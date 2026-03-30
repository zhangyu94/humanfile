# Config Management Strategy

## Decision

Keep the current generated-template model for `packages/core/configs`:

- maintain a small number of seed sources (`_source.md` plus `humanfile.mdc`), and
- generate editor-specific outputs into `configs/generated/`.

## Alternatives Considered

### Alternative A: Separate hand-maintained file per editor

Pros:
- Maximum per-editor customization.
- No generation step.

Cons:
- High drift risk across editor variants.
- Repeated text updates are error-prone.
- Harder consistency review.

### Alternative B: Seed files + generation (selected)

Pros:
- Single-source updates for shared policy text.
- Deterministic output for all editors.
- Easier validation with sync checks.

Cons:
- Requires a build/check workflow.
- Editor-specific nuance must be modeled in transforms.

## Why This Fits humanfile

humanfile's value proposition depends on policy consistency across tools.
Generated configs optimize for consistency first, while still allowing one
editor-specific source (`humanfile.mdc`) where format differences are larger.

## Relationship To Agent Skills

`.agents/skills/humanfile` remains meaningful even with editor configs:

- editor config files target repository-local instruction channels for specific tools;
- skills target agent runtimes that support skill loading and can provide more structured enforcement behavior.

Not all agents support skills, and not all agents read the same repo files.
Keeping both channels improves coverage in a defense-in-depth model.

## Operational Guidance

- Treat `_source.md` as canonical for shared policy prose.
- Regenerate before release and enforce sync checks in CI.
- Keep generated outputs committed to make install operations deterministic for end users.
- Do not gitignore `packages/core/configs/generated/`; it is a shipped artifact and part of the install contract.

## Naming And Layout Improvements

Suggested incremental improvements:

1. Keep generated outputs under one root, but use subdirectories where the destination convention is inherently nested.
    - Example: `generated/skills/humanfile/SKILL.md`.
2. Introduce optional per-platform folders behind a compatibility layer when clarity needs outweigh migration cost.
    - Example target layout: `generated/cursor/humanfile.mdc`, `generated/copilot/copilot-instructions.md`, etc.
3. Keep top-level generated editor files (or symlinks/copies) during migration to avoid breaking installer lookups and contributor habits.
4. Group source materials by channel as templates grow.
    - Example future layout:
        - `configs/sources/editor-shared.md`
        - `configs/sources/cursor/humanfile.mdc`
        - `configs/sources/skills/humanfile/SKILL.md`

This balances clarity with low migration risk.

## CLI Support For Skill Installation

Because `.agents/skills/humanfile` is considered meaningful, the CLI should support installing it directly.
The install command now supports a skill option so users can install editor configs and the skill template in one workflow.
