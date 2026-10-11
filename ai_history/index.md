# AI interaction history

This folder holds the history of every AI interaction used for this assignment, as Emeka defined it for this project (STATUS.md, decision L6).

## What each transcript contains

Each transcript contains only two things, verbatim, in order, with timestamps:

1. Every message Emeka typed to the AI.
2. Every response the AI presented back to Emeka.

Emeka's personal details are never included: Emeka's global agent rules, Emeka's email address, the Anthropic organization ID, and the list of connected tools. Nothing else from the native logs is included either, such as context the tools inject automatically, tool calls, raw tool output, or hidden reasoning. `REDACTIONS.md` lists every labeled redaction inside the kept messages.

## How transcripts are produced

- Claude Code writes every session to a native log on Emeka's machine. Those full logs are never committed.
- `scripts/export-ai-history.py` reads those logs and writes one Markdown transcript per session to `raw/claude-code/`. It keeps only typed messages and presented responses, and it replaces any email address or account identifier with a labeled `[REDACTED: …]` marker. It refuses to write a transcript if text from Emeka's global agent rules would get through. It runs at the end of every phase and once more at final packaging.
- If the exporter finds sub-agent or Codex threads it does not cover yet, it stops with a warning rather than dropping them silently. If a web chat tool is used, it is registered below and exported under the same rules.

## Sessions and threads

| # | Started | Tool and agent | Purpose | Transcript |
|---|---|---|---|---|
| 1 | 2026-10-10 16:43 PT | Claude Code desktop app (Claude Opus 5.5), primary execution agent | Phase 0 bootstrap and transcript policy. Continues as the primary agent for later phases unless a new session is listed below. | `raw/claude-code/1ef7915c-57bf-4806-b3f9-2125b1adf2a6.md` |

## Known limitation

Anything presented after the last export cannot be in the committed copy. The final export runs as the last step before the final commit, so at most a closing confirmation falls outside it.
