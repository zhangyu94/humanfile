# GitHub Action Specification

## Overview

This document defines the stable behavior spec for the GitHub Action in
`packages/action`.

This spec applies to:
- `packages/action/action.yml` input surface
- action runtime behavior in pull request workflows
- failure and comment semantics exposed to users

## Scope

This specification covers:
- input names, defaults, and validation behavior
- event/context assumptions for execution
- protected-file detection outcomes
- PR comment lifecycle behavior
- failure and warning semantics

This specification does not cover:
- internal implementation structure
- private helper names or module boundaries
- non-spec formatting details of logs/comments

## Runtime

| Property | Value    |
| -------- | -------- |
| `using`  | `node20` |

The action runs on Node.js 20 via GitHub's `actions/runner` infrastructure. The `node20` runtime is declared in `action.yml` and determines the minimum Node version available during execution.

## Action Inputs

Defined in `packages/action/action.yml`:

| Input              | Required | Default               | Spec                                                                                                                      |
| ------------------ | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ai-threshold`     | No       | `1000`                | Parsed as a positive number; invalid values fail the run.                                                                 |
| `fail-on-readonly` | No       | `true`                | When string `"true"`, readonly violations fail the check. Any other value (including `"yes"`, `"1"`) is treated as false. |
| `comment-on-pr`    | No       | `true`                | When string `"true"`, action manages PR comments; any other value is log-only. Defaults to `"true"` when empty.           |
| `github-token`     | No       | `${{ github.token }}` | Token used for GitHub API operations required by current mode.                                                            |

### ai-threshold validation

The action fails early when `ai-threshold` is not a finite positive number.
Invalid examples include: non-numeric, zero, negative, empty, and whitespace.

## Execution Preconditions

### Workspace resolution

The action resolves its working directory from `GITHUB_WORKSPACE`:
- If `GITHUB_WORKSPACE` is set and the path exists, it is used.
- If `GITHUB_WORKSPACE` is set but the path does not exist, the action **fails** immediately with a diagnostic message.
- If `GITHUB_WORKSPACE` is unset, the action falls back to the process working directory and emits a warning.

### Pull request context

The action expects pull request context.
If run outside a pull request event, it exits without failure and logs a skip message.

### .human presence

If no `.human` files are discovered in the workspace, the action exits without failure and logs a skip message.

## Protected-File Detection Spec

For changed files in the pull request:
- `free` files are ignored for violations.
- `confirm` files are reported as violations.
- `readonly` files are reported as violations.

The action and local guard use the same core policy evaluation semantics for protection-level classification and violation collection.

If no protected files are modified:
- action reports no violations,
- and in comment mode attempts to remove any previous action-managed comment.

### Changed-file retrieval and pagination

- The action retrieves changed pull-request files through paginated GitHub API requests.
- Pagination uses page size 100 and continues until a page has fewer than 100 files (or no files).

## Comment Mode Spec

### Marker and idempotency

Action-managed comments include a stable marker:
`<!-- humanfile-action -->`

When `comment-on-pr` is true:
- if a marked comment exists, action updates it,
- otherwise action creates one,
- and when violations clear, action deletes the marked comment.

When `comment-on-pr` is false:
- action does not call PR comment create/update/delete APIs,
- action emits actionable logs instead.

## Failure and Warning Semantics

### Confirm-only violations

When all violations are `confirm`-level (no `readonly` violations), the action **never fails the step**. It posts a comment (if enabled) and logs the violations as warnings, but exits successfully.

### Readonly failure behavior

If readonly violations exist and `fail-on-readonly` is true, the action fails.

If readonly violations exist and `fail-on-readonly` is false, the action does not fail solely because of readonly violations.

### Commit message retrieval

The action retrieves commit messages from the first page of the pull request's commits API (`per_page: 100`). Commits beyond the first 100 are not included in the AI heuristic signal.

### Commit message fetch degradations

If commit message retrieval fails, the action emits a warning and continues, falling back to line-count-only heuristic behavior.

## AI Heuristic Spec

- Total changed lines are calculated as the sum of additions plus deletions across all changed files.
- A pull request is flagged as likely AI-generated when either:
	- total changed lines are greater than or equal to `ai-threshold`, or
	- commit messages contain configured AI/tooling signals and total changed lines are greater than half of `ai-threshold`.

These AI heuristic semantics are shared with core policy evaluation used by the CLI guard.

## Permissions Spec

### Comment-enabled mode

Recommended minimum permissions:
- `contents: read`
- `pull-requests: write`

### Log-only mode (`comment-on-pr: false`)

Recommended minimum permissions:
- `contents: read`

`pull-requests: write` is not required in log-only mode.

## Stability Guidance

Update this specification when any of the following changes:
- input names, defaults, or validation behavior
- skip/fail conditions
- comment lifecycle semantics
- permissions expectations tied to supported modes
