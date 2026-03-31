---
created: "20260331"
---

# Chore: drop Windsurf and Cline support

## Goal

- Remove **Windsurf** and **Cline** as first-class, supported editors in this repo.
- Keep all other existing editor integrations and generic behavior intact.
- Make the supported editor list and QA surface area smaller and more focused, without breaking non-editor-specific flows.

## Context

- This project documents and tests editor modes and behavior for multiple IDEs.
- Windsurf and Cline are currently much less popular than other supported editors, so maintaining explicit documentation, QA, and configuration for them has limited value.
- Dropping explicit support means:
  - They are no longer listed as supported editors in specs and docs.
  - They are no longer part of the IDE QA suite or CI matrices.
  - We do not ship editor-specific instructions, screenshots, or test harnesses for them.
- Generic behavior (for example, any editor that can invoke the CLI) may still work; the goal is to drop *first-class* support and expectations, not to block users from experimenting on their own.

## Approach

- Treat this as a **chore** plan: no new product surface area, just narrowing supported-editor scope and reducing maintenance.
- Execute the change in four small passes:
  1. **Inventory and confirm references** to Windsurf and Cline.
  2. **Update documentation** (specs, guides, assets) to remove them from supported lists.
  3. **Tighten QA and CI scope** so they no longer appear in editor matrices or suites.
  4. **Clean up code/config references**, if any, and validate via tests and a final search pass.
- Keep the plan scoped strictly to **Windsurf** and **Cline**; do not touch other editor integrations beyond incidental text reshuffling.

## Steps

- **1. Inventory existing Windsurf/Cline references**
  - [ ] Run `rg "windsurf|WindSurf|cline" docs packages .github` from repo root.
  - [ ] Group hits by category: **specs/docs**, **QA/editor suites**, **configs/code**, **CI/test**.
  - [ ] Confirm there are no unrelated uses of the same words (for example, in external references) before editing.

- **2. Update specs and higher-level docs**
  - [ ] In `docs/specs/editor-modes-and-expected-behavior.md`:
    - [ ] Remove Windsurf and Cline from any lists, tables, or matrices of supported editors.
    - [ ] Adjust example scenarios so they reference only the remaining supported editors (for example Cursor, VS Code), without changing the underlying behavior spec.
  - [ ] In any other specs or design docs under `docs/specs/`/`docs/design/` that mention Windsurf or Cline:
    - [ ] Remove them from enumerations of supported editors.
    - [ ] If there is a “Non-goals” or “Out of scope” section, optionally add a brief note clarifying that Windsurf and Cline are not first-class supported editors.
  - [ ] In top-level docs that list supported editors (for example `packages/core/README.md`, `AGENTS.md`, or other READMEs discovered during the inventory):
    - [ ] Remove Windsurf and Cline from supported-editor lists.
    - [ ] Ensure the remaining list is consistent across files.

- **3. Simplify QA/editor suites**
  - [ ] In `packages/core/humanfile-ide-qa-suite/`:
    - [ ] Remove any Windsurf- or Cline-specific editor runner files or configuration (for example under `editors/` or `results/`), keeping historical artefacts only if they are clearly marked as legacy and not referenced by current workflows.
    - [ ] Update `instructions/*.md` so they no longer describe Windsurf/Cline QA flows or treat them as supported editors.
  - [ ] Ensure the remaining editor QA (for example Cursor and any others) is unaffected by the removal.

- **4. Remove code/config/CI references**
  - [ ] In `packages/core/` and other packages, search for `"windsurf"`, `"WindSurf"`, and `"cline"`:
    - [ ] Remove editor-specific branches or configuration entries for Windsurf and Cline, if they exist.
    - [ ] For any generic editor detection logic, ensure removing these cases does not break behavior for remaining editors (unknown editors should either fall back or fail cleanly as per existing rules).
  - [ ] In `.github/workflows/*.yml`:
    - [ ] Remove Windsurf and Cline from any job matrices, environment variables, or test steps that reference specific editors.
    - [ ] Confirm CI continues to exercise the remaining supported editors only.

- **5. Validation and follow-ups**
  - [ ] Re-run `rg "windsurf|WindSurf|cline" docs packages .github` and verify that:
    - [ ] No references remain in specs, QA instructions, configs, or CI.
    - [ ] Any remaining hits (if any) are intentional (for example, historical notes) and clearly marked as such.
  - [ ] Run `pnpm test` (and any editor-mode test commands) to confirm there are no regressions.
  - [ ] Add a short note to the next release notes or changelog entry indicating that Windsurf and Cline are no longer first-class supported editors.

## Decisions

- **Scope**: This plan only removes **Windsurf** and **Cline** as first-class editors; it does not add support for any new editors.
- **Compatibility**: We will not actively block Windsurf/Cline usage via the CLI or generic flows; we simply stop documenting and testing them.
- **QA surface**: Editor-mode QA will focus on the remaining, more widely used editors to keep coverage meaningful and sustainable.

## Validation

- All references to Windsurf and Cline are removed from active specs, docs, QA instructions, configs, and CI workflows (except any explicitly tagged historical notes).
- The supported editor list is consistent across specs, READMEs, and contributor docs, and no longer mentions Windsurf or Cline.
- Existing tests and editor-mode scenarios for the remaining editors pass without regression.
