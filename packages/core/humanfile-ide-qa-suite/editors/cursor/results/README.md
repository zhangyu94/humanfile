# Cursor runtime compliance results

This directory is written by the Cursor runtime runner:

Prerequisites:

- Install Cursor CLI so `agent` is available. See [Cursor CLI installation](https://cursor.com/docs/cli/installation).
- Ensure `~/.local/bin` is on your `PATH` (or set `HF_CURSOR_AGENT_PATH` to the absolute path of `agent`).
- Verify with `agent --version`.

```bash
pnpm --filter humanfile run qa:editor:cursor
```

## How to tell if the run passed

The runner prints a single-line summary like:

`cursor runtime: OVERALL=pass pass=3 fail=0 unsupported=0 manual=0 report=.../editors/cursor/results/compliance-report.json`

Exit codes:

- `0`: overall pass
- `1`: at least one scenario failed
- `2`: unsupported (Cursor CLI not runnable)

## Files

- `compliance-report.json` — structured results for each scenario (`pass`/`fail`/etc.) plus evidence pointers.
- `artifacts/` — raw evidence (CLI logs, exported transcripts, and the disposable workspace snapshot).
