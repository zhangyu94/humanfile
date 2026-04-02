---
created: "20260402"
completed: "20260402"
---

# README quick start restructure (policy → agents → hooks → CI)

## Opinion (why do this)

Reordering the root **Quick Start** to:

1. Create a `.human` file  
2. Install agent guidance  
3. Install git hooks *(optional)*  
4. Enforce on pull requests *(optional)*  

matches how people actually adopt the product: **declare policy first**, then **wire editors**, then **optional local and remote enforcement**. It also keeps optional steps clearly optional instead of mixing “see what you did” (`check`) into the numbered path.

Moving **“See effective levels”** (`humanfile check`, and related sanity commands) into **Common CLI commands** is appropriate: verification is reference material developers reach for repeatedly, not a mandatory third step between `init` and `install`.

## Goal

- Reshape [README.md](../../../README.md) **Quick Start** to the four-step flow above (with hooks as step 3, PR as step 4).
- Relocate “see effective levels” / tree classification content under **Common CLI commands** (with short prose + command examples).
- Re-embed or reposition the CLI demo GIF so it still supports the README narrative (see **Demo assets** below).
- Update any dependent docs that describe the old order or demo story.

## Proposed README structure (root)

| Section | Change |
| ------- | ------ |
| **Quick Start** | **1.** `npx humanfile init` (create `.human`) — keep “by hand” note. **2.** `npx humanfile install` (+ `--env` examples as today). **3.** *(Optional)* `humanfile guard install …` — one concise example + pointer to `cli-spec` / `packages/core/DEVELOPMENT.md` for policies. **4.** *(Optional)* GitHub Action snippet (as today) + links to action README / action-spec. |
| **Common CLI commands** | Lead with **classification / provenance**: `check` (whole tree + path), `explain`, `ls`; then guards if not duplicated. Add 1–2 sentences tying `check` to “see effective levels”. |
| **CLI demo media** | **One GIF** under **Common CLI commands** for classification / provenance (`check`, `ls`, `explain`, optionally `init` setup only). **Separate GIFs** embedded next to Quick Start **step 2** (install) and **step 3** (guard), each driven by its own VHS cassette. Update all `alt` text to match each recording. |

## Demo assets (VHS) — three focused recordings

**Rationale for splitting:** One long cassette mixing init, check, explain, install, and guard is hard to maintain and re-record when only one flow changes. **Separate videos per concern** keeps each tape short, makes README step 2 / step 3 self-explanatory, and matches the reordered quick start.

**Tradeoffs**

- **Pros:** Targeted updates (e.g. only re-render guard demo when `guard install` output changes); clearer user mental model; step 2/3 can show real `install` / `guard` without bloating the “explore CLI” demo.
- **Cons:** Three assets to keep in sync for **terminal size, font, theme, and resolution** (reuse the same VHS `Set` block across tapes or a shared include pattern if VHS supports it); larger total binary size in `git`; README gains two more embeds (keep `width`/`height` consistent with today’s fold, e.g. 600×300).

### 1. `cli-demo` (redesign, not “stuff everything in one GIF”)

- **Purpose:** Support **Common CLI commands** — “see effective levels” and provenance.
- **Suggested story:** Hidden setup (temp repo + minimal tree, same as today) → `npx humanfile init` (if you want init visible here) **or** start from “already has `.human`” to avoid duplicating step 1 visually → `npx humanfile check` → `npx humanfile ls` → one or two `explain` examples (confirm / readonly / free with `-n` as today).
- **Outputs:** Keep [docs/assets/cli-demo/cli-demo.gif](../../assets/cli-demo/cli-demo.gif) / `cli-demo.mp4` as the primary **classification** demo; redesign [cli-demo.tape](../../assets/cli-demo/cli-demo.tape) accordingly (drop any obligation to show `install` or `guard` in this file).

### 2. New: install agent guidance demo

- **Purpose:** Quick Start **step 2** only.
- **Suggested story:** Same or similar hidden setup (repo with `.human` already present) → `npx humanfile install --no-prompt --env <one>` (pick one stable env, e.g. `cursor`, per [cli-spec](../../specs/cli-spec.md)) → optional `ls` of the written path to prove the file landed (e.g. `.cursor/rules/humanfile.mdc`). Avoid interactive prompts.
- **Layout (pick one and document in asset README):**
  - **A:** New directory `docs/assets/install-demo/` with `install-demo.tape`, `install-demo.gif`, `install-demo.mp4`, `README.md`, **or**
  - **B:** Second tape under `docs/assets/cli-demo/` (e.g. `install-demo.tape` + `install-demo.gif`) if you want all terminal demos in one folder.
- **README:** Embed `<img src="…/install-demo.gif" …>` immediately under step 2.

### 3. New: git hooks (guard) demo

- **Purpose:** Quick Start **step 3** (optional).
- **Suggested story:** Repo with `.human` → `npx humanfile guard install --hook pre-commit --mode staged` (or the single example chosen for README) → `npx humanfile guard status` to show installed state. If a full hook fire is too noisy or flaky in VHS, end at `guard status` or a one-line “success” message.
- **Layout:** Mirror install demo — e.g. `docs/assets/guard-demo/` **or** `docs/assets/cli-demo/guard-demo.tape` + `guard-demo.gif`.
- **README:** Embed under step 3.

**Cross-cutting constraints**

- Reuse **JetBrains Mono**, **terminal size**, **theme**, and **padding** from the existing cli-demo so all three GIFs look like one product.
- Every cassette: **non-interactive** commands only; verify flags in [docs/specs/cli-spec.md](../../specs/cli-spec.md).
- Re-render commands documented per asset `README.md` (from repo root: `vhs docs/assets/.../*.tape`).

## Files to touch (checklist)

- [x] [README.md](../../../README.md) — Quick Start reorder; step 2 + step 3 embeds; Common CLI + classification GIF; alt text for each asset.
- [x] [docs/assets/cli-demo/cli-demo.tape](../../assets/cli-demo/cli-demo.tape) — Redesign for **classification / provenance** only (see §1).
- [x] [docs/assets/cli-demo/README.md](../../assets/cli-demo/README.md) — Document cli-demo story; fix stale references (`demo.tape` vs `cli-demo.tape`); link to sibling install/guard asset dirs if split.
- [x] **New** install demo: tape + gif + mp4 + `README.md` (path per layout A or B above).
- [x] **New** guard demo: tape + gif + mp4 + `README.md`.
- [x] [docs/assets/README.md](../../assets/README.md) — Index new folders/files if added.
- [x] [packages/action/README.md](../../../packages/action/README.md) — Only if its “Quick Start” duplicates the old numbering; align wording with root README step 4 (optional CI).
- [ ] Optional: add a short note in [docs/plans/completed/20260331-docs-cli-demo-gif.md](../completed/20260331-docs-cli-demo-gif.md) or a new completed plan entry when the new cassette ships (per repo plan-completion habits).

## Validation

- Quick Start reads in order without implying `check` is required before `install`.
- Common CLI section contains `check` + brief “effective levels” explanation.
- All three `vhs …/*.tape` runs succeed locally; committed GIF/MP4 match README alt text and prose.
- Visual consistency across the three demos (font, size, theme).
- No broken internal links after moves.

## Risks

- **Interactive** `install` / **prompts** in any cassette: use `--no-prompt` and explicit `--env` (or documented equivalents).
- **Guard** demo may be environment-sensitive (git, hooks path); keep to the simplest command pair that still reads clearly on GitHub.
- **Repo size:** three GIFs (and optional MP4s); prefer tight scene count and reasonable `Framerate` / length.
