---
created: "20260331"
completed: "20260331"
---

# Test: Cursor Editor Mode Programmatic Compliance

## Goal

- Extract the **Cursor** portion of `test-editor-modes-programmatic-compliance.md` into a focused plan.
- Implement Cursor compliance in two layers:
  - **Deterministic contract layer (CI-suitable):** verify generated Cursor config matches the editor-mode spec.
  - **Runtime behavior layer (local-only):** collect evidence of how Cursor Agent behaves in practice on `free/confirm/readonly` scenarios.

## Scope

- In scope:
  - Cursor agent integration only (as installed by `humanfile install --env cursor`).
  - Deterministic checks (CI-suitable) that validate:
    - Cursor-specific expectations in `docs/specs/editor-modes-and-expected-behavior.md` are reflected in
      `packages/core/configs/generated/cursor/.cursor/rules/humanfile.mdc`.
    - High-level behavior invariants (free/confirm/readonly, per-edit confirmation) are captured as a machine-readable contract.
  - Local runtime evidence capture that produces a structured JSON report (not a CI gate).
- Out of scope (for this plan):
  - Copilot, Claude Code, Windsurf, Cline, Codex.
  - Fully automated UI driving of the Cursor desktop app (no stable vendor automation surface today).

## Approach

1. **Add deterministic contract tests for Cursor**
   - New test file: `packages/core/test/editor-modes-cursor.contract.test.ts`.
   - Tests should:
     - load the Cursor fixture,
     - read `packages/core/configs/generated/cursor/.cursor/rules/humanfile.mdc`,
     - assert that key invariants from the fixture/spec are present in the generated config, for example:
       - `.human` is described as the source of truth for free/confirm/readonly.
       - Cursor **Agent mode** always requires per-edit confirmation on `confirm` and `readonly` paths (no autonomous override).
       - guidance includes running `humanfile check <path> --json` (or equivalent) before edits on protected paths.

2. **Wire into CI**
   - Extend the existing `pnpm test` pipeline to include the new cursor contract test file.
   - Add a convenience script in `packages/core/package.json` (if needed), e.g.:
     - `"test:editor-modes:cursor": "vitest test/editor-modes-cursor.contract.test.ts"`.

3. **Add a local runtime evidence harness (Cursor)**
   - Add a local-only runner that supports two modes:
     - **Cursor CLI mode (preferred, programmatic):** invoke Cursor’s CLI agent (`agent`) to run scenarios against a repo-under-test.
       - Reference: [Cursor CLI overview](https://cursor.com/docs/cli/overview)
       - Gate behind env flags so CI does not try to run it.
     - **Manual mode (fallback):** write prompts and a transcript placeholder, marked `manual-required`.
   - The runner must write a structured report to:
     - `packages/core/humanfile-ide-qa-suite/results/compliance-report.json`
   - Add a test that validates the report **schema** (opt-in locally; skipped in CI by default).

4. **Document Cursor-specific outcome**
   - Keep the parent plan (`test-editor-modes-programmatic-compliance.md`) as the umbrella.

## Steps

- [x] Add `editor-modes-cursor.contract.test.ts` in `packages/core/test/`:
  - [x] Assert presence of invariants from `docs/specs/editor-modes-and-expected-behavior.md`.
- [x] Wire the new test into the `packages/core` test scripts (and thus CI).
- [x] Run tests locally and ensure they pass.
- [x] Add local runtime harness for Cursor that writes `packages/core/humanfile-ide-qa-suite/editors/cursor/results/compliance-report.json`.
- [x] Add Cursor CLI support to the runtime harness:
  - [x] Detect `agent` on PATH; if missing, mark scenarios as `unsupported` with a clear message.
  - [x] When enabled, run scripted scenarios via `agent` and capture logs as evidence.
- [x] Add a report schema test that is opt-in locally (skipped in CI by default).

## Validation

- New tests fail if:
  - the Cursor spec changes without updating the fixture, or
  - the generated Cursor config drifts from the expected invariants.
- New tests pass in CI for the current configuration.
- Local runtime report can be produced and attached to PRs when behavior changes.
- The plan remains self-contained and does not block future work on other editors.

