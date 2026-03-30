# humanfile (core)

Core library for parsing `.human` files and classifying file protection levels.

## Install

```bash
npm install humanfile
```

## API

```ts
import {
  classify,
  classifyAll,
  collectProtectedViolations,
  discoverRuleSets,
  evaluateAiHeuristic,
  evaluateProtectedChangeSet,
  explain,
  parse,
  ruleSetsForPath,
} from 'humanfile'
```

### `parse(content, directory?)`

```ts
function parse(content: string, directory?: string): HumanRuleSet
```

Parses `.human` content into one scoped rule set.

Parameters:
- `content`: raw `.human` file text.
- `directory`: directory containing the `.human` file, relative to repo root (`""` for root).

Returns:
- `HumanRuleSet` with ordered rules (last matching rule wins inside a rule set).

### `classify(filePath, ruleSets)`

```ts
function classify(filePath: string, ruleSets: HumanRuleSet[]): ProtectionLevel
```

Classifies one repo-relative path.

Parameters:
- `filePath`: repo-relative path using `/` separators.
- `ruleSets`: rule sets ordered from root to deeper directories.

Returns:
- `ProtectionLevel` (`'free' | 'confirm' | 'readonly'`).

### `explain(filePath, ruleSets)`

```ts
function explain(filePath: string, ruleSets: HumanRuleSet[]): ExplainResult
```

Explains why a path resolved to its final level.

Returns:
- `ExplainResult` with:
  - `level`: final protection level.
  - `matched`: whether any rule matched.
  - `decisiveRule`: winning rule metadata or `null`.
  - `trace`: ordered per-rule evaluation trace.

### `classifyAll(repoRoot)`

```ts
function classifyAll(repoRoot: string): Promise<Map<string, ProtectionLevel>>
```

Discovers `.human` files and classifies all files under `repoRoot`.

Returns:
- `Map<path, level>` where keys are repo-relative paths.

### `discoverRuleSets(repoRoot)`

```ts
function discoverRuleSets(repoRoot: string): Promise<HumanRuleSet[]>
```

Discovers and parses all `.human` files under `repoRoot`.

Returns:
- `HumanRuleSet[]` sorted from shallow to deep directory scope.

### `ruleSetsForPath(filePath, ruleSets)`

```ts
function ruleSetsForPath(filePath: string, ruleSets: HumanRuleSet[]): HumanRuleSet[]
```

Filters rule sets to only those whose directory scope applies to the given path. Root-scoped rule sets (directory `""`) apply to all paths.

### `collectProtectedViolations(changedFiles, ruleSets)`

```ts
function collectProtectedViolations(
  changedFiles: ChangedFileStat[],
  ruleSets: HumanRuleSet[],
): ProtectedViolation[]
```

Classifies each changed file and returns only non-`free` entries with their resolved level.

### `evaluateAiHeuristic(changedFiles, threshold, commitMessages?)`

```ts
function evaluateAiHeuristic(
  changedFiles: ChangedFileStat[],
  threshold: number,
  commitMessages?: string[],
): AiHeuristicResult
```

Estimates whether a change set is likely AI-generated based on total line count and commit message signals.

### `evaluateProtectedChangeSet(options)`

```ts
function evaluateProtectedChangeSet(options: {
  changedFiles: ChangedFileStat[]
  ruleSets: HumanRuleSet[]
  aiThreshold: number
  commitMessages?: string[]
}): ProtectedPolicyEvaluation
```

Combines violation collection and AI heuristic evaluation in one call.

## Exported Types

