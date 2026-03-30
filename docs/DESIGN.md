# Design

This file is a map to the design documentation set.

## Where To Put What

- `docs/design/`: long-form design decisions, alternatives, and trade-offs.
- `docs/specs/`: normative contracts that implementations must satisfy.
- `docs/PLANS.md`: execution plans and delivery tracking.
- `docs/references/`: external-source reference notes and summaries.

## Index

| Document                                                          | Topic                                                                    | Status |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| [overview.md](./design/overview.md)                               | Product-level design overview and key implementation decisions           | Active |
| [core-beliefs.md](./design/core-beliefs.md)                       | Core operating principles for the humanfile project                      | Active |
| [config-management.md](./design/config-management.md)             | Strategy and trade-offs for managing multi-editor config templates       | Active |
| [terminology-conventions.md](./design/terminology-conventions.md) | Canonical wording for protection levels in docs, comments, and messaging | Active |
| [editor-modes-rationale.md](./design/editor-modes-rationale.md)   | Why editor autonomy modes must not weaken `.human` protection semantics  | Active |

## Adding a Design Document

1. Create a new `.md` file in `docs/design/`
    - Include: motivation, alternatives considered, decision, consequences
2. Add an entry to the index table above
