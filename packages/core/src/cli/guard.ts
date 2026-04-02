import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defineCommand } from 'citty'
import pc from 'picocolors'
import { explain } from '../classifier'
import { discoverRuleSets } from '../loader'
import { evaluateProtectedChangeSet } from '../policy'

const NUMSTAT_LINE_RE = /^(-|\d+)\t(-|\d+)\t(.+)$/

export type GuardHook = 'pre-commit' | 'pre-push'
export type GuardMode = 'staged' | 'diff'
export type GuardPolicy = 'strict' | 'ai-aware'

const GUARD_SENTINEL = '# humanfile-guard:v1'
const GUARD_MODE_RE = /mode=(staged|diff)/
const GUARD_POLICY_RE = /policy=(strict|ai-aware)/
const GUARD_AI_THRESHOLD_RE = /ai-threshold=(\d+)/
const DEFAULT_GUARD_POLICY: GuardPolicy = 'ai-aware'
const DEFAULT_AI_THRESHOLD = 1000

interface GuardViolation {
  path: string
  level: 'confirm' | 'readonly'
  sourceFile: string | null
}

interface GuardCheckResult {
  files: string[]
  changedFiles: Array<{ filename: string, additions: number, deletions: number }>
  violations: GuardViolation[]
  policy: GuardPolicy
  likelyAiGenerated: boolean
  totalLinesChanged: number
  shouldBlock: boolean
}

interface HookInstallResult {
  hook: GuardHook
  path: string
  skipped: boolean
}

interface HookUninstallResult {
  hook: GuardHook
  path: string
  removed: boolean
  skippedReason: 'missing' | 'non-humanfile' | null
}

interface HookStatus {
  hook: GuardHook
  path: string
  installed: boolean
  managedByHumanfile: boolean
  mode: GuardMode | null
  policy: GuardPolicy | null
  aiThreshold: number | null
}

export function parseHookTargets(value: string): GuardHook[] {
  if (value === 'pre-commit')
    return ['pre-commit']
  if (value === 'pre-push')
    return ['pre-push']
  if (value === 'both')
    return ['pre-commit', 'pre-push']
  throw new TypeError(`Unsupported hook: ${value}`)
}

export function isGuardMode(value: string): value is GuardMode {
  return value === 'staged' || value === 'diff'
}

export function isGuardPolicy(value: string): value is GuardPolicy {
  return value === 'strict' || value === 'ai-aware'
}

function hookPath(repoRoot: string, hook: GuardHook): string {
  return resolve(repoRoot, '.git', 'hooks', hook)
}

function resolveGitRepositoryRoot(startDir: string): string {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: startDir,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new TypeError(
      detail
        ? `Not a git repository: ${detail}`
        : 'Not a git repository. Run from a git checkout (any subdirectory is fine) so hooks can be written under .git/hooks.',
    )
  }
  const root = result.stdout.trim()
  if (!root)
    throw new TypeError('Could not resolve git repository root.')
  return root
}

function parseGuardHeader(content: string): { managed: boolean, mode: GuardMode | null, policy: GuardPolicy | null, aiThreshold: number | null } {
  const header = content.split('\n').find(line => line.includes(GUARD_SENTINEL))
  if (!header)
    return { managed: false, mode: null, policy: null, aiThreshold: null }

  const modeMatch = header.match(GUARD_MODE_RE)
  const policyMatch = header.match(GUARD_POLICY_RE)
  const thresholdMatch = header.match(GUARD_AI_THRESHOLD_RE)
  const aiThreshold = thresholdMatch ? Number.parseInt(thresholdMatch[1], 10) : null

  return {
    managed: true,
    mode: modeMatch ? modeMatch[1] as GuardMode : null,
    policy: policyMatch ? policyMatch[1] as GuardPolicy : null,
    aiThreshold: Number.isFinite(aiThreshold) ? aiThreshold : null,
  }
}

