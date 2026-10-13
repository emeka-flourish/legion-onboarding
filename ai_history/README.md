# AI interaction history

Every AI interaction used for this assignment, as Legion's brief asks.

- **[index.md](index.md)**: every session, what it was for, and its transcript, plus what a transcript contains and how it is produced. It also notes the one other AI tool used: Otter, for transcribing voice notes only.
- **[raw/claude-code/](raw/claude-code/)**: one transcript per session. Each holds every message Emeka typed and the AI's final response in each turn, verbatim, in order, and timestamped.
- **[REDACTIONS.md](REDACTIONS.md)**: every redaction, each labeled in place where it occurs.

The transcripts are built from Claude Code's native logs by [`scripts/export-ai-history.py`](../scripts/export-ai-history.py), which refuses to write one if private text would get through. The native logs themselves are never committed.