```ts
type ProtectionLevel = 'free' | 'confirm' | 'readonly'

interface HumanRule {
  pattern: string
  level: 'confirm' | 'readonly'
}

interface HumanRuleSet {
  directory: string
  rules: HumanRule[]
}

interface ExplainDecisiveRule {
  sourceFile: string
  sourceDirectory: string
  pattern: string
  level: 'confirm' | 'readonly'
}

interface ExplainTraceEntry {
  sourceFile: string
  sourceDirectory: string
  relativePath: string
  pattern: string
  ruleLevel: 'confirm' | 'readonly'
  matched: boolean
  effectiveLevelAfterRule: ProtectionLevel
}

interface ExplainResult {
  path: string
  level: ProtectionLevel
  matched: boolean
  decisiveRule: ExplainDecisiveRule | null
  trace: ExplainTraceEntry[]
}

interface ChangedFileStat {
  filename: string
  additions: number
  deletions: number
}

interface ProtectedViolation extends ChangedFileStat {
  level: 'confirm' | 'readonly'
}

interface AiHeuristicResult {
  likelyAiGenerated: boolean
  totalLinesChanged: number
}

interface ProtectedPolicyEvaluation {
  violations: ProtectedViolation[]
  likelyAiGenerated: boolean
  totalLinesChanged: number
}
```

For normative behavior specs, see `../../docs/specs/human-file-format.md` and `../../docs/specs/cli-spec.md`.

## Development

### Script Purpose Reference

- `build`: compile library and CLI outputs into `dist/`.
- `test`: run unit and integration tests once (pass `--watch` to vitest for watch mode).
- `configs:build`: regenerate all config templates into `configs/generated/`.
- `configs:check-sync`: verify `configs/generated/*` is in sync with sources.
- `bench`: run synthetic classifier performance benchmark (`test/bench/classify.bench.ts`).
- `qa:prepare-suite`: generate the manual IDE QA suite used for cross-editor acceptance checks.

```bash
pnpm build
pnpm test
pnpm run configs:build
pnpm bench
```

## CLI

How you invoke the CLI depends on context:

```bash
# From repository root (workspace script)
pnpm humanfile check

# From packages/core (local dev script)
pnpm run humanfile check

# After package install (global/bin resolution)
humanfile check
```

```bash
humanfile check
humanfile explain src/index.ts
humanfile explain --verbose src/index.ts
humanfile init
humanfile install
humanfile guard install --hook pre-commit --mode staged
humanfile guard status
humanfile ls
```

`install` auto-detects a primary editor environment and installs the matching config from `configs/generated/`.

`explain` is inspired by `git check-ignore`: it reports match provenance and can be used in path-focused debugging workflows.

For full command/flag semantics, see `../../docs/specs/cli-spec.md`.

Useful install flags:

```bash
# Explicit primary environment
humanfile install --env cursor

# Add extra environments without interactive prompt
humanfile install --env cursor --with copilot,claude

# Disable prompt (CI/scripts)
humanfile install --no-prompt

# Preview without writing files
humanfile install --dry-run

# Also install .agents skill template
humanfile install --with-skill
```

Local guard setup:

```bash
# Install a pre-commit guard that checks staged files
humanfile guard install --hook pre-commit --mode staged

# Install both pre-commit and pre-push hooks
humanfile guard install --hook both --mode diff

# Install ai-aware policy (blocks only likely AI-generated protected edits)
humanfile guard install --hook both --mode diff --policy ai-aware --ai-threshold 1200

# Inspect guard status
humanfile guard status

# Uninstall only humanfile-managed hooks
humanfile guard uninstall --hook both
```

Guard policies:

- `strict`: block whenever protected files are changed.
- `ai-aware` (default): block only when protected files are changed and the AI heuristic is triggered.

When a guard blocks a change, it prints violating files and suggests `humanfile explain <path>` for rule provenance.

## Implementation Notes

### What `test/fixtures/classify-all/` is used for

`test/fixtures/classify-all/` provides real directory trees for integration tests. These fixtures exercise parser, loader, and classifier behavior together, including nested `.human` scoping, precedence, and whitespace parsing.

### Generated Config Policy

`configs/generated/` is intentionally committed and should not be gitignored.
This keeps CLI installs deterministic for end users and allows CI to verify
template drift with `configs:check-sync`.