export function buildGuardHookScript(
  hook: GuardHook,
  mode: GuardMode,
  policy: GuardPolicy = DEFAULT_GUARD_POLICY,
  aiThreshold: number = DEFAULT_AI_THRESHOLD,
): string {
  return [
    '#!/usr/bin/env sh',
    `${GUARD_SENTINEL} hook=${hook} mode=${mode} policy=${policy} ai-threshold=${aiThreshold}`,
    '',
    'run_guard() {',
    '  if [ -n "$HUMANFILE_GUARD_BIN" ]; then',
    '    "$HUMANFILE_GUARD_BIN" guard run --hook "$1" --mode "$2" --policy "$3" --ai-threshold "$4" --cwd "$PWD"',
    '    return $? ',
    '  fi',
    '',
    '  if command -v humanfile >/dev/null 2>&1; then',
    '    humanfile guard run --hook "$1" --mode "$2" --policy "$3" --ai-threshold "$4" --cwd "$PWD"',
    '    return $? ',
    '  fi',
    '',
    '  if command -v pnpm >/dev/null 2>&1; then',
    '    pnpm humanfile guard run --hook "$1" --mode "$2" --policy "$3" --ai-threshold "$4" --cwd "$PWD"',
    '    return $? ',
    '  fi',
    '',
    '  echo "humanfile guard: command not found. Set HUMANFILE_GUARD_BIN or install humanfile in PATH."',
    '  return 1',
    '}',
    '',
    `run_guard ${hook} ${mode} ${policy} ${aiThreshold}`,
  ].join('\n')
}

export async function installGuardHook(options: {
  cwd: string
  hook: GuardHook
  mode: GuardMode
  policy?: GuardPolicy
  aiThreshold?: number
  force: boolean
  dryRun: boolean
}): Promise<HookInstallResult> {
  const policy = options.policy ?? DEFAULT_GUARD_POLICY
  const aiThreshold = options.aiThreshold ?? DEFAULT_AI_THRESHOLD
  const repoRoot = resolveGitRepositoryRoot(options.cwd)
  const path = hookPath(repoRoot, options.hook)
  if (existsSync(path)) {
    const existing = await readFile(path, 'utf8')
    const current = parseGuardHeader(existing)
    if (!current.managed && !options.force) {
      throw new TypeError(`Refusing to overwrite existing non-humanfile hook: ${options.hook}. Use --force to overwrite.`)
    }
    if (
      current.managed
      && !options.force
      && current.mode === options.mode
      && current.policy === policy
      && current.aiThreshold === aiThreshold
    ) {
      return { hook: options.hook, path, skipped: true }
    }
  }

  if (!options.dryRun) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, buildGuardHookScript(options.hook, options.mode, policy, aiThreshold), 'utf8')
    await chmod(path, 0o755)
  }

  return { hook: options.hook, path, skipped: false }
}

export async function uninstallGuardHook(options: {
  cwd: string
  hook: GuardHook
  dryRun: boolean
}): Promise<HookUninstallResult> {
  const repoRoot = resolveGitRepositoryRoot(options.cwd)
  const path = hookPath(repoRoot, options.hook)
  if (!existsSync(path)) {
    return { hook: options.hook, path, removed: false, skippedReason: 'missing' }
  }

  const existing = await readFile(path, 'utf8')
  const parsed = parseGuardHeader(existing)
  if (!parsed.managed) {
    return { hook: options.hook, path, removed: false, skippedReason: 'non-humanfile' }
  }

  if (!options.dryRun) {
    await rm(path)
  }

  return { hook: options.hook, path, removed: true, skippedReason: null }
}

export async function readGuardStatus(cwd: string): Promise<HookStatus[]> {
  let repoRoot: string
  try {
    repoRoot = resolveGitRepositoryRoot(cwd)
  }
  catch {
    const hooks: GuardHook[] = ['pre-commit', 'pre-push']
    return hooks.map((hook) => {
      const path = hookPath(cwd, hook)
      return {
        hook,
        path,
        installed: false,
        managedByHumanfile: false,
        mode: null,
        policy: null,
        aiThreshold: null,
      }
    })
  }

  const hooks: GuardHook[] = ['pre-commit', 'pre-push']
  const statuses: HookStatus[] = []

  for (const hook of hooks) {
    const path = hookPath(repoRoot, hook)
    if (!existsSync(path)) {
      statuses.push({
        hook,
        path,
        installed: false,
        managedByHumanfile: false,
        mode: null,
        policy: null,
        aiThreshold: null,
      })
      continue
    }

    const content = await readFile(path, 'utf8')
    const parsed = parseGuardHeader(content)
    statuses.push({
      hook,
      path,
      installed: true,
      managedByHumanfile: parsed.managed,
      mode: parsed.mode,
      policy: parsed.policy,
      aiThreshold: parsed.aiThreshold,
    })
  }

  return statuses
}

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new TypeError((result.stderr || result.stdout || '').trim() || `git ${args.join(' ')} failed`)
  }
  return result.stdout.trim()
}

