import type { ExplainResult } from '../types'
import { Buffer } from 'node:buffer'
import { defineCommand } from 'citty'
import pc from 'picocolors'
import { explain } from '../classifier'
import { discoverRuleSets, ruleSetsForPath } from '../loader'

const NEWLINE_RE = /\r?\n/g
const TRAILING_CR_RE = /\r$/

interface ExplainCommandArgs {
  'path'?: string
  'stdin'?: boolean
  'json'?: boolean
  'verbose'?: boolean
  'v'?: boolean
  'quiet'?: boolean
  'q'?: boolean
  'non-matching'?: boolean
  'n'?: boolean
  'z'?: boolean
  '_'?: unknown[]
}

function getPositionalPaths(args: ExplainCommandArgs): string[] {
  const candidate = [
    ...(typeof args.path === 'string' && args.path.length > 0 ? [args.path] : []),
    ...(Array.isArray(args._)
      ? args._.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : []),
  ]

  const seen = new Set<string>()
  const ordered: string[] = []
  for (const item of candidate) {
    if (!seen.has(item)) {
      seen.add(item)
      ordered.push(item)
    }
  }

  return ordered
}

async function readPathsFromStdin(zMode: boolean): Promise<string[]> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }

  const raw = Buffer.concat(chunks).toString('utf-8')
  if (raw.length === 0)
    return []

  if (zMode) {
    return raw.split('\0').filter(item => item.length > 0)
  }

  return raw
    .split(NEWLINE_RE)
    .map(item => item.replace(TRAILING_CR_RE, ''))
    .filter(item => item.length > 0)
}

function hasApplicableRuleSet(path: string, ruleSets: Parameters<typeof ruleSetsForPath>[1]): boolean {
  return ruleSetsForPath(path, ruleSets).length > 0
}

function formatDefault(result: ExplainResult): string {
  const decisiveRule = result.decisiveRule
  if (!result.matched || !decisiveRule) {
    return [
      result.path,
      `  level: ${pc.green(result.level)}`,
    ].join('\n')
  }

  return [
    result.path,
    `  level: ${result.level === 'readonly' ? pc.red(result.level) : pc.yellow(result.level)}`,
    `  decisive rule: ${decisiveRule.pattern}`,
    `  source: ${decisiveRule.sourceFile}`,
  ].join('\n')
}

function formatVerbose(result: ExplainResult): string {
  const lines = [
    `path: ${result.path}`,
    `final: ${result.level}`,
    'trace:',
  ]

  if (result.trace.length === 0) {
    lines.push('  (no applicable .human rule sets)')
  }

  for (const [index, entry] of result.trace.entries()) {
    const status = entry.matched ? pc.green('matched') : pc.dim('miss')
    lines.push(
      `  [${index + 1}] ${entry.sourceFile}: ${entry.pattern} -> ${entry.ruleLevel} (${status}, effective=${entry.effectiveLevelAfterRule})`,
    )
  }

  const decisiveRule = result.decisiveRule
  if (decisiveRule) {
    lines.push(`decisive rule: ${decisiveRule.sourceFile}:${decisiveRule.pattern}`)
  }
  else {
    lines.push('decisive rule: none')
  }

  return lines.join('\n')
}

export const explainCommand = defineCommand({
  meta: {
    name: 'explain',
    description: 'Explain why files resolve to free, confirm, or readonly',
  },
  args: {
    'path': {
      type: 'positional',
      description: 'File path to explain',
      required: false,
    },
    'stdin': {
      type: 'boolean',
      description: 'Read file paths from stdin',
      default: false,
    },
    'json': {
      type: 'boolean',
      description: 'Output explanation as JSON',
      default: false,
    },
    'verbose': {
      type: 'boolean',
      description: 'Show rule-by-rule evaluation trace',
      default: false,
    },
    'v': {
      type: 'boolean',
      description: 'Alias for --verbose',
      default: false,
    },
    'quiet': {
      type: 'boolean',
      description: 'Suppress output and use exit code only',
      default: false,
    },
    'q': {
      type: 'boolean',
      description: 'Alias for --quiet',
      default: false,
    },
    'non-matching': {
      type: 'boolean',
      description: 'Include paths with no matching rules (free)',
      default: false,
    },
    'n': {
      type: 'boolean',
      description: 'Alias for --non-matching',
      default: false,
    },
    'z': {
      type: 'boolean',
      description: 'Use NUL-delimited stdin/stdout records',
      default: false,
    },
  },
  async run({ args }) {
    const parsed = args as ExplainCommandArgs
    const verbose = Boolean(parsed.verbose || parsed.v)
    const quiet = Boolean(parsed.quiet || parsed.q)
    const nonMatching = Boolean(parsed['non-matching'] || parsed.n)
    const zMode = Boolean(parsed.z)

    if (quiet && parsed.json) {
      console.log(pc.red('Cannot combine --quiet with --json.'))
      process.exitCode = 1
      return
    }

    if (zMode && verbose) {
      console.log(pc.red('Cannot combine -z with --verbose.'))
      process.exitCode = 1
      return
    }

    const inputPaths = parsed.stdin
      ? await readPathsFromStdin(zMode)
      : getPositionalPaths(parsed)

    if (inputPaths.length === 0) {
      console.log(pc.yellow('No paths provided.'))
      console.log(pc.dim('Pass one or more paths, or use --stdin.'))
      process.exitCode = 1
      return
    }

    const ruleSets = await discoverRuleSets(process.cwd())
    const results = inputPaths.map(path => explain(path, ruleSets))
    const filtered = nonMatching ? results : results.filter(item => item.matched)

    if (quiet) {
      if (!nonMatching) {
        const allMatched = results.every(result => result.matched)
        if (!allMatched)
          process.exitCode = 1
      }
      return
    }

    if (parsed.json) {
      const payload = filtered.length === 1 ? filtered[0] : filtered
      console.log(JSON.stringify(payload, null, 2))
      if (filtered.length === 0)
        process.exitCode = 1
      return
    }

    if (zMode) {
      const records = filtered.map((result) => {
        if (result.matched && result.decisiveRule) {
          return `${result.path}\t${result.level}\t${result.decisiveRule.sourceFile}\t${result.decisiveRule.pattern}`
        }

        return `${result.path}\t${result.level}\t-\t-`
      })
      process.stdout.write(`${records.join('\0')}\0`)
      if (filtered.length === 0)
        process.exitCode = 1
      return
    }

    if (filtered.length === 0) {
      const firstNoApplicable = results.find(result => !hasApplicableRuleSet(result.path, ruleSets))
      if (firstNoApplicable) {
        console.log(pc.yellow(`No applicable .human scope found for: ${firstNoApplicable.path}`))
      }
      else {
        console.log(pc.yellow('No matching .human rules found.'))
        console.log(pc.dim('Use --non-matching to include free paths in output.'))
      }
      process.exitCode = 1
      return
    }

    const rendered = filtered.map(result => verbose ? formatVerbose(result) : formatDefault(result))
    console.log(rendered.join('\n\n'))
  },
})
