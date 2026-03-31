# CLI demo assets (`cli-demo.*`)

This directory holds the **README CLI demo** as a **programmatically rendered** GIF and MP4, driven by a [VHS](https://github.com/charmbracelet/vhs) cassette.

## What gets produced

| File          | Role                                                                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo.tape`   | Source script VHS executes (terminal size, font, typing, commands, waits).                                                                                                                                                 |
| `cli-demo.gif`| Primary README asset; rendered at **1200×600** px (2:1). [README.md](../../../README.md) shows it at **600×300** via `<img width height>` so the page layout stays compact while the file stays sharp on high-DPI screens. |
| `cli-demo.mp4`| Same recording as H.264; useful for previews or docs that accept video.                                                                                                                                                    |

Re-render whenever **CLI output**, **fonts**, or **layout** change so the recording stays accurate.

## Resolution

The tape targets **1200×600** terminal pixels (font **18**, padding **16**) so `demo.gif` and `demo.mp4` are usable on retina displays and when scaling. The root README still embeds at **600×300** CSS pixels so the fold does not grow; to show full native size, drop the `width` / `height` attributes or set them to `1200` / `600`.

## Prerequisites (programmatic build)

All of this runs on your machine or in CI; nothing is hand-captured.

1. **Node.js** — `npx` must work (the tape runs `npx humanfile …` inside a fresh temp repo, so the published package is exercised like a real user).
2. **VHS** — used to run the tape:

   ```bash
   brew install vhs
   ```

3. **JetBrains Mono** — matches the committed typography; without it VHS falls back to another monospace face:

   ```bash
   brew install --cask font-jetbrains-mono
   ```

4. **zsh** — the tape sets `Set Shell zsh` (default on current macOS).

5. **git** — the hidden setup runs `git init` / `git commit` in a temp directory.

6. **Network** — first `npx humanfile` run may download the package; CI should allow `registry.npmjs.org`.

## Reproduce `cli-demo.gif` from this directory

From this `cli-demo/` directory:

```bash
vhs cli-demo.tape
```

VHS reads `Output` lines inside the tape and writes:

- `cli-demo.gif`
- `cli-demo.mp4`

### Verify dimensions and size

On macOS:

```bash
sips -g pixelWidth -g pixelHeight cli-demo.gif
# Expect 1200×600 while the tape uses Set Width 1200 / Set Height 600 (display size in README is separate).
```

Keep an eye on file size for the README (aim for a few hundred KB; large GIFs hurt load time).

## What the tape records

- **`Hide` / `Show`:** Creates a disposable git repo under `$TMPDIR`, adds minimal files (`src/`, `docs/specs/`, `LICENSE`, etc.), commits, then `clear` so the visible recording starts cleanly with `ls`.
- **Visible scenes:** `ls` → `npx humanfile init` → `check` → `ls` (rules) → `check src/index.ts` → three `explain` invocations (confirm, readonly, free via `-n`).
- **`Wait+Screen` vs `Sleep`:** Some steps wait for stable text; `explain` uses **fixed `Sleep`** because colored `level:` output breaks plain-text `Wait` regexes and `npx` can be slow under `ttyd`.

Edit **`demo.tape`** to change resolution, font, timing, or commands. **Settings** (`Set Width`, `Set Height`, `Set FontSize`, …) must appear **before** interactive commands in the tape.

## Docker alternative

VHS documents a Docker image with dependencies bundled:

```bash
docker run --rm -v "$PWD:/vhs" -w /vhs ghcr.io/charmbracelet/vhs:latest cli-demo.tape
```

The working directory inside the container is the repo root (`-w /vhs`), so `Output docs/assets/...` paths in the tape resolve like a local run.
