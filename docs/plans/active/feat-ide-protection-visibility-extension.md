---
created: "20260325"
---

# IDE Protection Visibility Extension

## Goal

- Provide an IDE experience where developers can immediately see which files and directories are `free`, `confirm`, or `readonly` based on `.human` rules.
- Make ownership boundaries visible at rest, not only during CLI/action checks.
- Preserve readability and minimize visual noise in large repositories.

## Problem

- Protection state is currently discoverable via CLI (`check`, `explain`) and CI, but not continuously visible in the IDE file explorer/editor.
- Teams can miss protection context when navigating, causing accidental edits or unnecessary confirmation loops.

## Scope

- IDE-first feature, implemented as extension behavior and UI overlays.
- Uses existing core classification logic as source of truth.
- Does not change `.human` semantics.

## Design Alternatives

### Alternative A: Explorer Color Overlay

Concept:
- Color file/folder labels directly in the explorer tree.
- Suggested palette:
    - `free`: neutral/default
    - `confirm`: amber accent
    - `readonly`: red accent

Pros:
- Fastest scan speed; state visible without clicks.
- Closest to familiar gitignored-style mental model.
- Works well for deep tree navigation.

Cons:
- Can conflict with existing theme/icon semantics.
- Accessibility risk for color-blind users without secondary cues.
- Potentially high visual noise in large trees.

### Alternative B: Badge + Icon Channel

Concept:
- Keep default text color, add compact badge/icon per item (e.g., dot, lock, person/check) using decorations.
- Optional legend in extension panel.

Pros:
- Theme-safe and less intrusive than recoloring text.
- Better accessibility when icon shape encodes meaning.
- Easier to layer with git decorations.

Cons:
- Slightly slower to parse than color field.
- Limited icon real estate for long filenames.
- Requires careful icon design for small sizes.

### Alternative C: Contextual Lens + Hover Only

Concept:
- Minimal explorer signal (optional subtle marker), with detailed status shown in file hover, status bar, and editor code lens/header.

Pros:
- Lowest visual clutter.
- Rich explanation possible (winning rule, source `.human`, precedence chain).
- Good for users who prefer focus mode.

Cons:
- Discoverability is weaker for new users.
- Requires interaction to reveal critical state.
- Slower for repo-wide auditing tasks.

### Alternative D: Hybrid Adaptive Mode (Recommended)

Concept:
- Use badges by default (Alternative B), optional color mode (Alternative A), and deep details on hover/lens (Alternative C).
- Provide settings for density and contrast mode.

Pros:
- Balances discoverability, accessibility, and noise control.
- Flexible across personal/team preferences and themes.
- Allows progressive onboarding: simple visuals first, details on demand.

Cons:
- Highest implementation and testing complexity.
- More settings can increase support burden.

## Visual Tokens

- `free`: no marker or hollow neutral marker.
- `confirm`: amber triangle/person marker.
- `readonly`: red lock marker.
- Optional textual fallback: `F`, `C`, `R` for high-contrast mode.

## Data and Refresh Model

- Inputs:
    - discovered `.human` files
    - resolved file classifications
- Recompute triggers:
    - `.human` create/edit/delete
    - file tree changes
    - workspace folder changes
- Performance strategy:
    - incremental recomputation for changed subtrees
    - cache classification results by file path + rule set hash

## UX States

- Empty state: no `.human` found, with CTA to run `humanfile init`.
- Loading state: extension scanning repository.
- Error state: parse/load issues with actionable messages.

## Steps

1. Define UI contract and visual token set.
2. Build extension-side classifier adapter using core library APIs.
3. Implement explorer decorations (badges baseline).
4. Add hover/status-bar detail with provenance (`explain` data).
5. Add settings:
    - `mode`: badge | color | hybrid
    - `showFolders`: boolean
    - `highContrastMarkers`: boolean
6. Add telemetry-free diagnostics command for debugging visual mismatches.
7. Validate accessibility and performance on medium/large repos.

## Validation

- Correctness:
    - Decoration state matches `humanfile check` and `humanfile explain` outputs.
- Accessibility:
    - Non-color cues remain clear in grayscale simulation.
- Performance:
    - Initial render and update latency remain acceptable on large repos.
- Usability:
    - Users can identify protected paths quickly without opening CLI.

## Open Questions

- Should folders display an aggregate level (max severity) or mixed indicator?
- Should unresolved parse errors block decorations or show best-effort fallback?
- Which platform should be first-class target for MVP (VS Code only vs multi-IDE)?

## Recommendation

- Start with Alternative D in phased rollout:
    - Phase 1: badges + hover details
    - Phase 2: optional color mode
    - Phase 3: adaptive presets and accessibility tuning
