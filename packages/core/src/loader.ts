import type { Ignore } from 'ignore'
import type { HumanRuleSet, ProtectionLevel } from './types'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import ignore from 'ignore'
import { classify } from './classifier'
import { parse } from './parser'

const HUMAN_FILENAME = '.human'
const BACKSLASH_RE = /\\/g

function toPosix(p: string): string {
  return p.replace(BACKSLASH_RE, '/')
}

/**
 * Build an ignore filter from the root `.gitignore` (if present).
 * Always excludes `.git`.
 */
async function createGitignoreFilter(repoRoot: string): Promise<Ignore> {
  const ig = ignore()
  ig.add('.git')
  try {
    const content = await readFile(join(repoRoot, '.gitignore'), 'utf-8')
    ig.add(content)
  }
  catch {
    // No root .gitignore found; keep the default .git exclusion only.
  }
  return ig
}

interface WalkResult {
  ruleSets: HumanRuleSet[]
  files: string[]
}

/**
 * Single-pass walk that collects both `.human` rule sets and file paths,
 * respecting the root `.gitignore`.
 */
async function walkRepo(repoRoot: string): Promise<WalkResult> {
  const ig = await createGitignoreFilter(repoRoot)
  const ruleSets: HumanRuleSet[] = []
  const files: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const rel = toPosix(relative(repoRoot, join(dir, entry.name)))
      if (ig.ignores(entry.isDirectory() ? `${rel}/` : rel))
        continue

      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
      }
      else if (entry.name === HUMAN_FILENAME) {
        const content = await readFile(fullPath, 'utf-8')
        const directory = toPosix(relative(repoRoot, dirname(fullPath)))
        ruleSets.push(parse(content, directory))
      }
      else {
        files.push(rel)
      }
    }
  }

  await walk(repoRoot)
  ruleSets.sort((a, b) => {
    const depthA = a.directory === '' ? 0 : a.directory.split('/').length
    const depthB = b.directory === '' ? 0 : b.directory.split('/').length
    if (depthA !== depthB)
      return depthA - depthB
    return a.directory.localeCompare(b.directory)
  })
  return { ruleSets, files }
}

/**
 * Discover all `.human` files under `repoRoot` and classify every file
 * in the repository.
 *
 * @returns A map of relative file paths → {@link ProtectionLevel}.
 */
export async function classifyAll(
  repoRoot: string,
): Promise<Map<string, ProtectionLevel>> {
  const { ruleSets, files } = await walkRepo(repoRoot)
  const result = new Map<string, ProtectionLevel>()

  for (const file of files) {
    const applicable = ruleSetsForPath(file, ruleSets)
    result.set(file, classify(file, applicable))
  }

  return result
}

/**
 * Walk the repo, find every `.human` file, parse each into a rule set,
 * and return them sorted from shallowest to deepest directory.
 */
export async function discoverRuleSets(
  repoRoot: string,
): Promise<HumanRuleSet[]> {
  const { ruleSets } = await walkRepo(repoRoot)
  return ruleSets
}

/**
 * Filter rule sets to only those whose directory is a parent of (or equal to)
 * the given file path, ordered from shallowest to deepest.
 */
export function ruleSetsForPath(
  filePath: string,
  ruleSets: HumanRuleSet[],
): HumanRuleSet[] {
  return ruleSets.filter((rs) => {
    if (rs.directory === '')
      return true
    const prefix = rs.directory.endsWith('/')
      ? rs.directory
      : `${rs.directory}/`
    return filePath.startsWith(prefix)
  })
}
