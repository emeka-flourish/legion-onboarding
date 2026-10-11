# STATUS

**Last updated:** 2026-10-10 20:40 PT, by Claude Code (primary agent, session `1ef7915c`).

## Where we are

- **Current phase:** Phase 2. Gate 1 is approved and recorded below (L10). The Gates 2 to 4 batch is proposed in `docs/PRODUCT_BRIEF.md` and waits for Emeka's approval.
- **Next step:** Emeka approves, modifies, or rejects Gates 2 to 4, and decides how to count the remaining time (open question 1). Then the concept and journey (Gates 5 and 6).
- **Branches:** `main` holds the baseline commit. Product work happens on `feat/ai-native-onboarding`. The discovery branch was merged into it at `3c200c6`.
- **Clock:** started 2026-10-10 at 16:43 Pacific. At 20:35, when Phase 1 closed, 3 hours 52 minutes of wall-clock time had passed.

## Phase plan and time budget (about five hours in total)

| Phase | What it produces | Budget | Status |
|---|---|---|---|
| 0. Setup and logging | Repo, rules, transcript export, plan | 0:20 | Done in about 1:00 (16:43 to about 17:45), including two reworks of the transcript policy |
| 1. Observe the current product and telemetry | Findings in `discovery/`, Gate 1 | 0:40 | Done in about 3:10 (17:27 to 20:35, in the discovery session). Gate 1 approved. |
| 2. Thesis, hypotheses, journey, integrations | `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, Gates 2 to 7 | 0:50 | In progress. Gates 2 to 4 proposed. |
| 3. Build the smallest prototype that proves the thesis | Working journey in `src/`, early skeleton deploy | 2:00 | Not started |
| 4. Test, refine, deploy, document | Tested journey, deployed URL, README, open PR | 0:40 | Not started |
| 5. Walkthrough and submission package | Recorded video, final transcripts, final PR | 0:30 | Not started |

## Decision gates

Gates are reviewed in four batches (decision L8): Gate 1 alone, Gates 2 to 4 together, Gates 5 and 6 together, and Gate 7 alone. Each gate still needs Emeka's explicit approval.

| # | Gate | Status | Decision | Approved on |
|---|---|---|---|---|
| 1 | Current-state diagnosis | Approved | Seven problems in Emeka's priority order, with direction for each (L10) | 2026-10-10 |
| 2 | Product goals and success metrics | Proposed in `docs/PRODUCT_BRIEF.md` | | |
| 3 | Design principles | Proposed in `docs/PRODUCT_BRIEF.md` | | |
| 4 | Primary hypotheses | Proposed in `docs/PRODUCT_BRIEF.md` | | |
| 5 | Chosen redesign concept | Open | | |
| 6 | End-to-end user journey | Open | | |
| 7 | Architecture and live versus mocked integrations | Open | | |
| 8 | Material scope changes after implementation starts | As needed | | |

## Locked decisions

Change any of these only with Emeka's explicit approval.

- **L1.** Onboarding ends at first-visit completion. The prototype shows the whole journey through that point, plus a post-visit state. (Kickoff, 2026-10-10)
- **L2.** No real patient information, no fake clinical encounters in Legion production, and no real insurance, payment, or healthcare transactions. Synthetic personas and mocked responses only. (Kickoff, 2026-10-10)
- **L3.** Safety-critical boundaries never rely solely on unconstrained model behavior. (Kickoff, 2026-10-10)
- **L4.** Every gate needs Emeka's explicit approval before work that depends on it goes ahead. (Kickoff, 2026-10-10)
- **L5.** The phase plan and time budgets above are approved. (Emeka, 2026-10-10)
- **L6.** Transcripts contain only what Emeka types to the AI and the AI's final response in each turn (the message that hands the turn back to Emeka), verbatim and in order. Progress messages written between tool steps are not included. They never contain Emeka's personal details: Emeka's global agent rules (including their mentions of Flourish and Emeka's private folder names), Emeka's email address, the Anthropic organization ID, or the list of connected tools. They also leave out injected context, tool calls, raw tool output, and hidden reasoning. (Emeka, 2026-10-10)
- **L7.** The repository lives under the `emeka-flourish` GitHub account and is private for now. (Emeka, 2026-10-10)
- **L8.** Gates are reviewed in four batches, as described above. (Emeka, 2026-10-10)
- **L9.** Commits use GitHub's no-reply address for `emeka-flourish`, so no personal email appears in the repository's history. (Emeka, 2026-10-10)
- **L10. Gate 1, the current-state diagnosis.** (Emeka, 2026-10-10. The full evidence and wording are in `discovery/diagnosis.md`, sections 1 and 2.) The problems, in Emeka's order of importance, with Emeka's direction:
  1. **Measurement can't see people or the goal.** Rebuild the instrumentation so it is person-based, follows each patient through the post-visit step, and is synced with the backend, so outcomes come from the systems of record. Events carry codes and timings, never clinical answers. The headline denominator is eligible patients.
  2. **Choosing a provider doesn't build trust.** 36.6% of match-page sessions never pick a provider. Build trust through personalization: show why each provider fits, and let patients filter by when they are available, without adding clicks or inputs. Every reason must be true and traceable, and AI may phrase reasons but never invent them.
  3. **Pre-visit readiness is long, repetitive, and typed by hand.** It takes about 75 to 80 inputs. Remove duplicates, retrieve records and history before asking, and reveal questions progressively, especially on mobile. Keep GAD-7 and PHQ-9 word for word, and keep the clinically essential history. Shorten only by removing duplicates, retrieving existing data, or moving questions into the visit. Safety-relevant answers get fixed-rule handling and human review. One idea for Gate 5: a guided conversation in place of the unexplained "Current Issues" box.
  4. **Account creation loses one in five held slots.** Consider creating the account with phone and name only and collecting the rest later, and let patients resume by phone number. Emeka is cautious about phone-linked prefill, which is to be resolved at Gate 7. Input errors must never appear as an eligibility decision.
  5. **Initial screening works.** Keep it largely as is. Record eligibility outcomes with reason codes. Design the crisis path from first principles with fixed rules. Fix the mobile fold and the Yes/No polarity that flips between questions.
  6. **Coverage and cost certainty arrive after commitment.** Fix it, because it costs trust.
  7. **Trust, tone, and accessibility details.** Agreed, but lower priority. Do the free fixes by default: time zones, contrast, plain-language errors, and accurate claims.

  Other Gate 1 answers: the "single text field" is the "Current Issues" box. Screen-out paths are not to be tested in production. Never answer "Yes" to the risk-of-harm question in production. Discovery is closed.

The default stack and integration approach in `AGENTS.md` (Next.js, TypeScript, Tailwind, Vercel, no database, mocked adapters) is the working assumption until Gate 7 confirms it.

## Open questions for Emeka

1. **How to count the remaining time.** By the wall clock, 3 hours 52 minutes had passed when Phase 1 closed, and the approved plan still needs about 4 hours for Phases 2 to 5. Either the five hours counts active effort and the plan stands, or the remaining work gets a hard, compressed budget. The options are in the Gates 2 to 4 message.
2. **Two discovery files with uncommitted edits.** `discovery/funnel-analysis.md` and `discovery/opportunities.md` have table-formatting changes only (padded divider rows, no content changes), probably from an editor. Should they be committed or discarded?

## Assumptions

- **A1.** The kickoff refers to `brief/legion-assignment.md`. The actual file is `brief/legion-assignment-brief.md`, and that is the assignment we are using.
- **A2.** The empty `ai_history/raw_history/` folder was renamed to `ai_history/raw/`, as the kickoff asks. The empty `STATUS.md.md`, which Obsidian created, was replaced by this file.
- **A3.** `.obsidian/` and `.DS_Store` are personal editor and OS files and are not committed.
- **A4.** Exported transcripts are committed at every phase boundary once the exporter's leak check passes. Full native logs are never committed.
- **A5.** The empty `product/` folder is left alone. Design documents go in `docs/` as the kickoff specifies.
- **A6.** New commits use the no-reply address, set in the repository's git config and shared by every worktree. The commits from before that change still carry the old author email. They will be re-authored once, right before the first push.

## Log

- **2026-10-10, Phase 0 bootstrap:** Initialized git. Created `AGENTS.md` with the `CLAUDE.md` symlink, `STATUS.md`, `ai_history/index.md`, `.gitignore`, and `.gitattributes`. Made the baseline commit on `main` and created the feature branch.
- **2026-10-10, Phase 0 transcript policy:** Emeka defined the transcript contents (L6). Replaced the copy-everything sync script with `scripts/export-ai-history.py`, which exports only typed messages and presented responses, redacts with labels, and runs a leak check. The full-log copies were deleted from the repo folder; the originals remain in Claude Code's own storage. Updated `AGENTS.md` and `ai_history/index.md` to state the policy precisely.
- **2026-10-10, Phase 1 setup:** Emeka started a separate Claude Code session for Phase 1 discovery, working from the walkthrough videos and voice notes. Emeka confirmed the repository stays private for now, that no AI tool was used for the assignment before this session, and that commits use GitHub's no-reply address. Added a parallel-sessions rule to `AGENTS.md` and registered the discovery session in `ai_history/index.md`.
- **2026-10-10, transcript policy narrowed:** Emeka clarified that only the AI's final response in each turn is exported, not the progress messages between tool steps (L6 updated; the discovery session was told the same). The exporter now keeps only responses that end a turn, and it adds a one-line note for a turn that ended without one.
- **2026-10-10 20:35, Phase 1 closed:** The discovery session's findings were merged into the feature branch (`3c200c6`). Gate 1 was approved and recorded as L10. The Gates 2 to 4 batch was drafted in `docs/PRODUCT_BRIEF.md`, using `discovery/diagnosis.md` sections 3 to 6. Both sessions' transcripts were exported at the phase boundary.
