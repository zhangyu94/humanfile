---
created: "20260330"
---

# Programmatic Editor Mode Compliance Testing

## Goal

- Add repeatable, programmatic tests that verify behavior in [editor-modes-and-expected-behavior.md](../../specs/editor-modes-and-expected-behavior.md) for every editor environment supported by `humanfile install`.
- Produce machine-readable evidence for compliance decisions (pass/fail + rationale).
- Reduce dependence on manual-only QA while keeping a fallback path for editors without stable automation surfaces.

## Scope

- In scope:
  - Copilot, Cursor, Claude Code, Windsurf, Cline, Codex (the same set targeted by `humanfile install`).
  - Mode-level behavior checks against normative invariants (`free`, `confirm`, `readonly`, interactive approval, autonomous session consent).
  - CI-runnable tests for deterministic portions only; runtime editor checks run locally by developers.
- Out of scope (initially):
  - Full UI-level pixel/interaction testing inside proprietary editor desktops.
  - Full cross-editor runtime execution in CI (blocked by editor installation/automation constraints).
  - Long-lived secrets management beyond local developer environment variables.

## Context

- Current coverage is primarily manual in `packages/core/humanfile-ide-qa-suite/instructions/`.
- Generated install artifacts already encode policy instructions per editor in `packages/core/configs/generated/*`.
- The spec in `docs/specs/editor-modes-and-expected-behavior.md` defines stable invariants and a mode matrix but is not yet enforced by a single automated contract test suite.

## Approach

Build a two-layer compliance framework:

1. Spec Contract Layer (deterministic, CI-required)
   - Convert editor mode expectations from the spec into a canonical machine-readable fixture (editor, mode, capabilities, expected outcomes).
   - Add tests that validate generated install outputs include required behavior constraints for each editor/mode mapping.
   - Add policy simulation tests that execute scripted edit intents (`free`, `confirm`, `readonly`) and assert expected decisions under interactive vs autonomous consent models.

2. Runtime Adapter Layer (local-required)
   - Define an adapter interface per editor for executing standardized prompt scenarios against `repo-under-test` and collecting outcomes.
  - Implement adapters where stable automation exists first; mark others as `manual-required` with structured evidence placeholders.
   - Emit a unified JSON report (`compliance-report.json`) consumed by tests/docs.
  - Treat local execution as the authoritative runtime signal for editor-mode adherence.

## Deliverables

- Canonical compliance matrix fixture (source of truth for test cases).
- New test package/module that:
  - validates spec-to-generated-artifact consistency,
  - validates policy behavior invariants by simulation,
  - validates runtime adapter report schema.
- CLI/test runner command (for example `pnpm run qa:editor-modes`) to run deterministic checks and optionally integration adapters.
- Updated QA docs describing:
  - which checks are strict CI gates,
  - which checks are local-only runtime checks,
  - how to interpret/report drift.

## Local Execution Contract

This section defines the contributor-facing contract so local runtime checks are run consistently and produce comparable evidence.

1. Commands
  - Deterministic contract checks (CI and local): `pnpm --filter humanfile test -- editor-modes-contract`
  - Local runtime adapters (developer machine only): `pnpm --filter humanfile run qa:editor-modes:local`
  - Combined local verification (pre-PR): `pnpm --filter humanfile run qa:editor-modes:all`

2. Output locations
  - Deterministic checks may print to stdout only.
  - Runtime adapters must write JSON to: `packages/core/humanfile-ide-qa-suite/results/compliance-report.json`
  - Optional raw logs/screenshots should be stored under: `packages/core/humanfile-ide-qa-suite/results/artifacts/`

3. Required report schema fields
  - `specVersion`: string identifying the matrix/spec revision under test.
  - `generatedAt`: ISO timestamp.
  - `runner`: local machine metadata (os, node version, package version).
  - `results[]`: list of scenario outcomes with:
    - `editor`
    - `mode`
    - `scenarioId`
    - `expected`
    - `observed`
    - `status` (`pass` | `fail` | `manual-required` | `unsupported`)
    - `evidence` (log path, screenshot path, or transcript reference)

4. Pull request evidence policy
  - CI status is authoritative only for deterministic contract checks.
  - Changes affecting editor-mode behavior must include local runtime evidence summary in the PR description.
  - If an editor is `manual-required`, PR must include explicit checklist outcome rather than inferred pass.

5. Failure policy
  - Any deterministic contract failure blocks merge.
  - Runtime `fail` results block behavior-changing PRs unless explicitly waived with maintainer sign-off.
  - Runtime `manual-required` does not block by itself, but missing evidence does.

## Steps

1. Define compliance data model and fixtures
   - Introduce typed fixture format for editor + mode + expected behavior.
   - Seed fixture from current mode matrix and invariants in the spec.

2. Implement deterministic contract tests
   - Assert every `humanfile install` target has fixture coverage.
   - Assert generated config artifacts contain required semantic instructions (pre-write check, `readonly` prohibition, `confirm` handling).
   - Assert invariant-level policy simulation for interactive/autonomous consent.

3. Build adapter harness and report schema
   - Add standard scenario set (attempt `readonly` edit, `confirm` edit with/without consent, `free` edit).
   - Define report schema: editor, mode, scenario, observed result, expected result, pass/fail, evidence link/log.

4. Add initial adapters and fallback policy
   - Implement adapters for environments with scriptable execution paths first.
   - For non-scriptable paths, emit `manual-required` status with deterministic checklist IDs, not silent pass.

5. Wire commands and CI behavior
   - Add split commands:
  - deterministic contract tests (required in CI),
  - runtime adapters (local-only; explicitly skipped in CI),
  - combined local verification for contributor workflows.
   - Fail CI on deterministic regressions.
   - Keep local runtime reports as attachable review artifacts for pull requests.

6. Documentation and rollout
   - Update spec references if terminology needs normalization.
   - Update QA instructions to point to programmatic runner and evidence files.
   - Keep manual QA as fallback until adapter coverage is acceptable.

## Editor-Specific Runtime Adapter Plans

This plan defines the shared, cross-editor framework. Editor-specific runtime automation plans are tracked separately:

- Cursor via Cursor CLI: `docs/plans/completed/20260331-test-editor-modes-cursor-programmatic-compliance.md`
- GitHub Copilot via Copilot CLI: `docs/plans/completed/20260331-test-editor-modes-copilot-programmatic-compliance.md`

## Validation

- For every editor supported by `humanfile install`, deterministic tests prove matrix coverage and invariant conformance.
- Deterministic suite is green in CI and fails on intentional rule regressions.
- Runtime adapter reports are schema-valid and comparable across local runs.
- Drift between spec and generated configs is detected automatically in pull requests.

## Risks And Mitigations

- Vendor mode drift or renamed modes
  - Mitigation: keep fixture names decoupled from display names and map aliases explicitly.
- Limited editor automation APIs
  - Mitigation: local-first adapter status model (`automated-local`, `manual-required`, `unsupported`) with explicit evidence requirements.
- Non-reproducible CI environments for proprietary editor runtimes
  - Mitigation: keep CI scope deterministic and require local compliance report artifacts for runtime checks.
- False confidence from instruction-text assertions
  - Mitigation: combine artifact checks with policy simulation and runtime evidence where possible.

## Open Questions

- Should deterministic matrix fixtures live under `docs/specs/` (normative) or under test fixtures (implementation-owned)?
- Which adapters are realistic for reliable local automation in this repository?
- Do we want a single aggregated compliance score, or strict per-scenario pass/fail reporting only?
