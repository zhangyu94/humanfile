import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'
import { checkbox } from '@inquirer/prompts'
import { defineCommand } from 'citty'
import pc from 'picocolors'

export type SupportedEnvironment = 'cursor' | 'copilot' | 'claude' | 'windsurf' | 'cline' | 'codex'

interface EnvironmentConfig {
  sourcePath: string
  destinationPath: string
  label: string
}

const ENVIRONMENT_CONFIGS: Record<SupportedEnvironment, EnvironmentConfig> = {
  cursor: {
    sourcePath: 'cursor/.cursor/rules/humanfile.mdc',
    destinationPath: '.cursor/rules/humanfile.mdc',
    label: 'Cursor',
  },
  copilot: {
    sourcePath: 'copilot/.github/copilot-instructions.md',
    destinationPath: '.github/copilot-instructions.md',
    label: 'GitHub Copilot',
  },
  claude: {
    sourcePath: 'claude/CLAUDE.md',
    destinationPath: 'CLAUDE.md',
    label: 'Claude Code',
  },
  windsurf: {
    sourcePath: 'windsurf/.windsurfrules',
    destinationPath: '.windsurfrules',
    label: 'Windsurf',
  },
  cline: {
    sourcePath: 'cline/.clinerules',
    destinationPath: '.clinerules',
    label: 'Cline',
  },
  codex: {
    sourcePath: 'codex/AGENTS.md',
    destinationPath: 'AGENTS.md',
    label: 'Codex',
  },
}

const ENVIRONMENT_ORDER: SupportedEnvironment[] = [
  'cursor',
  'copilot',
  'claude',
  'windsurf',
  'cline',
  'codex',
]

const ENVIRONMENT_HINT = 'cursor|copilot|claude|windsurf|cline|codex'

export function detectEnvironment(cwd: string): SupportedEnvironment | null {
  if (existsSync(resolve(cwd, '.cursor')))
    return 'cursor'

  if (existsSync(resolve(cwd, '.windsurfrules')))
    return 'windsurf'

  if (existsSync(resolve(cwd, '.clinerules')))
    return 'cline'

  if (existsSync(resolve(cwd, 'CLAUDE.md')))
    return 'claude'

  if (existsSync(resolve(cwd, 'AGENTS.md')))
    return 'codex'

  if (existsSync(resolve(cwd, '.vscode')) || existsSync(resolve(cwd, '.github')))
    return 'copilot'

  return null
}

function isSupportedEnvironment(value: string): value is SupportedEnvironment {
  return value in ENVIRONMENT_CONFIGS
}

export function parseEnvironmentCsv(value: string): SupportedEnvironment[] {
  const parsed = value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  const unique: SupportedEnvironment[] = []
  for (const item of parsed) {
    if (!isSupportedEnvironment(item)) {
      throw new TypeError(`Unsupported environment: ${item}`)
    }
    if (!unique.includes(item)) {
      unique.push(item)
    }
  }

  return unique
}

export function resolveBundledConfigRoot(fromFileUrl: string = import.meta.url): string {
  const here = dirname(fileURLToPath(fromFileUrl))
  const candidates = [
    resolve(here, '../../configs/generated'),
    resolve(here, '../configs/generated'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  throw new TypeError('Could not locate bundled configs/generated directory in package.')
}

export function buildEnvironmentChoices(detected: SupportedEnvironment | null): {
  name: string
  value: SupportedEnvironment
  checked: boolean
}[] {
  return ENVIRONMENT_ORDER.map(env => ({
    name: `${ENVIRONMENT_CONFIGS[env].label} -> ${ENVIRONMENT_CONFIGS[env].destinationPath}`,
    value: env,
    checked: detected === env,
  }))
}

async function promptForEnvironments(
  detected: SupportedEnvironment | null,
): Promise<SupportedEnvironment[]> {
  if (!input.isTTY || !output.isTTY)
    return detected ? [detected] : []

  const message = detected
    ? `Detected ${ENVIRONMENT_CONFIGS[detected].label}. Select environments to install (Space to toggle, Enter to confirm):`
    : 'Could not auto-detect an environment. Select environments to install (Space to toggle, Enter to confirm):'

  const selected = await checkbox<SupportedEnvironment>({
    message,
    choices: buildEnvironmentChoices(detected),
    pageSize: ENVIRONMENT_ORDER.length,
    loop: false,
  })

  if (selected.length === 0)
    return detected ? [detected] : []

  return ENVIRONMENT_ORDER.filter(env => selected.includes(env))
}

export interface InstallConfigOptions {
  cwd: string
  env: SupportedEnvironment
  force: boolean
  dryRun: boolean
  bundledRoot?: string
}

export interface InstallConfigResult {
  env: SupportedEnvironment
  destinationPath: string
  sourcePath: string
  skipped: boolean
}

export interface InstallSkillOptions {
  cwd: string
  force: boolean
  dryRun: boolean
  bundledRoot?: string
}

export interface InstallSkillResult {
  destinationPath: string
  sourcePath: string
  skipped: boolean
}

export async function installSkillTemplate(options: InstallSkillOptions): Promise<InstallSkillResult> {
  const {
    cwd,
    force,
    dryRun,
    bundledRoot = resolveBundledConfigRoot(),
  } = options

  const destinationPath = '.agents/skills/humanfile/SKILL.md'
  const sourcePath = resolve(bundledRoot, 'skills/humanfile/SKILL.md')
  const destination = resolve(cwd, destinationPath)

  if (existsSync(destination) && !force) {
    return {
      destinationPath,
      sourcePath,
      skipped: true,
    }
  }

  if (!dryRun) {
    const content = await readFile(sourcePath, 'utf-8')
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, content, 'utf-8')
  }

  return {
    destinationPath,
    sourcePath,
    skipped: false,
  }
}

export async function installConfig(options: InstallConfigOptions): Promise<InstallConfigResult> {
  const {
    cwd,
    env,
    force,
    dryRun,
    bundledRoot = resolveBundledConfigRoot(),
  } = options

  const mapping = ENVIRONMENT_CONFIGS[env]
  const destination = resolve(cwd, mapping.destinationPath)
  const sourcePath = resolve(bundledRoot, mapping.sourcePath)

  if (existsSync(destination) && !force) {
    return {
      env,
      destinationPath: mapping.destinationPath,
      sourcePath,
      skipped: true,
    }
  }

  if (!dryRun) {
    const content = await readFile(sourcePath, 'utf-8')
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, content, 'utf-8')
  }

  return {
    env,
    destinationPath: mapping.destinationPath,
    sourcePath,
    skipped: false,
  }
}

