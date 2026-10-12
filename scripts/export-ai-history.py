#!/usr/bin/env python3
"""Export this project's AI conversations into ai_history/raw/ for submission.

Policy (STATUS.md, locked decision L6): each exported transcript contains exactly two things, verbatim
and in order: every message Emeka typed, and the AI's final response in each turn, meaning the message
that hands the turn back to Emeka. Everything else in the native logs is left out: progress messages
written between tool steps, context the tools inject (global agent instructions, account email and
organization ID, connected-tool lists, environment details), tool calls and their raw output, and
hidden reasoning. Email addresses and account identifiers inside kept messages become labeled
[REDACTED: ...] markers, tallied in ai_history/REDACTIONS.md. A leak check refuses to write a
transcript if any line or path from the injected private instructions, or the account identifier,
would survive.

Usage: python3 scripts/export-ai-history.py   (run at the end of every phase; safe to re-run)
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "ai_history" / "raw" / "claude-code"
REDACTIONS_FILE = ROOT / "ai_history" / "REDACTIONS.md"
# Extra private terms, one per line, kept only on this machine (git-ignored and never uploaded).
PRIVATE_TERMS_FILE = ROOT / ".ai-history-private"
# Claude Code names its per-project log folder after the working directory; sessions started in a
# subfolder or worktree of this project land in folders that share this prefix.
NATIVE_DIRS = sorted((Path.home() / ".claude" / "projects").glob(re.sub(r"[^A-Za-z0-9]", "-", str(ROOT)) + "*"))
CODEX_DIRS = [Path.home() / ".codex" / "sessions", Path.home() / ".codex" / "archived_sessions"]

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
EMAIL_ALLOWED = {"noreply@anthropic.com"}  # commit co-author trailer, not personal data
FINAL = {"end_turn", "stop_sequence"}  # how a response that hands the turn back to Emeka ends
NO_FINAL = "*(This turn ended without a final response.)*"
# Context the app sometimes adds to a typed message (such as which worktree a session runs in). Emeka didn't type it.
REMINDER = re.compile(r"<system-reminder>.*?</system-reminder>", re.DOTALL)


def local_time(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")


def shown_text(content):
    """The text a person saw: plain string content, or the text blocks of a block list."""
    if isinstance(content, str):
        return content
    blocks = [b for b in content if isinstance(b, dict)]
    text = "\n\n".join(b["text"] for b in blocks if b.get("type") == "text" and b.get("text", "").strip())
    if text and any(b.get("type") == "image" for b in blocks):
        text += "\n\n[An image was attached here. Images are not included in this export.]"
    return text


def read_session(path):
    """Return the kept messages as [speaker, timestamp, text, message_id] and the private values to guard."""
    messages, private = [], {"ids": set(), "markers": set(), "domains": set()}
    if PRIVATE_TERMS_FILE.exists():
        private["domains"].update(t.strip().lower() for t in PRIVATE_TERMS_FILE.read_text(encoding="utf-8").splitlines() if t.strip())
    turn_open = turn_answered = False
    delivered = set()  # a message typed while Claude was working, recorded once per delivery
    with path.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            # The domain of any personal email address in the log is private too, even when written on its own.
            for address in EMAIL.findall(line):
                if address.lower() not in EMAIL_ALLOWED and not address.lower().endswith("users.noreply.github.com"):
                    private["domains"].add(address.split("@", 1)[1].lower())
            e = json.loads(line)
            kind, att = e.get("type"), e.get("attachment")
            if kind == "attachment" and isinstance(att, dict):
                # A message Emeka typed while Claude was still working arrives mid-turn as a queued prompt.
                # Task and monitor notifications use the same mechanism with a different origin, and stay out.
                if (
                    att.get("type") == "queued_command"
                    and att.get("commandMode") == "prompt"
                    and (att.get("origin") or {}).get("kind") == "human"
                    and str(att.get("prompt", "")).strip()
                ):
                    key = att.get("delivery_id") or att.get("source_uuid") or att.get("prompt")
                    if key not in delivered:
                        delivered.add(key)
                        messages.append(["Emeka, while Claude was working", att.get("timestamp") or e.get("timestamp", ""), att["prompt"], None])
                    continue
                if att.get("type") == "credential_org" and att.get("organizationUuid"):
                    private["ids"].add(att["organizationUuid"])
                if att.get("type") == "instructions":
                    for doc in att.get("files", []):
                        if not str(doc.get("path", "")).startswith(str(ROOT)):  # global, not this project's
                            body = doc.get("content", "")
                            private["markers"].update(s.strip() for s in body.splitlines() if len(s.strip()) >= 30)
                            private["markers"].update(re.findall(r"~/[\w.\-/]+", body))
                continue
            if kind not in ("user", "assistant"):
                continue
            msg = e.get("message") or {}
            text, ts = shown_text(msg.get("content", "")), e.get("timestamp", "")
            if kind == "user":
                if REMINDER.search(text):
                    text = REMINDER.sub("", text).strip()
                typed = (e.get("origin") or {}).get("kind") == "human" or text.startswith("[Request interrupted")
                if not typed or e.get("isMeta") or e.get("isCompactSummary") or not text.strip():
                    continue
                if turn_open and not turn_answered:
                    messages.append(["note", ts, NO_FINAL, None])
                messages.append(["Emeka", ts, text, None])
                turn_open, turn_answered = True, False
            elif not e.get("isSidechain") and msg.get("stop_reason") in FINAL and text.strip():
                last = messages[-1] if messages else None
                if last and last[0] == "Claude" and last[3] == msg.get("id"):
                    last[2] += "\n\n" + text  # another text block of the same final response
                else:
                    messages.append(["Claude", ts, text, msg.get("id")])
                turn_answered = True
    return messages, private


def render(session_id, messages, private, counts):
    def redact(text):
        def email(m):
            if m.group(0).lower() in EMAIL_ALLOWED:
                return m.group(0)
            counts["email address"] = counts.get("email address", 0) + 1
            return "[REDACTED: email address]"

        text = EMAIL.sub(email, text)
        for value in private["ids"]:
            if value in text:
                counts["account identifier"] = counts.get("account identifier", 0) + text.count(value)
                text = text.replace(value, "[REDACTED: account identifier]")
        for domain in private["domains"]:
            pattern = re.compile(re.escape(domain), re.IGNORECASE)
            hits = len(pattern.findall(text))
            if hits:
                counts["private email or domain"] = counts.get("private email or domain", 0) + hits
                text = pattern.sub("[REDACTED: private email or domain]", text)
        return text

    parts = [
        f"# Claude Code session `{session_id}`",
        "",
        "Exported from the native Claude Code log by `scripts/export-ai-history.py`. It contains every message "
        "Emeka typed (including any typed while Claude was still working, marked as such) and Claude's final "
        "response in each turn, verbatim and in order. Progress messages written "
        "between tool steps, context the tools inject, tool calls and their raw output, and hidden reasoning are "
        "left out, as described in `ai_history/index.md`. Redactions appear inline as `[REDACTED: reason]` and "
        "are tallied in `ai_history/REDACTIONS.md`.",
    ]
    for speaker, ts, text, _ in messages:
        if speaker == "note":
            parts += ["", "---", "", text]
        else:
            parts += ["", "---", "", f"**{speaker}** · {local_time(ts)}", "", redact(text)]
    return "\n".join(parts) + "\n"


def leaks(rendered, private):
    found = []
    for n, line in enumerate(rendered.splitlines(), 1):
        for kind, values in (("private instruction text", private["markers"]), ("account identifier", private["ids"])):
            if any(v in line for v in values):
                found.append(f"line {n}: {kind}")
        if any(d in line.lower() for d in private["domains"]):
            found.append(f"line {n}: private email or domain")
    return found


def first_line(path):
    with path.open(encoding="utf-8", errors="replace") as f:
        return f.readline()


def write_redactions(rows):
    table = "\n".join(f"| `{f}` | {reason} | {n} |" for f, reason, n in rows) or "| None so far | | |"
    REDACTIONS_FILE.write_text(f"""# Redactions

