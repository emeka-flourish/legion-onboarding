# STATUS

**Last updated:** 2026-10-10 17:37 PT, by Claude Code (primary agent, session `1ef7915c`).

## Where we are

- **Current phase:** Phase 1 (observe the current product and telemetry) is running in a separate Claude Code session. It works from Emeka's walkthrough videos and voice notes in its own worktree, on the branch `claude/legion-discovery-analysis-8e714a`.
- **Next step:** When that session finishes, the primary session merges its findings into the feature branch, reviews them, and presents Gate 1 (current-state diagnosis) to Emeka.
- **Branches:** `main` holds the baseline commit. Product work happens on `feat/ai-native-onboarding`, and the discovery branch is merged into it when done.
- **Clock:** started 2026-10-10 at 16:43 Pacific, when the primary session began. Prep time before that is not counted.

## Phase plan and time budget (about five hours in total)

| Phase | What it produces | Budget | Status |
|---|---|---|---|
| 0. Setup and logging | Repo, rules, transcript export, plan | 0:20 | Done in about 0:45. The transcript policy was reworked, and the extra 25 minutes will be recovered in Phases 1 and 2. |
| 1. Observe the current product and telemetry | Findings in `discovery/`, Gate 1 | 0:40 | In progress in a separate session, started 17:27 |
| 2. Thesis, hypotheses, journey, integrations | `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, Gates 2 to 7 | 0:50 | Not started |
| 3. Build the smallest prototype that proves the thesis | Working journey in `src/`, early skeleton deploy | 2:00 | Not started |
| 4. Test, refine, deploy, document | Tested journey, deployed URL, README, open PR | 0:40 | Not started |
| 5. Walkthrough and submission package | Recorded video, final transcripts, final PR | 0:30 | Not started |

## Decision gates

Gates are reviewed in four batches (decision L8): Gate 1 alone, Gates 2 to 4 together, Gates 5 and 6 together, and Gate 7 alone. Each gate still needs Emeka's explicit approval.

| # | Gate | Status | Decision | Approved on |
|---|---|---|---|---|
| 1 | Current-state diagnosis | Open | | |
| 2 | Product goals and success metrics | Open | | |
| 3 | Design principles | Open | | |
| 4 | Primary hypotheses | Open | | |
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

The default stack and integration approach in `AGENTS.md` (Next.js, TypeScript, Tailwind, Vercel, no database, mocked adapters) is the working assumption until Gate 7 confirms it.

## Waiting on

- **The discovery session's output (Phase 1).** That includes what to do with the walkthrough recordings and voice notes in `discovery/raw_discovery/`. The two videos are over GitHub's 100 MB limit and are ignored by git.

## Open questions for Emeka

None right now.

## Assumptions

- **A1.** The kickoff refers to `brief/legion-assignment.md`. The actual file is `brief/legion-assignment-brief.md`, and that is the assignment we are using.
- **A2.** The empty `ai_history/raw_history/` folder was renamed to `ai_history/raw/`, as the kickoff asks. The empty `STATUS.md.md`, which Obsidian created, was replaced by this file.
- **A3.** `.obsidian/` and `.DS_Store` are personal editor and OS files and are not committed.
- **A4.** Exported transcripts are committed at every phase boundary once the exporter's leak check passes. Full native logs are never committed.
- **A5.** The empty `product/` folder is left alone. Design documents go in `docs/` as the kickoff specifies.
- **A6.** New commits use the no-reply address, set in the repository's git config and shared by every worktree. The existing commits still carry the old author email. They will be re-authored once, right before the first push and after the discovery branch is merged, so the old email cannot come back through a merge.

## Log

- **2026-10-10, Phase 0 bootstrap:** Initialized git. Created `AGENTS.md` with the `CLAUDE.md` symlink, `STATUS.md`, `ai_history/index.md`, `.gitignore`, and `.gitattributes`. Made the baseline commit on `main` and created the feature branch.
- **2026-10-10, Phase 0 transcript policy:** Emeka defined the transcript contents (L6). Replaced the copy-everything sync script with `scripts/export-ai-history.py`, which exports only typed messages and presented responses, redacts with labels, and runs a leak check. The full-log copies were deleted from the repo folder; the originals remain in Claude Code's own storage. Updated `AGENTS.md` and `ai_history/index.md` to state the policy precisely.
- **2026-10-10, Phase 1 setup:** Emeka started a separate Claude Code session for Phase 1 discovery, working from the walkthrough videos and voice notes. Emeka confirmed the repository stays private for now, that no AI tool was used for the assignment before this session, and that commits use GitHub's no-reply address. Added a parallel-sessions rule to `AGENTS.md` and registered the discovery session in `ai_history/index.md`.
- **2026-10-10, transcript policy narrowed:** Emeka clarified that only the AI's final response in each turn is exported, not the progress messages between tool steps (L6 updated; the discovery session was told the same). The exporter now keeps only responses that end a turn, and it adds a one-line note for a turn that ended without one.
