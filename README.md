# humanfile

[![npm version](https://img.shields.io/npm/v/humanfile)](https://www.npmjs.com/package/humanfile)
[![CI](https://github.com/zhangyu94/humanfile/actions/workflows/ci.yml/badge.svg)](https://github.com/zhangyu94/humanfile/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Move fast with AI, without losing human ownership.**

> [!WARNING]
> This repository is still under active development and is not fully tested yet.
> Expect breaking changes and rough edges.

`.human` files let you declare where a human stays in the loop, using familiar `.gitignore`-style patterns. Coding agents can move quickly on `free` paths, must ask on `confirm` paths, and must not edit `readonly` paths.

## Why?

AI coding agents can modify any file in your repository. Without boundaries:

- Your carefully crafted documentation gets overwritten by AI-generated text
- A colleague's hand-tuned config gets silently replaced in an AI-driven PR
- Developers lose motivation to invest in manual editing — why bother if AI will just overwrite it?
- Agents can't tell which files are the source of truth when they see conflicting information

`humanfile` gives you a lightweight policy that prevents the highest-risk changes while keeping delivery speed high:

- `free` paths keep shipping velocity high.
- `confirm` paths force explicit human consent.
- `readonly` paths block edits to critical files.

```
# .human — declare where you want to stay in the loop

docs/specs/    # agent should ask before editing

!LICENSE       # agent should not edit (use sparingly)
```

`humanfile` enforces this with three layers of defense:

```
                    .human
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     🤖 Agent       🪝 Git         ⚙️ CI
     Guidance       Hooks         Action

  Agents check    Commits are     PRs flag
  before editing  blocked locally violations
```

## Quick Start

### 1. Create a .human file

```bash
npx humanfile init
```

This creates a starter `.human` policy file in your project root so protection rules can be evaluated.

Or create one manually:

```text
docs/specs/
!LICENSE
```

### 2. Check protection levels

```bash
npx humanfile check
```

This prints each matched file with its effective protection level so you can verify your patterns before using them in agent workflows.

### 3. Install guidance for your AI tool

```bash
npx humanfile install
```

This writes environment-specific instruction/config files (for example, Copilot or Cursor guidance files) so your agent can follow `.human` boundaries during edits.

Common explicit targets:

```bash
npx humanfile install --env cursor
npx humanfile install --env copilot
npx humanfile install --env claude
npx humanfile install --env windsurf
npx humanfile install --env cline
npx humanfile install --env codex
```

### 4. Enforce in CI (recommended)

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

After this workflow is enabled, pull requests are automatically checked and flagged (or failed, based on your settings) when changes violate your configured boundaries.

Action setup details: [packages/action/README.md](./packages/action/README.md)

## Protection Levels

| Level    | Syntax    | Agent behavior                  |
| -------- | --------- | ------------------------------- |
| free     | unmatched | Agent edits without restriction |
| confirm  | pattern   | Agent asks for permission first |
| readonly | !pattern  | Agent cannot edit               |

Tip: Use confirm by default, and reserve readonly for files that should always require human control.

## Most Used CLI Commands

```bash
npx humanfile check
npx humanfile explain src/index.ts
npx humanfile install
npx humanfile guard install --hook both --mode staged
npx humanfile guard install --hook both --mode diff --policy ai-aware --ai-threshold 1200
npx humanfile guard status
npx humanfile ls
```

Full command/flag reference: [docs/specs/cli-spec.md](./docs/specs/cli-spec.md)

## Installable Config Targets

The Config column shows destination paths written by humanfile install.

| Platform       | Config                          |
| -------------- | ------------------------------- |
| Cursor         | .cursor/rules/humanfile.mdc     |
| GitHub Copilot | .github/copilot-instructions.md |
| Claude Code    | CLAUDE.md                       |
| Windsurf       | .windsurfrules                  |
| Cline          | .clinerules                     |
| Codex          | AGENTS.md                       |

## Library API

If you want to integrate humanfile into custom tooling, see API docs: [packages/core/README.md](./packages/core/README.md).

## Learn More

- Specifications: [docs/SPECS.md](./docs/SPECS.md)
- Architecture and internals: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Contributor guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Agent entrypoint for this repo: [AGENTS.md](./AGENTS.md)
