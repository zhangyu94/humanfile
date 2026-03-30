# CODEOWNERS Syntax (GitHub)

## Purpose

This document defines GitHub CODEOWNERS syntax and matching behavior in a practical, implementation-oriented format.

It is intended to be specific enough for reproduction.

## Canonical Sources

1. About code owners (GitHub Docs):
    - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
2. CODEOWNERS syntax section (GitHub Docs):
    - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-syntax
3. CODEOWNERS file location section (GitHub Docs):
    - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-file-location
4. Baseline ignore pattern format (Git):
    - https://git-scm.com/docs/gitignore#_pattern_format

## Scope and Non-Goals

This spec covers:

- File discovery precedence for CODEOWNERS on GitHub
- Rule-line structure and owner token formats
- Matching and precedence behavior (last match wins)
- Unsupported syntax relative to `.gitignore`
- Validation/error behavior and practical constraints

This spec does not cover:

- Full branch protection or ruleset setup details
- Non-GitHub CODEOWNERS variants

## File Discovery and Activation

GitHub uses only one CODEOWNERS file per branch. It searches in this order and uses the first file found:

1. `.github/CODEOWNERS`
2. `CODEOWNERS` at repository root
3. `docs/CODEOWNERS`

For pull requests, review-request behavior uses the CODEOWNERS file from the base branch.

## Rule Structure

Each effective rule line is:

- `<pattern> <owner> [owner ...]`

Where:

- `pattern` is a gitignore-like path pattern (with GitHub-specific restrictions below)
- each `owner` is one of:
    - `@username`
    - `@org/team-name`
    - email address (subject to GitHub account constraints)

Comments and whitespace:

- blank lines are ignored
- lines starting with `#` are comments
- inline comments are supported after owners (as shown in GitHub examples)

Owner-list rule:

- if multiple owners are intended for one pattern, they must be on the same line
- if the same pattern appears again later, the last matching line determines owners

## Matching and Precedence

- CODEOWNERS patterns follow most `.gitignore` pattern rules
- path matching is case-sensitive on GitHub
- order matters: the last matching pattern wins

Resolution algorithm for a path:

1. Normalize input path to repo-relative path using `/` separators.
2. Evaluate rules top to bottom.
3. Track the latest rule whose pattern matches.
4. Final ownership is taken from the last matching rule.
5. If no rule matches, there is no code owner assignment for that path.

## Unsupported or Different Syntax vs `.gitignore`

GitHub explicitly states these `.gitignore` features do not work in CODEOWNERS:

1. `!` negation patterns
2. `[ ]` character ranges
3. escaping a leading `#` as a literal pattern

Practical implication:

- avoid these constructs entirely in CODEOWNERS for predictable behavior

## Patterns and Practical Semantics

Because CODEOWNERS follows most `.gitignore`-style matching semantics:

- leading `/` anchors to repository root
- trailing `/` indicates directory scope
- `*` matches within a path segment
- `**` supports recursive matching

Examples:

```text
* @global-owner1 @global-owner2
*.js @js-owner
/docs/ @docs-team
**/logs @ops-team
/scripts/ @owner-a @owner-b
```

Override examples:

```text
/apps/ @octocat
/apps/github
```

In this case, files under `/apps/github` end up with no owner assignment from these lines.

```text
/apps/ @octocat
/apps/github @doctocat
```

In this case, `/apps/github/**` is owned by `@doctocat`.

## Validation and Error Handling

- if a line has invalid syntax, GitHub skips that line
- if an owner does not exist or lacks required access, owner assignment fails for that owner
- GitHub UI highlights CODEOWNERS syntax errors
- GitHub REST API exposes CODEOWNERS errors:
    - https://docs.github.com/en/rest/repos/repos#list-codeowners-errors

## Constraints and Limits

- CODEOWNERS file must be under 3 MB, or GitHub does not load it
- owners must have appropriate write access
- teams must be visible and have explicit write access

## Debugging and Verification

Recommended checks:

1. Open CODEOWNERS file in GitHub UI and resolve highlighted errors.
2. Verify each owner/team has required repository access.
3. Test representative changed paths in a PR targeting the intended base branch.
4. Use the CODEOWNERS errors REST endpoint in CI checks for automated validation.

## Reproduction Checklist

To reproduce GitHub-like behavior in a parser/evaluator:

1. Select the active CODEOWNERS file by location precedence.
2. Parse line-by-line, dropping blanks/comments.
3. Parse `<pattern> <owners...>` with optional inline comment.
4. Evaluate patterns with gitignore-like matching minus unsupported constructs.
5. Enforce case-sensitive path matching.
6. Resolve using last matching rule wins.
7. Return no owner when no rule matches.
8. Skip invalid lines without aborting the whole file.
9. Enforce file size and owner-access constraints.

## Versioning Note

This summary reflects GitHub documentation available as of 2026-03-25.
