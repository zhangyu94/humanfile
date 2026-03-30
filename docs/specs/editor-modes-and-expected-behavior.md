# Editor Modes And Expected Behavior Specification

## Purpose

Define expected behavior for humanfile policy enforcement across supported editor agents and permission modes.

This specification clarifies how approval or autonomy modes of code editors (for example, GitHub Copilot Bypass Approvals and Autopilot) is expected to interact with `.human` protections.

## Scope

This specification applies to environments targeted by `humanfile install`:

- Copilot
- Cursor
- Claude Code
- Windsurf
- Cline
- Codex

## Normative Invariants

The following rules are mandatory across all editor modes:

1. `readonly` files must never be edited by the agent.
2. `confirm` files must require explicit approval before the agent edits.
3. `free` files may be edited without `.human`-specific confirmation.
4. For interactive runs, approval is per-edit human confirmation.
5. For fully autonomous runs, entering autonomous mode is treated as session-level approval for `confirm` edits.
6. If no approved mechanism applies, `confirm` files must not be edited.

Rationale: editor modes change interaction flow and tool approvals. humanfile keeps stable protection levels while allowing two explicit approval mechanisms (interactive confirmation or autonomous session consent).

## Approval Models

humanfile recognizes two valid ways to satisfy `confirm` approval:

1. Interactive approval
    - The agent asks before a `confirm` edit.
    - User response gates the write.
2. Autonomous session consent
    - User explicitly selects a fully autonomous mode for the session.
    - This session-level action authorizes `confirm` edits for that run.

Safety notes:

- Session-level consent for `confirm` does not apply to `readonly` files.
- Implementations should expose clear audit signals when a `confirm` edit happened under autonomous consent.
- Implementations may provide a stricter option that still requires per-edit confirmation in autonomous mode.

## Protection Semantics

Canonical levels are defined by `.human` matching rules:

- `free`: unmatched path
- `confirm`: matched by non-`!` pattern
- `readonly`: matched by `!` pattern

See `.human` format details in [human-file-format.md](./human-file-format.md).

## Mode Capability Matrix

The table below maps documented editor modes to capabilities and expected humanfile behavior.

| Editor      | Mode                     | Vendor-documented capabilities                                          | Expected humanfile behavior                                                             |
| ----------- | ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Copilot     | Default Approvals        | Normal tool approvals; prompts where configured                         | Enforce `free/confirm/readonly` invariants                                              |
| Copilot     | Bypass Approvals         | Auto-approves tool calls; can auto-retry failures                       | Treat mode selection as session-level consent for `confirm`; keep `readonly` blocked    |
| Copilot     | Autopilot (Preview)      | Auto-approves tools, auto-responds to questions, continues autonomously | Treat mode selection as session-level consent for `confirm`; keep `readonly` blocked    |
| Cursor      | Agent mode               | Can edit files and run commands                                         | Always require per-edit confirmation for `confirm`; `readonly` always blocked            |
| Cursor      | Plan Mode                | Produces plan before implementation                                     | Do not perform writes while planning; still enforce invariants if implementation starts |
| Claude Code | `default`                | Standard first-use prompt behavior                                      | Enforce `free/confirm/readonly` invariants                                              |
| Claude Code | `acceptEdits`            | Auto-accept file edit permissions for session                           | Treat mode as session-level consent for `confirm`; keep `readonly` blocked              |
| Claude Code | `plan`                   | Analyze-only; no file modification or command execution                 | No writes; invariants hold trivially                                                    |
| Claude Code | `auto`                   | Auto-approval with classifier-based safeguards                          | Treat mode as session-level consent for `confirm`; keep `readonly` blocked              |
| Claude Code | `dontAsk`                | Auto-deny tools unless pre-approved by rules                            | If writes happen through approved paths, enforce invariants                             |
| Claude Code | `bypassPermissions`      | Skips permission prompts except protected editor directories            | Treat mode as session-level consent for `confirm`; keep `readonly` blocked              |
| Windsurf    | Ask Mode                 | Read-only exploration                                                   | No writes; invariants hold trivially                                                    |
| Windsurf    | Plan Mode                | Planning workflow prior to implementation                               | No writes during planning; invariants hold if implementation starts                     |
| Windsurf    | Code Mode                | Full agentic edit/command capabilities                                  | Treat mode as session-level consent for `confirm`; keep `readonly` blocked              |
| Cline       | Plan Mode                | Read/search/strategy; no file edits or commands                         | No writes; invariants hold trivially                                                    |
| Cline       | Act Mode                 | Can edit files and run commands                                         | Treat mode as session-level consent for `confirm`; keep `readonly` blocked              |
| Codex       | Ask (ChatGPT Codex UI)   | Question-answer workflow over codebase context                          | No direct write expectation in ask-only workflow                                        |
| Codex       | Code (ChatGPT Codex UI)  | Executes coding task in isolated environment with edits/commands        | Treat mode as session-level consent for `confirm`; keep `readonly` blocked              |
| Codex CLI   | `codex exec` default     | Read-only sandbox by default                                            | No writes; invariants hold trivially                                                    |
| Codex CLI   | `codex exec --full-auto` | Allows edits in automation path                                         | Treat mode/flag as session-level consent for `confirm`; keep `readonly` blocked         |

