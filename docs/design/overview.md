# Design Overview

## What .human Is (and Isn't)

A `.human` file declares files where a human takes responsibility.
This does not mean those files must be entirely hand-written.
A human may use AI assistance to edit a `confirm` file and then verify the result.
The point is that a human has declared ownership and wants to be in the loop.

`.human` serves three purposes:

1. Guiding agents. Agents learn which files to ask about and which to leave alone, reducing accidental overwrites.
2. Informing source of truth. When an agent encounters conflicting information in a repository, files marked in `.human` should be treated as authoritative.
3. Protecting human motivation. Without boundaries, developers become reluctant to invest effort in manual editing. `.human` preserves the incentive to maintain code carefully by making ownership explicit.

For underlying principles (human ownership, convention over configuration, defense in depth), see [core-beliefs.md](./core-beliefs.md).

For normative contracts, see [../SPECS.md](../SPECS.md).

## Key Design Decisions

### Why `.gitignore` syntax?

Every developer already knows it.
Glob patterns are expressive enough for file-level ownership without over-engineering.
The `ignore` npm package provides battle-tested matching semantics.

### Why `!` for readonly?

The `!` prefix is visually concise and maps cleanly to a stronger protection level.
It avoids semantic conflict with `.gitignore` because `.human` is a different policy domain.

Use `!` (`readonly`) sparingly.
If too many files are marked readonly, agents
cannot update them even when information becomes stale.
For most files, `confirm` is the better default.

### Why last-match-wins?

This matches `.gitignore` mental models and supports broad-to-specific rules.

```text
src/          # confirm everything in src
!src/config/  # but config is readonly
```

### Why keep CLI in the core package?

The CLI adds small runtime dependencies, but `npx humanfile` works immediately without additional package selection.
This mirrors influential TypeScript tools that ship both library and CLI from one package for lower onboarding friction.
