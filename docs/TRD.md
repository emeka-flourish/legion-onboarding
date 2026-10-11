# Technical Requirements Document
## "Book fast, arrive ready": AI-native onboarding prototype for Legion Health

**Date:** 2026-10-10
**Last updated:** 2026-10-10
**Status:** Draft, awaiting Emeka's approval. Nothing is built until it is approved.
**Author:** Claude Code (primary agent)
**Depends on:** [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) (Gates 1 to 6), [ARCHITECTURE.md](ARCHITECTURE.md) (Gate 7), [INTEGRATIONS.md](INTEGRATIONS.md), and [discovery/design-system.md](../discovery/design-system.md)

---

## Changelog

| Date | Changes |
|---|---|
| 2026-10-10 | First draft. Gate 7 changes from Emeka are included: live AI behind a provider router (OpenAI first, with Anthropic and Gemini switchable), a scripted fallback, and a simple database for the hosted demo. |
| 2026-10-10 | Added section 7, the telemetry and measurement plan, at Emeka's request. It covers identity and linkage, the event contract and catalog, metric definitions, data-quality checks, and the journey view. Also added TAC-36 to TAC-42, and expanded milestones M1, M2, and M6. |
| 2026-10-10 | Checked the whole TRD against the approved goals, principles, hypotheses, definition of done, and locked decisions. It fills eight gaps against approved decisions and eight strengthening items, and adds TAC-43 to TAC-56. Two additions are marked proposed until Emeka approves them: a people-in-progress panel and a trust question. |
| 2026-10-10 | Emeka approved section 7, the audit fixes, and both proposed additions. The questions for Legion become stated assumptions (section 13), because Legion won't be asked before submission. |

---

## Table of contents

