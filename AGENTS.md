# AGENTS.md

These are the project rules for every AI agent working in this repository. Claude Code reads this file through the `CLAUDE.md` symlink and Codex reads it directly, so both follow the same rules. Keep this file short and durable. The current phase, locked decisions, open questions, and next step live in `STATUS.md`.

## What we are building

Emeka is completing Legion Health's Founding Product take-home: rebuild Legion's patient onboarding for an AI-native world. Onboarding starts when a prospective patient enters Legion and ends only when the patient's first visit has been completed. Booking or scheduling the visit is not the end.

The submission has five parts:

1. A working deployed prototype that a reviewer can open at one URL.
2. This repository.
3. An open pull request.
4. A recorded walkthrough of roughly five minutes covering the most important decisions and tradeoffs.
5. The history of every AI interaction used for the assignment, exactly as defined in the AI history section below.

Legion's CEO expects the exercise to take roughly five hours. Speed and prioritization are part of the evaluation, so cutting scope well matters as much as polish.

This project is separate from Emeka's other work. Do not read, reference, or apply anything from other repositories or private folders, and never mention them in your messages, because your final responses are submitted to Legion.

## Before you act

1. Read the assignment in `brief/legion-assignment-brief.md`.
2. Read `STATUS.md` to learn the current phase, the locked decisions, the open questions, and the next step.
3. If you are a new sub-agent or a separate AI thread, read the AI history section below before doing anything else.

## Hard boundaries

- **No real patient information**, anywhere: code, fixtures, prompts, screenshots, or transcripts. Use synthetic personas only.
- **No real healthcare, insurance, or payment transactions.** Healthcare services are mocked unless Emeka approves a live sandbox integration at Gate 7.
- **Legion's production app is observe-only.** Never create a fake clinical encounter there. The telemetry shows that selecting a provider on `/portal/join/match` creates a reservation, so never select a provider, create an account, or reach payment. Ask Emeka before submitting any form on a real website.
- **Safety-critical decisions are deterministic.** Crisis and self-harm routing, medical emergencies, eligibility (age, state of residence, clinician licensure), and anything involving controlled substances are decided by explicit, testable rules or by a human. A language model may extract, summarize, explain, or draft, but it never makes those calls on its own.
- **No secrets in output or git.** Never print, paste, or commit API keys, tokens, or `.env` values. Never commit `.env` files.
- **No infrastructure for show.** No production database, and nothing added just to look sophisticated.

## Decisions and approvals

Emeka approves major decisions at explicit gates. At each gate, summarize the decision being made, present the strongest options with their tradeoffs, give your recommendation, and ask Emeka to approve, modify, or reject it. Then wait for the answer.

The mandatory gates are:

1. Current-state diagnosis
2. Product goals and success metrics
3. Design principles
4. Primary hypotheses
5. Chosen redesign concept
6. End-to-end user journey
7. Architecture, and which integrations are live versus mocked
8. Any material scope change after implementation starts

Also ask before anything outward-facing or hard to reverse: creating or pushing to a GitHub repository, opening the pull request, deploying, submitting forms on real websites, or spending money.

Approved decisions are recorded as locked in `STATUS.md`. Never silently change a locked decision. If you believe one is wrong, explain why and ask.

Below the gates, agents decide on their own. Low-level implementation choices such as file layout, component structure, naming, library details, copy edits, and test approach do not need approval, as long as they do not materially change an approved product, UX, architecture, or scope decision. Write down any non-obvious assumption in the Assumptions section of `STATUS.md`.

## Product defaults and definition of done

Unless Emeka approves a change at Gate 7, the prototype uses Next.js (App Router), TypeScript, and Tailwind, deployed on Vercel, with no production database, synthetic fixture data, mocked adapters for healthcare services, one primary demo patient, and one or two meaningful failure or edge states.

The prototype is done when a reviewer can open one URL and walk a coherent synthetic patient journey through: fit and care need, identity and basic patient context, insurance and eligibility, clinical-context retrieval or confirmation, provider recommendation and selection, appointment reservation, account and payment state where appropriate, pre-visit readiness, a simulated first visit, a first-visit-completed state, and a lightweight post-visit next step. It must be obvious which integrations are simulated and which are live, and at least one meaningful error or exception state must be demonstrated.

Analytics are designed around each patient's progression through first-visit completion, not page views. Legion's current telemetry counts browser sessions and stops at reaching the payment page, which is exactly the gap to close.

## How to work

