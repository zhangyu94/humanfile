# Manual IDE QA (fallback)

This directory is for **manual IDE QA** across multiple editors. It is a complement to the automated Cursor runtime runner in `editors/cursor/`, not a dependency.

- Use `editors/cursor/run.ts` + `qa:editor:cursor` for **automated Cursor checks**.
- Use these instruction files when you want to **manually exercise other editors** (Copilot, Claude Code, Windsurf, Cline, Codex) or do ad‑hoc exploratory testing.

Files:

- `prompts.md` — canonical prompts (free/confirm/readonly + rules awareness) to run in each editor.
- `expected-behavior.md` — what a correct agent response looks like for each prompt.
- `incorrect-behavior.md` — examples that should be marked as FAIL.
- `manual-qa-instructions.md` — step‑by‑step manual checklist per editor.
- `results.md` — table for recording pass/fail per editor and prompt.
