# .human File Boundaries

This project uses `.human` files to declare files where a human takes
responsibility. Before editing any file, check if it is covered by a `.human`
rule. Listed files are not necessarily hand-written — they are files the human
wants to stay in the loop on.

## Rules

1. Look for `.human` files from the target file's directory up to the repo root.
2. Patterns use `.gitignore` glob syntax:
   - Plain patterns (e.g. `core/`) → **confirm**: ask the user before editing.
   - `!`-prefixed patterns (e.g. `!LICENSE`) → **readonly**: do NOT edit.
   - Unmatched files → **free**: edit normally.
3. Later patterns override earlier ones (last match wins).
4. Deeper `.human` files override shallower ones.

## Behavior

- **free**: proceed normally.
- **confirm**: ask the user for explicit permission before editing. State the intended change.
- **readonly**: do NOT edit. Inform the user the file is protected by `.human`.

Treat `confirm` and `readonly` files as **source of truth** — when you see
conflicting information in the repo, prefer the content in these files.
Never modify `.human` files without the user explicitly asking.
