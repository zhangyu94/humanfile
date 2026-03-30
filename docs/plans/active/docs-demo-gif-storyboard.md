---
created: "20260326"
---

# Demo GIF Storyboard Plan

## Goal

- Produce a high-quality, short demo GIF that clearly shows init, check, and PR feedback flow.
- Keep readability crisp on GitHub desktop and mobile.

## Context

- The previous GIF was visually coarse and unsuitable for README conversion.
- The demo should communicate value quickly without distracting motion.

## Storyboard

### Shot 1: Setup Context (2s)

- Frame: clean terminal in a realistic repo.
- Action: show existing files and no `.human` yet.
- Caption: "Start with a normal repo".

### Shot 2: Initialize Policy (3s)

- Action: run `npx humanfile init`.
- Visual focus: generated `.human` content appears.
- Caption: "Declare ownership boundaries".

### Shot 3: Check Classification (4s)

- Action: run `npx humanfile check`.
- Visual focus: `readonly`, `confirm`, and `free` rows.
- Caption: "See protection levels instantly".

### Shot 4: PR Enforcement (4s)

- Frame: PR comment mock or captured GitHub UI snippet.
- Visual focus: separate sections for readonly-protected and confirm-protected changes.
- Caption: "CI flags boundary violations before merge".

### Shot 5: Outcome Summary (2s)

- Frame: concise three-bullet overlay.
- Text:
    - "Fast on free paths"
    - "Approval on confirm paths"
    - "Block on readonly paths"

## Production Specs

- Aspect ratio: 16:10 or 16:9.
- Render width: 1200-1440px master, export README GIF at 960px.
- FPS: 12-16.
- Duration: 10-15 seconds total.
- Font: monospaced terminal font with clear anti-aliasing.
- Compression target: <= 3 MB GIF (or MP4 fallback for docs pages).

## Steps

- [ ] Capture high-resolution terminal/GitHub source clips.
- [ ] Edit according to storyboard timing.
- [ ] Add concise captions with consistent terminology.
- [ ] Export optimized GIF and verify quality in GitHub markdown preview.
- [ ] Replace README placeholder note with final asset.

## Validation

- Text remains readable on mobile viewport.
- Motion is smooth and non-distracting.
- Terminology matches repository conventions.
- Asset size and load time are acceptable on README.
