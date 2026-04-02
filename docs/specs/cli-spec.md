# CLI Specification

## Overview

This document defines the stable command-line behavior for the `humanfile` CLI as implemented in `packages/core/src/cli.ts` and command modules under `packages/core/src/cli/`.

## Command Surface

Top-level subcommands:
- `check`
- `explain`
- `guard`
- `init`
- `install`
- `ls`

## Global Flags

| Flag           | Behavior                                                |
| -------------- | ------------------------------------------------------- |
| `--version`    | Print the package version from `package.json` and exit. |
| `--help`, `-h` | Print usage information and exit (citty standard).      |

## Shared Behavior

- Working directory defaults to current process directory.
- Commands that discover rules use `.human` files rooted at current working directory.
- Exit codes:
    - `0` for successful execution with no spec violations.
    - `1` for explicit validation failures or policy-triggered non-zero modes.

## check

### Purpose

Classify files by protection level (`free`, `confirm`, `readonly`).

### Positional

- `path` (optional): classify one path; if omitted, classify repository files.

### Flags

- `--json`: output JSON.
- `--level <free|confirm|readonly>`: filter output in repo-wide mode.
- `--exit-code`: return non-zero when protected files are present.
- `--explain`: explain a single-path classification.

### Single-path JSON output shape

When `--json` is used with a single `path` (non-`--explain`):

```json
{ "path": "<filePath>", "level": "free|confirm|readonly" }
```

When `--json --explain` is used with a single `path`, the output is the full `ExplainResult` object (see `explain` section).

### Behavioral Notes

- If no `.human` files are discovered:
    - JSON mode returns `{ "error": "No .human files found" }`.
    - text mode prints guidance to run `humanfile init`.
    - Exit code is `0` (no policy violation).
- `--explain` requires a single `path`; without `path`, command exits non-zero.
- In repo-wide mode, output is ordered by level priority: readonly, confirm, free.
- `--level` filters the repo-wide result set after classification. Unknown level values exit non-zero with an error message.
- With `--exit-code` in repo-wide mode, non-zero is based on the visible result set.

## explain

### Purpose

Explain why a path resolved to a specific protection level with provenance.

### Input Modes

- Positional path arguments.
- `--stdin` for stream input.

### Flags

- `--json`: structured output.
- `--verbose` or `-v`: include rule-by-rule trace.
- `--quiet` or `-q`: status-only mode (no payload output).
- `--non-matching` or `-n`: include unmatched (`free`) records.
- `-z`: NUL-delimited input/output mode.

### Flag Constraints

- `--quiet` cannot be combined with `--json`.
- `-z` cannot be combined with `--verbose`.

### JSON output shape

- Single matched path: returns an `ExplainResult` object directly.
- Multiple paths or `--non-matching`: returns an array of `ExplainResult` objects.
- When the filtered result set is empty (all paths unmatched without `--non-matching`): returns `[]` and exits non-zero.

### Behavioral Notes

- With default settings, only matched paths are shown.
- If no paths are provided, command exits non-zero.
- `--quiet` exits non-zero if any input path has no decisive rule match, unless `--non-matching` is also set.
- In `-z` mode, output records are NUL-delimited and each record is: `path<TAB>level<TAB>sourceFile<TAB>pattern`.

## init

### Purpose

Create a starter `.human` file using repository heuristics.

### Flags

- `--force`: overwrite existing `.human` file.

### Pattern Generation Heuristics

The `init` command scans the current directory and conditionally includes patterns:

| Condition                | Pattern generated | Level    |
| ------------------------ | ----------------- | -------- |
| `README.md` exists       | `README.md`       | confirm  |
| `docs/` directory exists | `docs/specs/`     | confirm  |
| `LICENSE` file exists    | `!LICENSE`        | readonly |

When no conditions match, a fallback template with commented-out examples is generated.

### Behavioral Notes

- Without `--force`, existing `.human` is preserved and command returns early.
- Suggested patterns are generated from repository contents using the heuristics above.

