#!/usr/bin/env python3
"""Export this project's AI conversations into ai_history/raw/ for submission.

Policy (STATUS.md, locked decision L6): each exported transcript contains exactly what Emeka typed
and what the AI presented back, verbatim and in order. Everything else in the native logs is left
out: context the tools inject (global agent instructions, account email and organization ID,
connected-tool lists, environment details), tool calls and their raw output, and hidden reasoning.
Email addresses and account identifiers inside kept messages become labeled [REDACTED: ...] markers,
tallied in ai_history/REDACTIONS.md. A leak check refuses to write a transcript if any line or path
from the injected private instructions, or the account identifier, would survive.

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
# Claude Code names its per-project log folder after the working directory; sessions started in a
# subfolder of this project land in folders that share this prefix.
NATIVE_DIRS = sorted((Path.home() / ".claude" / "projects").glob(re.sub(r"[^A-Za-z0-9]", "-", str(ROOT)) + "*"))
CODEX_DIRS = [Path.home() / ".codex" / "sessions", Path.home() / ".codex" / "archived_sessions"]

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
EMAIL_ALLOWED = {"noreply@anthropic.com"}  # commit co-author trailer, not personal data


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
    """Return the kept messages as (speaker, timestamp, text) and the private values to guard."""
    messages, private = [], {"ids": set(), "markers": set()}
    with path.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            e = json.loads(line)
            kind, att = e.get("type"), e.get("attachment")
            if kind == "attachment" and isinstance(att, dict):
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
            text = shown_text((e.get("message") or {}).get("content", ""))
            if kind == "user":
                typed = (e.get("origin") or {}).get("kind") == "human" or text.startswith("[Request interrupted")
                if not typed or e.get("isMeta") or e.get("isCompactSummary"):
                    continue
                speaker = "Emeka"
            else:
                if e.get("isSidechain"):
                    continue
                speaker = "Claude"
            if text.strip():
                messages.append((speaker, e.get("timestamp", ""), text))
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
        return text

    parts = [
        f"# Claude Code session `{session_id}`",
        "",
        "Exported from the native Claude Code log by `scripts/export-ai-history.py`. It contains every message "
        "Emeka typed and every response Claude presented, verbatim and in order. Context the tools inject, tool "
        "calls and their raw output, and hidden reasoning are left out, as described in `ai_history/index.md`. "
        "Redactions appear inline as `[REDACTED: reason]` and are tallied in `ai_history/REDACTIONS.md`.",
    ]
    for speaker, ts, text in messages:
        parts += ["", "---", "", f"**{speaker}** · {local_time(ts)}", "", redact(text)]
    return "\n".join(parts) + "\n"


def leaks(rendered, private):
    found = []
    for n, line in enumerate(rendered.splitlines(), 1):
        for kind, values in (("private instruction text", private["markers"]), ("account identifier", private["ids"])):
            if any(v in line for v in values):
                found.append(f"line {n}: {kind}")
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

At Emeka's direction (STATUS.md, decision L6), the exported transcripts contain only what Emeka typed and what the AI presented back. These parts of the native logs are never exported:

- Context the tools inject automatically: Emeka's global agent instructions, the account email address and organization identifier, lists of connected tools, and environment details.
- The AI's tool calls and their raw output, such as commands, file reads and writes, and search results. The AI's visible messages describe these steps as they happened, and the resulting files are in this repository.
- Hidden model reasoning, which the native log mostly stores only in encrypted form.
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
        typed = sum(1 for m in messages if m[0] == "Emeka")
        print(f"{out.relative_to(ROOT)}: {typed} typed messages, {len(messages) - typed} presented responses, "
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