## Cursor Agent Mode Classification

Cursor Agent mode is **not** treated as a fully autonomous session, even though it
can edit files and run commands. The distinction from modes that receive session-level
consent (e.g. Copilot Autopilot, Claude Code `auto`, Codex `--full-auto`) is:

1. **Interactive by design.** Cursor Agent mode runs inside an IDE session where the
   user is actively present. The agent can ask questions and wait for answers — the
   UI is built for this interaction pattern.
2. **No explicit autonomy opt-in.** Modes like Copilot Autopilot or `codex exec --full-auto`
   require a deliberate user action to grant autonomous execution. Cursor Agent mode
   is the default working mode — entering it does not signal "run without asking."
3. **Per-edit confirmation is practical.** Because the user is watching, stopping to
   ask before editing a `confirm` file adds minimal friction while preserving the
   human-in-the-loop guarantee that `.human` is designed to enforce.

For these reasons, the Cursor config requires per-file approval for `confirm`-level
files in Agent mode rather than granting blanket session consent.

## Recommended Guardrails

To reduce risk while keeping autonomous workflows practical:

1. Session-bounded consent
    - Treat autonomous consent as scoped to the current session or delegated task.
2. Clear observability
    - Emit a visible note when `confirm` files were edited under autonomous consent.
3. Optional strict mode
    - Offer a configuration to require per-edit confirmation for `confirm` even in autonomous runs.

## Handling Vendor Drift

Vendors may rename modes or adjust exact permission details over time.

When drift occurs:

1. Preserve the normative invariants in this document.
2. Update mode names and capability descriptions to match current vendor docs.
3. Regenerate editor-specific configuration outputs from canonical sources.

## Official Documentation References

- GitHub Copilot agents overview: https://code.visualstudio.com/docs/copilot/agents/overview
- GitHub Copilot permission levels and Autopilot details: https://code.visualstudio.com/docs/copilot/agents/agent-tools#_permission-levels
- Cursor agent overview: https://cursor.com/docs/agent/overview
- Cursor Plan Mode: https://cursor.com/docs/agent/plan-mode
- Claude Code permission modes: https://code.claude.com/docs/en/permissions
- Claude Code settings reference: https://code.claude.com/docs/en/settings
- Windsurf Cascade modes: https://docs.windsurf.com/windsurf/cascade/modes
- Cline Plan and Act mode: https://docs.cline.bot/features/plan-and-act
- OpenAI Codex overview: https://developers.openai.com/codex
- OpenAI Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- OpenAI Codex product announcement (Ask/Code wording): https://openai.com/index/introducing-codex/
