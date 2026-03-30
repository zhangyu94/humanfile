# .gitignore Syntax

## Purpose

This document defines `.gitignore` syntax and matching behavior in a practical, implementation-oriented format.

It is based on authoritative Git documentation and cross-checked with GitHub Docs.

## Canonical Sources

1. gitignore manual:
    - https://git-scm.com/docs/gitignore
    - https://www.kernel.org/pub/software/scm/git/docs/gitignore.html
2. Debugging ignore behavior:
    - https://git-scm.com/docs/git-check-ignore
3. Related behavior for tracked files and force-add:
    - https://git-scm.com/docs/git-add
    - https://git-scm.com/docs/git-rm
4. Practical usage guide:
    - https://docs.github.com/en/get-started/git-basics/ignoring-files

## Scope and Non-Goals

This spec covers:

- Pattern syntax accepted by `.gitignore`-style files
- Source precedence and rule resolution
- Practical edge cases that commonly cause confusion

## Ignore Sources and Precedence

When Git decides whether a path is ignored, it evaluates patterns from multiple sources.

Higher to lower precedence (within each source, last match wins):

1. Command-line exclude patterns (for commands that support them)
2. Per-directory `.gitignore` files from repository root down to the path's directory
    - Lower directories override higher directories
    - Patterns are interpreted relative to the directory containing that `.gitignore`
3. `$GIT_DIR/info/exclude`
4. `core.excludesFile` (global user ignore file)

Important: last matching pattern decides the result at a given precedence level.

## Tracked vs Untracked Files

`.gitignore` applies to intentionally untracked files.

- Already tracked files are not ignored by adding them to `.gitignore`.
- To stop tracking a file, remove it from index first:

```bash
git rm --cached <path>
```

Then keep the ignore rule so it stays untracked.

## Line-Level Rules

Each non-empty line is a pattern unless treated as comment.

1. Blank line: no effect
2. Line starting with `#`: comment
    - To match literal `#` at start, escape it: `\#file`
3. Trailing spaces are ignored
    - To keep trailing space, escape it with `\`
4. Escape with backslash `\` for special characters

Invalid pattern note:

- A trailing backslash at end of pattern is invalid and never matches.

## Negation (`!`) and Re-Inclusion

A leading `!` negates a previous exclude rule and re-includes matching paths.

Example:

```gitignore
*.log
!important.log
```

Caveat (critical):

- You cannot re-include a file if one of its parent directories is excluded.
- Git does not descend into excluded directories for performance, so child rules are ineffective there.

To match a literal leading `!`, escape it:

```gitignore
\!literal.txt
```

## Path Separator and Anchoring

`/` is the directory separator in patterns.

### Relative behavior

- If pattern contains `/` in beginning or middle, it is relative to current `.gitignore` directory.
- If pattern has no `/`, it may match at any depth below that `.gitignore`.

Examples:

- `foo` matches `foo`, `a/foo`, `a/b/foo`
- `dir/foo` matches only relative `dir/foo` under current `.gitignore` directory
- `/foo` anchors to the directory containing current `.gitignore`

### Directory-only match

- Trailing `/` means directory-only match.

Example:

- `build/` matches directory `build` and everything under it
- It does not match a regular file named `build`

## Wildcards

Git ignore patterns use shell-style matching with path-aware behavior.

1. `*` matches zero or more characters except `/`
2. `?` matches one character except `/`
3. Character classes supported, for example `[a-zA-Z0-9]`

## Special `**` Semantics

`**` has special forms in full path matching:

1. Leading `**/`:
    - `**/foo` matches `foo` at any depth
2. Trailing `/**`:
    - `abc/**` matches everything under directory `abc` recursively
3. Middle `/**/`:
    - `a/**/b` matches `a/b`, `a/x/b`, `a/x/y/b`, etc.
4. Other consecutive asterisks:
    - treated as regular `*` behavior per Git docs

## Practical Matching Examples

```gitignore
# Ignore object and archive outputs everywhere
*.[oa]

# Ignore top-level generated docs in this directory only
/*.html

# Ignore any tmp directory recursively
tmp/

# Ignore all logs
*.log

# Keep one log file
!important.log

# Ignore everything under foo except foo/bar
/*
!/foo
/foo/*
!/foo/bar
```

## Multi-File Scoping Model

`.gitignore` files are hierarchical.

- A `.gitignore` in a subdirectory only applies within that subdirectory tree.
- Deeper `.gitignore` files override higher ones due to precedence order.

This is why colocated `.gitignore` files are useful for package-specific rules.

## Debugging and Verification

Use `git check-ignore` to see exactly which rule matched.

```bash
git check-ignore -v path/to/file
```

Typical verbose output reports:

- source file where pattern came from
- line number
- matching pattern
- queried path

For stream use and machine parsing:

```bash
git check-ignore -v -z --stdin
```

## Operational Notes

1. `git add` does not add ignored files by default.
2. `git add -f` can force-add ignored files.
3. Ignore behavior and tracking state are independent once a file is tracked.
4. Git does not follow symlinks when reading `.gitignore` from working tree.

## Reference Grammar (Informal)

This is an implementation-friendly summary grammar:

- file := line*
- line := blank | comment | pattern
- comment := `#` text
- pattern := [negation] token+
- negation := `!`
- tokens may include:
    - literals (with optional escapes)
    - `/` separators
    - `*`, `?`, `[ranges]`
    - `**` in documented special positions
    - optional trailing `/` for directory-only

Resolution algorithm:

1. Collect candidate patterns from all sources in precedence order.
2. For per-directory `.gitignore`, evaluate from root down to path directory.
3. Evaluate patterns in order within each source; remember last match.
4. Apply negation rules where possible.
5. Return ignored/not-ignored.

## Known Pitfalls Checklist

1. "Rule does not work" because file is already tracked.
2. Negation appears ignored because parent directory is excluded.
3. Missing leading slash causes broader matches than expected.
4. Using `foo/*` when recursive behavior was intended (`foo/**`).
5. Confusing `.gitignore` patterns with command pathspec behavior.

## Suggested Project Policy

For predictable behavior:

1. Keep shared rules in repository `.gitignore`.
2. Keep local machine rules in global excludes file.
3. Keep repo-local personal rules in `.git/info/exclude`.
4. Validate complex rules with `git check-ignore -v` before commit.

## Versioning Note

This spec reflects behavior described in Git docs available as of 2026-03-24.
