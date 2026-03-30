# Architecture

## Package Layout

```
humanfile/
├── packages/
│   ├── core/             # npm library + CLI: parse .human files, classify paths
│   │   └── configs/      # Agent config templates + generated outputs
│   └── action/           # GitHub Action: PR review against .human boundaries
├── .cursor/rules/        # Cursor rule (.mdc)
├── .agents/skills/       # Portable agent skill (SKILL.md)
├── docs/                 # Structured knowledge base (harness engineering style)
└── .github/workflows/    # CI, release, and dogfood workflows
```

## Dependency Graph

```
packages/action ──depends-on──► packages/core (humanfile)
.cursor/rules/                  (Cursor rule, no code deps)
.agents/skills/humanfile/       (portable agent skill, no code deps)
```

The GitHub Action imports the core library as a workspace dependency.
The Cursor rule assets are purely declarative guidance files.

## packages/core

The core library answers one question: **given a file path, what is its protection level?**

```
src/
├── types.ts       # ProtectionLevel, HumanRule, HumanRuleSet
├── parser.ts      # parse(): .human file content → HumanRuleSet
├── classifier.ts  # classify(): file path × rule sets → ProtectionLevel
├── loader.ts      # classifyAll(), discoverRuleSets(): repo-wide operations
├── policy.ts      # collectProtectedViolations(), evaluateAiHeuristic(): violation + AI heuristic
├── index.ts       # Public API barrel export
├── cli.ts         # CLI entry point (humanfile command)
└── cli/
    ├── check.ts    # humanfile check — classify files
    ├── explain.ts  # humanfile explain — rule provenance and trace
    ├── guard.ts    # humanfile guard — local git hook management
    ├── init.ts     # humanfile init — create starter .human file
    ├── install.ts  # humanfile install — agent-config installer
    └── ls.ts       # humanfile ls — list .human files
```

Key design decisions:
- Uses the `ignore` npm package for `.gitignore`-compatible glob matching
- Extends with `!` prefix semantics for readonly level
- Last-match-wins within a rule set; deeper rule sets override shallower ones
- Pre-compiled `ignore` instances cached via WeakMap for performance
- Zero Node.js API usage in parser/classifier (pure functions); loader uses `fs`
- CLI is a separate build entry point (`cli.ts`), published via `bin` field

## packages/action

A GitHub Action that runs on `pull_request` events.

```
src/
├── types.ts       # ChangedFile, Violation, AnalysisResult
├── diff.ts        # Fetch changed files from GitHub API
├── heuristic.ts   # Estimate if PR is AI-generated
├── comment.ts     # Build markdown PR comment
└── main.ts        # Action entry point
```

Flow: discover rule sets → fetch PR diff → classify each changed file → apply AI heuristic → post/update/delete PR comment.

## Agent Guidance

Declarative agent guidance — no runtime code.

- `.cursor/rules/humanfile.mdc` — Cursor rule (always-on, applies to all files)
- `.agents/skills/humanfile/SKILL.md` — Portable agent skill
- `packages/core/configs/` — Ready-to-copy templates generated from a single source (`_source.md`)

## Testing Strategy

- **Unit tests** in `packages/core/test/` cover parsing and classification
- **Unit tests** in `packages/action/test/` cover heuristic and comment generation
- All tests use Vitest
