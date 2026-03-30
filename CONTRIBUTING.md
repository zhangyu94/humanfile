# Contributing to humanfile

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/zhangyu94/humanfile.git
cd humanfile

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run linting
pnpm lint
```

### Project Structure

```
packages/
├── core/             # npm library + CLI (humanfile)
│   └── configs/      # Agent config templates for multiple platforms
└── action/           # GitHub Action (@humanfile/action)
docs/                 # Structured documentation
```

## Making Changes

1. **Create a branch** from `main` for your work.
2. **Make your changes.** Follow the existing code style (enforced by ESLint).
3. **Add or update tests** for new functionality in the relevant `test/` directory.
4. **Run `pnpm test`** to verify all tests pass.
5. **Run `pnpm lint`** to ensure code style compliance.
6. **Submit a pull request** against `main`.

Plan guidance:
- Use [docs/plans/README.md](./docs/plans/README.md) as the source of truth for plan workflow.
- Check the **Plan Admission Criteria** section before creating a new plan.
- Minor, low-risk, single-scope changes can be implemented directly without adding a plan file.
- Completed plan files may be periodically consolidated into
  [docs/plans/completed-history.md](./docs/plans/completed-history.md).

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

## Adding a New Agent Platform Config

Agent config templates are generated from a single source. To add a new platform:

1. Add the template content to `packages/core/configs/sources/` (or extend `configs/sources/_source.md` if sharing common content).
2. Update `packages/core/configs/build.ts` to add the new target and any necessary transforms.
3. Run `pnpm --filter humanfile configs:build` to regenerate all outputs.
4. Run `pnpm --filter humanfile configs:check-sync` to verify generated files are in sync.
5. Add the platform to the table in `packages/core/configs/README.md`.
6. Add the platform to the "Installable Config Targets" section in the root `README.md`.

## Reporting Issues

- Use the issue templates when available.
- Include steps to reproduce for bugs.
- Include your `.human` file content if relevant.

## Labels and Triage

- `bug`: Confirmed defect with expected behavior mismatch.
- `enhancement`: Backward-compatible improvement to existing behavior.
- `feature`: Net-new capability or workflow.
- `documentation`: Docs-only changes.
- `needs-repro`: Missing or incomplete reproduction details.
- `needs-info`: Additional context requested from reporter.
- `good first issue`: Suitable for first-time contributors.
- `help wanted`: Maintainer-approved tasks open for contribution.

Triage guidance:
- Reproducible bugs should include clear steps, expected behavior, actual behavior, and environment details.
- Feature requests should focus on user problem, constraints, and alternatives considered.
- Issues without enough detail may be labeled `needs-info` and closed if no follow-up is provided.

## Maintainer Response Expectations

- New bug reports and feature requests are acknowledged within 5 business days when maintainers are active.
- High-impact regressions are prioritized first, especially for CLI install/config safety.
- If an issue is blocked on reporter feedback, maintainers request required details and may close after 14 days of inactivity.
- Design-heavy feature requests may be redirected to Discussions first for scoping.
