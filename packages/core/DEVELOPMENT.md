# Developing humanfile (core)

This document is for **contributors** working on `packages/core` in the monorepo: npm scripts, local CLI runs, editor QA harnesses, git hooks, and test fixtures. Library API and a short CLI overview for package consumers stay in [README.md](./README.md).

## npm scripts

### Script purpose reference

- `build`: compile library and CLI outputs into `dist/`.
- `test`: run unit and integration tests once (pass `--watch` to vitest for watch mode).
- `configs:build`: regenerate all config templates into `configs/generated/`.
- `configs:check-sync`: verify `configs/generated/*` is in sync with sources.
- `bench`: run synthetic classifier performance benchmark (`test/bench/classify.bench.ts`).
- `qa:prepare-suite`: generate the manual IDE QA suite used for cross-editor acceptance checks.
- `qa:editor:cursor`: local runtime harness for Cursor CLI (`agent`) against `humanfile-ide-qa-suite/repo-under-test`.
- `qa:editor:copilot`: local runtime harness for GitHub Copilot CLI (`copilot`) against the same fixture repo.

```bash
pnpm build
pnpm test
pnpm run configs:build
pnpm bench
```

## Editor runtime QA

From **`packages/core`**:

```bash
pnpm run qa:editor:cursor
pnpm run qa:editor:copilot
```

From the **monorepo root**:

```bash
pnpm --filter humanfile run qa:editor:cursor
pnpm --filter humanfile run qa:editor:copilot
```

These are **local-only**: they need the corresponding CLI installed and authenticated; they are not a substitute for unit tests in CI.

### `qa:editor:cursor`

- **Prerequisites:** Cursor CLI with `agent` on `PATH`, or `HF_CURSOR_AGENT_PATH` pointing at the `agent` binary. See [Cursor CLI installation](https://cursor.com/docs/cli/installation).
- **Outputs** (under `humanfile-ide-qa-suite/editors/cursor/results/`):
  - `compliance-report.json` — structured pass/fail per scenario + evidence paths
  - `artifacts/cursor.log` — raw CLI transcript
- **Exit code:** `0` pass, `1` at least one scenario failed, `2` unsupported (e.g. CLI not runnable), `3` manual-required (if emitted by the harness).

### `qa:editor:copilot`

- **Prerequisites:** GitHub Copilot CLI with `copilot` on `PATH`, or `HF_COPILOT_CLI_PATH`. See [GitHub Copilot CLI](https://github.com/features/copilot/cli).
- **Outputs** (under `humanfile-ide-qa-suite/editors/copilot/results/`):
  - `compliance-report.json`
  - `artifacts/copilot.log`
- **Exit code:** same scheme as Cursor (`0` / `1` / `2` / `3`).

For directory layout, manual prompts, and cross-editor instructions, see [humanfile-ide-qa-suite/README.md](./humanfile-ide-qa-suite/README.md).

## CLI in this workspace

How you invoke the CLI depends on context:

```bash
# From repository root (workspace script)
pnpm humanfile check

# From packages/core (local dev script)
pnpm run humanfile check

# After package install (global/bin resolution)
humanfile check
```

```bash
humanfile check
humanfile explain src/index.ts
humanfile explain --verbose src/index.ts
humanfile init
humanfile install
humanfile guard install --hook pre-commit --mode staged
humanfile guard status
humanfile ls
```

`install` auto-detects a primary editor environment and installs the matching config from `configs/generated/`.

`explain` is inspired by `git check-ignore`: it reports match provenance and can be used in path-focused debugging workflows.

For full command/flag semantics, see [`../../docs/specs/cli-spec.md`](../../docs/specs/cli-spec.md).

### Useful `install` flags

```bash
# Explicit primary environment
humanfile install --env cursor

# Add extra environments without interactive prompt
humanfile install --env cursor --with copilot,claude

# Disable prompt (CI/scripts)
humanfile install --no-prompt

# Preview without writing files
humanfile install --dry-run

# Also install .agents skill template
humanfile install --with-skill
```

### Local guard setup

```bash
# Install a pre-commit guard that checks staged files
humanfile guard install --hook pre-commit --mode staged

# Install both pre-commit and pre-push hooks
humanfile guard install --hook both --mode diff

# Install ai-aware policy (blocks only likely AI-generated protected edits)
humanfile guard install --hook both --mode diff --policy ai-aware --ai-threshold 1200

# Inspect guard status
humanfile guard status

# Uninstall only humanfile-managed hooks
humanfile guard uninstall --hook both
```

**Guard policies**

- `strict`: block whenever protected files are changed.
- `ai-aware` (default): block only when protected files are changed and the AI heuristic is triggered.

When a guard blocks a change, it prints violating files and suggests `humanfile explain <path>` for rule provenance.

## Implementation notes

### What `test/fixtures/classify-all/` is used for

`test/fixtures/classify-all/` provides real directory trees for integration tests. These fixtures exercise parser, loader, and classifier behavior together, including nested `.human` scoping, precedence, and whitespace parsing.

### Generated config policy

`configs/generated/` is intentionally committed and should not be gitignored.
This keeps CLI installs deterministic for end users and allows CI to verify
template drift with `configs:check-sync`.
