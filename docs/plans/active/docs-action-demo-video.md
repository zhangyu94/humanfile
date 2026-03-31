---
created: "20260330"
---

# Docs: GitHub Action Demo (CI + PR feedback)

## Goal

- Produce a short demo asset that showcases the **GitHub Action** experience:
  - PR check fails (or warns) when `.human`-protected files are modified
  - the bot posts a PR comment with separate sections for `readonly` and `confirm`
- Keep the demo readable and privacy-safe for a public repo README.

## Context

- The CLI demo is best as a terminal recording; the action demo is best shown in GitHub UI.
- The action demo should be reproducible and easy to re-record after UI text changes.

## Approach

We will support two capture modes:

- **Option A (recommended): GitHub UI video via Playwright**
  - record a short browser video of the PR page (Checks → failing `humanfile`, Conversation → bot comment)
  - convert to GIF for README only if size/quality is acceptable
- **Option B (fallback): terminal demo via `gh`**
  - show `gh pr checks` output and print the bot comment body with `gh api`
  - can be recorded with VHS if we decide UI recording is too complex

## Deliverables

- Preferred:
  - `docs/assets/action-demo.mp4`
  - optional `docs/assets/action-demo.gif` (only if it stays crisp and small)
- If using Playwright:
  - a small capture script (or documented commands) to re-record
- README update:
  - embed GIF if we produce one; otherwise link to the MP4 (with a thumbnail/poster image)

## Preconditions

- A dedicated demo PR exists in a repo where it’s safe to record without leaking private info.
  - If we use a private repo, ensure the recording hides the repo name/URL and user identity.
  - Prefer using a public demo repo specifically for recording.

## Storyboard (GitHub UI)

Total: ~6–10 seconds.

- **Scene A (Checks)** (~2–3s):
  - show the `humanfile` job failing (or warning) due to a readonly-protected change
- **Scene B (Conversation)** (~3–5s):
  - scroll to the bot comment and pause with both sections visible:
    - “Readonly-Protected Files Modified”
    - “Confirm-Protected Files Modified”

## Steps — Option A (Playwright)

1. Create or reuse a **demo PR** that intentionally edits:
   - one `readonly`-protected file (to trigger failure when `fail-on-readonly: true`)
   - one `confirm`-protected file

2. Ensure the PR run is complete and the comment is present.

3. Install Playwright (local-only tooling; do not ship as a runtime dep):

```bash
pnpm add -D playwright
pnpm exec playwright install chromium
```

4. Record the PR page:
   - start on the PR URL
   - show Checks tab and the failing check summary
   - switch to Conversation and pause on the comment

5. Export to `docs/assets/action-demo.mp4`.

6. (Optional) Convert to GIF:

```bash
ffmpeg -i docs/assets/action-demo.mp4 -vf \"fps=12,scale=960:-1:flags=lanczos\" -loop 0 docs/assets/action-demo.gif
```

7. Update `README.md`:
   - embed GIF if present, else link to MP4.

## Steps — Option B (gh)

1. From a repo with the demo PR open:

```bash
gh pr checks <PR_NUMBER>
gh api repos/<owner>/<repo>/issues/<PR_NUMBER>/comments --jq '.[].body'
```

2. Record in terminal (VHS or manual) and export to `docs/assets/action-demo.gif` or `docs/assets/action-demo.mp4`.

## Validation

- No private information is visible (repo name, usernames, emails, tokens).
- The failing check and PR comment are both readable at typical README widths.
- Asset size and load time are acceptable for README.
- The capture process is documented so the demo can be refreshed later.

