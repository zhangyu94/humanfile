---
created: "20260402"
---

# Fix Cursor QA reporting when agent command fails

## Problem

`pnpm qa:editor:cursor` can print `OVERALL=pass` even when Cursor CLI agent runs fail (non‑zero exit + stderr). This happens because the adapter currently grades confirm/readonly scenarios primarily by **“file unchanged”**, which is true even when the agent failed to run.

Example failure mode:
- stderr: “You’re out of usage…”
- exit_ok: false
- file unchanged → currently reported as `pass`

This produces misleading summaries and hides real runtime failures.

## Goals

- A scenario must **not** be reported as `pass` when the agent command failed to execute (non‑zero exit).
- Summary (`OVERALL=...`) must reflect that reality (fail/unsupported/manual).
- Improve evidence so it is obvious *why* a scenario failed (stderr + exit status).

## Non-goals

- Perfectly classify every possible Cursor CLI failure string across versions.
- Make Cursor CLI agent always runnable in constrained environments (quota, auth, etc.).

## Plan

### Reporting changes

- In `packages/core/humanfile-ide-qa-suite/editors/cursor/run.ts`, for each scenario:
  - If `out.ok === false`:
    - Set status to **`fail`** by default and set `observed` to include a short failure reason derived from stderr/stdout (trimmed).
    - Optionally, detect known “environment not runnable” strings (e.g. “You’re out of usage”, auth missing) and mark **`unsupported`** instead of `fail` to keep semantics clear.
  - Only apply the current “did the file change” grading when `out.ok === true`.

- Ensure `printSummary` remains accurate automatically via `overallFromStatuses`.

### Fix failing cases (if possible)

- Investigate if Cursor CLI agent can be made runnable in this environment:
  - Confirm `agentCommand()` path resolution works.
  - Check whether the stderr is due to auth/quota; if it’s quota, it’s not fixable in code.
  - If fixable (e.g. wrong binary/path), adjust `HF_CURSOR_AGENT_PATH` handling or invocation flags.

### Validation

- Re-run `pnpm qa:editor:cursor`.
- Expect:
  - When stderr indicates the agent failed to run, report shows `fail` (or `unsupported`, if we implement that mapping).
  - `OVERALL` matches statuses (no “pass” when scenarios failed to execute).

