# STATUS

**Last updated:** 2026-10-10, end of Phase 0 (bootstrap), by Claude Code (primary agent, session `1ef7915c`).

## Where we are

- **Current phase:** Phase 0, setup and logging. Bootstrap is complete and waiting on Emeka's approval of the execution plan.
- **Next step:** Emeka answers the open questions below and approves or edits the plan. Then Phase 1 starts: observing the current product and telemetry.
- **Branches:** `main` holds the baseline commit. Product work happens on `feat/ai-native-onboarding`.
- **Clock:** started 2026-10-10 at 16:43 Pacific, when this session began. Prep time before that is not counted.

## Phase plan and time budget (about five hours in total)

| Phase | What it produces | Budget | Status |
|---|---|---|---|
| 0. Setup and logging | Repo, rules, transcript capture, plan | 0:20 | In review |
| 1. Observe the current product and telemetry | Findings in `discovery/`, Gate 1 | 0:40 | Not started |
| 2. Thesis, hypotheses, journey, integrations | `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, Gates 2 to 7 | 0:50 | Not started |
| 3. Build the smallest prototype that proves the thesis | Working journey in `src/`, early skeleton deploy | 2:00 | Not started |
| 4. Test, refine, deploy, document | Tested journey, deployed URL, README, open PR | 0:40 | Not started |
| 5. Walkthrough and submission package | Recorded video, final AI history, final PR | 0:30 | Not started |

## Decision gates

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

These come from Emeka's kickoff on 2026-10-10. Change them only with Emeka's explicit approval.

- **L1.** Onboarding ends at first-visit completion. The prototype shows the whole journey through that point, plus a post-visit state.
- **L2.** No real patient information, no fake clinical encounters in Legion production, and no real insurance, payment, or healthcare transactions. Synthetic personas and mocked responses only.
- **L3.** Safety-critical boundaries never rely solely on unconstrained model behavior.
- **L4.** Raw native transcripts are the AI history of record. Summaries never substitute for them.
- **L5.** Each gate in the table above needs Emeka's explicit approval before work that depends on it goes ahead.

The default stack and integration approach in `AGENTS.md` (Next.js, TypeScript, Tailwind, Vercel, no database, mocked adapters) is the working assumption until Gate 7 confirms it.

## Open questions for Emeka

1. **Transcript redaction policy.** The transcripts include context the tools inject automatically: Emeka's global agent instructions (which mention Flourish and private folder names), Emeka's email address, and an Anthropic organization ID. Which of these should be removed as unrelated personal information, with a label? Until this is decided, raw transcripts stay out of git.
2. **AI use before this session.** Was any AI tool used for this assignment before this session, for example to draft the kickoff instructions? If so, that thread has to be exported and added to the index.
3. **GitHub account, commit identity, and visibility.** The GitHub CLI is logged in as `emeka-flourish`, and commits in this repo are currently authored with a `[REDACTED: private email or domain]` email from the global git config. Which account and email should this submission use, and should the repo be private with Legion's reviewers invited? The baseline commit is local only, so its author can still be changed before the first push.
4. **Phase 1 walkthrough of the live product.** May the agent walk the live Texas flow in the in-app browser with a synthetic persona, submitting the early steps and stopping on the match page without selecting a provider? The alternative is that Emeka walks it and drops screenshots into `discovery/raw_discovery/`.
5. **Gate batching.** May related gates be presented together (Gate 1 alone, Gates 2 to 4 together, Gates 5 and 6 together, Gate 7 alone), each still needing explicit approval?

## Assumptions

- **A1.** The kickoff refers to `brief/legion-assignment.md`. The actual file is `brief/legion-assignment-brief.md`, and that is the assignment we are using.
- **A2.** The kickoff asks for `ai_history/raw/`, so the empty `ai_history/raw_history/` folder was renamed to that. The empty `STATUS.md.md`, which Obsidian created, was replaced by this file.
- **A3.** `.obsidian/` and `.DS_Store` are personal editor and OS files and are not committed.
- **A4.** Raw transcripts are excluded from git until the redaction policy is approved, because personal data that enters git history is hard to remove after a push.
- **A5.** The empty `product/` folder is left alone. Design documents go in `docs/` as the kickoff specifies.

## Log

- **2026-10-10, Phase 0:** Initialized git. Created `AGENTS.md` with the `CLAUDE.md` symlink, `STATUS.md`, `ai_history/index.md`, `.gitignore`, `.gitattributes`, and `scripts/sync-ai-history.sh`. Verified that native transcripts are captured, that the sync produces a byte-identical copy, and what the transcripts do and do not contain. Made the baseline commit on `main` and created the feature branch.
