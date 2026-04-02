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

## CLI

The `humanfile` binary ships with the package. Common commands:

```bash
humanfile check <path>
humanfile explain <path>
humanfile init
humanfile install
humanfile ls
```

For every subcommand, flag, and JSON output shape, see [`../../docs/specs/cli-spec.md`](../../docs/specs/cli-spec.md).

**Developing this package** (build/test scripts, editor QA harnesses, running the CLI from the monorepo, guard hooks): see [DEVELOPMENT.md](./DEVELOPMENT.md).
