# Editor Modes Rationale

## Motivation

One may ask how high-autonomy editor modes should interact with `.human` protections, such as GitHub Copilot's "Bypass Approvals" and "Autopilot" modes.

## Problem Statement

Different editors expose different concepts:

- permission levels
- plan vs act/code modes
- read-only vs full-agent modes

These names differ, but the core risks are the same:

- **Avoid under protection:** mode autonomy can accidentally be treated as permission to ignore repository ownership boundaries.
- **Avoid over protection:** Meanwhile, we do not want to over protect the files when the developers do want to grant approvals automatically.

## Decision

humanfile keeps stable protection levels but uses mode-aware approval semantics.

Repository policy remains constant:

1. `readonly` stays non-editable by agents.
2. `confirm` requires explicit approval before edits.
3. `free` remains unrestricted.

Approval for `confirm` can be satisfied in two ways:

1. Interactive per-edit confirmation.
2. Session-level consent when the user explicitly chooses a fully autonomous mode.

This preserves policy meaning while making autonomous workflows practical.

## Why This Design

1. Safety consistency
    - A team can switch editors or models without silently changing trust boundaries.
2. Cognitive simplicity
    - Developers learn one policy model (`free/confirm/readonly`) and apply it everywhere.
3. Defense in depth
    - Vendor-level approvals reduce accidental tool invocation.
    - humanfile boundaries reduce accidental ownership violations.
    - Both layers remain valuable; neither replaces the other.

## Key Implication For Copilot Modes

For both Bypass Approvals and Autopilot:

- selecting the mode is treated as explicit session-level consent for `confirm` edits,
- and `.human` `readonly` requirements remain unchanged.

Autopilot is more autonomous than Bypass Approvals (auto-responds and keeps iterating), so preserving the hard `readonly` boundary is especially important.

## Trade-offs

1. Short-term friction in high-autonomy modes
    - Lower than strict per-edit prompting because autonomous mode supplies session-level consent.
2. Better long-term trust and auditability
    - Teams retain a hard `readonly` boundary and explicit opt-in semantics for autonomous `confirm` edits.
3. Slightly weaker confirm boundary in autonomous runs
    - `confirm` no longer guarantees per-file interactive prompts when users intentionally select full autonomy.

## Operational Guidance

When vendor docs change mode names or details:

1. Update descriptive docs and config templates.
2. Keep policy invariants unchanged unless `.human` semantics themselves change.
3. Validate behavior in manual QA prompts for each supported editor.

Implementations should also:

1. Scope autonomous consent to session/task rather than global lifetime consent.
2. Surface clear indicators when `confirm` files were edited under autonomous consent.
3. Offer an optional strict mode that still requires per-edit confirmation for `confirm` files.

## Related Documents

- Normative spec: [../specs/editor-modes-and-expected-behavior.md](../specs/editor-modes-and-expected-behavior.md)
- Protection level wording: [terminology-conventions.md](./terminology-conventions.md)
- File format contract: [../specs/human-file-format.md](../specs/human-file-format.md)