## install

### Purpose

Install environment-specific agent instruction files from bundled templates.

### Primary Environments

- `cursor`
- `copilot`
- `claude`
- `windsurf`
- `cline`
- `codex`

### Flags

- `--env <name>`: explicit primary target.
- `--with <csv>`: additional targets.
- `--force`: overwrite existing destination files.
- `--dry-run`: report actions without writing files.
- `--no-prompt`: disable interactive selection when auto-detecting.
- `--with-skill`: also install `.agents/skills/humanfile/SKILL.md` from bundled templates.

### Detection Order

When `--env` is not provided, environment detection preference is:
1. Cursor (`.cursor`)
2. Windsurf (`.windsurfrules`)
3. Cline (`.clinerules`)
4. Claude (`CLAUDE.md`)
5. Codex (`AGENTS.md`)
6. Copilot (`.vscode` or `.github`)

### Behavioral Notes

- Unsupported `--env` or `--with` values cause non-zero exit.
- Existing destination files are skipped unless `--force` is set.
- Skill template destination is skipped unless `--force` is set when `--with-skill` is provided.

## guard

### Purpose

Manage local git hooks that block protected-file changes before push.

### Subcommands

- `humanfile guard install`
- `humanfile guard uninstall`
- `humanfile guard status`

Internal execution subcommand:

- `humanfile guard run`

### install flags

- `--hook <pre-commit|pre-push|both>` (default: `pre-commit`)
- `--mode <staged|diff>` (default: `staged`)
- `--policy <strict|ai-aware>` (default: `ai-aware`)
- `--ai-threshold <number>` (default: `1000`, must be positive)
- `--force`
- `--dry-run`

### uninstall flags

- `--hook <pre-commit|pre-push|both>` (default: `both`)
- `--dry-run`

### status behavior

- Reports each known hook as missing, custom (non-humanfile), or installed with mode.
- For humanfile-managed hooks, status also reports installed policy and `ai-threshold` when relevant.

### install/uninstall safety behavior

- `install`, `uninstall`, and `status` resolve the git repository root with `git rev-parse --show-toplevel` from the process working directory, so running from a subdirectory (for example `packages/my-app` in a monorepo) still installs hooks at the true repo root’s `.git/hooks`. If the cwd is not inside a git checkout, install/uninstall fail with a clear error and `status` reports hooks as missing.
- Install writes a sentinel-tagged script and executable permissions.
- Install refuses to overwrite non-humanfile hooks unless `--force` is set.
- Install skips writing when an existing humanfile-managed hook already has the same mode, policy, and ai-threshold. Use `--force` to reinstall regardless.
- Uninstall removes only sentinel-tagged humanfile hooks.
- Uninstall for a missing hook file reports `skipped: missing` (no error).

### run behavior

- Evaluates changed files according to `--mode` and `--hook` context.
- `run` accepts optional `--cwd <path>` to evaluate a specific repository path.
- Blocking policy:
    - `strict`: exits non-zero when any `confirm` or `readonly` file is in scope.
    - `ai-aware`: exits non-zero only when protected files are in scope and the AI heuristic flags likely AI-generated changes.
- `--ai-threshold` must be a positive number; invalid values produce non-zero exit.
- When no `.human` files or no rule sets exist, `run` reports no violations and does not block.
- Prints violating files with resolved level and a suggested `humanfile explain <path>` follow-up.
- For pre-push `diff` mode, changed-file resolution prefers upstream comparison (`@{u}...HEAD`) and falls back to `HEAD~1...HEAD` when no upstream exists.
- For pre-push `diff` mode in `ai-aware`, commit messages from the evaluated range are used as a secondary AI signal.

## ls

### Purpose

List discovered `.human` files with confirm/readonly counts.

### Behavioral Notes

- If no `.human` files are found, prints a no-files message and exits zero.

## Stability Guidance

This specification should be updated when command names, flags, defaults, exit-code semantics, or parseable output specs change.
