# AI interaction history

This folder holds the complete, unedited history of every AI interaction used for this assignment, as Legion requires. The files in `raw/` are byte-for-byte copies of each tool's own native transcript files. Nothing in `raw/` is summarized or edited, except for labeled redactions of credentials, secrets, or unrelated personal information, each recorded in `REDACTIONS.md`.

## How the raw logs are captured

- **Claude Code** (desktop app Code tab or CLI) automatically writes each session to `~/.claude/projects/-Users-McMekxy-Projects-legion-onboarding/<session-id>.jsonl`. Sub-agent sessions and large tool outputs are stored in the `<session-id>/` folder next to it.
- **Codex**, if used, automatically writes each session to `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`.
- **`scripts/sync-ai-history.sh`** copies those files unchanged into `raw/claude-code/` and `raw/codex/`. It runs at the end of every phase and once more at final packaging. Its first run was checked byte for byte against the native file.
- **The desktop app's Export option** produces a zip containing the same JSONL plus app metadata. We use the JSONL directly and leave that metadata out, because it lists the account's connected apps and settings, which is unrelated personal data and adds nothing to the conversation record.
- **Web chat tools** (ChatGPT, claude.ai, and similar) have no automatic capture. If one is used, it is registered below with its URL when it starts and exported at the end through the tool's own data export.

Each `.jsonl` file is in JSON Lines format, with one event per line: user prompts, assistant responses, tool calls and their results, and app metadata such as timestamps, model, and working directory.

## Sessions and threads

| # | Started | Tool and agent | Purpose | Raw log |
|---|---|---|---|---|
| 1 | 2026-10-10 16:43 PT | Claude Code desktop app (Claude Opus 5.5), primary execution agent | Phase 0 bootstrap: project setup, logging design, execution plan. Continues as the primary agent for later phases unless a new session is listed below. | `raw/claude-code/1ef7915c-57bf-4806-b3f9-2125b1adf2a6.jsonl` |

## Known limitations of the record

- **Most model reasoning is not readable.** Claude Code stores most of the model's extended reasoning ("thinking") as an encrypted signature with no readable text. Prompts, visible responses, tool calls, and tool results are complete. To make up for this, agents are told to explain their reasoning in their visible messages.
- **The very end of the final session.** Anything written after the last sync cannot be in the committed copy. The final sync runs as the last step before the final commit, so only a closing confirmation comes after it.
- **Context the tools inject.** The transcripts include context the tools add on their own, such as Emeka's global agent instructions, an account email and organization identifier, and the list of connected tools. Anything removed as unrelated personal information appears as a labeled redaction in `REDACTIONS.md`.
- **Raw transcripts stay out of git until packaging.** Until Emeka approves the redaction policy, `raw/` is excluded from commits so that unredacted personal data never enters git history. The copies are kept on disk and refreshed at every phase.
