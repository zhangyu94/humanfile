# Release Guide

Two release commands from repository root:

```bash
pnpm run release:core
pnpm run release:action
```

## Core Release

Command:

```bash
pnpm run release:core
```

What it does:
- Bumps version in `packages/core/package.json`
- Creates release commit/tag using `v*`
- Pushes tag and triggers `.github/workflows/release-core.yml`

Workflow behavior (`release-core.yml`):
- Runs build/test
- Publishes npm package (`humanfile`)
- Creates GitHub release

Prerequisite:
- Configure npm Trusted Publishing for this repository/workflow on npm package `humanfile`.

## Action Release

Command:

```bash
pnpm run release:action
```

What it does:
- Bumps version in `packages/action/package.json`
- Creates release commit/tag using `action-v*`
- Pushes tag and triggers `.github/workflows/release-action.yml`

Workflow behavior (`release-action.yml`):
- Runs build/test
- Creates GitHub release only
- Does not publish to npm

## Tag Policy

- `v*` is reserved for core npm package releases
- `action-v*` is reserved for GitHub Action releases
