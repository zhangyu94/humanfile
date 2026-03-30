import type { ProtectionLevel } from '../types'
import { defineCommand } from 'citty'
import pc from 'picocolors'
import { classify, explain } from '../classifier'
import { classifyAll, discoverRuleSets } from '../loader'

const VALID_LEVELS: ReadonlySet<string> = new Set(['free', 'confirm', 'readonly'])

const LEVEL_LABELS: Record<ProtectionLevel, string> = {
  free: pc.green('free'),
  confirm: pc.yellow('confirm'),
  readonly: pc.red('readonly'),
}

const LEVEL_ICONS: Record<ProtectionLevel, string> = {
  free: pc.green('◻'),
  confirm: pc.yellow('▲'),
  readonly: pc.red('●'),
}

export const checkCommand = defineCommand({
  meta: {
    name: 'check',
    description: 'Classify files by their .human protection level',
  },
  args: {
    'path': {
      type: 'positional',
      description: 'File path to classify (omit to classify all files)',
      required: false,
    },
    'json': {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    'level': {
      type: 'string',
      description: 'Filter by protection level (free, confirm, readonly)',
    },
    'exit-code': {
      type: 'boolean',
      description: 'Exit with code 1 if any protected files exist',
      default: false,
    },
    'explain': {
      type: 'boolean',
      description: 'Explain classification for a single path',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = process.cwd()
    const ruleSets = await discoverRuleSets(cwd)

    if (args.level && !VALID_LEVELS.has(args.level)) {
      console.log(pc.red(`Unknown level: "${args.level}". Must be one of: free, confirm, readonly.`))
      process.exitCode = 1
      return
    }

    if (ruleSets.length === 0) {
      if (args.json) {
        console.log(JSON.stringify({ error: 'No .human files found' }))
      }
      else {
        console.log(pc.dim('No .human files found in this directory tree.'))
        console.log(pc.dim('Run `humanfile init` to create one.'))
      }
      return
    }

    if (args.path) {
      if (args.explain) {
        const result = explain(args.path, ruleSets)
        const decisiveRule = result.decisiveRule
        if (args.json) {
          console.log(JSON.stringify(result, null, 2))
        }
        else if (!result.matched || !decisiveRule) {
          console.log(`${LEVEL_ICONS[result.level]} ${LEVEL_LABELS[result.level]}  ${result.path}`)
          console.log(pc.dim('  reason: no matching .human rule'))
        }
        else {
          console.log(`${LEVEL_ICONS[result.level]} ${LEVEL_LABELS[result.level]}  ${result.path}`)
          console.log(pc.dim(`  decisive rule: ${decisiveRule.pattern}`))
          console.log(pc.dim(`  source: ${decisiveRule.sourceFile}`))
          console.log(pc.dim('  reason: last matching rule wins'))
        }

        if (args['exit-code'] && result.level !== 'free') {
          process.exitCode = 1
        }
        return
      }

      const level = classify(args.path, ruleSets)
      if (args.json) {
        console.log(JSON.stringify({ path: args.path, level }))
      }
      else {
        console.log(`${LEVEL_ICONS[level]} ${LEVEL_LABELS[level]}  ${args.path}`)
      }
      if (args['exit-code'] && level !== 'free') {
        process.exitCode = 1
      }
      return
    }

    if (args.explain) {
      console.log(pc.red('--explain requires a single file path.'))
      console.log(pc.dim('Use `humanfile explain <path>` for explainability output.'))
      process.exitCode = 1
      return
    }

    const results = await classifyAll(cwd)

    let entries = [...results.entries()]
    if (args.level) {
      entries = entries.filter(([, level]) => level === args.level)
    }

    entries.sort((a, b) => {
      const order: Record<string, number> = { readonly: 0, confirm: 1, free: 2 }
      return (order[a[1]] ?? 3) - (order[b[1]] ?? 3)
    })

    if (args.json) {
      const obj = Object.fromEntries(entries)
      console.log(JSON.stringify(obj, null, 2))
    }
    else {
      for (const [filePath, level] of entries) {
        console.log(`  ${LEVEL_ICONS[level]} ${LEVEL_LABELS[level].padEnd(18)} ${pc.dim(filePath)}`)
      }

      const readonlyCount = entries.filter(([, l]) => l === 'readonly').length
      const confirmCount = entries.filter(([, l]) => l === 'confirm').length
      const freeCount = entries.filter(([, l]) => l === 'free').length

      console.log()
      console.log(
        pc.bold(`${entries.length} files`),
        pc.dim('('),
        readonlyCount > 0 ? pc.red(`${readonlyCount} readonly`) : '',
        confirmCount > 0 ? pc.yellow(`${confirmCount} confirm`) : '',
        freeCount > 0 ? pc.green(`${freeCount} free`) : '',
        pc.dim(')'),
      )
    }

    if (args['exit-code']) {
      const hasProtected = entries.some(([, l]) => l !== 'free')
      if (hasProtected) {
        process.exitCode = 1
      }
    }
  },
})
