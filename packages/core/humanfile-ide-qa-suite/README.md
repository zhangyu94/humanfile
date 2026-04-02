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

## Running the automated harnesses

The `pnpm` scripts are defined on the **`humanfile`** package (`packages/core/package.json`). **Commands, prerequisites, output paths, and exit codes** are documented in:

- [`../DEVELOPMENT.md`](../DEVELOPMENT.md) → **Editor runtime QA**
