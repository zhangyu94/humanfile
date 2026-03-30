import type { Ignore } from 'ignore'
import type {
  ExplainDecisiveRule,
  ExplainResult,
  ExplainTraceEntry,
  HumanRuleSet,
  ProtectionLevel,
} from './types'
import ignore from 'ignore'

interface CompiledRule {
  matcher: Ignore
  level: 'confirm' | 'readonly'
}

const compiledCache = new WeakMap<HumanRuleSet, CompiledRule[]>()

function getCompiledRules(ruleSet: HumanRuleSet): CompiledRule[] {
  let compiled = compiledCache.get(ruleSet)
  if (!compiled) {
    compiled = ruleSet.rules.map(rule => ({
      matcher: ignore().add(rule.pattern),
      level: rule.level,
    }))
    compiledCache.set(ruleSet, compiled)
  }
  return compiled
}

/**
 * Classify a single file path against one or more {@link HumanRuleSet}s.
 *
 * Rule sets should be ordered from root → deepest directory.
 * Within each set, last-match-wins (same semantics as `.gitignore`).
 * Across sets, deeper directories take precedence.
 *
 * @returns The resolved {@link ProtectionLevel} for the given path.
 */
export function classify(
  filePath: string,
  ruleSets: HumanRuleSet[],
): ProtectionLevel {
  let result: ProtectionLevel = 'free'

  for (const ruleSet of ruleSets) {
    const relativePath = stripPrefix(filePath, ruleSet.directory)
    if (relativePath === null)
      continue

    const level = classifyInRuleSet(relativePath, ruleSet)
    if (level !== null) {
      result = level
    }
  }

  return result
}

/**
 * Explain how a file path was classified by reporting the final level,
 * decisive-rule metadata, and an ordered evaluation trace.
 */
export function explain(
  filePath: string,
  ruleSets: HumanRuleSet[],
): ExplainResult {
  let result: ProtectionLevel = 'free'
  let decisiveRule: ExplainDecisiveRule | null = null
  const trace: ExplainTraceEntry[] = []

  for (const ruleSet of ruleSets) {
    const relativePath = stripPrefix(filePath, ruleSet.directory)
    if (relativePath === null)
      continue

    const compiled = getCompiledRules(ruleSet)
    const sourceFile = toHumanFilePath(ruleSet.directory)

    for (const [index, compiledRule] of compiled.entries()) {
      const rule = ruleSet.rules[index]
      const matched = compiledRule.matcher.ignores(relativePath)
      if (matched) {
        result = compiledRule.level
        decisiveRule = {
          sourceFile,
          sourceDirectory: ruleSet.directory,
          pattern: rule.pattern,
          level: compiledRule.level,
        }
      }

      trace.push({
        sourceFile,
        sourceDirectory: ruleSet.directory,
        relativePath,
        pattern: rule.pattern,
        ruleLevel: compiledRule.level,
        matched,
        effectiveLevelAfterRule: result,
      })
    }
  }

  return {
    path: filePath,
    level: result,
    matched: decisiveRule !== null,
    decisiveRule,
    trace,
  }
}

/**
 * Classify a path within a single rule set (last match wins).
 * Returns `null` if no rule matches.
 */
function classifyInRuleSet(
  relativePath: string,
  ruleSet: HumanRuleSet,
): ProtectionLevel | null {
  let matched: ProtectionLevel | null = null

  for (const compiled of getCompiledRules(ruleSet)) {
    if (compiled.matcher.ignores(relativePath)) {
      matched = compiled.level
    }
  }

  return matched
}

/**
 * Strip a directory prefix from a file path and return the remainder.
 * Returns `null` if the path is not under the given directory.
 */
function stripPrefix(filePath: string, directory: string): string | null {
  if (directory === '')
    return filePath

  const prefix = directory.endsWith('/') ? directory : `${directory}/`
  if (filePath.startsWith(prefix)) {
    return filePath.slice(prefix.length)
  }
  return null
}

function toHumanFilePath(directory: string): string {
  return directory === '' ? '.human' : `${directory}/.human`
}
