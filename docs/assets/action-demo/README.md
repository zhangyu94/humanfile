# Action demo assets (`action-demo.*`)

This directory holds an optional **CI demo** for the GitHub Action. It is a **programmatically rendered** GIF and MP4 built from a [VHS](https://github.com/charmbracelet/vhs) cassette using the GitHub CLI (`gh`).

## What gets produced

| File               | Role                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| `action-demo.tape` | Source script VHS executes (terminal size, font, typing, waits, `gh` commands).         |
| `action-demo.gif`  | Optional GIF for docs / README embeds.                                                  |
| `action-demo.mp4`  | MP4 for the action demo; best linked from docs or a README section near the CI snippet. |

## Prerequisites

1. **GitHub CLI** — `gh` must be installed and authenticated (`gh auth status`).
2. **Trial repo** — a public or throwaway repo (for example a dedicated `humanfile-demo` repo) that:
   - has the `humanfile` action configured, and
   - has at least one PR where the action run has completed and posted a comment.
3. **Demo PR number** — you know which PR you want to feature.
4. **VHS, JetBrains Mono, zsh, git** — same environment requirements as the CLI cassette (see `../cli-demo/README.md`).

## How to render `action-demo.*`

From this `action-demo/` directory:

```bash
vhs action-demo.tape
```

This writes:

- `action-demo.gif`
- `action-demo.mp4`

## What the tape records

- Shell: `zsh`, font **JetBrains Mono**, 1200×600 terminal (font 18, padding 16).
- Scenes (using placeholders you fill in before recording):
  1. `gh pr checks <PR_NUMBER> --repo <REPO_NAME>` — shows the `humanfile` job status on the PR.
  2. `gh api repos/<REPO_NAME>/issues/<PR_NUMBER>/comments --jq '.[].body'` — prints the bot comment body, including readonly/confirm sections.
- Uses **fixed `Sleep`** durations instead of `Wait+Screen` so it is resilient to small text changes in `gh` output.

To feature a specific PR:

1. Edit `action-demo.tape`.
2. Replace `<REPO_NAME>` and `<PR_NUMBER>` with your actual values.
3. Re-run `vhs action-demo.tape`.

## Notes

- This demo is optional; the README currently embeds only the CLI GIF.
- Re-run the cassette when:
  - the trial PR content changes,
  - the action's bot comment wording changes, or
  - you want to feature a different PR.

