# STATUS

**Last updated:** 2026-10-10, evening, by Claude Code (primary agent, session `1ef7915c`).

## Where we are

- **Current phase:** Phase 3, the build.
  - The TRD is approved (L17), and the API keys are in `.env.local`.
  - M0 (scaffold) is done and committed.
  - M1's logic core is written and type-checks. Its tests are not written yet.
- **Why the build is paused:** Emeka found the TRD lacked a telemetry plan, then asked for a full check against the goals, principles, and constraints. The TRD now has section 7 (the telemetry and measurement plan) and the audit fixes, with TAC-36 to TAC-56. These amendments wait for Emeka's approval.
- **Next step:** Emeka approves the TRD amendments, and decides on the two proposed additions. M1 then resumes: the code changes listed in the log, then M1's unit tests. Nothing is deployed until every local check passes and Emeka approves the look and feel on localhost.
- **Branches:** `main` holds the baseline commit. Product work happens on `feat/ai-native-onboarding`. The discovery branch was merged into it at `3c200c6`.
- **Effort guide:** Legion's "roughly five hours" signals how much effort and complexity the build should have. It is not a clock to track closely, and time is not reported in the pull request (L5).

## Phase plan

| Phase | What it produces | Status |
|---|---|---|
| 0. Setup and logging | Repo, rules, transcript export, plan | Done |
| 1. Observe the current product and telemetry | Findings in `discovery/`, Gate 1 | Done. Gate 1 approved. |
| 2. Thesis, hypotheses, journey, integrations | `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, Gates 2 to 7 | Done. All seven gates approved. |
| 3. Build the smallest prototype that proves the thesis | `docs/TRD.md` first, then a working journey in `src/`, tested locally | In progress. M0 is done. M1's logic core is written, with tests pending. Paused for approval of the TRD amendments. |
| 4. Test, refine, deploy, document | Tested journey, deployed URL, README, open PR | Not started |
| 5. Walkthrough and submission package | Recorded video, final transcripts, final PR | Not started |

## Decision gates

Gates are reviewed in four batches (decision L8): Gate 1 alone, Gates 2 to 4 together, Gates 5 and 6 together, and Gate 7 alone. Each gate still needs Emeka's explicit approval.

| # | Gate | Status | Decision | Approved on |
|---|---|---|---|---|
| 1 | Current-state diagnosis | Approved | Seven problems in Emeka's priority order, with direction for each (L10) | 2026-10-10 |
| 2 | Product goals and success metrics | Approved | Four goals; first-visit completion among eligible starters, per person, within 14 days; six stage metrics; four guardrails (L11) | 2026-10-10 |
| 3 | Design principles | Approved | Nine principles, with principle 3 named "Confirm, don't type" (L12) | 2026-10-10 |
| 4 | Primary hypotheses | Approved | H1 to H5; H1 to H3 in depth, H4 and H5 lighter (L13) | 2026-10-10 |
| 5 | Chosen redesign concept | Approved | "Book fast, arrive ready," with the decisions inside it (L14) | 2026-10-10 |
| 6 | End-to-end user journey | Approved | Eleven stages, three demo patients, exception states, and seven integration-driven changes (L15) | 2026-10-10 |
| 7 | Architecture and live versus mocked integrations | Approved | Live AI behind a provider router (OpenAI first), simulated vendors, Upstash Redis (L16) | 2026-10-10 |
| 8 | Material scope changes after implementation starts | As needed | | |

## Locked decisions

Change any of these only with Emeka's explicit approval.

- **L1.** Onboarding ends at first-visit completion. The prototype shows the whole journey through that point, plus a post-visit state. (Kickoff, 2026-10-10)
- **L2.** No real patient information, no fake clinical encounters in Legion production, and no real insurance, payment, or healthcare transactions. Synthetic personas and mocked responses only. (Kickoff, 2026-10-10)
- **L3.** Safety-critical boundaries never rely solely on unconstrained model behavior. (Kickoff, 2026-10-10)
- **L4.** Every gate needs Emeka's explicit approval before work that depends on it goes ahead. (Kickoff, 2026-10-10)
- **L5.** The phase plan above is approved. Legion's "roughly five hours" is a guide to effort and complexity, not a clock. Time is not tracked closely and is not reported in the pull request. (Emeka, 2026-10-10)
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
- **L11. Gate 2, goals and success metrics.** (Emeka, 2026-10-10. Full detail in `docs/PRODUCT_BRIEF.md`, section 2.)
  - **Goals:** (1) more eligible people complete a first visit; (2) care feels personalized from the first interaction and builds trust, with coverage, cost, and provider fit known before commitment; (3) less friction, meaning less typing and nothing asked twice; (4) Legion sees every person's progress through the first visit and the step after it. Goal 2 is Emeka's explicit addition at this gate.
  - **Headline metric:** first-visit completion among people who pass screening, counted per person, within 14 days of starting.
  - **Measures:** the six stage metrics and four guardrails listed in the brief.
- **L12. Gate 3, design principles.** (Emeka, 2026-10-10.) The nine principles in `docs/PRODUCT_BRIEF.md`, section 3, with principle 3 named "Confirm, don't type," together with what each requires in the prototype.
- **L13. Gate 4, primary hypotheses.** (Emeka, 2026-10-10.) H1 to H5, as stated in `docs/PRODUCT_BRIEF.md`, section 4. H1 (person-level measurement), H2 (provider trust), and H3 (confirm, don't type) are built in depth. H4 (light identity and resume) and H5 (certainty before commitment) are lighter steps in the same journey. The crisis path, human review of every safety flag, and word-for-word questionnaires are requirements.
- **L14. Gate 5, the redesign concept: "Book fast, arrive ready."** (Emeka, 2026-10-10. Full detail in `docs/PRODUCT_BRIEF.md`, section 5.)
  - **Two speeds.** Before payment, low-effort taps personalize each next step. After booking, a guided conversation and retrieved records replace the heavy intake. Emeka moved the conversation after booking and the account after the provider results, to keep cognitive load low and earn trust first.
  - **Decisions inside the concept:**
    - The optional note appears after the results only, and re-orders providers without silently removing any.
    - Commitment means handing over the card. The plan tap comes before matching, and the exact coverage check comes after the light account and before the card.
    - The light account is created at "hold this time." Before that, progress is saved in the browser for seven days, with no health details on the resume screen.
    - The best-fit filters and ranking are a stated assumption, and only reasons that differ between providers are shown, each with its source.
    - The conversation replaces the "Current Issues" box and the narrative history. **Moving family and social history into the visit is to be revisited with the working prototype.**
    - Safety flags get same-day human review, and the appointment stays booked.
    - The prototype asks "18 or older," and the 65 limit is an open question for Legion.
- **L15. Gate 6, the end-to-end journey.** (Emeka, 2026-10-10. Full detail in `docs/PRODUCT_BRIEF.md`, section 6, and `docs/INTEGRATIONS.md`.)
  - **Stages and patients.** Eleven stages: eight to book fast, three to arrive ready. Three invented patients (Maya, Jordan, Sam), and the exception states listed in the brief.
  - **Seven integration-driven changes, approved after the service research:**
    1. The ID check comes first on the home page after booking, and supplies the details for record matching and age verification.
    2. Retrieval runs in the background.
    3. Coverage checks fall back to the member ID when the lookup finds nothing.
    4. A preferred-pharmacy step is added.
    5. One question covers medications the history can't see.
    6. Provider reasons show their sources, with network status verified per provider.
    7. The controlled-substance message states the Texas prescription-monitoring rule.
  - **Also approved:**
    - If a plan doesn't answer within about 15 seconds, the patient can book with the typical cost shown. Coverage is confirmed before the visit, with free cancellation if it falls through.
    - The free RxNorm API is a live stretch addition, built only if the core build finishes early.
  - **Not used:** Verified, because of Emeka's caution about phone-linked prefill.
- **L16. Gate 7, architecture.** (Emeka, 2026-10-10. Detail in `docs/ARCHITECTURE.md` and `docs/TRD.md`.)
  - **Live AI.** AI runs through a provider router with a quick config file. OpenAI goes first, and Anthropic and Gemini are switchable. Scripted responses take over when a key or service is unavailable. Claude picks the models.
  - **Simulated vendors.** All healthcare vendors are simulated, with visible "Simulated" tags. The architecture decisions are documented in `docs/` and in the walkthrough script.
  - **Stretch goal.** RxNorm is a live stretch addition.
  - **Database.** A simple database is added, so people can test the hosted demo easily. Claude recommends Upstash Redis, confirmed through the TRD.
  - **Process.** A detailed TRD and execution plan, with acceptance criteria and tests including visual evaluation, comes before any build. Everything is tested locally before deploying to Vercel.
- **L17. TRD approved.** (Emeka, 2026-10-10.) `docs/TRD.md` is approved: Upstash Redis storage, the model picks in its section 4.3, TAC-01 to TAC-35, and the milestone plan. The telemetry plan (section 7) and the audit fixes (TAC-36 to TAC-56) were added afterward, at Emeka's request, and await approval.

The default stack and integration approach in `AGENTS.md` (Next.js, TypeScript, Tailwind, Vercel, no database, mocked adapters) is the working assumption until Gate 7 confirms it.

## Open questions for Emeka

1. **The TRD amendments.** Approve or change section 7 (telemetry) and the audit fixes, TAC-36 to TAC-56.
2. **Two proposed additions.** Approve or decline the people-in-progress panel (goal 4) and the one-tap trust question (goal 2).
3. **Later, before deploy (M8):** provision Upstash Redis on the Vercel project. Then give the go for the private repository, re-authoring the early commits, push, the draft pull request, and the deploy.

To revisit later: whether family and social history should move into the visit (L14), once the working prototype exists.

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
- **2026-10-10, Phase 1 closed:** The discovery session's findings were merged into the feature branch (`3c200c6`). Gate 1 was approved and recorded as L10. The Gates 2 to 4 batch was drafted in `docs/PRODUCT_BRIEF.md`, using `discovery/diagnosis.md` sections 3 to 6. Both sessions' transcripts were exported at the phase boundary.
- **2026-10-10, Gates 2 to 4 approved:** Emeka approved the goals and metrics, adding an explicit goal about personalization and trust (L11). Emeka also approved the nine principles (L12) and option B for the hypotheses (L13). Emeka clarified that the five hours is an effort guide, not a clock (L5). The editor's table formatting in two discovery files was committed. The concept and journey (Gates 5 and 6) were proposed in `docs/PRODUCT_BRIEF.md`, sections 5 and 6.
- **2026-10-10, Gates 5 and 6 approved:** Emeka reworked the concept: the guided conversation moved after booking, and account creation moved after the provider results. The result was "Book fast, arrive ready" (L14), with three demo patients. Before locking the journey, Emeka asked for research into the brief's data sources. The research is in `docs/INTEGRATIONS.md`. Emeka approved its seven journey changes, the slow-coverage fallback, and RxNorm as a stretch goal (L15). Gate 7 was proposed in `docs/ARCHITECTURE.md`.
- **2026-10-10, Gate 7 approved:** Emeka approved the architecture with two changes (L16): live AI behind a provider router with OpenAI first, and a simple database for the hosted demo. Emeka also required a TRD and execution plan before any build. Claude checked current model IDs and package versions, drafted `docs/TRD.md` (recommending Upstash Redis), created `.env.example`, and updated `docs/ARCHITECTURE.md`.
- **2026-10-10, build started:** Emeka approved the TRD (L17) and added OpenAI, Anthropic, and Gemini keys to `.env.local`.
  - **M0, committed as `d1ee816`.** Next.js 16.4, Tailwind 4 with Legion's tokens, Vitest 5, and Playwright 1.64. `agentRules: false` stops `next dev` from rewriting `AGENTS.md`.
  - **M1, logic core written.** It covers types, actions, the reducer, rules, invented providers and demo patients, simulated asynchronous services, memory and Redis stores, the event catalog with its privacy validator, and sessions.
- **2026-10-10, TRD amended at Emeka's request:**
  - **Telemetry.** Section 7 is a full telemetry and measurement plan.
  - **Audit fixes.** A check against the goals, principles, hypotheses, definition of done, and locked decisions closed eight gaps and added eight strengthening items. The gaps were: essential-history short forms, consent before every retrieval, a resume screen with no health details, date-of-birth errors never shown as eligibility, no celebration around screening, the clinician panel with the monitoring check, "in network · verified," and example chips for the optional note.
  - **Code changes once approved:**
    - The event source becomes `patient_action` or `system_of_record`.
    - Reservation events become system-of-record events.
    - `appointment_confirmed` and `visit_ready` carry `typed_inputs` and `taps`.
    - Events carry `v: 1`.
    - Invalid events are rejected and counted.
    - A phone number that's already known reuses the person ID.
    - The essential-history fields are added.
    - Demo phone numbers are randomized, with a lockout after wrong codes.
    - AI calls are capped.
    - Generic results serve journeys without a demo patient.