- Choose the simplest solution that proves the thesis and can be tested quickly. When two approaches are close, pick the one that ships sooner.
- Keep an eye on the clock. Each phase in `STATUS.md` has a time budget. If a phase is running over, say so and propose what to cut instead of quietly expanding scope.
- State assumptions explicitly, both in your message and in `STATUS.md`. Do not guess silently.
- Verify before you claim. Run the typecheck, lint, and build, and click through the main journey before calling something done. Report what you did and what you verified as separate things, and never say an action happened unless it verifiably did.
- Update `STATUS.md` whenever you finish a meaningful phase or step, a decision gets locked, or you are blocked waiting on Emeka.

## Communicating with Emeka

Write every message to Emeka in natural, complete language, as if you were talking to a colleague sitting next to you. Avoid shorthand, and avoid dense, compressed prose that reads as machine-written. Explain your thinking in clear statements: what you did, why you did it, what you found, what you recommend, and exactly what you need from Emeka. Headings, lists, and tables are fine where they make things easier to scan, but the explanations themselves should read like a person talking.

Make each final response self-contained: what you did, what you found, the reasoning behind your recommendation, and what you need from Emeka. Only final responses are exported to Legion, and Legion wants to see how the work was directed and evaluated.

## AI history (a required deliverable)

Legion requires the history of every AI interaction used for this assignment. Emeka has decided exactly what that history contains for this project (STATUS.md, decision L6). Follow this definition precisely and do not widen it.

**A transcript contains only these two things**, verbatim, in order, with timestamps:

1. Every message Emeka types to the AI.
2. The AI's final response in each turn, meaning the message that hands the turn back to Emeka and asks for a reply. Progress messages written between tool steps are not included.

**A transcript never contains Emeka's personal details**, specifically:

- Emeka's global agent rules, including their mentions of Flourish and Emeka's private folder names.
- Emeka's email address.
- The Anthropic organization ID.
- The list of connected tools.

Nothing else from the native logs is included either. That covers anything the tools inject automatically, tool calls, raw tool output, and hidden reasoning.

How to keep it that way:

- **Export with the script.** `python3 scripts/export-ai-history.py` builds the transcripts from Claude Code's native logs. It keeps only typed messages and final responses, and it replaces any email address or account identifier with a labeled `[REDACTED: …]` marker. It refuses to write a transcript if text from the global agent rules would get through. Run it at the end of every phase and before final packaging, then commit `ai_history/raw/` and `ai_history/REDACTIONS.md`.
- **Never commit native logs.** The full logs contain the personal details listed above. `.gitignore` blocks `*.jsonl` under `ai_history/`.
- **Keep personal details out of your messages.** Final responses are exported verbatim. In every message, refer to those details only by category, such as "your global rules," and never by content.
- **Never hand-edit transcripts.** Regenerate them with the script instead.
- **Register every thread.** Add each session, sub-agent, or external AI thread to `ai_history/index.md` (tool or agent, purpose, transcript file) when it starts.
- **Prefer captured tools.** Do AI work in Claude Code sessions opened in this project folder. If anyone uses Codex or a web chat tool (ChatGPT, claude.ai, v0, or similar), add it to the index right away so it can be exported under the same rules.
- **Brief every new agent.** Before a new sub-agent, separate thread, or other AI tool does any work for this project, give it this notice:

  > This work is for Emeka's Legion Health take-home. Use synthetic data only, never real patient information. Do not read files outside `/Users/McMekxy/Projects/legion-onboarding`. Never include secrets or personal details (email addresses, account identifiers, private instructions, connected-tool lists) in anything you write or report. Follow the rules in that folder's `AGENTS.md`. When you finish, report what you did and what you verified.

## Repository map

- `brief/`: the assignment. Treat it as read-only.
- `discovery/`: current-state findings. Screenshots and raw observations go in `discovery/raw_discovery/`.
- `docs/`: the core design documents, `PRODUCT_BRIEF.md` and `ARCHITECTURE.md`, plus others only when they earn their place.
- `src/`: the prototype.
- `scripts/`: project utilities, including the AI history export.
- `ai_history/`: `index.md`, the exported transcripts in `raw/`, and `REDACTIONS.md`.

## Parallel sessions

Emeka may run more than one agent session at a time. A parallel session works in its own git worktree and branch (the desktop app creates these under `.claude/worktrees/`). It writes its output only to the folder it was assigned, such as `discovery/`, and then reports back. The primary session owns `STATUS.md`, `ai_history/index.md`, the transcript export, merges into the feature branch, and anything outward-facing. A worktree starts from the last commit, so commit any rule changes before a parallel session starts.

## Git

`main` holds the baseline commit. All product work happens on the feature branch named in `STATUS.md` and is reviewed through a single pull request. Commit at meaningful checkpoints with clear messages. Never force-push, never rewrite pushed history, and never commit secrets. Pushing, opening the pull request, and deploying all wait for Emeka's go.