1. [Overview](#1-overview)
2. [Current state](#2-current-state)
3. [Gap analysis](#3-gap-analysis)
4. [Architecture decisions](#4-architecture-decisions)
5. [Data model and storage](#5-data-model-and-storage)
6. [Backend specification](#6-backend-specification)
7. [Telemetry and measurement plan](#7-telemetry-and-measurement-plan)
8. [Frontend specification](#8-frontend-specification)
9. [File-level change map](#9-file-level-change-map)
10. [Testing requirements](#10-testing-requirements)
11. [Technical acceptance criteria](#11-technical-acceptance-criteria)
12. [Execution plan](#12-execution-plan)
13. [Open questions](#13-open-questions)

---

## 1. Overview

### 1.1 Problem statement

Legion's onboarding loses people where trust and effort matter most:
- 36.6% of match-page sessions never pick a provider.
- One in five held slots never becomes an account.
- A pre-visit intake of 75 to 80 inputs follows booking.

Legion also cannot see a single person's progress past the payment page. The prototype has to let reviewers experience the redesigned journey from first visit to the step after the first visit, and to see the person-level measurement behind it.

### 1.2 Proposed solution

A Next.js web app on Vercel that runs the eleven approved stages of "Book fast, arrive ready" for three invented patients, with seven exception states:

- **Rules.** Eligibility, safety, ranking, and cost are tested rules.
- **AI.** Language work runs through a provider router (OpenAI first, with Anthropic and Gemini switchable), with a scripted fallback.
- **Simulated services.** Healthcare services are simulated, behave like the real vendors, and are labeled.
- **Events and storage.** Every step writes person-level events. A small Redis store makes progress, resuming, and the journey view work for anyone who opens the hosted link.

### 1.3 Scope

**In scope:**
- All eleven stages, the three demo patients, and the seven exception states in PRODUCT_BRIEF.md, section 6.
- The AI router and three AI tasks:
  - turning the optional note into preference chips
  - extracting confirmable items from the guided conversation
  - drafting the clinician summary

  Each task has a scripted fallback.
- Simulated eligibility, records, medication history and pharmacy, identity, scheduling, payment, texts, visit, and e-prescribing. Where the real service answers asynchronously, the simulation does too.
- Person-level telemetry through the post-visit step (section 7): an event catalog, identity linkage, metric definitions, data-quality checks, and a four-panel journey view.
- Demo controls, Upstash Redis storage with a memory fallback, and a full test suite including visual checks.
- **Stretch:** a live RxNorm lookup for medication names.

**Out of scope:**
- Real authentication, real patient data, and real vendor calls. The only live calls are the AI models and the RxNorm stretch.
- A production database design, payments, and SMS.
- Clinician-facing tools beyond the summary and the safety-flag review control.
- Internationalization, and an accessibility audit beyond automated checks plus the visual checklist.

### 1.4 Key decisions summary

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.4 (App Router), React 19.3, TypeScript, Tailwind 4.3 | Approved default. It matches Legion's own stack (Tailwind with shadcn tokens). |
| Where journey logic runs | On the server: a pure reducer plus route handlers | One tested source of truth. System-of-record events come from the server, not page code (H1). |
| Storage | Upstash Redis, through the Vercel Marketplace, with an in-memory fallback | The simplest store that makes resuming, events, and the journey view real on Vercel. No schema or migrations. Local work and tests never depend on it. |
| AI access | AI SDK 7 with OpenAI, Anthropic, and Google providers, behind one router and a config file | Emeka asked for a switch. The AI SDK gives one structured-output API across all three. |
| AI's role | Extract, select, and draft only. The questions are fixed text, and rules decide. | Keeps the AI bounded and testable (L3). Reviewers still see real AI behavior. |
| Simulated asynchronous services | Jobs that resolve when the journey is next read, after a fixed delay | Behaves like webhooks without background workers. Deterministic in tests. |
| Event privacy | An allowlist validator: codes, numbers, and booleans only | Guardrail from Gate 1, and testable |
| Telemetry | Server-side, person-level events with a fixed catalog, two sources (patient action and system of record), and metric definitions tied to H1 to H5 (section 7) | Today's PostHog data counts sessions and stops at the payment page, so it can't measure the goal (L10, problem 1) |
| Deployment | Vercel CLI from this folder, with `.vercelignore` | No GitHub-to-Vercel connection needed. Recordings and notes can never be uploaded. |

---

## 2. Current state

### 2.1 Repository

**What exists:** only documents (`brief/`, `discovery/`, `docs/`, `ai_history/`, and `scripts/export-ai-history.py`), plus project rules (`AGENTS.md`, `STATUS.md`). There is no application code, no `package.json`, and no tests.

**Tooling available on this machine** (checked 2026-10-10): Node 22.22, npm 10.9, pnpm 11.21, the Vercel CLI 51.4 (signed in), and the GitHub CLI (signed in as `emeka-flourish`).

### 2.2 Legion's current flow (the experience being replaced)

**What it does today:** an eight-step funnel (fit, conditions, insurance, needs, match, about yourself, payment), then a portal checklist of about 75 to 80 inputs before the visit. The full account is in [discovery/current-flow.md](../discovery/current-flow.md).

**Current limitations:**
- Telemetry counts browser sessions only, and stops at reaching the payment page.
- Providers come with no explanation, and there is no filter for availability.
- Coverage is checked only after the card.
- Records are typed by hand.
- The self-harm question in the PHQ-9 has no visible safety handling.

### 2.3 External versions pinned for this build (npm registry, 2026-10-10)

| Package | Version |
|---|---|
| `next` | 16.4.0 |
| `react`, `react-dom` | 19.3.0 |
| `tailwindcss` | 4.3.3 |
| `zod` | 4.6.5 |
| `ai` | 7.0.137 |
| `@ai-sdk/openai` | 4.0.91 |
| `@ai-sdk/anthropic` | 4.0.78 |
| `@ai-sdk/google` | 4.0.93 |
| `@upstash/redis` | 1.39.0 |
| `vitest` | 5.0.3 |
| `@playwright/test` | 1.64.0 |

AI SDK calls are written against the documentation bundled in `node_modules/ai/docs`, never from memory.

---

## 3. Gap analysis

| Capability needed | Current state | Gap | Solution |
|---|---|---|---|
| Runnable app | Missing | Everything | Scaffold Next.js, Tailwind, Vitest, and Playwright (M0) |
| Journey logic for the eleven stages | Missing | State machine and guards | `src/domain/reducer.ts` with zod-validated actions |
| Eligibility, safety, matching, and cost rules | Missing | All of them | `src/rules/*` as pure functions with unit tests |
| Provider and patient data | Missing | Invented fixtures | `src/data/providers.ts` and `src/data/personas.ts` |
| Simulated vendors with asynchronous behavior | Missing | Adapters and jobs | `src/services/sim/*` with lazily resolved jobs |
| AI with a provider switch | Missing | Router, tasks, and fallbacks | `src/ai/*` and `src/config/ai.config.ts` |
| Persistence across devices | Missing | Store | `src/store/*`: Redis or memory |
| Person-level events | Missing | Schema, emission, and privacy | `src/events/*` |
| Journey view | Missing | Timeline and funnel | `/journey` page and `src/events/funnel.ts` |
| Tests and visual review | Missing | Everything | Vitest, Playwright, axe, an AI evaluation script, and `docs/QA.md` |

---

## 4. Architecture decisions

### 4.1 Where the journey logic lives

- **Option A: client-side state machine.** Faster to wire. But system-of-record events would come from the browser, and resuming would need the client state anyway.
- **Option B: server-side reducer behind one action endpoint.** The pure function `applyAction(journey, action, ctx)` is easy to unit-test. The server records events and calls the simulated services.

**Decision: Option B.** *Rationale:* events such as `appointment_confirmed` and `first_visit_completed` must come from systems of record (H1, L10). It also keeps the client thin, and makes integration tests independent of the UI.

### 4.2 Storage (Emeka's question at Gate 7)

- **Option A: browser only (no database).** Zero setup. But resuming on another device and the journey view would be fake on the hosted link.
- **Option B: Upstash Redis through the Vercel Marketplace, with an in-memory fallback.** Values are stored as JSON with a seven-day expiry, and there is no schema to migrate. The client is `@upstash/redis`.
- **Option C: Neon Postgres.** Gives SQL for the funnel, but adds schema, migrations, and connection setup.

**Decision: Option B.**

*Rationale:* it adds roughly 30 to 45 minutes, including tests, and makes three things real on the hosted link:
- resuming by phone on a second device (H4)
- events stored server-side, so the journey view shows real demo journeys (H1)
- system-of-record events written by server-side services

Postgres would cost more time for no visible benefit at this size. The in-memory fallback (used when no Redis variables are set) keeps local work and tests independent of the cloud.

**Data minimization.** The store holds:
- journey state, with confirmed structured items only (never raw conversation text)
- a keyed hash of the phone number, never the number itself
- code-only events

Every key expires after seven days.

### 4.3 AI provider router and model choices

Emeka asked for a quick config file and a switch that starts with OpenAI. Model IDs were checked against Vercel's live model list on 2026-10-10. Anthropic IDs follow Anthropic's published names. Each family uses the newest generally available version, and previews are avoided.

| Provider | Quality tier (conversation extraction, clinician summary) | Fast tier (preference chips) | Environment key |
|---|---|---|---|
| OpenAI (default) | `gpt-6.1-sol` | `gpt-6-luna` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-5-5` | `claude-haiku-5-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.8-flash` | `gemini-3.5-flash-lite` | `GOOGLE_GENERATIVE_AI_API_KEY` |

**Behavior:**
- The router tries `AI_PROVIDER` first (default `openai`), then any other provider that has a key, in the order OpenAI, Anthropic, Google, then the scripted fallback.
- An attempt fails over on a missing key, a timeout, a provider error, or output that fails the zod schema.
- Every result carries `{ mode: 'live' | 'scripted', provider, model, latencyMs, fallbackReason }`, and the UI shows it as an "AI · live (OpenAI)" or "AI · scripted" tag.
- `AI_MODEL_QUALITY` and `AI_MODEL_FAST` override the models without code changes.

### 4.4 The AI's job is bounded

- **Option A: the model writes the conversation freely.** It feels richest, but it can't be fully bounded or tested, and it risks advice or reassurance.
- **Option B: fixed questions, with AI for extraction and selection.**
  - The four questions and the follow-up bank are fixed text.
  - The model returns structured items, plus at most one follow-up chosen by ID from the bank.
  - Reflections ("Here's what I noted") are built by a template from the confirmed items.
  - The only AI-authored prose is the clinician summary, which is schema-limited, filtered for prohibited content, and confirmed by the patient.

**Decision: Option B.** *Rationale:* rules decide and AI assists (L3, principle 7). A crisis-language rule runs before every model call, and the model is never called on a crisis match.

### 4.5 Simulated asynchronous services

The real eligibility, records, and medication-history services answer later, through webhooks (INTEGRATIONS.md).

**Approach:** each simulated call creates a job `{ kind, startedAt, readyAt, status }`. `GET /api/journey` resolves any job whose `readyAt` has passed. It computes the fixture result, marks the job complete, and emits the system-of-record event exactly once.

**Delays:**

| Job | Delay |
|---|---|
| Eligibility verification | 4 seconds |
| Insurance lookup (discovery) | 6 seconds |
| Records search | 8 seconds |
| Medication history | 5 seconds |

In tests, `DEMO_FAST=1` divides every delay by 20, or a fake clock is injected.

**Rationale:** this is realistic, serverless-friendly, and deterministic, with no background workers.

### 4.6 Sessions, resuming, and identity

**Cookies:**
- `lh_journey` holds the journey ID, signed with an HMAC using `SESSION_SECRET`. It is HttpOnly, `SameSite=Lax`, lasts seven days, and is the only record of progress before "Hold this time."
- `lh_session` holds the session number.

**At "Hold this time":**
- The person record is created as `phoneHash = HMAC(SESSION_SECRET, e164Phone)`.
- A six-digit code is stored for ten minutes. In demo mode, the code is shown on screen rather than texted.
- Demo phone numbers are randomized per journey within the fictional 555-01xx range, so two reviewers using the same demo patient never collide.
- After five wrong codes for a number, resuming with that number locks for ten minutes.

**Resuming:**
- `/resume` takes the phone number and code, finds the journey by `phoneHash`, sets a new cookie, and increments `sessions`.
- It emits `journey_resumed`.

### 4.7 Event privacy

- **Event properties:** they must pass `validateEventProps(name, props)`. Keys come from a per-event allowlist. Values are booleans, finite numbers, or code strings matching `^[a-z0-9_.:-]{1,40}$`. Any free text throws, in tests as well as at runtime.
- **Event origin:** server code emits all events. The `source` field records where each event came from: `patient_action` for what the patient did (recorded by the server when it applies the action), `system_of_record` for what the simulated services report. The full plan is in section 7.

### 4.8 Deployment

- **Before deploying:** the deploy happens only after every local check passes and Emeka has approved the look and feel on localhost.
- **Commands:** `vercel link`, then Emeka provisions Upstash, then `vercel env pull`, then a preview deploy, a smoke test of that preview, and the production deploy.
- **Excluded from uploads:** `.vercelignore` excludes `discovery/raw_discovery/`, `ai_history/`, `.obsidian/`, `*.mov`, and `*.MP4`.

---

## 5. Data model and storage

This build uses no relational database, so this section takes the place of a schema diff.

### 5.1 Redis keys (all with a seven-day TTL unless noted)

| Key | Value | Notes |
|---|---|---|
| `journey:{journeyId}` | JSON `Journey` | Overwritten on each action |
| `events:{journeyId}` | List of JSON `JourneyEvent` | Appended with RPUSH |
| `journeys:index` | Sorted set of `journeyId`, scored by creation time | Read by the funnel. Entries older than seven days are pruned on read. |
| `phone:{phoneHash}` | `journeyId` | For resuming |
| `code:{phoneHash}` | Six-digit code | TTL of ten minutes |

The memory store implements the same interface (`JourneyStore`) with Maps and expiry timestamps.

### 5.2 Core types (`src/domain/types.ts`)

```typescript
export type PersonaId = 'maya' | 'jordan' | 'sam';
export type Stage =
  | 'fit' | 'needs' | 'help' | 'pay' | 'providers' | 'hold' | 'coverage' | 'book'   // book fast
  | 'home' | 'visit' | 'after'                                                       // arrive ready
  | 'crisis' | 'not_a_fit';                                                          // exits
export type FitQuestionId = 'texas' | 'medicaid_medicare' | 'risk_of_harm'
  | 'recent_hospitalization' | 'adult' | 'virtual_only';
export type ConditionCode = 'adhd' | 'depression' | 'anxiety' | 'bipolar' | 'ptsd' | 'not_sure' | 'other';
export type CareType = 'existing_dx_medication' | 'new_evaluation' | 'not_sure';
export type PlanCode = 'aetna' | 'bcbs_tx' | 'cigna' | 'uhc' | 'oscar' | 'other' | 'none';
export type TimeWindow = 'weekday_morning' | 'weekday_afternoon' | 'weekday_evening' | 'weekend';
export type ReadinessTaskId = 'identity' | 'records' | 'story' | 'check_in'
  | 'confirm_found' | 'pharmacy' | 'essentials';

export interface Reason { code: string; label: string; source: string; shared: boolean }
export interface PreferenceChip { kind: 'gender' | 'language' | 'focus' | 'time' | 'other'; value: string; label: string }
export interface ServiceJob {
  kind: 'coverage_verify' | 'coverage_discover' | 'records' | 'med_history';
  startedAt: string; readyAt: string; status: 'pending' | 'complete' | 'timeout';
  result?: unknown;
}
export interface SafetyFlag { id: string; type: 'phq9_item9' | 'crisis_language'; raisedAt: string; reviewedAt?: string }

export interface Journey {
  id: string; createdAt: string; updatedAt: string;
  personaId?: PersonaId;
  stage: Stage;
  sessions: number;
  fit: Partial<Record<FitQuestionId, boolean>>;
  eligibility?: { outcome: 'eligible' | 'screened_out' | 'crisis'; reasonCode?: string };
  conditions: ConditionCode[];
  careType?: CareType;
  plan?: PlanCode;
  preferences: { windows: TimeWindow[]; chips: PreferenceChip[]; earlierOpeningAlert: boolean };
  selection?: { providerId: string; slotStart: string; reasons: Reason[] };
  person?: { personId: string; firstName: string; phoneHash: string };
  coverage?: {
    mode: 'insured' | 'self_pay';
    method?: 'member_id' | 'lookup';
    status: 'pending' | 'active' | 'inactive' | 'not_found' | 'timeout';
    intakeCostCents?: number; followUpCostCents?: number; source: string;
    confirmLater: boolean;                       // slow-check path (approved with Gate 6)
  };
  booking?: { appointmentId: string; start: string; end: string; timeZone: string; cardLast4: string };
  readiness: {
    tasks: Record<ReadinessTaskId, 'todo' | 'in_progress' | 'done'>;
    identity?: { legalName: string; dob: string; sexAtBirth: string; city: string; ageVerified: boolean; reviewFlag: boolean };
    story?: StoryItems;                          // confirmed items only, never raw text
    clinicianSummary?: { text: string; mode: 'live' | 'scripted' };
    records?: ConfirmedRecord[];
    medications?: ConfirmedMedication[];
    otherMedications?: string[];                 // short confirmed entries
    pharmacyId?: string;
    gad7?: number[]; phq9?: number[];            // 0..3 per item, scores computed
    essentials?: { substanceUse: string; emergencyContactName: string; emergencyContactPhone: string };
    safetyFlags: SafetyFlag[];
    deadline?: string;                           // visit start minus 24 hours
  };
  visit?: { status: 'scheduled' | 'in_progress' | 'completed'; completedAt?: string };
  after?: { followUpStart?: string; prescriptionPharmacyId?: string; summaryViewed: boolean };
  jobs: Partial<Record<ServiceJob['kind'], ServiceJob>>;
  counters: { typed: number; taps: number };     // feeds the "inputs typed" guardrail
  demo: { slowInsurer: boolean; takeChosenSlot: boolean };
}

export interface JourneyEvent {
  id: string; v: 1; name: EventName; journeyId: string; personId?: string; session: number;
  ts: string; source: 'patient_action' | 'system_of_record'; props: Record<string, string | number | boolean>;
}
```

`StoryItems`, `ConfirmedRecord`, `ConfirmedMedication`, and `EventName` are defined in `src/domain/types.ts`, and their zod schemas live in `src/domain/schemas.ts`.

---

## 6. Backend specification

### 6.1 Actions (`src/domain/actions.ts`)

All actions form one zod discriminated union on `type`. The reducer rejects an action that is not allowed at the current stage, with `409 { error: 'invalid_transition' }`.

| Action | Allowed at | Effect and next stage | Events |
|---|---|---|---|
| `ANSWER_FIT {questionId, answer}` | fit | Records the answer. After six answers, `evaluateFit` sets the outcome and moves to needs, crisis, or not_a_fit. | `eligibility_evaluated`, plus `crisis_resources_shown` or `screen_out_resource_shown` |
| `SET_CONDITIONS {conditions[]}` | needs | Moves to help | `care_need_captured {condition_count}` |
| `SET_CARE_TYPE {careType}` | help | Moves to pay | `care_need_captured {need_type}` |
| `SET_PLAN {plan}` | pay | Moves to providers | `coverage_selected {plan_kind}` |
| `SET_TIME_WINDOWS {windows[]}` | providers | Re-ranks | `filter_applied {window_count}` |
| `APPLY_PREFERENCE_CHIPS {chips[]}` | providers | Re-ranks, never removes | `preference_note_applied {chip_count}` |
| `SET_EARLIER_ALERT {on}` | providers | | `earlier_opening_alert_set` |
| `SELECT_SLOT {providerId, slotStart}` | providers | Reserves the slot. If the "take chosen slot" toggle is on, it fails and offers alternatives. Otherwise moves to hold. | `slot_selected {rank}`, then `reservation_created` or `reservation_failed` |
| `HOLD_START {firstName, phone}` | hold | Creates the code. In demo mode it is shown on screen. | none |
| `HOLD_VERIFY {code}` | hold | Creates the person and links the journey. Moves to coverage, or to book for self-pay. | `account_created {method:'phone'}` |
| `COVERAGE_SUBMIT {method, memberId?, dob}` | coverage | Starts the verify or discover job | `coverage_check_started` |
| `COVERAGE_USE_SELF_PAY` | coverage | Moves to book as self-pay | `coverage_selected {plan_kind:'self_pay'}` |
| `COVERAGE_CONFIRM_LATER` | coverage, once the job has passed 15 seconds | Sets `confirmLater`, moves to book | `coverage_check_timed_out` |
| `BOOK {consents, cardLast4}` | book | All three consents are required. Scheduling confirms (system of record). Moves to home. | `consents_signed`, `payment_method_added`, `appointment_confirmed`, `reminder_sent` |
| `ID_VERIFY` | home | Identity fixture, then age check, then a review flag on mismatch | `identity_verified` |
| `RECORDS_CONSENT` | home, after identity | Starts the records and medication-history jobs | `records_requested` |
| `STORY_CONFIRM {items, summary?}` | home | Saves confirmed items only | `intake_task_completed {task:'story'}` |
| `CHECKIN_ANSWER {instrument, index, value}` | home | Stores the answer. PHQ-9 item 9 above 0 raises a flag. | `safety_flag_raised` (when it applies), then `intake_task_completed {task:'check_in'}` when finished |
| `CONFIRM_FOUND {records[], medications[], otherMedications[]}` | home, after the jobs complete | | `intake_task_completed {task:'confirm_found'}` |
| `SET_PHARMACY {pharmacyId}` | home | | `intake_task_completed {task:'pharmacy'}` |
| `SET_ESSENTIALS {hospitalizedEver, controlledNow, otherAllergies[], alcohol, cannabis, otherSubstances, contactName, contactPhone}` | home | Records the essential history (L14, item 5). Allergies and controlled substances arrive prefilled from the confirmed searches. Once all required tasks are done, sets the journey ready. | `intake_task_completed`, then `visit_ready {hours_before_visit, typed_inputs, taps}` |
| `JOIN_VISIT` | home or visit | Moves to visit | `visit_join_attempted`, then `visit_started` (system of record) |
| `END_VISIT` | visit | The clinical record completes the visit. Moves to after. | `first_visit_completed` (system of record), `prescription_sent` (system of record) |
| `VIEW_SUMMARY` | after | | `visit_summary_viewed` |
| `BOOK_FOLLOW_UP {slotStart}` | after | | `follow_up_booked` (system of record) |
| `DEMO_SET {slowInsurer?, takeChosenSlot?}` | any (demo mode only) | Toggles a scenario | none |
| `DEMO_REVIEW_FLAG {flagId}` | any (demo mode only) | A person reviews the flag | `safety_flag_reviewed {minutes_to_review}` |

Required readiness tasks are `identity`, `story`, `check_in`, `confirm_found`, `pharmacy`, and `essentials`. The `records` task is the background search, and it completes together with `confirm_found`.

### 6.2 Route handlers

| Method and path | Request | Response | Errors |
|---|---|---|---|
| `POST /api/journey` | `{ personaId?: PersonaId }` | `201 { journey: ClientJourney }`. Sets the cookies and emits `onboarding_started`. | `400` for an invalid persona |
| `GET /api/journey` | none (uses the cookie) | `200 { journey: ClientJourney, ai: AiStatus }`. Resolves due jobs first. | `404` if there is no journey or it expired |
| `POST /api/journey/action` | `Action` | `200 { journey: ClientJourney, demoCode?: string }` | `400` validation, `409` invalid transition, `404` no journey |
| `POST /api/providers` | `{}` (reads the journey) | `200 { top: ProviderCard[3], sharedReasons: Reason[], noOpenings: boolean, nearest?: ProviderCard[], totalEligible: number }` | `409` before the pay stage |
| `POST /api/ai/preference-note` | `{ note: string (max 300) }` | `200 { chips: PreferenceChip[], meta: AiMeta }` or `200 { safety: 'crisis' }` | `400` |
| `POST /api/ai/intake` | `{ promptId: 1 to 4, answer: string (max 1200), followUpOf?: string }` | `200 { items: ExtractedItem[], followUpId: FollowUpId \| null, meta: AiMeta }` or `200 { safety: 'crisis' }` | `400` |
| `POST /api/ai/summary` | `{}` (uses the confirmed items) | `200 { text: string, meta: AiMeta }` | `409` if the story is not confirmed |
| `POST /api/resume/start` | `{ phone }` | `200 { sent: true, demoCode? }` (the same answer whether or not the number is known) | `400` |
| `POST /api/resume/verify` | `{ phone, code }` | `200 { journey }`. Sets a new cookie, increments the session count, emits `journey_resumed`. | `401` for a wrong code |
| `GET /api/journey-view` | none | `200 { timeline: JourneyEvent[], funnel: { live: FunnelRow[], synthetic: FunnelRow[] }, guardrails }` | none |
| `GET /api/rxnorm?term=` (stretch) | query string | `200 { matches: {rxcui, name}[], meta: {mode:'live'} }` | `502` passed through as an empty list |

`ClientJourney` is `Journey` without `phoneHash`, internal job results, or demo internals.

### 6.3 Rules (`src/rules/*`, pure functions)

```typescript
evaluateFit(fit): { outcome: 'eligible' | 'screened_out' | 'crisis'; reasonCode?: 'not_texas' | 'medicaid_medicare' | 'recent_hospitalization' | 'under_18' | 'not_virtual' }
// "Yes" to risk_of_harm gives 'crisis' and takes precedence over every other answer.
detectCrisisLanguage(text): { match: boolean; category?: 'self_harm' | 'harm_others' | 'suicide' }
// A conservative phrase and regex list. A false positive leads to resources plus review, never to blocking care.
phq9Item9Positive(answers): boolean        // index 8 > 0
scorePhq9(a), scoreGad7(a): { total: number; band: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe' }
conditionExpectations(conditions, careType): Expectation[]
// Anxiety: benzodiazepine cap at 1 mg/day, plus the Texas prescription-monitoring note. ADHD: stimulant policy (verified ID, history review).
adaptCareTypeOptions(conditions): CareTypeOption[]   // wording adapts, e.g. ADHD: "I was diagnosed and need medication" or "I think I might have ADHD"
filterProviders(all, j): Provider[]        // licensed in TX, takes the plan or self-pay, offers the care type, accepting new patients
rankProviders(eligible, j, now): Ranked[]  // openings in the chosen windows over 14 days, then condition focus, then preference chips
buildReasons(top3, j): { perCard: Reason[][]; shared: Reason[] }   // only differing reasons go on the cards, each with its source
nearestOutsideWindows(eligible, j, now): Ranked[]                   // when no one fits the windows
typicalCost(plan) / selfPayCost(): { intakeCents: 25000, followUpCents: 15000 } / exactCost(coverageResult)
timeZoneFor(city | zip): 'America/Chicago' | 'America/Denver'       // El Paso and Hudspeth County use Mountain Time
formatSlot(iso, tz): string                // always includes the zone abbreviation, e.g. "Tue Oct 13, 6:30 PM CDT"
readinessStatus(j): { requiredDone: boolean; remaining: ReadinessTaskId[]; deadline: string }
ageCheck(identityDob, fitAdultAnswer, coverageDob?): { verified: boolean; reviewFlag: boolean }
```

### 6.4 Simulated services (`src/services/sim/*`)

Every service has one interface in `src/services/types.ts`, and each result carries `source` (for example `"Eligibility check · Sohar (simulated)"`). Fixture outcomes for each demo patient:

| Service | Maya | Jordan | Sam |
|---|---|---|---|
| Coverage verify or discover (Sohar) | Member ID: active, intake copay $40, follow-up $40 | (self-pay, no call) | Lookup: not found, then member ID: inactive, then the self-pay option |
| Network status (Sohar) | 2 of the top 3 are in network | n/a | n/a |
| Records (Metriport) | 2 sources: Lakeside Family Medicine (2024 visit, anxiety symptoms noted, penicillin allergy) and Hill Country Urgent Care (2025, insomnia) | None found | 1 source (2025 urgent-care visit) |
| Medication history (DoseSpot via Surescripts) | Hydroxyzine 25 mg as needed, filled 2026-08 at Riverside Pharmacy | Empty, because his fills were cash-paid. The follow-up question captures them. | None |
| Identity (Persona) | Verified. Name, date of birth (1997), sex, and Austin address. | Verified (1992), Houston | Verified (2004), El Paso |
| Scheduling | Evening openings | No weekend or early-morning openings in 14 days, so nearest times plus an alert | Mountain Time display |
| Visit and e-prescribing | Completed. New prescription sent to Riverside Pharmacy. | Completed. Prescription sent to the chosen pharmacy. | Completed. Follow-up booked, with a therapy referral noted. |

Providers: 12 invented providers (initials avatars, no photos) in `src/data/providers.ts`. Each has license states, plans, care types, focus areas, languages, gender, accepting-new-patients status, and a weekly availability pattern. Slots are generated deterministically for 14 days from `seed(journeyId, providerId)`. Every fact names its source: licensure from the Texas Board of Nursing or Texas Medical Board, plans from Legion credentialing, and openings from Legion scheduling, all marked simulated.

**Without a demo patient.** Each service returns a generic invented result, so a reviewer can try their own answers:
- active coverage at a $40 copay
- one record source
- no medication history
- a generic ID
- no prescription after the visit

### 6.5 AI layer (`src/ai/*`, `src/config/ai.config.ts`)

```typescript
// src/config/ai.config.ts: the one place to switch providers or models
export const aiConfig = {
  activeProvider: (process.env.AI_PROVIDER ?? 'openai') as 'openai' | 'anthropic' | 'google' | 'scripted',
  fallbackOrder: ['openai', 'anthropic', 'google'] as const,
  models: {
    openai:    { quality: 'gpt-6.1-sol',     fast: 'gpt-6-luna' },
    anthropic: { quality: 'claude-opus-5-5', fast: 'claude-haiku-5-5' },
    google:    { quality: 'gemini-3.8-flash', fast: 'gemini-3.5-flash-lite' },
  },
  tasks: {
    preferenceNote:   { tier: 'fast',    timeoutMs: 8_000 },
    intakeExtract:    { tier: 'quality', timeoutMs: 15_000 },
    clinicianSummary: { tier: 'quality', timeoutMs: 20_000 },
  },
} as const;

// src/ai/router.ts
runTask<T>(task: TaskName, input: TaskInput, ctx: { personaId?: PersonaId }):
  Promise<{ output: T; meta: { mode: 'live' | 'scripted'; provider?: string; model?: string; latencyMs: number; fallbackReason?: string } }>
```

**Tasks:**
- **`preferenceNote`.** The output schema is `{ chips: PreferenceChip[] (max 5) }`, and unknown kinds are dropped. The scripted fallback is a keyword mapper for words such as "woman", "female", "Spanish", "evening", "trauma", and "sleep".
- **`intakeExtract`.**
  - Inputs: the prompt ID, the answer, the conditions, the care type, and the follow-up IDs already used.
  - Output: `{ items: { kind: 'concern' | 'onset' | 'duration' | 'trigger' | 'prior_treatment' | 'medication_mentioned' | 'goal' | 'preference'; text: string (max 80) }[] (max 8), followUpId: FollowUpId | null }`.
  - The follow-up bank: `sleep_impact`, `work_impact`, `onset_trigger`, `med_dose`, `med_side_effects`, `therapy_history`, and `goal_clarify`. Each has fixed question text.
  - Scripted fallback: the demo patient's canned output when the answer matches their canned demo answer. Otherwise a keyword extractor.
- **`clinicianSummary`.**
  - Output: `{ text: string (max 900) }`, drawn from the confirmed items, the questionnaire bands, and the confirmed records.
  - A post-filter rejects advice, diagnosis, or dose language (for example "you should", "diagnos", " mg " when it isn't in the inputs, "prescribe") and falls back to the template summary.

**Rules around every task:**
- `detectCrisisLanguage` runs on every free-text input before any model call. A match returns `{ safety: 'crisis' }` and raises a flag, and the model is never called.
- Inputs and outputs are not logged, and conversation text is never stored. Server logs never include request bodies.
- AI routes need a valid journey cookie at the matching stage. Each journey gets at most 40 live AI calls, after which the scripted fallback takes over.
- AI routes set `maxDuration` to 30 seconds on Vercel.

### 6.6 Events (`src/events/*`)

- **`emit(store, journey, name, source, props)`.** It validates the properties and appends the event to `events:{journeyId}`, with `personId` once the person exists.
- **`funnel.ts`.** It computes per-person rows (started, eligible, selected a provider, account, coverage known before booking, booked, ready before the deadline, first visit completed within 14 days, post-visit step) for:
  - **live:** every journey in `journeys:index`
  - **synthetic:** a seeded cohort of 1,000 invented people, generated once, with conversion rates loosely anchored to the current funnel data and clearly labeled as invented
- **Guardrails reported:**
  - median typed inputs before the visit
  - median minutes from start to booking
  - share of screened-out people shown a resource
  - share of safety flags reviewed within the set time

The full telemetry plan, with the catalog, metric definitions, and data-quality checks, is in section 7.

---

## 7. Telemetry and measurement plan

This section is the measurement design behind H1, Emeka's first priority (L10, problem 1, and principle 1). Legion's current PostHog data counts browser sessions and ends at reaching the payment page, so it cannot see the goal. The plan below does three things:
- it measures each eligible person from the first page to the step after the first visit
- it takes outcomes from the systems that own them
- it makes each hypothesis (H1 to H5) testable

### 7.1 Today versus the rebuild

| | Today (PostHog, from the brief) | The rebuild |
|---|---|---|
| Unit of counting | A browser session | A patient journey, linked to a person at account creation |
| End point | Reaching the payment page | First visit completed, then the post-visit step |
| Where outcomes come from | Page views and a few browser events | The systems that own them: scheduling, payment, eligibility, records, identity, the visit platform, and the clinical record |
| Screen-outs | Indistinguishable from people who left | Recorded with a reason code |
| Returning later or on another device | Counted as a loss | On the same device, the signed cookie. On another device, resuming by phone. Either way it's the same journey, with a new session number. |
| Patient effort | Not measured | Typed inputs versus taps, and minutes to book |
| Safety | Not measured | Flags raised, and minutes until a person reviews them |
| Ad blockers and bots | An undercount, because capture runs in the browser | Captured on the server when each action is applied |
| Event quality | Duplicate and cross-route events at low volume | A fixed catalog, an allowlist, and validation at runtime |
| Privacy | Not stated | Codes, counts, and timings only, never clinical answers |

### 7.2 Identity and linkage

- **Journey ID.** Created on the first page and held in a signed first-party cookie. It appears on every event.
- **Person ID.** Created at "Hold this time," when the phone code is verified. Every later event carries it. Earlier events need no rewriting, because they share the journey ID.
- **Session number.** It is a property, not the unit of counting. It goes up when a patient resumes by phone on another device, or uses the demo's return-visit control.
- **One person, more than one journey.** Someone might start a fresh journey and then verify a phone number that already belongs to a person. In that case the new journey reuses that person's ID, so person-level metrics count them once.
- **What is still blind.** An eligible person might abandon on one device before creating an account, then start over on another device. That person counts as two starts. It is the only gap left before booking, and it is far smaller than today's.

### 7.3 Event contract

```typescript
interface JourneyEvent {
  id: string;              // evt_…
  v: 1;                    // schema version
  name: EventName;         // from the catalog in section 7.4
  journeyId: string;
  personId?: string;       // present from account_created onward
  session: number;
  ts: string;              // ISO 8601, UTC
  source: "patient_action" | "system_of_record";
  props: Record<string, string | number | boolean>;  // allowlisted codes, counts, and timings
}
```

- **Captured on the server.** Events are recorded when the server applies an action or a service result. No page code emits analytics.
- **Two sources.**
  - `patient_action` covers what the patient did, including outcomes the rules compute from it, such as eligibility and visit readiness.
  - `system_of_record` covers what an authoritative system reports, such as a confirmed appointment or a signed visit note. In the prototype these come only from the simulated services.
- **Exactly once.** A system-of-record event fires when a job resolves or an action commits, and each of those can happen only once.
- **Validated.** An event whose name is not in the catalog, or whose properties fail the allowlist, is rejected and counted in the data-quality panel. It is never stored.

### 7.4 Event catalog

| Stage | Event | Fires when | Source | Properties | Serves |
|---|---|---|---|---|---|
| Start | `onboarding_started` | The journey is created on the first page | patient_action | entry, persona | Starts |
| Fit check | `eligibility_evaluated` | The deciding fit answer is given | patient_action | outcome, reason | The eligible denominator, and screen-out reasons |
| Fit check | `screen_out_resource_shown` | A screened-out person sees resources | patient_action | reason | Guardrail |
| Safety | `crisis_resources_shown` | Crisis resources are shown | patient_action | trigger (`fit_check`, `phq9_item9`, `crisis_language`) | Safety |
| Needs | `care_need_captured` | Conditions are chosen, then the care type | patient_action | condition_count, need_type | Context |
| Payment | `coverage_selected` | A plan or self-pay is chosen | patient_action | plan_kind | H5 |
| Matching | `providers_presented` | The three best fits are shown | patient_action | count, eligible_count, no_openings, hours_to_earliest | H2 denominator |
| Matching | `filter_applied` | "When works for you?" changes | patient_action | window_count | H2 |
| Matching | `preference_note_applied` | The optional note's chips are applied | patient_action | chip_count, mode | H2, AI |
| Matching | `earlier_opening_alert_set` | The earlier-opening alert is switched on or off | patient_action | on | H2 |
| Matching | `slot_selected` | A time is picked | patient_action | rank | H2 |
| Matching | `reservation_created` | Scheduling holds the time | system_of_record | hold_minutes | Stage metric 1 |
| Matching | `reservation_failed` | Scheduling reports the time is taken | system_of_record | reason | Exception |
| Account | `account_created` | The phone code is verified | patient_action | method | H4, stage metric 2 |
| Account | `journey_resumed` | A patient resumes by phone | patient_action | method, session | H4 |
| Coverage | `coverage_check_started` | A member ID or lookup is submitted | patient_action | method | H5 |
| Coverage | `coverage_verified` | The eligibility service answers | system_of_record | result, cost_shown, source | H5, stage metric 3 |
| Coverage | `coverage_check_timed_out` | The patient books before the plan answers | patient_action | seconds | H5 |
| Booking | `consents_signed` | The three policies are accepted | patient_action | count | |
| Booking | `payment_method_added` | The payment processor authorizes the card | system_of_record | result | |
| Booking | `appointment_confirmed` | Scheduling confirms the visit | system_of_record | lead_hours, coverage_confirm_later, typed_inputs, taps | Denominator for stages 3 to 5, and effort |
| Booking | `reminder_sent` | Messaging sends a text | system_of_record | kind, channel | |
| Readiness | `identity_verified` | The identity provider returns a result | system_of_record | result, age_verified, review_flag | H3 |
| Readiness | `records_requested` | The patient consents to the search | patient_action | sources | H3 |
| Readiness | `records_received` | The records network answers | system_of_record | count, source | H3 |
| Readiness | `med_history_received` | The pharmacy network answers | system_of_record | count, source | H3 |
| Readiness | `intake_task_completed` | A checklist task is finished | patient_action | task, items, mode, records_confirmed, meds_confirmed, other_meds, prefilled | H3 |
| Safety | `safety_flag_raised` | A fixed rule flags an answer | patient_action | type | Guardrail |
| Safety | `safety_flag_reviewed` | A person reviews the flag | system_of_record | type, minutes_to_review | Guardrail |
| Readiness | `visit_ready` | The last required task is done | patient_action | hours_before_visit, typed_inputs, taps | Stage metric 4, and effort |
| Visit | `visit_join_attempted` | The patient taps Join | patient_action | | |
| Visit | `visit_started` | The visit platform starts the visit | system_of_record | | |
| Visit | `first_visit_completed` | The clinical record marks the visit complete | system_of_record | within_14_days, minutes_from_start | Headline, stage metric 5 |
| After | `prescription_sent` | E-prescribing sends the prescription | system_of_record | | |
| After | `visit_summary_viewed` | The patient opens the summary | patient_action | | |
| After | `follow_up_booked` | Scheduling books the follow-up | system_of_record | weeks_out | Stage metric 6 |
| Booking | `trust_pulse_answered` | The patient answers the optional trust question after booking | patient_action | score | Goal 2 |

### 7.5 Metric definitions

**Counting rules:**
- Every metric counts people: the person ID once it exists, and otherwise the journey ID.
- Cohorts are grouped by the date of `onboarding_started`.
- A cohort is final 14 days after its last start.

| Metric | Numerator | Denominator |
|---|---|---|
| **Headline: first-visit completion among eligible starters** | People with `first_visit_completed` within 14 days of their first `onboarding_started` | People with `eligibility_evaluated` = eligible |
| Provider selected, among eligible people who saw matches | People with `reservation_created` | People with `providers_presented` |
| Held reservation becomes an account | People with `account_created` | People with `reservation_created` |
| Coverage and cost known before booking | People whose `appointment_confirmed` has `coverage_confirm_later` = false | People with `appointment_confirmed` |
| Readiness complete before the deadline | People with `visit_ready` at least 24 hours before the visit | People with `appointment_confirmed` |
| Attended the first visit | People with `first_visit_completed` | People with `appointment_confirmed` |
| Took the post-visit next step | People with `follow_up_booked` | People with `first_visit_completed` |
| Guardrail: typed inputs before the visit | Median `typed_inputs` on `visit_ready` | |
| Guardrail: time from start to booking | Median minutes from `onboarding_started` to `appointment_confirmed` | |
| Guardrail: screened-out people shown a resource | People with `screen_out_resource_shown` | People screened out (target 100%) |
| Guardrail: safety flags reviewed within the set time | Flags with `safety_flag_reviewed` within 240 minutes (an assumed target; Legion sets the real one) | Flags raised |

**What each hypothesis watches:**
- **H1:** the share of journeys whose events form a complete chain up to their current stage, and the share of people linked across sessions.
- **H2:** provider selection split by `no_openings`, use of the time filter and the optional note, and the distribution of the chosen `rank`.
- **H3:** prefilled versus typed readiness items, median typed inputs, readiness before the deadline, and live versus scripted AI.
- **H4:** reservations that become accounts, and the share of journeys resumed on another device.
- **H5:** the share booked with coverage verified first, the timeout rate, and the spread of coverage results.

**Approved: a direct measure for goal 2.** Goal 2 (care feels personalized and builds trust) currently has only indirect measures. The proposal:
- **The question.** Right after booking, one optional one-tap question: "How confident do you feel about your provider choice?" on a scale of 1 to 5.
- **The event.** `trust_pulse_answered {score}`.
- **The metric.** The median score, plus the share answering 4 or 5.

### 7.6 Where the data lives

- **In the prototype.** Events are appended to a Redis list for each journey, and the journey index feeds the funnel. The journey view computes metrics when it is opened, which is fine at demo scale.
- **In production.** The same contract would apply:
  - **PostHog.** Events go to PostHog through server-side capture, so Legion keeps its existing tool. The `distinct_id` is the journey ID, and it is identified as the person at account creation. That makes PostHog's data person-level, and ad blockers can't drop it.
  - **Systems of record.** Their events come from vendor webhooks and internal systems:
    - Sohar verification and discovery
    - Metriport network queries
    - Persona
    - DoseSpot
    - the scheduling system (Healthie, judging by the payment descriptor)
    - Stripe
    - the visit platform
    - the clinical record, when the visit note is signed
  - **Warehouse.** A warehouse table computes the funnel. The prototype's journey view stands in for it.

### 7.7 The journey view (`/journey`)

It has five panels:
1. **This journey.** Every event in order, with its stage, time, and a source badge. It also shows:
   - session numbers
   - the point where the anonymous journey links to a person
   - the next expected events that haven't happened yet
2. **Funnel.** Per-person conversion, both for live demo journeys from the last seven days and for a synthetic baseline cohort that is clearly labeled as invented. The headline metric comes first, then the six stage metrics and the four guardrails.
3. **Today versus the rebuild.** Legion's session funnel from the brief, 5,898 sessions down to 1,403 reaching the payment page, where measurement stops. Beside it, the rebuild's stages through first visit completed and the post-visit step.
4. **Data quality.** It reports:
   - validation failures (expected to be zero)
   - out-of-order events
   - duplicate system-of-record events
   - linkage gaps
   - how complete each journey's chain of events is
5. **People in progress** (for goal 4). A list of live demo journeys from the last seven days. For each one it shows:
   - a short journey ID
   - the current stage
   - readiness, as a count of required tasks done out of six
   - any open safety flags, with a "Mark reviewed" control
   - the next expected event

   This shows how a care team could see where everyone is, and it gives the safety-review guardrail a home.

### 7.8 Data-quality checks

- **Contract.** Every event the code can emit is in the catalog, and its properties validate. This is tested, and enforced at runtime.
- **Golden sequences.** Each demo patient's full journey records an exact, ordered list of events, kept in a test fixture.
- **Order.** A stage event never comes before the event it depends on. For example, `appointment_confirmed` never comes before `reservation_created`.
- **Exactly once.** No system-of-record event is duplicated.
- **Linkage.** Every event carries the journey ID. Every event from `account_created` onward carries the same person ID, and no earlier event carries one.

### 7.9 Privacy

- **What events contain.** Codes, counts, and timings only. There are no names, phone numbers, free text, condition names, or questionnaire answers. Eligibility reason codes are allowed, as Emeka approved at Gate 1.
- **Where events go.** In the prototype, events never leave the server. In production, the PostHog project and the warehouse would hold no protected health information.

---

## 8. Frontend specification

### 8.1 Routes and screen states

| Route | Stage | Content rules |
|---|---|---|
| `/` | entry | A Legion-style welcome with a "Get started" button (calls `POST /api/journey`) and a link to "Already started? Continue with your phone." If a valid journey cookie exists, it shows "Welcome back. Continue where you left off," naming only the step (for example, "Choosing a time") and never any health details, plus "Start over." |
| `/start/fit` | 1 | One question per screen, with a progress bar of six. The two answer buttons sit above the fold at 375×812, and the continuing answer always sits in the same position. A "Yes" to the risk-of-harm question goes to `/start/crisis`. Finishing the check shows a calm "You're a fit for our care" line, not a celebration. |
| `/start/crisis` | exit | 988 (call or text) and 911 guidance, plus a Crisis Text Line line. There is no booking path. |
| `/start/not-a-fit` | exit | Resources for each reason code |
| `/start/needs` | 2 | Condition chips (multi-select). Selecting a condition expands its expectation text. |
| `/start/help` | 3 | Three adaptive options (one tap) |
| `/start/pay` | 4 | Plan tiles plus "No insurance." The typical cost appears inline. Self-pay shows $250 for the intake and $150 for follow-ups, and no insurance wording. |
| `/start/providers` | 5 | It has:<br>- a "When works for you?" chip bar, preset from the demo patient and editable<br>- a "Why these three" line (the shared reasons)<br>- three cards, each with a slot grid of up to the next 6 openings in the chosen windows, with zone labels<br>- after the cards, the optional note box with example chips such as "A woman provider," "Speaks Spanish," and "Evenings only"<br>- "See all N providers" |
| `/start/hold` | 6 | "We'll hold this time for you." First name and mobile number, then a code field. A demo code hint appears on screen. |
| `/start/coverage` | 7 | It has:<br>- **Inputs.** Member ID, plus date of birth typed as MM/DD/YYYY with a format hint and checked as it's typed. An invalid date shows a plain message next to the field, never an age or eligibility notice.<br>- **"Look it up for me."** It first says what will be shared (name, date of birth, state) and with whom (the insurance check service, simulated), and runs only after a tap.<br>- **Pending checks.** A status line counts up while the check runs. At 15 seconds, the "Book now; we'll confirm before your visit" option appears.<br>- **Problems.** Inactive and not-found results each have a plain next step. |
| `/start/book` | 8 | It has:<br>- a review card: provider, time with zone, cost, the one-line cancellation rule, and "In network with [plan] · verified" once coverage is confirmed<br>- the three consent checkboxes, on one screen<br>- a simulated card field showing a test card |
| `/home` | 9 | It has:<br>- **Visit card.** Time, zone, and the Join button, available from 10 minutes before in demo mode.<br>- **Get ready checklist.** In the approved order, with each task labeled Required or Optional and the deadline shown.<br>- **Coverage outcome.** If coverage was confirmed later, a banner shows the result: the confirmed cost, or for an inactive plan, the choice of self-pay or a free cancellation.<br>- **"Texts from Legion."** The simulated texts sent: the confirmation, a day-before reminder listing any remaining items, and the join link.<br>- **Milestone confirmations.** Calm confirmations appear when the patient is booked and when they're ready. |
| `/home/id` | 9a | A purpose line ("Verify once, and we'll fill in the details your records search needs") that waits for an explicit tap. Then a simulated ID capture, then the extracted fields with their source to review |
| `/home/records` | 9b, 9e | Consent card (purpose, sources, and what is retrieved), then "Searching…" states, then found items with source tags to confirm, then the "anything else you take?" question |
| `/home/story` | 9c | It opens with an AI disclosure: "An AI assistant organizes your answers for your provider. It doesn't give medical advice or make decisions, and your provider reviews everything." Then:<br>- the four fixed prompts, with at most one follow-up each<br>- "Here's what I noted" chips after each answer<br>- a review screen<br>- the clinician summary to confirm<br><br>AI tags appear throughout, and "Need help now? Call or text 988" stays visible. |
| `/home/check-in` | 9d | GAD-7 and then PHQ-9, word for word, one item per screen with four options. "Need help now? Call or text 988" stays visible. A positive item 9 shows the safety panel immediately. Finishing shows a plain "Thank you" with no celebration. |
| `/home/pharmacy` | 9f | Prefilled from fill history, editable from a short list |
| `/home/essentials` | 9g | **Essential history**, as five short forms, prefilled wherever the searches found something:<br>1. Psychiatric hospitalization, ever. The past-year answer from the fit check is shown.<br>2. Controlled substances taken now. Prefilled from confirmed medications and the "anything else you take" answer.<br>3. Allergies. Any found are shown to confirm, plus room for others.<br>4. Substance use, as three short choices.<br>5. An emergency contact. |
| `/visit` | 10 | A waiting room, then a simulated video tile with the provider's initials and a timer, then "End visit." Before the video starts, a "What your provider has" panel shows what readiness produced:<br>- the clinician summary<br>- confirmed records and medications<br>- questionnaire scores and severity bands<br>- any safety flags, with their review status<br>- when a controlled substance is relevant, "Prescription monitoring check: pending, done by your provider (simulated)" |
| `/after` | 11 | The visit summary (scripted for each demo patient, labeled "reviewed by your clinician (simulated)"), the prescription sent to the confirmed pharmacy, and one-tap follow-up times |
| `/resume` | n/a | Phone and code, then a redirect to the journey's current stage. Nothing before the redirect shows health details. |
| `/journey` | internal | The four panels in section 7.7 (timeline, funnel, today versus the rebuild, and data quality), plus the people-in-progress panel |

The client reads `GET /api/journey` on load and after each action. While a job is pending, it polls every 1.5 seconds and stops once nothing is pending. The browser back button follows the stage order; earlier stages can be revisited but not edited after booking.

### 8.2 Global UI rules

1. **Demo banner.** It appears on every page: "Demo with invented patients. Please don't enter real health information." A "Demo controls" button opens a drawer with:
   - a patient picker (Maya, Jordan, Sam, or none)
   - "Fill this step" (for speed)
   - "Simulate a return visit," which clears the cookie and opens `/resume`
   - toggles for "Make the insurer slow" and "Make the chosen time get taken"
   - "Mark safety flag reviewed"
   - links to the journey view and to reset
   - the AI status line, for example "AI: OpenAI gpt-6.1-sol · live" or "AI: scripted"
2. **Tags.**
   - `SimulatedTag` on every simulated result.
   - `AiTag` (live or scripted, with the provider) on every AI-produced item.
   - `SourceTag` on every prefilled fact.
3. **Copy.**
   - No "perfect match" and no over-claiming.
   - Every time shows its zone.
   - Errors are in plain language, and raw technical messages never appear.
   - No insurance wording for self-pay patients.
4. **Accessibility.**
   - Text and button contrast at least 4.5:1, and tap targets at least 44 px.
   - Visible focus rings and labeled inputs.
   - No horizontal scroll at 375 px.
5. **Design tokens.** Taken from [discovery/design-system.md](../discovery/design-system.md):
   - primary #3A68E9, foreground #09090B, muted #F4F4F5, border #E4E4E7
   - an 8 px base radius and the Inter font
   - Lucide icons
   - a text wordmark rather than Legion's logo file
6. **Consent before retrieval.** Every retrieval states its purpose and what will be shared or retrieved, and runs only after an explicit tap. That covers the insurance lookup, the ID check, and the records and medication search (principle 6).
7. **Input errors are only input errors.** A validation problem always appears next to its field in plain words. It never appears as an eligibility, age, or coverage decision (L10, problem 4).
8. **No celebration around sensitive screening.** There is no confetti, emoji, or celebration screen after the fit check or the questionnaires. Calm confirmations mark the real milestones: booked, ready, and visit complete.
9. **Help is always visible on clinical screens.** The conversation and check-in screens keep "Need help now? Call or text 988" in view.
10. **Layout.** From 1,024 px wide, a two-column layout puts the step on the left and a calm context panel on the right, covering why we ask and what's simulated. On phones, context sits below the primary action, never above it.

### 8.3 Components (`src/components/*`)

`Shell` (header, progress, back, and help), `DemoBanner`, `DemoControls`, `ChoiceButton`, `Chip` / `ChipGroup`, `ProviderCard`, `SlotGrid`, `ReasonList`, `TimeWindowBar`, `SimulatedTag`, `AiTag`, `SourceTag`, `ConsentCard`, `ChecklistItem`, `QuestionnaireItem`, `SafetyPanel`, `StatusLine` (for jobs), and `FunnelTable` / `Timeline`.

---

## 9. File-level change map

| File or folder | Change | Notes |
|---|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs` | CREATE | Scaffold |
| `vitest.config.ts`, `playwright.config.ts` | CREATE | Playwright projects for mobile (390×844) and desktop (1440×900) |
| `.env.example` | CREATE | Created with this TRD |
| `.vercelignore` | CREATE | Excludes recordings, notes, discovery raw files, and transcripts |
| `.gitignore` | MODIFY | Adds `test-results/`, `playwright-report/`, and `.env.local` (already covered by `.env*`) |
| `src/app/layout.tsx`, `src/app/globals.css` | CREATE | Tokens, Inter, the banner |
| `src/app/page.tsx`, `src/app/start/**`, `src/app/home/**`, `src/app/visit/page.tsx`, `src/app/after/page.tsx`, `src/app/resume/page.tsx`, `src/app/journey/page.tsx` | CREATE | Screens from section 8.1 |
| `src/app/api/**/route.ts` | CREATE | Handlers from section 6.2 |
| `src/domain/types.ts`, `schemas.ts`, `actions.ts`, `reducer.ts` | CREATE | Section 5.2 and section 6.1 |
| `src/rules/*.ts` | CREATE | Section 6.3 |
| `src/data/providers.ts`, `personas.ts`, `questionnaires.ts`, `followups.ts`, `pharmacies.ts` | CREATE | Invented fixtures. The GAD-7 and PHQ-9 canonical wording is in `questionnaires.ts`. |
| `src/services/types.ts`, `src/services/sim/*.ts` | CREATE | Section 6.4 |
| `src/store/index.ts`, `memory.ts`, `redis.ts` | CREATE | `getStore()` picks Redis when its variables exist, otherwise memory |
| `src/ai/router.ts`, `src/ai/tasks/*.ts`, `src/ai/scripted/*.ts`, `src/ai/safety.ts`, `src/config/ai.config.ts` | CREATE | Section 6.5 |
| `src/events/catalog.ts`, `privacy.ts`, `emit.ts`, `metrics.ts`, `quality.ts`, `synthetic.ts`, `baseline.ts` | CREATE | Sections 6.6 and 7. `baseline.ts` holds today's session funnel from the brief. |
| `src/components/*` | CREATE | Section 8.3 |
| `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`, `scripts/eval-ai.ts` | CREATE | Section 10 |
| `docs/QA.md` | CREATE | Visual checklist results for each screen and viewport |
| `README.md` | CREATE | How to run, test, and deploy, and what is simulated |

---

## 10. Testing requirements

### 10.1 Unit tests (Vitest)

- **`evaluateFit`.**
  - [ ] All "fit" answers give `eligible`.
  - [ ] Each disqualifying answer gives its own reason code.
  - [ ] Risk of harm gives `crisis`, even when combined with other disqualifiers.
- **`detectCrisisLanguage`.**
  - [ ] Around 15 positive phrasings match, including mixed case, punctuation, and a typo variant.
  - [ ] Around 10 everyday sentences (for example "this job is killing me") are recorded. A false positive is allowed, but the result must be stable.
- **PHQ-9 and GAD-7.**
  - [ ] Item 9 above 0 is positive.
  - [ ] Scores and bands match the published cutoffs.
  - [ ] The wording constants match the canonical text exactly (snapshot).
- **`filterProviders`, `rankProviders`, `buildReasons`.**
  - [ ] Each hard filter excludes a provider.
  - [ ] Changing the windows changes the order.
  - [ ] Preference chips re-order but never remove.
  - [ ] Shared reasons move to the header.
  - [ ] Every reason has a source.
  - [ ] The no-openings case returns `nearest`.
- **Cost.**
  - [ ] Self-pay is $250 and $150.
  - [ ] The typical cost appears for each plan.
  - [ ] The exact cost comes from coverage.
- **`timeZoneFor` and `formatSlot`.**
  - [ ] El Paso gives Mountain Time and Austin gives Central Time.
  - [ ] The output always includes the zone abbreviation.
- **`readinessStatus`.**
  - [ ] Required tasks and the deadline equal the visit start minus 24 hours.
- **`ageCheck`.**
  - [ ] A mismatch sets `reviewFlag` and never ends eligibility.
- **Reducer.**
  - [ ] Every transition in section 6.1 works.
  - [ ] Each illegal transition returns `invalid_transition`.
  - [ ] Events are emitted with the right `source`.
- **`validateEventProps`.**
  - [ ] Allowlisted codes pass.
  - [ ] Free text, a long string, or an unknown key throws.
- **Telemetry metrics (`metrics.ts`) and quality checks (`quality.ts`).**
  - [ ] On a fixed event fixture, the headline rate, the six stage rates, and the four guardrails equal hand-computed values.
  - [ ] People are counted once across journeys and sessions.
  - [ ] The quality checks catch an out-of-order event, a duplicate system-of-record event, and a linkage gap planted in a fixture.
- **AI router.**
  - [ ] No keys gives `scripted`.
  - [ ] An active-provider key gives a live call (mocked).
  - [ ] A timeout falls back to the next provider and then to scripted.
  - [ ] Output that fails the schema falls back.
  - [ ] A crisis input never calls the model (spy).
  - [ ] The post-filter rejects advice language.
- **Store contract**, run against memory and against Redis when its variables are set.
  - [ ] Get, put, append, list, and the TTL are all set.
  - [ ] Phone lookup and code expiry work.

### 10.2 Integration tests (Vitest, route handlers with the memory store and a fake clock)

- [ ] **Maya end to end, through actions only.** Verify:
  - the stage sequence
  - coverage active with the exact cost
  - records 2, medications 1, pharmacy prefilled
  - `visit_ready`, then `first_visit_completed` (`system_of_record`)
  - the follow-up booked
- [ ] **Jordan.** Verify:
  - self-pay, with no insurance fields in any response
  - no openings in his windows, so `nearest` is returned
  - records found none, and medications are empty with the other-medications question saved
- [ ] **Sam.** Verify:
  - lookup not found, then member ID inactive, then self-pay
  - PHQ-9 item 9 raises a flag while the booking stays intact
  - his time zone is Mountain Time
- [ ] **Crisis at the fit check:** the outcome is `crisis`, and no later action is accepted.
- [ ] **Screen-out:** each reason gets its own reason code and resource event.
- [ ] **Slow insurer:** after 15 seconds of fake time, `COVERAGE_CONFIRM_LATER` is allowed, `confirmLater` is true, and booking succeeds.
- [ ] **Slot taken:** `reservation_failed` and alternatives are returned, then a second selection succeeds.
- [ ] **Resume:** a second cookie jar resumes by phone and code, `sessions` becomes 2, and events from both sessions share the `journeyId`.
- [ ] **No conversation text stored:** after the story, the serialized journey and its events contain none of the answer sentences.
- [ ] **AI routes without keys** return scripted results tagged `scripted`. With `OPENAI_API_KEY` mocked, they return `live`.
- [ ] **Golden event sequences.** Maya's, Jordan's, and Sam's full journeys match `tests/integration/golden-events.ts` exactly.
- [ ] **Linkage.** No event before `account_created` has a person ID, every event after it has the same one, and all events share the journey ID.
- [ ] **Person dedupe.** A new journey that verifies a known phone number reuses the existing person ID.
- [ ] **Exactly once.** Re-reading a journey after its jobs resolve adds no duplicate system-of-record events.

### 10.3 End-to-end and visual tests (Playwright)

- **Projects:** `mobile` (390×844, touch) and `desktop` (1440×900), with `DEMO_FAST=1`.
- **Specs:**
  - `maya.spec.ts`, `jordan.spec.ts`, `sam.spec.ts`: full journeys through the UI. Taps are real, with "Fill this step" used only on long questionnaires.
  - `exits.spec.ts`: the crisis path and a screen-out.
  - `resume.spec.ts`: two browser contexts act as two devices.
  - `journey-view.spec.ts`: all four panels render. The timeline shows sources, sessions, and the link point, and the data-quality panel shows zero validation failures.
  - `ai-tags.spec.ts`: every AI result shows a live or scripted tag, and every simulated result shows a "Simulated" tag.
  - `generic.spec.ts`: a full journey without a demo patient, using the reviewer's own answers.
  - `guards.spec.ts`: the resume welcome, consent before each retrieval, date-of-birth input errors, and the 988 link.
- **Screenshots:** every stage, for every demo patient, at both viewports, saved to `test-results/screens/<patient>/<viewport>/<nn>-<stage>.png`. A curated set is copied to `docs/screens/` for the README and pull request.
- **Accessibility:** `@axe-core/playwright` runs on every stage screen, with zero serious or critical violations allowed.

**Visual evaluation (done by me, recorded in `docs/QA.md`).** I review every screenshot against this checklist and log pass, fail, or a note per screen and viewport. Failures are fixed and re-shot before anything is called done.

| # | Check |
|---|---|
| V1 | No horizontal scroll at 375 px, and nothing clipped or overlapping |
| V2 | One clear primary action, and the fit-question answers fully visible without scrolling on mobile |
| V3 | Text and buttons readable, with contrast matching the axe result |
| V4 | Every time shows its zone, and Sam's shows Mountain Time |
| V5 | "Simulated," "AI," and source tags are present wherever required, and don't crowd the content |
| V6 | No over-claiming copy, no raw errors, and no insurance wording for Jordan |
| V7 | Provider cards show different reasons, a "Why these three" line, and a readable slot grid |
| V8 | The safety panel is unmistakable, shows 988 and 911 above the fold, and has no booking button |
| V9 | It looks recognizably Legion: tokens, Inter, the warm tone |
| V10 | Loading and "Searching…" states never leave a blank screen |
| V11 | No celebration around screening or questionnaires, with calm confirmations at milestones |
| V12 | Desktop shows two columns with context on the right. On a phone, nothing sits above the primary action except the step's title. |

### 10.4 Live AI evaluation (`npm run eval:ai`)

The evaluation runs against every provider with a key in `.env.local`, using 12 fixed inputs (three demo patients by four prompts) plus 3 crisis inputs. Pass criteria:
- 100% schema-valid output, or a recorded fallback
- follow-up IDs only from the bank
- the model never called for crisis inputs
- the clinician summary passes the post-filter

It writes a table of provider, model, pass rate, and median latency to `docs/QA.md`. OpenAI runs first, then Anthropic and Google when their keys are present.

### 10.5 Checks only Emeka can do

1. **Look and feel on localhost**, before anything is deployed:
   - Does it feel like Legion, and like personalized care from the first tap?
   - Is the AI conversation's tone right with the live model?
2. **Revisit family and social history** with the working prototype (L14).
3. **A real phone after deployment:** open the production link and run Maya's path with a thumb, on cellular.

Everything else in this document is run by the agent.

### 10.6 Test matrix (each acceptance criterion and what proves it)

| TAC | Proof | Command |
|---|---|---|
| 01–03 | Unit (`evaluateFit`), E2E (`exits.spec`), visual V2 | `npm test`, `npm run e2e` |
| 04–06 | Unit (expectations, cost), E2E Jordan, visual V6 | same |
| 07–11 | Unit (ranking, reasons, time zones), integration Jordan, E2E all three, visual V4 and V7 | same |
| 12–13 | Integration resume, E2E `resume.spec` | same |
| 14–15 | Integration slow insurer, slot taken, and Sam. E2E Sam and Maya. | same |
| 16–23 | Integration Maya, Jordan, and Sam, and no stored text. E2E all three. Visual V5, V8, and V10. | same |
| 24–26 | Integration Maya, E2E `journey-view.spec` | same |
| 27–28 | Unit (privacy, router), integration AI without keys, `eval:ai` | `npm test`, `npm run eval:ai` |
| 29 | E2E `ai-tags.spec`, visual V5 | `npm run e2e` |
| 30 | Unit store contract (both stores) | `npm test` |
| 31 | All of the above, plus `npm run typecheck`, `npm run lint`, `npm run build`, and axe | `npm run verify` |
| 32 | `docs/QA.md` complete | review |
| 33 | Repository checks | `npm run verify` (secret and ignore checks) |
| 36–39 | Integration: golden sequences, linkage, dedupe, exactly once | `npm test` |
| 40–41 | Unit: metrics, quality checks, privacy, emit | `npm test` |
| 42 | E2E `journey-view.spec`, with visual review | `npm run e2e` |
| 43, 51, 54 | Integration (Maya and Jordan), E2E all three, visual review | `npm test`, `npm run e2e` |
| 44–47, 49 | E2E `guards.spec`, visual V11 | `npm run e2e` |
| 48 | Integration (slow insurer), E2E | `npm test`, `npm run e2e` |
| 50 | Integration Maya: counts on `visit_ready` | `npm test` |
| 52 | Unit (session), integration (resume lockout), unit (AI cap) | `npm test` |
| 53 | E2E `generic.spec` | `npm run e2e` |
| 55–56 | E2E `journey-view.spec`, integration | `npm test`, `npm run e2e` |

---

## 11. Technical acceptance criteria

- [ ] **TAC-01.** Answering "Yes" to the risk-of-harm question shows the crisis screen with 988 and 911 guidance and no way to continue to booking. `crisis_resources_shown` is recorded.
- [ ] **TAC-02.** Each non-safety disqualifying answer shows the resource screen for its reason. `screen_out_resource_shown` is recorded with the reason code.
- [ ] **TAC-03.** At 375×812, both answer buttons for every fit question are fully visible without scrolling, and the continuing answer is always in the same position.
- [ ] **TAC-04.** Selecting anxiety shows the benzodiazepine expectation and the Texas prescription-monitoring note. Selecting ADHD shows the stimulant expectation.
- [ ] **TAC-05.** The care-type options' wording changes with the selected conditions.
- [ ] **TAC-06.** Choosing "No insurance" shows $250 for the intake and $150 for follow-ups, and no screen afterward mentions insurance verification, copays, or an incomplete insurance status.
- [ ] **TAC-07.** The provider step shows exactly three providers, a "Why these three" line, only reasons that differ on each card, a source on every reason, and no "perfect match" wording.
- [ ] **TAC-08.** For Maya, changing the time windows from evenings to mornings changes which providers are in the top three.
- [ ] **TAC-09.** For Jordan, the page says no provider has openings in his chosen times within 14 days, shows the nearest times, and offers an earlier-opening alert.
- [ ] **TAC-10.** Every displayed appointment time includes a zone abbreviation, and Sam sees Mountain Time.
- [ ] **TAC-11.** An optional note produces preference chips (AI tag shown) that re-order the providers. The number of providers shown and the "See all N" count do not change.
- [ ] **TAC-12.** "Hold this time" with first name, phone, and the correct code records `account_created`, and every later event carries the same `journeyId` plus a `personId`.
- [ ] **TAC-13.** In a second browser context, resuming with the same phone and code returns to the same stage of the same journey, and records `journey_resumed` with session 2.
- [ ] **TAC-14.** Maya's member ID check returns active with the exact cost. Sam's lookup returns not found, then his member ID returns inactive with a self-pay option. With "slow insurer" on, the book-now option appears at 15 seconds, and booking sets `confirmLater`.
- [ ] **TAC-15.** Booking requires all three consents and the card. `appointment_confirmed` has source `system_of_record`. With "chosen time gets taken" on, alternatives appear and no error screen is shown.
- [ ] **TAC-16.** After booking, the home checklist lists identity first, and the ID result shows legal name, date of birth, sex, and address with a source tag.
- [ ] **TAC-17.** The records and medication searches show "Searching…" until their jobs complete, then the found items with source tags.
- [ ] **TAC-18.** The guided conversation asks the four fixed prompts with at most one follow-up each, shows editable "Here's what I noted" items, and stores only confirmed items. No answer sentence appears in storage.
- [ ] **TAC-19.** Crisis language in any conversation answer immediately shows the safety panel, raises a flag, and makes no model call.
- [ ] **TAC-20.** GAD-7 and PHQ-9 wording matches the canonical text exactly, one item per screen.
- [ ] **TAC-21.** A PHQ-9 item 9 answer above 0 shows the safety panel, raises a flag, and the appointment remains booked.
- [ ] **TAC-22.** Jordan's medication history is empty, and the "anything else you take" question is shown and saved. Maya's two record sources and her medication are shown with sources.
- [ ] **TAC-23.** Maya's pharmacy is prefilled from her fill history and can be changed.
- [ ] **TAC-24.** Completing all required tasks records `visit_ready`, and the home screen shows the deadline (visit start minus 24 hours).
- [ ] **TAC-25.** Joining and ending the visit records `visit_started` and `first_visit_completed`, both with source `system_of_record`.
- [ ] **TAC-26.** The after-visit screen shows the summary, the prescription sent to the confirmed pharmacy, and a one-tap follow-up that records `follow_up_booked`.
- [ ] **TAC-27.** The journey view shows the timeline with sources and both sessions, and a funnel with the headline metric, stage rows, and guardrails. The synthetic data is labeled as invented.
- [ ] **TAC-28.** Every stored event passes `validateEventProps`, and the validator rejects free text.
- [ ] **TAC-29.** With no AI keys, every AI feature works and is tagged "AI · scripted." With `OPENAI_API_KEY`, it is tagged live with OpenAI. Setting `AI_PROVIDER=anthropic` or `google`, with that key present, switches provider without code changes.
- [ ] **TAC-30.** Every simulated result shows a "Simulated" tag, and the demo banner appears on every page.
- [ ] **TAC-31.** With Redis variables set, the app uses Redis and every key has a seven-day TTL (the code key has ten minutes). Without them, it uses the memory store.
- [ ] **TAC-32.** `npm run verify` passes: typecheck, lint, unit, integration, E2E on both viewports, build, and axe with zero serious or critical violations.
- [ ] **TAC-33.** `docs/QA.md` records a visual-checklist pass for every stage, demo patient, and viewport, plus the AI evaluation table.
- [ ] **TAC-34.** The repository holds no secrets. `.env.example` lists every variable. `.vercelignore` excludes recordings, notes, discovery raw files, and transcripts.
- [ ] **TAC-35 (stretch).** Medication names mentioned in the conversation are matched to RxNorm with a "Live · RxNorm" tag, and the flow still works if RxNorm is unreachable.
- [ ] **TAC-36.** Maya's, Jordan's, and Sam's full journeys each record exactly the ordered event sequence in `tests/integration/golden-events.ts`, with nothing extra and nothing missing.
- [ ] **TAC-37.** All of a journey's events share one `journeyId`. No event before `account_created` carries a `personId`. Every event from then on carries the same one. Events after a resume carry session 2.
- [ ] **TAC-38.** A new journey that verifies a phone number already linked to a person reuses that person's ID.
- [ ] **TAC-39.** Every event listed as `system_of_record` in section 7.4 is recorded with that source, only by a simulated service, and once per occurrence.
- [ ] **TAC-40.** On the fixed fixture in `tests/unit/metrics.test.ts`, the funnel returns the expected headline rate, six stage rates, and four guardrail values, counting each person once.
- [ ] **TAC-41.** Every event carries `v: 1`. An event that fails validation is rejected and counted, and is never stored.
- [ ] **TAC-42.** The journey view shows all four panels:
  - the timeline, with the link point and the sessions
  - the per-person funnel, with the headline metric first
  - the today-versus-rebuild comparison
  - data quality, with zero validation failures
- [ ] **TAC-43.** Essential history asks the five short forms, prefilled from the searches. Maya's penicillin allergy appears to confirm. Jordan's cash-paid stimulant prefills "controlled substances taken now."
- [ ] **TAC-44.** The insurance lookup, the ID check, and the records and medication search each show their purpose and what is shared, and none runs before an explicit tap.
- [ ] **TAC-45.** A returning visitor on the same device sees "Continue where you left off" with the step name only. No condition, plan, provider, or answer appears, and a "Start over" option is available.
- [ ] **TAC-46.** An invalid or impossible date of birth shows a plain message next to the field. No age or eligibility notice appears for an input error.
- [ ] **TAC-47.** No confetti, emoji, or celebration screen appears after the fit check or the questionnaires. Booked, ready, and visit complete each get a calm confirmation.
- [ ] **TAC-48.** On the slow-insurer path, the home screen later shows the coverage outcome: the confirmed cost or, for an inactive plan, self-pay or free cancellation.
- [ ] **TAC-49.** The conversation opens with the AI disclosure, and the conversation and check-in screens always show "Need help now? Call or text 988."
- [ ] **TAC-50.** Maya's full journey records at most 12 typed inputs and at most 60 inputs in total by `visit_ready`, against about 75 to 80 today.
- [ ] **TAC-51.** The visit screen's "What your provider has" panel shows the clinician summary, confirmed records and medications, questionnaire bands, and safety flags with their status. For Jordan, it also shows the prescription-monitoring check as pending.
- [ ] **TAC-52.** Hosted-demo protections:
  - Two journeys with the same demo patient get different demo phone numbers.
  - Five wrong codes lock resuming for that number for ten minutes.
  - AI calls beyond 40 per journey fall back to scripted.
- [ ] **TAC-53.** Without a demo patient, every stage completes with the generic invented results.
- [ ] **TAC-54.** Once coverage is confirmed, the booking review shows "In network with [plan] · verified."
- [ ] **TAC-55.** The people-in-progress panel lists live demo journeys with stage, readiness, open flags, and the next expected event. "Mark reviewed" records `safety_flag_reviewed`.
- [ ] **TAC-56.** After booking, the optional trust question records `trust_pulse_answered`, and the funnel shows its median score.

---

## 12. Execution plan

Each milestone ends with an exit check. Nothing moves on until it passes. The estimates are agent working time.

| #   | Milestone                                                                                                                                                                    | Exit check                                                                                                        | Estimate                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| M0  | Scaffold: Next.js 16.4, Tailwind 4 tokens, Vitest, Playwright, ESLint, `.vercelignore`, demo banner                                                                          | Dev server runs. Lint, typecheck, and a trivial test pass.                                                        | 20 min                      |
| M1 | Domain types and schemas, reducer, rules, fixtures, memory and Redis stores, and the event contract (catalog, envelope, privacy) | Unit suite green (section 10.1, excluding the AI router and metrics) | 50 min |
| M2 | Route handlers, simulated services with asynchronous jobs, resume, event emission, linkage, and person dedupe | Integration suite green, including the golden event sequences (TAC-36 to TAC-39) | 40 min |
| M3  | AI router, three tasks, scripted fallbacks, crisis pre-check, `eval:ai`                                                                                                      | Router unit tests and AI integration tests green. `eval:ai` passes on OpenAI if the key is present.               | 35 min                      |
| M4 | "Book fast" screens (stages 1 to 8), demo controls, resume welcome, consent and input-error rules, desktop layout | E2E stages 1 to 8 for all three demo patients on both viewports, plus `guards.spec`, screenshots taken, visual checks V1 to V7, V11, and V12 logged | 70 min |
| M5 | "Arrive ready" screens, essential history, the provider panel at the visit, after, resume, texts, and the coverage follow-through | Full E2E for all specs, including `generic.spec`, axe clean, visual checks V1 to V12 logged | 90 min |
| M6 | Telemetry: metrics, the five-panel journey view, and data-quality checks | Metrics unit tests and `journey-view.spec` green (TAC-40 to TAC-42, TAC-55, and TAC-56), with screenshots reviewed | 45 min |
| M7  | Full verification pass and fixes. Emeka reviews look and feel on localhost.                                                                                                  | `npm run verify` green, `docs/QA.md` complete, Emeka's approval                                                   | 30 min, plus Emeka's review |
| M8  | Deploy, after Emeka's go: Vercel link, Upstash, environment variables, preview, smoke test, production. Then GitHub (re-author the early commits, push, draft pull request). | E2E smoke test against the preview URL green. Production URL opens on Emeka's phone.                              | 25 min                      |
| M9  | Stretch: RxNorm                                                                                                                                                              | TAC-35                                                                                                            | 20 min                      |

**What I'd cut first, if the build runs long:**
1. the RxNorm stretch
2. the desktop viewport in E2E (keeping mobile, plus one desktop smoke spec)
3. the live half of the journey-view funnel (synthetic only)
4. the "slot taken" toggle

---

## 13. Open questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Provision Upstash Redis on the Vercel project. The dashboard path is Storage, then Upstash. Alternatively, Claude can run `vercel integration add upstash` once Emeka accepts the Marketplace terms. | Emeka | Needed before M8. Local work uses the memory store. |
| 2 | Add `OPENAI_API_KEY`, and optionally `ANTHROPIC_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY`, to `.env.local`, and later to Vercel. Keys go in the file, never in chat. | Emeka | Needed for live AI. Scripted until then. |
| 3 | Use Legion's real logo file, or a text wordmark? This draft assumes the text wordmark. | Emeka | Default: text wordmark |
| 4 | The 65 age limit, matching logic, readiness requirements, and safety-review time remain stated assumptions (L14). | Legion | **Assumed.** The prototype asks "18 or older" only. Matching, readiness requirements, and a 240-minute safety-review target are as stated in this TRD. |
| 5 | Also mirror events to a PostHog project from the prototype? This isn't planned: the production path is documented in section 7.6, and it would need a PostHog key. | Emeka | **Decided:** not in the prototype |
| 6 | Approve or decline the two proposed additions: the people-in-progress panel (section 7.7, goal 4) and the trust question (section 7.5, goal 2). | Emeka | **Approved:** both |
| 7 | A "Yes" to the risk-of-harm question at the fit check comes before any contact details exist, so the prototype shows resources only. Should Legion offer an optional callback? | Legion | **Assumed:** resources only (988, 911, and the Crisis Text Line), with no callback. This matches Legion's current promise, and no contact details exist at that point. |
| 8 | Demo holds don't expire. In production, the time would be re-checked at booking, with alternatives offered if the hold lapsed. | Legion | **Assumed:** holds last 10 minutes and renew while the patient is active. The time is re-checked at booking, and the slot-taken path handles conflicts. Demo holds don't expire. |
