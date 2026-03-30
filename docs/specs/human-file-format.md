# .human File Format Specification

## Overview

A `.human` file declares which files in a repository a human takes responsibility for.
This guides AI coding agents to respect ownership boundaries and treat these files as authoritative sources of truth.

Declaring a file in `.human` does not mean it must be entirely hand-written.
It means a human has claimed ownership and wants to be in the loop when changes are made.

## Syntax

The format mirrors `.gitignore` with one extension: the `!` prefix.

### Comments and Blank Lines

```
# This is a comment
# Blank lines are ignored

core/
```

Lines starting with `#` and blank lines are ignored.

### Whitespace and Bare `!`

- Leading and trailing whitespace on each line is trimmed before parsing.
- A line containing only `!` (no pattern after trimming) is ignored.
- A `!` rule is valid only when a non-empty pattern follows it.

### Protection Levels

| Syntax        | Level      | Meaning                                                          |
| ------------- | ---------- | ---------------------------------------------------------------- |
| `pattern`     | `confirm`  | Agent must obtain explicit approval before editing matched files |
| `!pattern`    | `readonly` | Agent must not edit matched files                                |
| _(unmatched)_ | `free`     | Agent may edit without restriction                               |

Approval for `confirm` may be satisfied through interactive per-edit confirmation,
or through explicit session-level consent in fully autonomous modes.

### `!` Prefix vs `.gitignore` Negation

In standard `.gitignore`, a `!` prefix negates a previous ignore rule (re-includes a file).
In `.human`, `!` has a **different meaning**: it marks a pattern as `readonly`.
The globbing engine is `.gitignore`-compatible, but the `!` semantics are specific to humanfile.

### Glob Patterns

Patterns follow `.gitignore` globbing rules:

| Pattern        | Matches                                |
| -------------- | -------------------------------------- |
| `core/`        | Everything inside the `core` directory |
| `*.config.ts`  | Any `.config.ts` file at any depth     |
| `**/*.test.ts` | Any `.test.ts` file at any depth       |
| `src/index.ts` | Exactly `src/index.ts`                 |
| `docs/**`      | Everything inside `docs` recursively   |

### Precedence

**Last match wins** within a single `.human` file:

```
src/          # confirm everything in src/
!src/config/  # override: config/ is readonly
```

For `src/config/db.ts`, the `readonly` rule wins because it appears last.

### Directory Scoping

`.human` files can exist in any directory.
Each file's patterns are scoped to its containing directory, similar to how `.gitignore` works.

When multiple `.human` files apply to a path (ancestor directories), they are evaluated from shallowest to deepest.
**Deeper rule sets take precedence.**

```
repo/
├── .human          # root-level rules
├── src/
│   └── .human      # src-specific rules (overrides root for src/ files)
```

### Discovery Limitation

`.human` files located inside directories excluded by the root `.gitignore` are **not** discovered.
The discovery walk applies `.gitignore` filtering before reading `.human` files.
See [core-library-api-spec.md](./core-library-api-spec.md) `discoverRuleSets` for details.

## Best Practices

- **Prefer `confirm` over `readonly`** for most files. `confirm` lets agents propose changes with your approval. `readonly` blocks all changes.
- **Use `readonly` sparingly.** If too many files are marked `!`, agents cannot update them even when the information becomes stale. Reserve `!` for files requiring human oversight on every change (e.g., LICENSE, security policies).
- **Start small.** A `.human` file with 2-3 patterns is enough. You can always add more patterns as you identify files that need protection.

## Examples

### Minimal (recommended starting point)

```
# Human takes responsibility for specs and license
docs/specs/
LICENSE
```

### With readonly for truly critical files

```
# Agent should get approval before editing these
docs/specs/

# Agent must not touch these at all (use sparingly)
!LICENSE
!SECURITY.md
```
