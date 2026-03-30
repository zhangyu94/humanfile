/**
 * Protection level assigned to a file path based on `.human` rules.
 *
 * - `free`     — not matched; agent may edit without restriction
 * - `confirm`  — matched by a plain pattern; agent must obtain explicit approval before editing
 * - `readonly` — matched by a `!`-prefixed pattern; agent must not edit
 */
export type ProtectionLevel = 'free' | 'confirm' | 'readonly'

export interface HumanRule {
  /** Original glob pattern (without the `!` prefix, if any). */
  pattern: string
  /** Protection level this rule assigns. */
  level: 'confirm' | 'readonly'
}

export interface HumanRuleSet {
  /** Directory containing the `.human` file (relative to repo root, "" for root). */
  directory: string
  /** Ordered list of rules (first → last, last match wins). */
  rules: HumanRule[]
}

export interface ExplainDecisiveRule {
  /** Relative path to the `.human` source file that produced the final match. */
  sourceFile: string
  /** Directory containing the winning `.human` file ("" means repo root). */
  sourceDirectory: string
  /** Winning glob pattern (without readonly `!` prefix). */
  pattern: string
  /** Winning protection level. */
  level: 'confirm' | 'readonly'
}

export interface ExplainTraceEntry {
  /** Relative path to the `.human` file this rule came from. */
  sourceFile: string
  /** Directory scope of the `.human` file this rule came from. */
  sourceDirectory: string
  /** Path as seen from the `.human` file scope. */
  relativePath: string
  /** Glob pattern for this rule (without readonly `!` prefix). */
  pattern: string
  /** Rule-level protection value from the rule itself. */
  ruleLevel: 'confirm' | 'readonly'
  /** Whether this specific rule matched. */
  matched: boolean
  /** Effective level after evaluating this rule. */
  effectiveLevelAfterRule: ProtectionLevel
}

export interface ExplainResult {
  /** Input file path that was evaluated. */
  path: string
  /** Final resolved protection level. */
  level: ProtectionLevel
  /** Whether at least one rule matched. */
  matched: boolean
  /** Final decisive rule metadata, null when no rules matched. */
  decisiveRule: ExplainDecisiveRule | null
  /** Ordered trace of evaluated rules. */
  trace: ExplainTraceEntry[]
}
