---
created: "20260325"
---

# Inline Source Annotations for Function-Level Ownership

## Goal

- Define a feature that lets developers annotate source code comments to mark specific functions or blocks as human-maintained.
- Preserve `.human` as the primary ownership model while enabling finer-grained ownership in mixed files.
- Ensure behavior is explainable, deterministic, and safe for agent tooling.

## Context

- Current ownership controls are file-path based through `.human` files.
- Teams often have mixed files where only specific functions should require confirmation or be read-only.
- A comment-based annotation can improve precision, but creates risks around stale metadata, language-specific parsing, and rule conflicts.

## Non-Goals

- Do not replace `.human` file semantics.
- Do not add annotation support for every language in the first release.
- Do not implement automated migration from file-level policy to inline policy in this phase.

## Proposed Behavior

- Inline annotations are optional and additive.
- `.human` remains source of truth for broad policy; inline rules can narrow behavior inside a file.
- Precedence for any location in a file:
    1. `readonly` from `.human` or inline annotation
    2. Inline `confirm`
    3. `.human` `confirm`
    4. `free`
- Rules should be evaluated deterministically and surfaced by `humanfile explain` output.

## Proposed Annotation Format (Draft)

- Primary form (line comment on declaration):
    - TypeScript/JavaScript: `// humanfile: confirm` or `// humanfile: readonly`
- Optional block form for multi-line declarations:
    - `/* humanfile: confirm */`
- Supported levels in v1:
    - `confirm`
    - `readonly`
- Any unknown level is ignored and reported as a validation warning.

## Scope (v1)

- Language support:
    - TypeScript and JavaScript in `packages/core` and `packages/action`.
- Targeted declaration kinds:
    - Function declarations
    - Function expressions assigned to variables
    - Arrow functions assigned to variables
    - Class methods
- Comment applies to the nearest following declaration within a small bounded range.

## Architecture Changes

- Parser layer:
    - Add annotation extraction API that returns declaration span + policy level.
    - Use AST-based parsing for JS/TS to avoid fragile regex matching.
- Classifier layer:
    - Merge inline classification with existing `.human` result based on precedence rules.
- Explain layer:
    - Include inline match provenance (annotation text, location, and resolved rule).
- CLI:
    - Existing `humanfile explain` displays resolved precedence path.
    - Add optional `humanfile validate-annotations` command (or equivalent flag) to report invalid/stale annotations.

## Detailed Steps

1. Finalize annotation grammar and precedence spec in docs.
2. Implement JS/TS annotation extractor with declaration span mapping.
3. Integrate extractor into classifier decision pipeline.
4. Extend explain output to include inline rule provenance.
5. Add validation command/flag for malformed or stale annotations.
6. Add tests:
    - Unit tests for parsing and precedence resolution
    - Integration tests for mixed `.human` + inline scenarios
    - CLI snapshot tests for explain/validation output
7. Update README and spec docs with examples and caveats.

## Test Plan

- Parser tests:
    - Valid comment forms map to expected declaration spans.
    - Invalid comments generate warnings but do not crash.
- Classifier tests:
    - Precedence matrix across `.human` and inline combinations.
    - Nested scope and adjacent declaration edge cases.
- CLI tests:
    - `explain` includes source-level provenance.
    - Validation command reports line/file diagnostics.

## Risks and Mitigations

- Stale annotations after refactors:
    - Mitigation: validation command and clear diagnostics.
- Language/AST edge cases:
    - Mitigation: scope v1 to JS/TS and known declaration shapes.
- Performance overhead on large repos:
    - Mitigation: parse only candidate files, cache AST results, benchmark before default-on behavior.
- Rule confusion for users:
    - Mitigation: explicit precedence docs and explain output examples.

## Rollout Plan

- Phase 1: Advisory mode behind opt-in CLI/config flag.
- Phase 2: Default-on advisory once stable in real projects.
- Phase 3: Enable strict enforcement mode for agents that consume classifier results.

## Open Questions

- Exact bounded-range rule for attaching comments to declarations.
- Whether inline annotations should support ownership identity (for example, person/team labels) in v1.
- Whether validation should run as a standalone command or as part of existing checks.
- How to represent annotations in non-JS/TS ecosystems without inconsistent syntax.

## Success Criteria

- Teams can protect specific functions in mixed files without over-scoping entire files.
- Explain output makes inline + `.human` decisions transparent.
- Validation catches malformed/stale annotations with actionable diagnostics.
- No measurable regression in baseline classifier performance for repositories without annotations.
