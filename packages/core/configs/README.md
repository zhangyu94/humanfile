# Agent Configuration Templates

Ready-to-copy configuration files for teaching AI coding agents to respect `.human` file boundaries.

## Single Source

All config files (except `humanfile.mdc`) are generated from `_source.md`.
The skill template is sourced from `skills/humanfile/SKILL.md`.
After editing sources, run (from the repo root or this directory):

```bash
pnpm --filter humanfile configs:build
```

The `--filter humanfile` flag makes the command safe to run from the monorepo root by targeting only the `humanfile` package. If you are already inside the `packages/core` directory, running `pnpm configs:build` without the filter is equivalent as long as no other package defines the same script.

This regenerates files in the `generated/` subdirectory in the following table.
Do not edit generated files directly.

| Platform | Source File | Destination |
|----------|------------|-------------|
| **Claude Code** | `generated/claude/CLAUDE.md` | `CLAUDE.md` (repo root) |
| **GitHub Copilot** | `generated/copilot/.github/copilot-instructions.md` | `.github/copilot-instructions.md` |
| **Cursor** | `generated/cursor/.cursor/rules/humanfile.mdc` | `.cursor/rules/humanfile.mdc` |
| **Windsurf** | `generated/windsurf/.windsurfrules` | `.windsurfrules` (repo root) |
| **Cline** | `generated/cline/.clinerules` | `.clinerules` (repo root) |
| **Codex** | `generated/codex/AGENTS.md` | `AGENTS.md` (repo root) |
| **Skill Runtime** | `generated/skills/humanfile/SKILL.md` | `.agents/skills/humanfile/SKILL.md` |

If your project already has one of these files, append the `.human` instructions
to the existing file instead of replacing it.
