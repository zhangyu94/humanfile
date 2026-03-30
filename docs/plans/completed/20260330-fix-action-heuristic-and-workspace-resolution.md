---
created: "20260330"
completed: "20260330"
---

# Action Heuristic and Workspace Resolution Reliability

## Goal

- Remove duplicated AI heuristic evaluation paths in the GitHub Action.
- Ensure workspace resolution is explicit and fails safely when runtime assumptions are invalid.
- Align action implementation details with published behavior contracts.

## Problem

- The action evaluates protected changes and then computes heuristic data again, creating avoidable duplication and drift risk.
- Workspace discovery currently falls back to process working directory, which can hide misconfiguration by silently skipping checks.
- Error messages for workspace-related setup failures can be clearer and more actionable.

## Context

- Action logic lives in packages/action/src/main.ts.
- Policy evaluation logic is already centralized in packages/core/src/policy.ts.
- The action is expected to be deterministic for CI users and avoid ambiguous skip behavior.

## Approach

- Treat evaluateProtectedChangeSet as the single source for both violation and heuristic outputs.
- Tighten workspace validation so runtime path expectations are explicit.
- Preserve backwards compatibility for successful flows while improving failure/skip diagnostics.

## Steps

1. Refactor action result construction to consume heuristic outputs from evaluateProtectedChangeSet directly.
2. Add workspace resolution helper that validates candidate path and produces explicit guidance when invalid.
3. Add or update tests for:
   - heuristic single-source behavior
   - missing or invalid workspace path handling
   - unchanged behavior for normal pull request events
4. Update action docs/spec if externally observable behavior changes.

## Validation

- pnpm build
- pnpm lint
- pnpm test
- Focused verification of packages/action/test/e2e.test.ts scenarios for workspace and heuristic behavior

## Risks and Mitigations

- Risk: stricter workspace checks could break edge setups.
  - Mitigation: provide explicit fallback policy and actionable error messaging.
- Risk: refactor changes output text used by downstream assertions.
  - Mitigation: keep message contracts stable unless intentionally revised and documented.
