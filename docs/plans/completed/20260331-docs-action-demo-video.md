---
created: "20260330"
completed: "20260331"
---

# Docs: GitHub Action Demo (CI + PR feedback)

## Goal

- Produce a short demo asset that showcases the **GitHub Action** experience:
  - PR check fails (or warns) when `.human`-protected files are modified.
  - The bot posts a PR comment with separate sections for `readonly` and `confirm`.
- Keep the demo readable and privacy-safe for a public repo README.

## Context

- The CLI demo is handled by `20260331-docs-cli-demo-gif.md` (terminal VHS).
- For the action, we opted for a **terminal-based demo** using `gh` (Option B) instead of a browser video:
  - works well with VHS / automation,
  - does not require shipping Playwright or a browser stack in this repo.

## Approach (Option B: `gh`-based demo)

- Use the real trial repo: `zhangyu94/humanfile-trial`.
- Assume a dedicated demo PR exists that:
  - edits at least one `readonly`-protected and one `confirm`-protected file, and
  - has a completed `humanfile` action run with a bot comment.
- Record a short terminal session with VHS using `docs/assets/action-demo/action-demo.tape` that shows:
  - `gh pr checks <PR_NUMBER> --repo zhangyu94/humanfile-trial`
  - `gh api repos/zhangyu94/humanfile-trial/issues/<PR_NUMBER>/comments --jq '.[].body'`

## Deliverables

- `docs/assets/action-demo/action-demo.tape` — VHS cassette for the action demo.
- `docs/assets/action-demo/action-demo.gif` / `docs/assets/action-demo/action-demo.mp4` — rendered assets (created locally via `vhs`).
- `docs/assets/action-demo/README.md` — instructions for re-rendering `action-demo.*`.
- README (optional) — can link to `docs/assets/action-demo.mp4` alongside the CI snippet.

## Tape summary

- Shell: `zsh`.
- Terminal: 1200×600, JetBrains Mono, Catppuccin Mocha (same visual style as the CLI tape).
- Scenes:
  1. Clear screen, run `gh pr checks <PR_NUMBER> --repo zhangyu94/humanfile-trial`, pause.
  2. Run `gh api repos/zhangyu94/humanfile-trial/issues/<PR_NUMBER>/comments --jq '.[].body'`, pause so the comment is readable.
- Uses fixed `Sleep` waits instead of `Wait+Screen` so it doesn't depend on exact `gh` wording.

## Steps (executed)

1. Added `docs/assets/action-demo.tape` with the `gh`-based storyboard and settings aligned to the CLI demo.
2. Extended `docs/assets/README.md` with:
   - an expanded “What gets produced” table including `action-demo.*`,
   - prerequisites for the action demo (GitHub CLI, trial repo, demo PR),
   - exact commands for rendering `action-demo.*`.
3. Left the README using only the CLI demo GIF for now; the action demo can be linked or embedded later.

## Validation

- The tape is deterministic and can be re-run whenever the trial PR or action behavior changes.
- No repo secrets, tokens, or private data are hardcoded — only the public repo name and a PR number placeholder.
- Instructions in `docs/assets/README.md` are sufficient for a contributor to regenerate `action-demo.*` locally.

