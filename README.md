# Book fast, arrive ready

A working prototype of AI-native patient onboarding for Legion Health, built for the Founding Product take-home.
Onboarding here starts on the first page and ends only when the patient's first visit is complete.

The journey runs at two speeds under one journey ID:

- **Book fast.** Quick taps take a patient from the fit check to a booked visit: what brings them here, the kind of
  help they want, how they'll pay (with the typical cost shown right away), three best-fit providers with the reasons
  why, a time held with just a first name and a texted code, the exact coverage check, then the card.
- **Arrive ready.** After booking, Legion looks before it asks. With the patient's permission it retrieves records and
  medication history to confirm, a short guided conversation replaces the long intake forms, GAD-7 and PHQ-9 stay word
  for word, and the provider sees a ready summary before the visit.

Every step records person-level events that run past the payment page, through the first visit and the step after it,
and an internal journey view shows them.

**Everything is invented.** The three demo patients, the providers, the insurance checks, the records, the texts, and
the visit are simulated. Two things are live: the AI, when a key is configured, and the free RxNorm drug vocabulary from the National Library of Medicine.

## Try it

- **Hosted:** the URL will be added here after deployment.
- **Locally** (Node 22 or later):

  ```bash
  npm install
  cp .env.example .env.local   # AI keys are optional; without them the AI runs in scripted mode
  npm run dev                  # then open http://localhost:3000
  ```

**Demo controls** (top right, on every page) start a journey as one of the demo patients, fill the current step,
switch on scenarios (a slow insurer, a time that gets taken), mark a safety flag reviewed, simulate a return visit on
another device, and open the journey view at `/journey`.

| Demo patient | What their path shows |
|---|---|
| **Maya Torres**, 29, Austin | The full happy path: a note that becomes preference chips, verified coverage with her exact copay, records and a medication found to confirm, the guided conversation, the visit, and a follow-up |
| **Jordan Ellis**, 34, Houston | Self-pay with no insurance wording anywhere, no openings in his chosen times, an empty records search, and a cash-paid stimulant caught by the "anything else you take?" question, which prefills controlled substances and the prescription-monitoring check |
| **Sam Rivera**, 22, El Paso | Mountain Time, a plan lookup that finds nothing, a plan that turns out inactive, and a PHQ-9 item 9 answer that shows crisis help at once and flags a person for same-day review while the visit stays booked |

Starting with no demo patient works too: every stage completes with generic invented results.

## What changed from today, and why

| Today (from the walkthrough and PostHog data) | In this prototype |
|---|---|
| The funnel counts browser sessions and stops at reaching the payment page | One journey ID per patient, linked to a person at account creation, with outcomes from systems of record through the first visit |
| 36.6% of match-page sessions never pick a provider; no reasons are shown | Three best fits ranked by openings in the times the patient chooses, each reason true and sourced, and an optional note that AI turns into removable chips |
| One in five held slots never becomes an account | A first name, a mobile number, and a texted code hold the time; resume from any device by phone |
| Coverage and cost arrive after the card | The typical cost at the plan tap, and the exact coverage check before the card, with "book now, confirm later" if the insurer is slow |
| About 75 to 80 inputs before the visit, mostly typed | Retrieved records and medications to confirm, four short questions in the patient's own words, and five short essential-history forms: 14 typed inputs for Maya |

The full diagnosis is in [discovery/diagnosis.md](discovery/diagnosis.md), and the goals, principles, hypotheses, and
journey in [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md).

## What's live and what's simulated

| Part | In this prototype | In production, likely |
|---|---|---|
| AI (preference chips, conversation notes, clinician summary) | **Live** through a provider router (OpenAI first, then Anthropic, then Google), with a scripted fallback | The same router |
| Medication names mentioned in the conversation | **Live:** matched to RxNorm at the ingredient or brand level, shown as "Recognized as …"; an outage just shows nothing | The same, or RxNorm through the e-prescribing vendor |
| Eligibility, crisis routing, PHQ-9 item 9, controlled-substance rules | Fixed rules, tested | The same rules |
| Insurance eligibility and discovery | Simulated, asynchronous | Sohar |
| Records search | Simulated, asynchronous | Metriport |
| Medication history and e-prescribing | Simulated | DoseSpot (Surescripts) |
| ID check | Simulated | Persona |
| Scheduling, payment, texts, video visit | Simulated | Legion's existing systems |
| Storage | Upstash Redis on Vercel; in memory locally | Legion's database |
| Analytics | Server-side events and the `/journey` view | PostHog through server-side capture |

## Safety and privacy

- **Rules decide; AI assists.** Eligibility, crisis routing, safety flags, and controlled-substance handling are fixed
  rules. A crisis-language check runs before every model call, and on a match no model is called.
- **The AI's job is bounded.** It extracts short notes the patient reviews, picks at most one follow-up from a fixed
  bank, and drafts a clinician summary that a post-filter checks for advice, assessments, and anything the patient
  didn't say. The patient confirms the summary before it's saved.
- **Nothing typed is stored**, apart from the notes and summary the patient confirms. Events carry codes and timings,
  never answers.
- **Consent comes before every retrieval**, and every prefilled fact shows where it came from.

## Tests

```bash
npm run verify     # typecheck, lint, unit and integration tests, then end-to-end tests against a production build
npm run eval:ai    # live AI evaluation on every provider with a key, and a live RxNorm check; writes to docs/QA.md
npm run e2e:live   # optional: the real AI and RxNorm through the real screens
```

`npm run verify` runs 183 unit and integration tests (golden event sequences for each demo patient, linkage, metrics,
data quality, the AI router and RxNorm lookup with stand-ins for the live services) and 42 end-to-end runs (21 tests at
phone and desktop sizes, with axe accessibility checks on every stage screen). These suites keep RxNorm unreachable on purpose,
which proves the journey survives an outage. The visual review of every screen is logged in [docs/QA.md](docs/QA.md).

## Configuration

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `openai` (default), `anthropic`, `google`, or `scripted` |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` | Optional provider keys; the router skips providers without one |
| `AI_MODEL_QUALITY`, `AI_MODEL_FAST` | Optional model overrides for the active provider |
| `AI_DAILY_LIVE_CALLS` | Live AI calls allowed per day across all journeys (default 1,500) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` pair) | Redis for the hosted demo; leave empty to use memory |
| `SESSION_SECRET` | Signs the journey cookie; required on Vercel |
| `DEMO_MODE`, `DEMO_FAST` | Demo controls and shown codes; `DEMO_FAST=1` shortens simulated waits for tests |
| `RXNORM_URL` | Optional; empty means NLM's public RxNorm API. The test suites point it at an unreachable address on purpose |

Models are set in one place, [src/config/ai.config.ts](src/config/ai.config.ts).

## Documents

- [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md): goals, metrics, principles, hypotheses, the concept, and the journey
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md): research into the data sources and vendors in the brief
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/TRD.md](docs/TRD.md): the architecture, the technical requirements, the telemetry plan, acceptance criteria, and stated assumptions
- [docs/QA.md](docs/QA.md): the live AI evaluation and the visual review
- [discovery/](discovery/): the current-state observation of Legion's flow, design language, and funnel
- [STATUS.md](STATUS.md): decisions, gates, and progress
- [ai_history/](ai_history/): the AI interaction history
