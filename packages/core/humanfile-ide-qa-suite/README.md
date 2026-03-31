# humanfile IDE QA suite

This directory contains **local-only** QA harnesses for testing whether editors/agents follow the `humanfile` contract (for example, Cursor Agent mode respecting `.human` boundaries).

## Directory layout

- **`editors/`**: one directory per editor (preferred layout).
  - **`editors/cursor/run.ts`**: Cursor runtime runner. Uses Cursor CLI `agent` in headless mode when enabled.
  - **`editors/cursor/results/`**: Cursor-specific generated outputs (ignored by git, except `results/README.md`).
  - **`editors/copilot/run.ts`**: GitHub Copilot runtime runner. Uses GitHub Copilot CLI `copilot` in non-interactive mode.
  - **`editors/copilot/results/`**: Copilot-specific generated outputs (ignored by git, except `results/README.md`).
- **`repo-under-test/`**: a small, deterministic repo used as the workspace for runtime runs.
  - Includes a `.human` plus `src/`, `docs/specs/`, and `LICENSE` so we can exercise `free` vs `confirm` vs `readonly`.
- **`instructions/`**: human-readable docs for **manual** IDE QA across editors (fallbacks, expected vs incorrect behavior, prompts). See `instructions/README.md`.

## Quick start: Cursor automated runtime check

Prerequisites:

- Install Cursor CLI so `agent` is available. See [Cursor CLI installation](https://cursor.com/docs/cli/installation).
- Ensure `~/.local/bin` is on your `PATH` (or set `HF_CURSOR_AGENT_PATH` to the absolute path of `agent`).
- Verify with `agent --version`.

From repo root, after installing Cursor CLI:

```bash
pnpm --filter humanfile run qa:editor-modes:cursor
```

Outputs:

- `editors/cursor/results/compliance-report.json` (structured pass/fail + evidence pointers)
- `editors/cursor/results/artifacts/cursor.log` (raw Cursor CLI output)

## Quick start: Copilot automated runtime check

Prerequisites:

- Install GitHub Copilot CLI so `copilot` is available. See [GitHub Copilot CLI](https://github.com/features/copilot/cli).
- Ensure `copilot --version` works (or set `HF_COPILOT_CLI_PATH` to the absolute path of `copilot`).
- Authenticate Copilot CLI per its setup instructions.

From repo root, after installing Copilot CLI:

```bash
pnpm --filter humanfile run qa:editor-modes:copilot
```

Outputs:

- `editors/copilot/results/compliance-report.json` (structured pass/fail + evidence pointers)
- `editors/copilot/results/artifacts/copilot.log` (raw Copilot CLI output)

Exit codes from the runner:

- `0`: overall pass
- `1`: at least one scenario failed
- `2`: unsupported (Cursor CLI not runnable)
