import type { HumanRule, HumanRuleSet } from './types'

/**
 * Parse the text content of a `.human` file into a {@link HumanRuleSet}.
 *
 * Syntax mirrors `.gitignore` with one extension:
 * - Lines starting with `!` denote **readonly** (agent must not edit).
 * - All other non-blank, non-comment lines denote **confirm** (agent must ask).
 *
 * @param content  Raw text of a `.human` file.
 * @param directory  Directory the file resides in, relative to repo root ("" for root).
 */
export function parse(content: string, directory = ''): HumanRuleSet {
  const rules: HumanRule[] = []

  for (const raw of content.split('\n')) {
    const line = raw.trim()

    if (line === '' || line.startsWith('#'))
      continue

    if (line.startsWith('!')) {
      const pattern = line.slice(1).trim()
      if (pattern !== '') {
        rules.push({ pattern, level: 'readonly' })
      }
    }
    else {
      rules.push({ pattern: line, level: 'confirm' })
    }
  }

  return { directory, rules }
}
