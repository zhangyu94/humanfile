# Plans

Engineering and research plans: goals, context, and execution notes.

This file is the source of truth for plan layout, YAML front matter, and naming.

## Directory Layout

| Path                     | Purpose                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| [active/](active/)       | Work in progress. Filename: `{type}-{shortDescription}.md`                                  |
| [completed/](completed/) | Temporary archive before consolidation. Filename: `{YYYYMMDD}-{type}-{shortDescription}.md` |

## YAML Front Matter Rules

Every plan in `active/` or `completed/` must start with:

```yaml
---
created: "YYYYMMDD"
---
```

Completed plans must also include:

```yaml
completed: "YYYYMMDD"
```

- `created`: date the plan document started
- `completed`: date work was considered done (required only in `completed/`)

## Allowed Type Values

| Type       | Use for                                    |
| ---------- | ------------------------------------------ |
| `feat`     | New capability or user-visible behavior    |
| `fix`      | Bug fixes, reliability, incorrect behavior |
| `refactor` | Internal changes without behavior change   |
| `research` | Exploration, benchmarks, spikes            |
| `docs`     | Documentation-only plans                   |
| `chore`    | Tooling, cleanup, debt management          |
| `perf`     | Performance work                           |
| `test`     | Test coverage or test infrastructure       |

These align with [Conventional Commits](https://www.conventionalcommits.org/) types (`research` is an added type).

## File Naming

### Active (`docs/plans/active/`)

`{type}-{shortDescription}.md`

Examples:
- `feat-pattern-support.md`

### Completed (`docs/plans/completed/`)

`{YYYYMMDD}-{type}-{shortDescription}.md`

Examples:
- `20260324-test-classify-all-integration.md`
- `20260324-perf-glob-matching-benchmarking.md`

## Lifecycle

1. Plan: create file in `active/` with required YAML.
2. Implement: update the plan as work progresses.
3. Complete: move to `completed/`, rename with completion date, add `completed` in YAML.
4. Consolidate: periodically fold completed plans into `./completed-history.md` and remove per-plan files.

Definition of done for any plan:
- If all plan steps are checked, the plan must no longer remain in `active/`.
- The completed copy in `completed/` must include both `created` and `completed` front matter fields.
- The plan must be reflected in `docs/PLANS.md` (`Active` removed, `Completed` added).

## Plan Admission Criteria

Use a plan in `active/` when the work is non-trivial or benefits from explicit tracking.
For minor, low-risk changes, contributors may implement directly without creating a plan.

Create a plan when any of the following is true:

- The change spans multiple packages, subsystems, or documents.
- The change introduces or modifies a stable contract (CLI/API/format/spec behavior).
- The work requires phased rollout, migration, or explicit rollback strategy.
- The work has elevated risk, uncertainty, or notable user impact.
- The work is expected to span multiple commits or sessions.

No plan is required for small, single-scope changes that are low-risk and fully covered by tests and review context.

## Plan Body Template

```markdown
---
created: "20260324"
---

# Short Title

## Goal
- ...

## Context
- ...

## Approach
- ...

## Steps
- ...

## Decisions
- ...

## Validation
- ...
```

## After Completion Checklist

1. Move file from `active/` to `completed/`.
2. Rename with date prefix: `{YYYYMMDD}-{type}-{shortDescription}.md`.
3. **Add `completed: "YYYYMMDD"` to YAML front matter** (required — do not skip).
4. Update links in [../PLANS.md](../PLANS.md).
5. **Evaluate whether the plan produced a new specification** (API contract, file format, protocol, etc.). If so, add or update a spec in `../specs/`. Most plans (bug fixes, chores, docs) will not need a spec.
6. Verify the plan is absent from `active/` and present in `completed/`.

## Consolidation Policy

- Completed plan files may be consolidated into `./completed-history.md` to keep public docs compact.
- Before removing completed plan files, ensure durable outcomes are represented in `../specs/`, package READMEs, or other long-lived docs.
- Keep summary metadata in the consolidated history (date, plan slug, outcome).
