# Core Beliefs

The following principles guide design and implementation decisions.

## 1. Human Ownership Is Non-Negotiable

AI agents are powerful collaborators, but humans must retain explicit control over critical code and documentation.
The right to declare "I take responsibility for this" should be as simple as creating a file.

Declaring ownership does not mean a file must be entirely hand-written.
It means a human has decided to stay in the loop — to review, approve, or reject any changes.

## 2. Boundaries Enable Speed

Constraints increase efficiency for both AI and human.

For AI:
- When an agent knows which files it can freely modify, it can move fast without fear of breaking human-maintained invariants.
- Files declared in `.human` serve as **source of truth** — agents can rely on their content when encountering conflicting information elsewhere in the repo.

For human:
- Clear boundaries reduce the need for expensive full-repo reviews.
- Knowing that ownership is enforced preserves the **motivation to invest in manual editing**. Developers won't fear that AI will silently overwrite their work.

## 3. Convention Over Configuration

Reuse existing developer mental models (`.gitignore` syntax, directory scoping, last-match-wins).
Minimize new concepts.
If a developer can write a `.gitignore`, they can write a `.human` file.

## 4. Defense in Depth

No single mechanism is sufficient.
Agent guidance can be bypassed.
CI checks can be ignored.
Visual indicators can be overlooked.
Layering all three creates a robust system.

## 5. Progressive Disclosure

Start simple.
A single `.human` file at the repo root with two lines is enough to get started.
Advanced features (nested scoping, per-agent rules) are available but not required.

## 6. Prefer `confirm` Over `readonly`

The `!` (readonly) level is powerful but should be used sparingly.
When too many files are marked readonly, agents cannot update them even when the information becomes stale.
For most files, `confirm` is the better default: agents can still propose changes, they just need to ask first.
Reserve `!` for files that truly require human oversight on every change (LICENSE, security policies, hand-tuned configs).

## 7. Repository as Source of Truth

Following the [Harness Engineering](https://openai.com/index/harness-engineering/) philosophy: everything an agent needs to know should be discoverable from the repository itself.
`.human` files are versioned, co-located, and machine-readable.
