# STATUS

**Last updated:** 2026-10-10 17:26 PT, end of Phase 0, by Claude Code (primary agent, session `1ef7915c`).

## Where we are

- **Current phase:** Phase 0 is done. Phase 1 (observe the current product and telemetry) is next.
- **Next step:** The telemetry half of Phase 1 can start right away. The live walkthrough waits for Emeka's decision on open question 1.
- **Branches:** `main` holds the baseline commit. Product work happens on `feat/ai-native-onboarding`.
- **Clock:** started 2026-10-10 at 16:43 Pacific, when this session began. Prep time before that is not counted.

## Phase plan and time budget (about five hours in total)

| Phase | What it produces | Budget | Status |
|---|---|---|---|
| 0. Setup and logging | Repo, rules, transcript export, plan | 0:20 | Done in about 0:45. The transcript policy was reworked, and the extra 25 minutes will be recovered in Phases 1 and 2. |
| 1. Observe the current product and telemetry | Findings in `discovery/`, Gate 1 | 0:40 | Not started |
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
- **L6.** Transcripts contain only what Emeka types to the AI and what the AI presents back, verbatim and in order. They never contain Emeka's personal details: Emeka's global agent rules (including their mentions of Flourish and Emeka's private folder names), Emeka's email address, the Anthropic organization ID, or the list of connected tools. They also leave out injected context, tool calls, raw tool output, and hidden reasoning. (Emeka, 2026-10-10)
- **L7.** The repository lives under the `emeka-flourish` GitHub account. (Emeka, 2026-10-10)
- **L8.** Gates are reviewed in four batches, as described above. (Emeka, 2026-10-10)

The default stack and integration approach in `AGENTS.md` (Next.js, TypeScript, Tailwind, Vercel, no database, mocked adapters) is the working assumption until Gate 7 confirms it.

## Open questions for Emeka

1. **Phase 1 walkthrough of the live product.** Emeka will decide this next turn. The options are: the agent walks the live Texas flow in the in-app browser with a synthetic persona, submitting the early steps and stopping on the match page without selecting a provider; or Emeka walks it and drops screenshots into `discovery/raw_discovery/`.
2. **Repository visibility.** Should the repository be private with Legion's reviewers invited, or public? This is needed before the first push in Phase 3.
3. **AI use before this session.** Was any AI tool used for this assignment before this session, for example to draft the kickoff instructions? If so, it has to be added to the index and exported under the same rules.
4. **Commit email.** Commits currently carry the work email from the global git config, and that email will be visible in the repository's history. The alternative is GitHub's no-reply address for `emeka-flourish`, which still links commits to the account. The baseline commit is local only, so its author can be changed before the first push.

## Assumptions

- **A1.** The kickoff refers to `brief/legion-assignment.md`. The actual file is `brief/legion-assignment-brief.md`, and that is the assignment we are using.
- **A2.** The empty `ai_history/raw_history/` folder was renamed to `ai_history/raw/`, as the kickoff asks. The empty `STATUS.md.md`, which Obsidian created, was replaced by this file.
- **A3.** `.obsidian/` and `.DS_Store` are personal editor and OS files and are not committed.
- **A4.** Exported transcripts are committed at every phase boundary once the exporter's leak check passes. Full native logs are never committed.
- **A5.** The empty `product/` folder is left alone. Design documents go in `docs/` as the kickoff specifies.
- **A6.** Commits keep the current global git identity until Emeka answers open question 4.

## Log

- **2026-10-10, Phase 0 bootstrap:** Initialized git. Created `AGENTS.md` with the `CLAUDE.md` symlink, `STATUS.md`, `ai_history/index.md`, `.gitignore`, and `.gitattributes`. Made the baseline commit on `main` and created the feature branch.
- **2026-10-10, Phase 0 transcript policy:** Emeka defined the transcript contents (L6). Replaced the copy-everything sync script with `scripts/export-ai-history.py`, which exports only typed messages and presented responses, redacts with labels, and runs a leak check. The full-log copies were deleted from the repo folder; the originals remain in Claude Code's own storage. Updated `AGENTS.md` and `ai_history/index.md` to state the policy precisely.
