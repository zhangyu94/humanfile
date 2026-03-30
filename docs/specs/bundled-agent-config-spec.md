# Bundled Agent Config Specification

## Overview

This document defines the stable contract for the bundled agent configuration system:
how source config files are authored, how generated outputs are produced, and how
drift between sources and generated files is detected.

## Source Files

All agent config content originates from source files under `packages/core/configs/`:

| Source path                    | Scope                                              | Description                                                           |
| ------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| `sources/_source.md`           | Portable (Claude, Copilot, Codex, Windsurf, Cline) | Single-source Markdown template used across multiple platforms        |
| `sources/cursor/humanfile.mdc` | Cursor                                             | Cursor-specific rule file with YAML frontmatter and Cursor mode table |
| `skills/humanfile/SKILL.md`    | Portable skill                                     | Agent skill file with YAML frontmatter for skill-aware agents         |

## Generation Pipeline

The build script (`packages/core/configs/build.ts`) reads source files and produces
generated outputs under `packages/core/configs/generated/`.

### Platform targets from `_source.md`

| Platform | Generated path                                      | Transform                 |
| -------- | --------------------------------------------------- | ------------------------- |
| Claude   | `generated/claude/CLAUDE.md`                        | None (verbatim copy)      |
| Copilot  | `generated/copilot/.github/copilot-instructions.md` | None (verbatim copy)      |
| Codex    | `generated/codex/AGENTS.md`                         | None (verbatim copy)      |
| Windsurf | `generated/windsurf/.windsurfrules`                 | Strip markdown formatting |
| Cline    | `generated/cline/.clinerules`                       | Strip markdown formatting |

### Cursor target

| Source                         | Generated path                                 |
| ------------------------------ | ---------------------------------------------- |
| `sources/cursor/humanfile.mdc` | `generated/cursor/.cursor/rules/humanfile.mdc` |

Copied verbatim (no transform).

### Skill target

| Source                      | Generated path                        |
| --------------------------- | ------------------------------------- |
| `skills/humanfile/SKILL.md` | `generated/skills/humanfile/SKILL.md` |

Copied verbatim (no transform).

## Markdown Stripping Transform

For platforms that require plain text (Windsurf, Cline), the following transforms are applied:

1. `**bold**` markers are removed, keeping the inner text.
2. `→` characters are replaced with `=`.

No other Markdown syntax is modified.

## Drift Detection

The sync checker (`packages/core/configs/check-sync.ts`) compares each generated file
against the expected output of the build pipeline. If any file differs, it reports
the specific drifted path and exits non-zero.

### Contract

- `configs:check-sync` exits `0` when all generated files match their sources after applying transforms.
- `configs:check-sync` exits `1` when any generated file has drifted, printing the path of each drifted file.
- The CI pipeline runs `configs:check-sync` to prevent merging changes that modify sources without regenerating.

## Regeneration Command

```bash
pnpm --filter humanfile configs:build
```

This clears the `generated/` directory and rebuilds all targets from sources.

## Stability Guidance

Update this specification when any of the following changes:
- source file paths or naming conventions
- platform target list or generated output paths
- transform logic (stripping rules, character replacements)
- drift detection behavior or exit code semantics