function resolvePrePushDiffRange(cwd: string): string {
  try {
    const upstream = runGit(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
    if (upstream)
      return `${upstream}...HEAD`
  }
  catch {
    // fall through to local fallback range
  }

  return 'HEAD~1...HEAD'
}

function parseNumStat(output: string): Array<{ filename: string, additions: number, deletions: number }> {
  if (!output)
    return []

  const parsed: Array<{ filename: string, additions: number, deletions: number }> = []
  for (const line of output.split('\n')) {
    if (!line)
      continue

    const match = line.match(NUMSTAT_LINE_RE)
    if (!match)
      continue

    const additions = match[1] === '-' ? 0 : Number.parseInt(match[1], 10)
    const deletions = match[2] === '-' ? 0 : Number.parseInt(match[2], 10)
    const filename = match[3]

    parsed.push({
      filename,
      additions: Number.isFinite(additions) ? additions : 0,
      deletions: Number.isFinite(deletions) ? deletions : 0,
    })
  }

  return parsed
}

function resolveChangedFiles(cwd: string, hook: GuardHook, mode: GuardMode): Array<{ filename: string, additions: number, deletions: number }> {
  if (mode === 'staged') {
    const output = runGit(cwd, ['diff', '--cached', '--numstat', '--diff-filter=ACMR'])
    return parseNumStat(output)
  }

  if (hook === 'pre-push') {
    const range = resolvePrePushDiffRange(cwd)
    const output = runGit(cwd, ['diff', '--numstat', '--diff-filter=ACMR', range])
    return parseNumStat(output)
  }

  const output = runGit(cwd, ['diff', '--numstat', '--diff-filter=ACMR'])
  return parseNumStat(output)
}

function resolveCommitMessages(cwd: string, hook: GuardHook, mode: GuardMode): string[] {
  if (hook !== 'pre-push' || mode !== 'diff')
    return []

  try {
    const range = resolvePrePushDiffRange(cwd)
    const output = runGit(cwd, ['log', '--format=%B%x00', range])
    return output ? output.split('\0').map(message => message.trim()).filter(Boolean) : []
  }
  catch {
    return []
  }
}

export async function runGuardCheck(
  cwd: string,
  hook: GuardHook,
  mode: GuardMode,
  policy: GuardPolicy = DEFAULT_GUARD_POLICY,
  aiThreshold: number = DEFAULT_AI_THRESHOLD,
): Promise<GuardCheckResult> {
  const changedFiles = resolveChangedFiles(cwd, hook, mode)
  const files = changedFiles.map(file => file.filename)
  if (changedFiles.length === 0) {
    return {
      files,
      changedFiles,
      violations: [],
      policy,
      likelyAiGenerated: false,
      totalLinesChanged: 0,
      shouldBlock: false,
    }
  }

  const ruleSets = await discoverRuleSets(cwd)
  if (ruleSets.length === 0) {
    return {
      files,
      changedFiles,
      violations: [],
      policy,
      likelyAiGenerated: false,
      totalLinesChanged: changedFiles.reduce((sum, file) => sum + file.additions + file.deletions, 0),
      shouldBlock: false,
    }
  }

  const evaluation = evaluateProtectedChangeSet({
    changedFiles,
    ruleSets,
    aiThreshold,
    commitMessages: resolveCommitMessages(cwd, hook, mode),
  })

  const violations: GuardViolation[] = []
  for (const violation of evaluation.violations) {
    const details = explain(violation.filename, ruleSets)
    violations.push({
      path: violation.filename,
      level: violation.level,
      sourceFile: details.decisiveRule?.sourceFile ?? null,
    })
  }

  const shouldBlock = policy === 'strict'
    ? violations.length > 0
    : (violations.length > 0 && evaluation.likelyAiGenerated)

  return {
    files,
    changedFiles,
    violations,
    policy,
    likelyAiGenerated: evaluation.likelyAiGenerated,
    totalLinesChanged: evaluation.totalLinesChanged,
    shouldBlock,
  }
}

export const guardCommand = defineCommand({
  meta: {
    name: 'guard',
    description: 'Manage local git hooks to enforce .human boundaries pre-commit/pre-push',
  },
  subCommands: {
    install: defineCommand({
      meta: {
        name: 'install',
        description: 'Install humanfile-managed local git hooks',
      },
      args: {
        'hook': {
          type: 'string',
          default: 'pre-commit',
          description: 'Hook target: pre-commit | pre-push | both',
        },
        'mode': {
          type: 'string',
          default: 'staged',
          description: 'Changed-file mode: staged | diff',
        },
        'policy': {
          type: 'string',
          default: DEFAULT_GUARD_POLICY,
          description: 'Blocking policy: strict | ai-aware',
        },
        'ai-threshold': {
          type: 'string',
          default: String(DEFAULT_AI_THRESHOLD),
          description: 'Line-change threshold used by ai-aware mode',
        },
        'force': {
          type: 'boolean',
          default: false,
          description: 'Overwrite existing hooks',
        },
        'dry-run': {
          type: 'boolean',
          default: false,
          description: 'Report actions without writing files',
        },
      },
      async run({ args }) {
        const mode = String(args.mode)
        if (!isGuardMode(mode)) {
          console.log(pc.red(`Unsupported mode: ${mode}`))
          process.exitCode = 1
          return
        }

        const policyValue = String(args.policy)
        if (!isGuardPolicy(policyValue)) {
          console.log(pc.red(`Unsupported policy: ${policyValue}`))
          process.exitCode = 1
          return
        }
        const policy = policyValue as GuardPolicy

        const aiThreshold = Number(args['ai-threshold'])
        if (!Number.isFinite(aiThreshold) || aiThreshold <= 0) {
          console.log(pc.red(`Invalid ai-threshold: ${args['ai-threshold']}`))
          process.exitCode = 1
          return
        }

        let hooks: GuardHook[]
        try {
          hooks = parseHookTargets(String(args.hook))
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.log(pc.red(message))
          process.exitCode = 1
          return
        }

        for (const hook of hooks) {
          try {
            const result = await installGuardHook({
              cwd: process.cwd(),
              hook,
              mode,
              policy,
              aiThreshold,
              force: Boolean(args.force),
              dryRun: Boolean(args['dry-run']),
            })
            if (result.skipped) {
              console.log(pc.yellow(`Skipped ${hook}: already installed with the same mode.`))
            }
            else {
              const modeLabel = args['dry-run'] ? ' (dry-run)' : ''
              console.log(pc.green(`Installed ${hook}${modeLabel}`))
              console.log(pc.dim(`  ${result.path}`))
            }
          }
          catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.log(pc.red(message))
            process.exitCode = 1
            return
          }
        }
      },
    }),
    uninstall: defineCommand({
      meta: {
        name: 'uninstall',
        description: 'Remove humanfile-managed local git hooks',
      },
      args: {
        'hook': {
          type: 'string',
          default: 'both',
          description: 'Hook target: pre-commit | pre-push | both',
        },
        'dry-run': {
          type: 'boolean',
          default: false,
          description: 'Report actions without deleting files',
        },
      },
      async run({ args }) {
        let hooks: GuardHook[]
        try {
          hooks = parseHookTargets(String(args.hook))
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.log(pc.red(message))
          process.exitCode = 1
          return
        }

        for (const hook of hooks) {
          const result = await uninstallGuardHook({
            cwd: process.cwd(),
            hook,
            dryRun: Boolean(args['dry-run']),
          })
          if (result.removed) {
            const modeLabel = args['dry-run'] ? ' (dry-run)' : ''
            console.log(pc.green(`Removed ${hook}${modeLabel}`))
            continue
          }

          if (result.skippedReason === 'missing') {
            console.log(pc.dim(`No hook at ${result.path}`))
            continue
          }

          console.log(pc.yellow(`Skipped ${hook}: existing hook is not managed by humanfile.`))
        }
      },
    }),
    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Report local guard hook installation status',
      },
      async run() {
        const statuses = await readGuardStatus(process.cwd())
        for (const status of statuses) {
          if (!status.installed) {
            console.log(`${pc.dim(status.hook)} ${pc.dim('-')} ${pc.dim('missing')}`)
            continue
          }

          if (!status.managedByHumanfile) {
            console.log(`${pc.yellow(status.hook)} ${pc.dim('-')} ${pc.yellow('custom (non-humanfile)')}`)
            continue
          }

          console.log(`${pc.green(status.hook)} ${pc.dim('-')} ${pc.green(`installed (${status.mode ?? 'unknown mode'})`)}`)
          if (status.policy) {
            const thresholdInfo = status.policy === 'ai-aware' && status.aiThreshold !== null
              ? `, ai-threshold=${status.aiThreshold}`
              : ''
            console.log(pc.dim(`  policy=${status.policy}${thresholdInfo}`))
          }
        }
      },
    }),
    run: defineCommand({
      meta: {
        name: 'run',
        description: 'Execute guard evaluation for hooks',
      },
      args: {
        'hook': {
          type: 'string',
          default: 'pre-commit',
        },
        'mode': {
          type: 'string',
          default: 'staged',
        },
        'policy': {
          type: 'string',
          default: DEFAULT_GUARD_POLICY,
        },
        'ai-threshold': {
          type: 'string',
          default: String(DEFAULT_AI_THRESHOLD),
        },
        'cwd': {
          type: 'string',
        },
      },
      async run({ args }) {
        const mode = String(args.mode)
        if (!isGuardMode(mode)) {
          console.log(`humanfile guard blocked: unsupported mode ${mode}`)
          process.exitCode = 1
          return
        }

        const hookValue = String(args.hook)
        if (hookValue !== 'pre-commit' && hookValue !== 'pre-push') {
          console.log(`humanfile guard blocked: unsupported hook ${hookValue}`)
          process.exitCode = 1
          return
        }
        const hook = hookValue as GuardHook

        const policyValue = String(args.policy)
        if (!isGuardPolicy(policyValue)) {
          console.log(`humanfile guard blocked: unsupported policy ${policyValue}`)
          process.exitCode = 1
          return
        }
        const policy = policyValue as GuardPolicy

        const aiThreshold = Number(args['ai-threshold'])
        if (!Number.isFinite(aiThreshold) || aiThreshold <= 0) {
          console.log(`humanfile guard blocked: invalid ai-threshold ${args['ai-threshold']}`)
          process.exitCode = 1
          return
        }

        const targetCwd = args.cwd ? String(args.cwd) : process.cwd()

        let checkResult: GuardCheckResult
        try {
          checkResult = await runGuardCheck(targetCwd, hook, mode, policy, aiThreshold)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.log(`humanfile guard blocked: ${message}`)
          process.exitCode = 1
          return
        }

        if (!checkResult.shouldBlock) {
          if (checkResult.violations.length > 0 && checkResult.policy === 'ai-aware') {
            console.log('humanfile guard: protected-file edits detected but not flagged as likely AI-generated.')
            console.log(`total lines changed: ${checkResult.totalLinesChanged}`)
          }
          process.exitCode = 0
          return
        }

        console.log('humanfile guard blocked protected-file changes:')
        for (const violation of checkResult.violations) {
          const sourceInfo = violation.sourceFile ? ` (source: ${violation.sourceFile})` : ''
          console.log(`- ${violation.path} -> ${violation.level}${sourceInfo}`)
        }
        console.log('')
        const first = checkResult.violations[0]
        console.log(`Next step: humanfile explain ${first.path}`)
        process.exitCode = 1
      },
    }),
  },
})
