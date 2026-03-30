---
name: humanfile
description: Enforce .human file boundaries when editing code. Checks file protection levels (free, confirm, readonly) before modifying any file. Use when the workspace contains .human files or when about to edit, create, or delete files in a project that uses .human for ownership boundaries.
---

# humanfile

`.human` files declare where a human takes responsibility.
Files listed are not necessarily hand-written — they are files the human wants to stay in the loop on.

## Before Editing Any File

1. Discover `.human` files from the repository root downward (the CLI discovers from the current working directory).
2. Check if the target path matches any pattern. Precedence: deepest `.human` file wins; within a single file, last matching rule wins.
3. Act on the result:

| Level      | Action                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `free`     | Proceed normally.                                                                                                                                                       |
| `confirm`  | STOP and obtain explicit approval before each edit. State the file path and intended change. Platform-specific configs may refine this for explicitly autonomous modes. |
| `readonly` | Do NOT edit. Tell the user the file is protected by `.human`.                                                                                                           |

## .human File Syntax

`.gitignore`-compatible globs with one extension:

```
# Plain patterns -> confirm (agent must obtain explicit approval before editing)
core/

# !-prefixed patterns -> readonly (agent must not edit — use sparingly)
!LICENSE
```

- Blank lines and `#` comments are ignored
- Patterns without `!` -> **confirm**
- Patterns with `!` prefix -> **readonly**
- Unmatched files -> **free**
- Later patterns override earlier ones (last match wins)
- `.human` files scope to their directory (like `.gitignore`)

## Guidelines

- Treat `confirm` and `readonly` files as **source of truth** — when you see conflicting information in the repo, prefer the content in `.human`-declared files.
- Never modify `.human` files themselves without the user explicitly asking.
- When a proposed change would touch a protected file, explain the constraint before proceeding.