This file is generated by `scripts/export-ai-history.py` every time it runs.

## Removed inside exported messages

Each of these is marked inline in the transcript as `[REDACTED: reason]`.

| Transcript | Reason | Count |
|---|---|---|
{table}

## Left out of every transcript

At Emeka's direction (STATUS.md, decision L6), the exported transcripts contain only what Emeka typed and the AI's final response in each turn. These parts of the native logs are never exported:

- The AI's progress messages written between tool steps within a turn. Only the final response that hands each turn back to Emeka is kept.
- Context the tools inject automatically: Emeka's global agent instructions, the account email address and organization identifier, lists of connected tools, and environment details.
- The AI's tool calls and their raw output, such as commands, file reads and writes, and search results. The resulting files are in this repository.
- Hidden model reasoning.
""", encoding="utf-8")


def main():
    sessions = sorted(p for d in NATIVE_DIRS for p in d.glob("*.jsonl"))
    if not sessions:
        sys.exit(f"No Claude Code sessions found for {ROOT}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows, failed = [], False
    for path in sessions:
        messages, private = read_session(path)
        counts = {}
        rendered = render(path.stem, messages, private, counts)
        problems = leaks(rendered, private)
        if problems:
            failed = True
            print(f"LEAK CHECK FAILED for {path.stem}; transcript not written:", *problems, sep="\n  ")
            continue
        out = OUT_DIR / f"{path.stem}.md"
        out.write_text(rendered, encoding="utf-8")
        typed = sum(1 for m in messages if m[0].startswith("Emeka"))
        final = sum(1 for m in messages if m[0] == "Claude")
        print(f"{out.relative_to(ROOT)}: {typed} typed messages, {final} final responses, "
              f"redactions: {counts or 'none'}")
        rows += [(out.relative_to(ROOT / "ai_history"), reason, n) for reason, n in sorted(counts.items())]
    # Threads this export does not cover yet must never be dropped silently.
    subagents = [p for d in NATIVE_DIRS for p in d.glob("*/subagents/**/*.jsonl")]
    codex = [p for d in CODEX_DIRS if d.is_dir() for p in d.rglob("rollout-*.jsonl")
             if f'"cwd":"{ROOT}' in first_line(p)]
    for label, found in (("sub-agent", subagents), ("Codex", codex)):
        if found:
            failed = True
            print(f"WARNING: {len(found)} {label} transcript(s) found that this export does not cover yet. Decide with Emeka.")
    write_redactions(rows)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
