---
created: "20260330"
completed: "20260331"
---

# Docs: README CLI demo (VHS terminal GIF)

## Goal

- Ship a short **terminal** demo in the root README so newcomers see the workflow immediately.
- Keep text readable on GitHub (desktop and mobile) and **re-renderable** from a committed `.tape` file.
- **Iteration (same deliverable paths):** switched typography to **JetBrains Mono**, widened command coverage beyond `init` + `check`, and fixed flaky VHS sync.

## Context

- Terminal GIFs are the usual pattern for CLI tools on GitHub.
- The GitHub Action story belongs in a **separate** asset (see `20260331-docs-action-demo-video.md` for the action demo plan).

## Approach

- Tool: **[VHS](https://github.com/charmbracelet/vhs)** — scripted recording from `docs/assets/cli-demo/cli-demo.tape`.
- **Hidden setup** (`Hide` / `Show`): create a minimal git repo under a temp directory, then `clear`, so on-screen history starts at `ls`.
- **Outputs:** `docs/assets/cli-demo/cli-demo.gif` (README), `docs/assets/cli-demo/cli-demo.mp4` (optional embed elsewhere).

## Font and production spec (current)

| Setting         | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| Font            | JetBrains Mono (`brew install --cask font-jetbrains-mono`)        |
| Terminal        | 1200 × 600 px, font 18, padding 16 (README img scaled to 600×300) |
| FPS             | 12                                                                |
| Theme           | Catppuccin Mocha                                                  |
| GIF size target | ≤ 3 MB                                                            |

Earlier iterations: SF Mono 960×540, 1100×640, 600×720, 600×300.
Current tape uses **1200×600** (font 18) for sharper assets.
README scales the embed to **600×300** for layout.

## Storyboard (commands shown)

In order:

1. `ls`
2. `npx humanfile init`
3. `npx humanfile check`
4. `npx humanfile ls`
5. `npx humanfile check src/index.ts`
6. `npx humanfile explain docs/specs/guide.md`
7. `npx humanfile explain LICENSE`
8. `npx humanfile explain -n src/index.ts`

Fixture omits `README.md` so `init` produces a small `.human` (e.g. `docs/specs/` + `!LICENSE`) without extra noise.

**Out of scope:** `install`, `guard` (mutates hooks), interactive flows.

## VHS notes

- **`explain` segments:** use **time-based `Sleep`** after `Enter`, not `Wait+Screen` on `level: free`, because picocolors wraps `free` in ANSI sequences and `Wait` may not match plaintext.
- **`npx` under ttyd** can be slow; sleeps avoid default wait timeouts on `explain`.

## Deliverables

- `docs/assets/cli-demo/cli-demo.tape`
- `docs/assets/cli-demo/cli-demo.gif` / `docs/assets/cli-demo/cli-demo.mp4`
- `docs/assets/cli-demo/README.md` (re-render instructions + font note)
- `README.md` embed above “Quick Start” (`<img width="600" height="300">`)

## Outcome (final)

- GIF/MP4 at 1200×600, stored under `docs/assets/cli-demo/`; file sizes depend on length and palette (re-check after re-renders).
- README alt text describes the broadened CLI demo (`init`, `check`, `ls`, `explain`).
- Re-render from repo root: `vhs docs/assets/cli-demo/cli-demo.tape`

## Steps (historical)

1. [x] Install VHS (`brew install vhs`).
2. [x] Add `docs/assets/cli-demo/cli-demo.tape` and `docs/assets/cli-demo/README.md`.
3. [x] Install JetBrains Mono; set font in tape.
4. [x] Expand storyboard; replace brittle `Wait` on colored `explain` output with `Sleep`.
5. [x] Embed GIF in README; keep `docs/PLANS.md` accurate.

## Validation

- [x] Readable at typical README width; motion acceptable.
- [x] Matches current CLI output.
- [x] `.tape` committed for future re-renders.
