---
created: "20260331"
---

# Chore: humanfile dogfood workflow

## Goal

- Add a dedicated **dogfood CI workflow** that exercises `humanfile` on this repository itself.
- Use it to catch regressions in the CLI, GitHub Action, and `.human` governance before users do.

## Scope

- In scope:
  - A new workflow under `.github/workflows/` (for example `humanfile-dogfood.yml`).
  - Running `humanfile` **against this repo** in a way that mimics real usage:
    - CLI checks (`check`, `explain`, `guard` where practical).
    - GitHub Action invocation against a synthetic or real PR diff.
  - Triggering on:
    - `pull_request` to `main`.
    - Optionally `workflow_dispatch` for manual runs.
- Out of scope:
  - Cross-repo dogfooding (trial repo is covered elsewhere).
  - Full matrix of Node versions (kept in the main CI workflow).

## Approach

1. **Define dogfood scenarios**
   - CLI:
     - `npx humanfile check` at repo root should succeed and classify a small sample (e.g. `README.md`, `docs/specs/human-file-format.md`, `packages/core/src/index.ts`).
     - `npx humanfile explain` on at least one `free`, one `confirm`, and one `readonly` path should return sensible provenance.
   - Guard:
     - In a temporary git worktree, install a pre-commit guard and confirm it blocks an obviously-bad change to a `readonly` path (for example `LICENSE`) while allowing a small change to a `free` path.
   - Action:
     - Run the published action (or a workspace checkout of it) against this repo:
       - For a change that touches only `free` paths: expect success.
       - For a change that touches `readonly` paths: expect failure and a violation report.

2. **Design the workflow**
   - New workflow file: `.github/workflows/humanfile-dogfood.yml`.
   - One job `dogfood`:
     - `runs-on: ubuntu-latest`.
     - Steps:
       - Checkout the repo.
       - Set up Node + pnpm.
       - Install dependencies with `pnpm install --frozen-lockfile --ignore-scripts`.
       - Run a lightweight CLI dogfood script (for example `pnpm --filter humanfile run dogfood:cli`).
       - Run an Action dogfood script (for example `pnpm --filter humanfile run dogfood:action`).

3. **Add helper scripts**

- In `packages/core/package.json`, add:
  - `dogfood:cli`: minimal script that:
    - Spawns `tsx` or node to:
      - run `humanfile check` and `humanfile explain` against a small fixed set of paths.
      - exit non-zero if expectations are not met.
- In `packages/action/package.json` (or a small `scripts/dogfood-action.ts`):
  - `dogfood:action`: script that:
    - Synthesizes a small diff (for example via `git diff` against HEAD^, or by using a fixture repository).
    - Invokes the action logic as it would run in CI.
    - Asserts that `fail-on-readonly` and classification behavior match the `action-spec`.

4. **Wire into CI**

- Add the new workflow, but keep it **separate from main `ci.yml`** so:
  - It can be re-run independently via the Actions tab.
  - It can be temporarily disabled without affecting typecheck/test gates.

## Steps

- [ ] Draft specific CLI dogfood scenarios and implement `dogfood:cli` script in `packages/core`.
- [ ] Draft specific Action dogfood scenarios and implement `dogfood:action` helper.
- [ ] Create `.github/workflows/humanfile-dogfood.yml` that:
  - [ ] Checks out repo, sets up Node + pnpm.
  - [ ] Runs `pnpm --filter humanfile run dogfood:cli`.
  - [ ] Runs `pnpm --filter @humanfile/action run dogfood:action` or equivalent.
- [ ] Run the dogfood workflow on a test PR and adjust thresholds/expectations.
- [ ] Document the workflow briefly in `ARCHITECTURE.md` under `.github/workflows/`.

## Validation

- The dogfood workflow passes on the current `main` branch.
- Intentionally breaking `.human` invariants or action behavior in this repo causes the dogfood workflow to fail.
- Contributors can read `ARCHITECTURE.md` + the workflow file and understand:
  - how `humanfile` is being exercised on its own repo, and
  - where to adjust scenarios when specs evolve.

