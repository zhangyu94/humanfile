# Install demo assets (`install-demo.*`)

Terminal demo for **Quick Start step 2** in the root README: `humanfile install` with a fixed environment (non-interactive).

Uses the same VHS **font, theme, and terminal size** as [cli-demo/](../cli-demo/) and [guard-demo/](../guard-demo/) for visual consistency.

## What gets produced

| File              | Role                                      |
| ----------------- | ----------------------------------------- |
| `install-demo.tape` | VHS source script                         |
| `install-demo.gif`  | README embed (1200×400; shown 600×200)   |
| `install-demo.mp4`  | H.264 variant                            |

## Prerequisites

Same as [cli-demo/README.md](../cli-demo/README.md): the cassette types `humanfile …` exactly as shown, so `humanfile` must be on `PATH` (global install via `npm i -g humanfile`, or `pnpm --filter humanfile build` + `cd packages/core && npm link` for local builds).

## Reproduce

From this directory:

```bash
vhs install-demo.tape
```

## What the tape records

- **Hidden:** Temp git repo, minimal tree, runs `humanfile init`, then `clear`.
- **Visible:** `humanfile install --env cursor`, then `ls .cursor/rules`.
