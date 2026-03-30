# @humanfile/action

GitHub Action for detecting modifications to `.human`-protected files in pull requests.

## Quick Start

Prerequisites:
- Repository contains at least one `.human` file.
- Workflow runs on `pull_request`.
- Checkout and Node/pnpm setup are available in the job.

```yaml
name: humanfile

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter humanfile build

      - name: Check .human boundaries
        uses: zhangyu94/humanfile/packages/action@action-v1
```

## Monorepo Action Reference

This action is shipped from a subpath in the monorepo, so workflow references
must include the package path:

```yaml
uses: zhangyu94/humanfile/packages/action@action-v1
```

Why `action-v1` instead of `v1`:
- This repository's release workflow publishes the core npm package on `v*` tags.
- Creating a plain `v1`/`v1.x.y` tag only for action changes can accidentally trigger core release automation.
- Scoped action tags (`action-v*`) avoid that collision.

Tag notes:
- `@action-v1` is a moving major alias for compatible action updates.
- Use immutable tags such as `@action-v1.2.0` or a full commit SHA for stricter reproducibility.

## Required Permissions

For pull-request usage with comments enabled:
- `contents: read` to read repository contents.
- `pull-requests: write` so the action can create or update PR comments.

For log-only mode (`comment-on-pr: false`):
- `contents: read` is sufficient.
- `pull-requests: write` is not required.

## Inputs

| Input              | Required | Default               | Description                                                  |
| ------------------ | -------- | --------------------- | ------------------------------------------------------------ |
| `ai-threshold`     | No       | `1000`                | Total line-change threshold for AI-likelihood heuristic.     |
| `fail-on-readonly` | No       | `true`                | Fail the check when readonly-protected files are modified.   |
| `comment-on-pr`    | No       | `true`                | Create/update PR comments. Set `false` for log-only mode.    |
| `github-token`     | No       | `${{ github.token }}` | Token used for PR API calls (list files, comments, commits). |

Configuration source of truth: `inputs` in `action.yml`.

When to tune each input:
- `ai-threshold`: increase for large monorepos to reduce noisy AI-likely warnings; decrease for smaller repos to catch large generated diffs sooner.
- `fail-on-readonly`: keep `true` for strict enforcement; set `false` when you want comment-only guidance.
- `comment-on-pr`: keep `true` for PR comment visibility; set `false` in environments where comment permissions are unavailable.
- `github-token`: override only when using a custom token with different permissions than the default workflow token.

## Tuning Examples

Strict mode (fail on readonly violations):

```yaml
- name: Check .human boundaries (strict)
  uses: zhangyu94/humanfile/packages/action@action-v1
  with:
    ai-threshold: 800
    fail-on-readonly: true
```

Permissive mode (warn via comment, do not fail readonly):

```yaml
- name: Check .human boundaries (permissive)
  uses: zhangyu94/humanfile/packages/action@action-v1
  with:
    ai-threshold: 1500
    fail-on-readonly: false
```

Log-only mode (no PR comment writes):

```yaml
- name: Check .human boundaries (log-only)
  uses: zhangyu94/humanfile/packages/action@action-v1
  with:
    comment-on-pr: false
```

## Behavior

1. Loads `.human` rule sets from the checked out repository.
2. Fetches changed files from the PR.
3. Classifies each changed file as `free`, `confirm`, or `readonly`.
4. Posts or updates a PR comment when protected files are touched (unless `comment-on-pr: false`).
5. Optionally fails the check on readonly violations.

## Sample PR Comment

```md
## ⚠️ humanfile — Protected Files Modified

**Severity:** Warning
**Total lines changed:** 1124

### 🔒 Readonly-Protected Files Modified
| File      | Additions | Deletions |
| --------- | --------- | --------- |
| `LICENSE` | +2        | -0        |

### 👤 Confirm-Protected Files Modified
| File                  | Additions | Deletions |
| --------------------- | --------- | --------- |
| `docs/specs/guide.md` | +18       | -3        |
```

## Troubleshooting

- No comment appears:
  Ensure your workflow has `pull-requests: write` permission, `comment-on-pr` is `true`, and the workflow runs on a PR event.
- Action skips with "No .human files found":
  Add `.human` to the repository root or a nested directory included in checkout.
- Build fails with missing `humanfile` dependency:
  Run `pnpm --filter humanfile build` before building the action (the action bundles `humanfile` as a dependency).
- Unexpected readonly failures:
  Validate `.human` precedence rules (last match wins, deeper scope overrides).
- AI-likelihood feels too sensitive:
  Increase `ai-threshold` to reduce warnings on medium-sized PRs.

## Development

```bash
pnpm build
pnpm test
```
