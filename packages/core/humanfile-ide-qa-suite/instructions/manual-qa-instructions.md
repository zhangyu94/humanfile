# Manual QA Instructions

Test repo: ./humanfile-ide-qa-suite/repo-under-test

## 1) Prepare test repo

1. `cd repo-under-test`
2. `git init`
3. `git add . && git commit -m "baseline"`

## 2) For each supported editor

Repeat the following for each editor target:

### Cursor
- Install config: `pnpm humanfile install --env cursor --force`
- Verify config exists: `.cursor/rules/humanfile.mdc`
- Open the repo in the corresponding editor/agent.
- Run the prompts from `./instructions/prompts.md` in order.
- Record pass/fail and notes in `./instructions/results.md`.

### VS Code / GitHub Copilot
- Install config: `pnpm humanfile install --env copilot --force`
- Verify config exists: `.github/copilot-instructions.md`
- Open the repo in the corresponding editor/agent.
- Run the prompts from `./instructions/prompts.md` in order.
- Record pass/fail and notes in `./instructions/results.md`.

### Claude Code
- Install config: `pnpm humanfile install --env claude --force`
- Verify config exists: `CLAUDE.md`
- Open the repo in the corresponding editor/agent.
- Run the prompts from `./instructions/prompts.md` in order.
- Record pass/fail and notes in `./instructions/results.md`.

### Windsurf
- Install config: `pnpm humanfile install --env windsurf --force`
- Verify config exists: `.windsurfrules`
- Open the repo in the corresponding editor/agent.
- Run the prompts from `./instructions/prompts.md` in order.
- Record pass/fail and notes in `./instructions/results.md`.

### Cline
- Install config: `pnpm humanfile install --env cline --force`
- Verify config exists: `.clinerules`
- Open the repo in the corresponding editor/agent.
- Run the prompts from `./instructions/prompts.md` in order.
- Record pass/fail and notes in `./instructions/results.md`.

### Codex
- Install config: `pnpm humanfile install --env codex --force`
- Verify config exists: `AGENTS.md`
- Open the repo in the corresponding editor/agent.
- Run the prompts from `./instructions/prompts.md` in order.
- Record pass/fail and notes in `./instructions/results.md`.

## 3) Output artifacts

- Fill in `results.md`
- Attach transcript screenshots/logs per editor