export const installCommand = defineCommand({
  meta: {
    name: 'install',
    description: 'Install environment-specific humanfile agent config automatically',
  },
  args: {
    'env': {
      type: 'string',
      description: 'Target environment: cursor|copilot|claude|windsurf|cline|codex (skips detection)',
    },
    'with': {
      type: 'string',
      description: 'Additional environments as comma-separated list (for example: copilot,claude)',
    },
    'force': {
      type: 'boolean',
      description: 'Overwrite existing destination file',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would be installed without writing files',
      default: false,
    },
    'no-prompt': {
      type: 'boolean',
      description: 'Disable interactive environment toggle prompt',
      default: false,
    },
    'with-skill': {
      type: 'boolean',
      description: 'Also install skill template to .agents/skills/humanfile/SKILL.md',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = process.cwd()
    const explicitPrimary = args.env
    let environments: SupportedEnvironment[] = []

    if (explicitPrimary) {
      if (!isSupportedEnvironment(explicitPrimary)) {
        console.log(pc.red(`Unsupported environment: ${explicitPrimary}`))
        process.exitCode = 1
        return
      }
      environments.push(explicitPrimary)
    }
    else {
      const detected = detectEnvironment(cwd)
      if (args['no-prompt']) {
        if (!detected) {
          console.log(pc.yellow('Could not auto-detect an environment.'))
          console.log(pc.dim(`Use --env ${ENVIRONMENT_HINT}`))
          process.exitCode = 1
          return
        }
        environments = [detected]
      }
      else {
        try {
          environments = await promptForEnvironments(detected)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.log(pc.red(message))
          process.exitCode = 1
          return
        }
      }
    }

    if (args.with) {
      try {
        const extras = parseEnvironmentCsv(args.with)
        for (const env of extras) {
          if (!environments.includes(env)) {
            environments.push(env)
          }
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(pc.red(message))
        process.exitCode = 1
        return
      }
    }

    if (environments.length === 0) {
      console.log(pc.yellow('No environments selected.'))
      console.log(pc.dim(`Use --env ${ENVIRONMENT_HINT}`))
      process.exitCode = 1
      return
    }

    const modeLabel = args['dry-run'] ? '(dry-run)' : ''
    const orderedEnvs = ENVIRONMENT_ORDER.filter(env => environments.includes(env))

    for (const env of orderedEnvs) {
      const result = await installConfig({
        cwd,
        env,
        force: args.force,
        dryRun: args['dry-run'],
      })

      const target = ENVIRONMENT_CONFIGS[env]
      if (result.skipped) {
        console.log(pc.yellow(`Skipped ${target.label}: ${target.destinationPath} already exists.`))
        console.log(pc.dim('Use --force to overwrite existing file.'))
        continue
      }

      console.log(pc.green(`Installed config for ${target.label} ${modeLabel}`.trim()))
      console.log(pc.dim(`  target: ${target.destinationPath}`))
    }

    if (args['with-skill']) {
      const result = await installSkillTemplate({
        cwd,
        force: args.force,
        dryRun: args['dry-run'],
      })

      if (result.skipped) {
        console.log(pc.yellow(`Skipped Skill template: ${result.destinationPath} already exists.`))
        console.log(pc.dim('Use --force to overwrite existing file.'))
      }
      else {
        console.log(pc.green(`Installed Skill template ${modeLabel}`.trim()))
        console.log(pc.dim(`  target: ${result.destinationPath}`))
      }
    }
  },
})
