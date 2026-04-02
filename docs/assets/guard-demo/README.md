# Guard demo assets (`guard-demo.*`)

Terminal demo for **Quick Start step 3** (optional git hooks) in the root README: `humanfile guard install` and `humanfile guard status`.

Uses the same VHS **font, theme, and terminal size** as [cli-demo/](../cli-demo/) and [install-demo/](../install-demo/) for visual consistency.

## What gets produced

| File              | Role                                   |
| ----------------- | -------------------------------------- |
| `guard-demo.tape` | VHS source script                      |
| `guard-demo.gif`  | README embed (1200×400; shown 600×200) |
| `guard-demo.mp4`  | H.264 variant                          |

## Prerequisites

Same as [cli-demo/README.md](../cli-demo/README.md): the cassette types `humanfile …` exactly as shown, so `humanfile` must be on `PATH` (global install via `npm i -g humanfile`, or `pnpm --filter humanfile build` + `cd packages/core && npm link` for local builds).

## Reproduce

From this directory:

```bash
vhs guard-demo.tape
```

## What the tape records

- **Hidden:** Temp git repo, minimal tree, runs `humanfile init`, then `clear`.
- **Visible:** `humanfile guard install --hook pre-commit --mode staged`, then `humanfile guard status`.
