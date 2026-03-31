# humanfile

[![npm version](https://img.shields.io/npm/v/humanfile?style=flat)](https://www.npmjs.com/package/humanfile)
[![npm downloads](https://img.shields.io/npm/dm/humanfile?style=flat)](https://www.npmjs.com/package/humanfile)
[![CI](https://github.com/zhangyu94/humanfile/actions/workflows/ci.yml/badge.svg)](https://github.com/zhangyu94/humanfile/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Move fast with AI, without losing human ownership.**

**humanfile** is a CLI and npm library for declaring boundaries for coding agents.
You write `.human` files using `.gitignore`-style patterns so both agents and collaborators can see which areas are expected to be human-maintained.
Every path gets a **protection level**:

| In plain terms           | Level      | Syntax (in `.human`)              |
| ------------------------ | ---------- | --------------------------------- |
| Agent may edit freely    | `free`     | _(no matching rule)_              |
| Agent must ask you first | `confirm`  | plain pattern, e.g. `docs/specs/` |
| Agent must not edit      | `readonly` | `!` + pattern, e.g. `!LICENSE`    |

The detailed rules (precedence, `!` vs `.gitignore` negation, examples) are in [docs/specs/human-file-format.md](./docs/specs/human-file-format.md).
Prefer `confirm` for areas you own day-to-day.
Use `readonly` sparingly for files agents must never touch.

> [!WARNING]
> This repository is still under active development and is not fully tested yet.
> Expect breaking changes and rough edges.

## Why humanfile?

AI coding agents can modify any file in your repository. Without boundaries:

- Your carefully crafted documentation gets overwritten by AI-generated text
- A colleague's hand-tuned config gets silently replaced in an AI-driven PR
- Developers lose motivation to invest in manual editing — why bother if AI will just overwrite it?
- Agents can't tell which files are the source of truth when they see conflicting information

**humanfile** gives you a lightweight policy that limits the highest-risk edits while keeping delivery speed high: **`free`** for velocity, **`confirm`** for consent, **`readonly`** for hard stops.

Minimal `.human` example:

```text
docs/specs/    # confirm — ask before editing specs
!LICENSE       # readonly — do not edit (use sparingly)
```

## How it shows up in your repo

```
                    .human
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     🤖 Agent       🪝 Git         ⚙️ CI
     guidance       hooks         Action

  check before   optional blocks  PR feedback
  editing        on commit/push   in CI
```

- **Agent guidance:** `humanfile install` drops instructions for Cursor, Copilot, Claude Code, and other tools (see table below).
- **Git hooks:** `humanfile guard install` runs checks on staged files or on push (optional).
- **CI:** the published GitHub Action comments on PRs and can fail when `readonly` rules are broken (optional).

## Quick Start

Requires **Node.js 20+** for `npx humanfile`.

### 1. Create a `.human` file

```bash
npx humanfile init
```

This writes a starter `.human` in the project root.
You can also author `.human` by hand.

### 2. See effective levels

```bash
npx humanfile check
```

Lists classified files and a short summary so you can sanity-check patterns before relying on agents or CI.

Example CLI run (init → check → ls → explain):

<img src="docs/assets/cli-demo/cli-demo.gif" width="600" height="300" alt="CLI demo: init, check, ls, explain" />

### 3. Install agent guidance

```bash
npx humanfile install
```

Writes editor- or platform-specific instructions so agents know your boundaries.
You may target one environment explicitly with:

```bash
npx humanfile install --env cursor
npx humanfile install --env copilot
npx humanfile install --env claude
npx humanfile install --env windsurf
npx humanfile install --env cline
npx humanfile install --env codex
```

### 4. Enforce on pull requests (recommended)

The GitHub action is published from this monorepo repo.
Reference it by **tag** (for example `action-v0.1.3`) and **subpath** `packages/action`:

```yaml
name: humanfile
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zhangyu94/humanfile/packages/action@action-v0.1.3
        with:
          ai-threshold: 1000
          fail-on-readonly: true
```

Action setup details: [packages/action/README.md](./packages/action/README.md) and [docs/specs/action-spec.md](./docs/specs/action-spec.md).

Example PR run (GitHub Action CI):

<img src="docs/assets/action-demo/action-demo.gif" width="600" height="300" alt="GitHub Action demo: failing check and PR comment" />

## Common CLI commands

```bash
npx humanfile check
npx humanfile explain path/to/file    # provenance for one path (add --non-matching / -n for free paths)
npx humanfile ls
npx humanfile install
npx humanfile guard install --hook both --mode staged
npx humanfile guard install --hook both --mode diff --policy ai-aware --ai-threshold 1200
npx humanfile guard status
```

Full CLI contract: [docs/specs/cli-spec.md](./docs/specs/cli-spec.md).

## `humanfile install` targets

| Platform       | Path written by `install`         |
| -------------- | --------------------------------- |
| Cursor         | `.cursor/rules/humanfile.mdc`     |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Claude Code    | `CLAUDE.md`                       |
| Windsurf       | `.windsurfrules`                  |
| Cline          | `.clinerules`                     |
| Codex          | `AGENTS.md`                       |

## Library API

To depend on the **humanfile** package from TypeScript or Node: [packages/core/README.md](./packages/core/README.md) and [docs/specs/core-library-api-spec.md](./docs/specs/core-library-api-spec.md).

## Learn more

| Doc                                                                                                    | What it's for                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| [docs/SPECS.md](./docs/SPECS.md)                                                                       | Index of product specs                            |
| [docs/specs/human-file-format.md](./docs/specs/human-file-format.md)                                   | `.human` syntax and semantics                     |
| [docs/specs/editor-modes-and-expected-behavior.md](./docs/specs/editor-modes-and-expected-behavior.md) | How editor modes relate to `confirm` / `readonly` |
| [docs/DESIGN.md](./docs/DESIGN.md)                                                                     | Design philosophy                                 |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                                                   | Monorepo layout                                   |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                                                                   | Contributing                                      |
| [AGENTS.md](./AGENTS.md)                                                                               | Map for AI agents working in this repo            |
