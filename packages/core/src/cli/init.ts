import { existsSync, readdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineCommand } from 'citty'
import pc from 'picocolors'

const COMMON_READONLY = [
  { pattern: 'LICENSE', check: 'LICENSE' },
]

const COMMON_CONFIRM = [
  { pattern: 'docs/specs/', check: 'docs' },
]

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Create a starter .human file',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing .human file',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = process.cwd()
    const humanPath = join(cwd, '.human')

    if (existsSync(humanPath) && !args.force) {
      console.log(pc.yellow('.human file already exists. Use --force to overwrite.'))
      return
    }

    const lines: string[] = []
    const entries = safeReaddir(cwd)

    const confirmLines: string[] = []
    if (entries.includes('README.md'))
      confirmLines.push('README.md')
    for (const item of COMMON_CONFIRM) {
      if (entries.includes(item.check))
        confirmLines.push(item.pattern)
    }

    if (confirmLines.length > 0) {
      lines.push('# Files where you take responsibility (agent must get explicit approval before editing)')
      lines.push(...confirmLines)
    }

    const readonlyLines: string[] = []
    for (const item of COMMON_READONLY) {
      if (entries.includes(item.check))
        readonlyLines.push(`!${item.pattern}`)
    }

    if (readonlyLines.length > 0) {
      if (lines.length > 0)
        lines.push('')
      lines.push('# Use ! sparingly — overuse prevents agents from keeping info current')
      lines.push(...readonlyLines)
    }

    if (lines.length === 0) {
      lines.push('# Declare files where you take responsibility')
      lines.push('# Plain patterns = agent must get explicit approval before editing (preferred)')
      lines.push('# !-prefixed patterns = agent must not edit (use sparingly)')
      lines.push('')
      lines.push('# Example:')
      lines.push('# docs/specs/')
      lines.push('# !LICENSE')
    }

    lines.push('')

    await writeFile(humanPath, lines.join('\n'), 'utf-8')

    console.log(pc.green('Created .human file:'))
    console.log()
    for (const line of lines) {
      if (line.trim()) {
        console.log(pc.dim(`  ${line}`))
      }
    }
    console.log()
    console.log(pc.dim('Run `humanfile check` to see protection levels.'))
  },
})

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir)
  }
  catch {
    return []
  }
}
