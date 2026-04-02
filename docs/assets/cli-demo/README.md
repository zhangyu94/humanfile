# CLI demo assets (`cli-demo.*`)

This directory holds a **classification / provenance** terminal demo as a **programmatically rendered** GIF and MP4, driven by a [VHS](https://github.com/charmbracelet/vhs) cassette.
It supports the root README **Common CLI commands** section (`check`, `ls`, `explain`).

Sibling demos: [install-demo/](../install-demo/) (Quick Start step 2), [guard-demo/](../guard-demo/) (Quick Start step 3).

## What gets produced

| File            | Role                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cli-demo.tape` | Source script VHS executes (terminal size, font, typing, commands, waits).                                                                                                                                                |
| `cli-demo.gif`  | Primary README asset for classification; rendered at **1200×400** px (3:1). [README.md](../../../README.md) shows it at **600×200** via `<img width height>` so the page layout stays compact while the file stays sharp. |
| `cli-demo.mp4`  | Same recording as H.264; useful for previews or docs that accept video.                                                                                                                                                   |

Re-render whenever **CLI output**, **fonts**, or **layout** change so the recording stays accurate.

## Resolution

The tape targets **1200×400** terminal pixels (font **18**, padding **16**) so `cli-demo.gif` and `cli-demo.mp4` are usable on retina displays and when scaling. The root README embeds at **600×200** CSS pixels so the fold does not grow; to show full native size, drop the `width` / `height` attributes or set them to `1200` / `400`.

## Prerequisites (programmatic build)

All of this runs on your machine or in CI; nothing is hand-captured.

1. **Global install** — the cassette types `humanfile …` exactly as shown, so `humanfile` must be on `PATH`.

   For local development builds:

   ```bash
   pnpm --filter humanfile build  # build packages/core/dist (CLI entrypoint)
   cd packages/core && npm link   # link `humanfile` into your global PATH
   ```

   Or install from npm:

   ```bash
   npm i -g humanfile             # install the CLI globally (enables `humanfile ...`)
   ```

2. **Node.js** — `node` on `PATH`.
3. **VHS** — used to run the tape:

   ```bash
   brew install vhs               # install VHS (terminal recorder)
   ```

4. **JetBrains Mono** — matches the committed typography; without it VHS falls back to another monospace face:

   ```bash
   brew install --cask font-jetbrains-mono # install the demo font
   ```

5. **zsh** — the tape sets `Set Shell zsh` (default on current macOS).

6. **git** — the hidden setup runs `git init` / `git commit` in a temp directory.

## Reproduce `cli-demo.gif`

From this directory:

```bash
vhs cli-demo.tape                 # render cli-demo.gif + cli-demo.mp4 from the tape
```

VHS reads `Output` lines inside the tape and writes into this directory:

- `cli-demo.gif`
- `cli-demo.mp4`

### Verify dimensions and size

On macOS:

```bash
cd docs/assets/cli-demo && sips -g pixelWidth -g pixelHeight cli-demo.gif # verify pixel dimensions
# Expect 1200×400 while the tape uses Set Width 1200 / Set Height 400 (display size in README is separate).
```

Keep an eye on file size for the README (aim for a few hundred KB; large GIFs hurt load time).

## What the tape records

- **`Hide` / `Show`:** Creates a disposable git repo under `$TMPDIR`, adds minimal files (`src/`, `docs/specs/`, `LICENSE`, `package.json`), commits, runs `humanfile init` (off-screen), then `clear` so the visible recording starts with classification commands only.
- **Visible scenes:** `humanfile check` (tree) → `humanfile ls` → `humanfile check src/index.ts` → `explain` invocations (confirm, readonly, free via `-n`), with `clear` between explain scenes to keep output on screen at 1200×400.
- **`Wait+Screen` vs `Sleep`:** Init uses `Wait+Screen` for stable output; classification and `explain` use **fixed `Sleep`** because colored `level:` output breaks plain-text `Wait` regexes and `npx` can be slow under `ttyd`.

Edit **`cli-demo.tape`** to change resolution, font, timing, or commands. **Settings** (`Set Width`, `Set Height`, `Set FontSize`, …) must appear **before** interactive commands in the tape.

## Docker alternative

VHS documents a Docker image with dependencies bundled:

```bash
docker run --rm -v "$PWD:/vhs" -w /vhs ghcr.io/charmbracelet/vhs:latest docs/assets/cli-demo/cli-demo.tape # render via Docker
```

The working directory inside the container is the repo root (`-w /vhs`), so `Output docs/assets/...` paths in the tape resolve like a local run.
