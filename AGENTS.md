# AGENTS.md

This file is the entry point for AI coding agents working in this repository.
It serves as a map — not an encyclopedia.
Follow the pointers below to find deeper context.

## Repository Overview

**humanfile** lets developers declare which files they take responsibility for via `.human` files.
Agents learn to obtain explicit approval before editing, treat these files as source of truth, and respect ownership boundaries.
The project ships a core library + CLI, a GitHub Action, and agent guidance for multiple platforms.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the package layout, dependency graph, and module responsibilities.

## Documentation Map

All long-form documentation lives in `docs/`:

| Path                    | Contents                                |
| ----------------------- | --------------------------------------- |
| `docs/design/`          | Design decisions, core beliefs          |
| `docs/plans/active/`    | Current implementation plans            |
| `docs/plans/completed/` | Archived completed plans                |
| `docs/specs/`           | Product specifications and requirements |
| `docs/references/`      | External reference material             |
| `docs/RELEASE.md`       | Internal release/shipping runbook       |
| `docs/DESIGN.md`        | High-level design philosophy            |
| `docs/PLANS.md`         | Plans index and status                  |

Placement rule:
- `docs/references/` is only for information derived from outside this repository.
- Internal operational guides (for example release/shipping steps) belong in `docs/` (for example `docs/RELEASE.md`).

## Key Conventions

- **Language:** TypeScript (ESM-first, dual CJS build for the core library)
- **Package manager:** pnpm with workspaces
- **Monorepo layout:** `packages/core` (lib + CLI + configs), `packages/action`
- **Tests:** Vitest — run `pnpm test` from root or any package
- **Build:** tsdown — run `pnpm build` from root or any package

## .human File Format

The `.human` file format is the core concept. Full specification:
`docs/specs/human-file-format.md`

Quick summary:
- `.gitignore`-compatible glob syntax
- Plain patterns → `confirm` (agent must ask before each edit; state the file path and intended change before proceeding)
- `!`-prefixed patterns → `readonly` (agent must not edit under any circumstances)
- Unmatched files → `free` (no restrictions)
- Last match wins; nested `.human` files scope to their directory

## Working in This Repo

1. Read `ARCHITECTURE.md` before making structural changes
2. Run `pnpm test` before submitting changes
3. Update `docs/` when adding new features or changing behavior
4. Follow the existing code style — ESLint with `@antfu/eslint-config`
5. When finishing a plan: move it from `docs/plans/active/` to `docs/plans/completed/` with a date-prefixed filename, add `completed` front matter, and update `docs/PLANS.md`.
6. When asked to draft a plan, create it under `docs/plans/active/` (and index it in `docs/PLANS.md`).
