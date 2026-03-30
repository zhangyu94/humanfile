---
created: "20260330"
completed: "20260330"
---

# CLI Spec Contract Coverage Expansion

## Goal

- Add test coverage that enforces key behavior in the CLI specification for check and explain commands.
- Detect future drift between documented CLI contracts and runtime behavior early.

## Problem

- Current tests cover parser, classifier, policy, and several CLI-related modules, but do not fully enforce all behavior described in docs/specs/cli-spec.md.
- Contract-level options and output mode constraints for check and explain have limited direct tests.

## Context

- CLI contracts are defined in docs/specs/cli-spec.md.
- Implementation is in packages/core/src/cli/check.ts and packages/core/src/cli/explain.ts.
- Existing test suite is strong, but command-flag matrix coverage can be extended.

## Approach

- Add contract-oriented CLI tests that map directly to spec behaviors.
- Use stable fixture-driven scenarios for flags and exit-code behavior.
- Keep tests focused on externally visible semantics, not internal implementation details.

## Steps

1. Define a compact scenario matrix from the spec for:
   - check command: json, level filtering, explain requirements, exit-code semantics
   - explain command: stdin handling, quiet/json conflict, z/verbose conflict, non-matching behavior
2. Implement tests that execute CLI commands in controlled fixture repositories.
3. Add assertions for both output shape and process exit code where specified.
4. Add a lightweight maintenance note linking each scenario group to relevant spec sections.

## Validation

- pnpm build
- pnpm lint
- pnpm test
- Verify new contract tests fail when behavior is intentionally perturbed

## Risks and Mitigations

- Risk: tests become brittle due to exact string matching.
  - Mitigation: assert stable structural fragments and exit codes rather than full message snapshots when possible.
- Risk: overlap with existing tests increases maintenance noise.
  - Mitigation: keep this suite contract-focused and avoid duplicating parser/classifier unit assertions.
