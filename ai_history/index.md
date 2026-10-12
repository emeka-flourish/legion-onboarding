# AI interaction history

This folder holds the history of every AI interaction used for this assignment, as Emeka defined it for this project (STATUS.md, decision L6).

## What each transcript contains

Each transcript contains only two things, verbatim, in order, with timestamps:

1. Every message Emeka typed to the AI, including any typed while the AI was still working, which the transcript marks as such.
2. The AI's final response in each turn, meaning the message that handed the turn back to Emeka. Progress messages written between tool steps are not included.

Emeka's personal details are never included: Emeka's global agent rules, Emeka's email address, the Anthropic organization ID, and the list of connected tools. Nothing else from the native logs is included either, such as context the tools inject automatically, tool calls, raw tool output, or hidden reasoning. `REDACTIONS.md` lists every labeled redaction inside the kept messages.

## How transcripts are produced

- Claude Code writes every session to a native log on Emeka's machine. Those full logs are never committed.
- `scripts/export-ai-history.py` reads those logs and writes one Markdown transcript per session to `raw/claude-code/`. It keeps only typed messages and final responses, leaves out notes the app inserts into a typed message (such as which worktree a session runs in), and replaces any email address or account identifier with a labeled `[REDACTED: …]` marker. It refuses to write a transcript if text from Emeka's global agent rules would get through. It runs at the end of every phase and once more at final packaging.
- If the exporter finds sub-agent or Codex threads it does not cover yet, it stops with a warning rather than dropping them silently. If a web chat tool is used, it is registered below and exported under the same rules.

## Sessions and threads

| # | Started | Tool and agent | Purpose | Transcript |
|---|---|---|---|---|
| 1 | 2026-10-10 16:43 PT | Claude Code desktop app (Claude Opus 5.5), primary execution agent | Phase 0 bootstrap and transcript policy. Continues as the primary agent for later phases unless a new session is listed below. | `raw/claude-code/1ef7915c-57bf-4806-b3f9-2125b1adf2a6.md` |
| 2 | 2026-10-10 17:27 PT | Claude Code desktop app, separate session in its own worktree (branch `claude/legion-discovery-analysis-8e714a`) | Phase 1: observe the existing product and telemetry from Emeka's walkthrough videos and voice notes. | `raw/claude-code/e4413249-8ee3-4151-b4d8-4966d27aea38.md` |
| 3 | 2026-10-11 22:58 PT | Claude Code desktop app, separate session in its own worktree (branch `claude/legion-onboarding-demo-plan-82c8b7`) | Phase 5: plan the recorded walkthrough from Emeka's list of highlights, and draft a loose script. | `raw/claude-code/b826a738-db41-4084-8873-36cf546f9aad.md` |

No AI tool was used for this assignment before session 1 (confirmed by Emeka on 2026-10-10).

## Known limitation

A turn's final response exists only once that turn ends, so the turn in which an export runs cannot include its own final response. That response is picked up by the next export. After the last turn of the project, Emeka can run the exporter once more and commit, so the closing message is included too.
