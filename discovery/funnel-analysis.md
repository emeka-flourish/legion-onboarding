# Funnel analysis of Legion's current onboarding telemetry

**Data.** The aggregate PostHog funnel in [the assignment brief](../brief/legion-assignment-brief.md): production host only, a rolling 30 days ending 2026-08-29, counted as ordered milestones reached **within the same browser session**. All numbers below are from that table or computed directly from it. The routing notes come from the walkthrough ([current-flow.md](current-flow.md)).

**Ground rule.** An aggregate, session-scoped funnel shows *where* sessions stop. It cannot show *why*. Every explanation below is labeled as a hypothesis, along with what would confirm it.

## The funnel, with derived figures

| # | Milestone (what is actually counted) | Sessions | From previous | From start | Drop | Share of all loss* |
|---|---|---|---|---|---|---|
| 1 | Start: `/portal/join` page view | 5,898 | | 100% | | |
| 2 | Fit check: `/portal/join/fit` page view (**reach, not completion**) | 5,490 | 93.1% | 93.1% | 408 | 9.1% |
| 3 | Conditions page view (the first evidence the fit check was passed) | 3,578 | 65.2% | 60.7% | 1,912 | **42.5%** |
| 4 | Insurance page view | 3,338 | 93.3% | 56.6% | 240 | 5.3% |
| 5 | Needs page view | 3,095 | 92.7% | 52.5% | 243 | 5.4% |
| 6 | Match page view | 3,013 | 97.4% | 51.1% | 82 | 1.8% |
| 7 | `portal.provider_selected` | 1,909 | 63.4% | 32.4% | 1,104 | **24.6%** |
| 8 | `portal.provider.reservation.created` | 1,764 | 92.4% | 29.9% | 145 | 3.2% |
| 9 | Patient details page view | 1,763 | 99.9% | 29.9% | 1 | 0.0% |
| 10 | `portal.onboarding.userCreated` | 1,403 | 79.6% | 23.8% | 360 | 8.0% |
| 11 | Payment page view (**reach, not payment**) | 1,403 | 100% | 23.8% | 0 | 0% |

\* Share of the 4,495 sessions lost between start and payment-page reach.

**Derived views:**

- **Two transitions account for two-thirds of all loss.** Fit check to conditions loses 42.5%, and match page to provider selection loses 24.6%.
- **The three short questionnaire screens between them cost little.** Of the sessions that reach conditions, 84.2% reach the match page.
- **Of sessions that see providers, 46.6% reach the payment page.** Of sessions that pass the fit check (reach conditions), 39.2% do.
- **About 20% of reservations end without an account in that session.** Each reservation holds a real provider slot, so roughly 361 holds over 30 days end with no account created in-session.
- **Campaign traffic is a large share of starts.** `utm.params.applied` fired in 1,717 sessions on `/portal/join`, which is 29.1% of starting sessions. Intent probably differs by channel, but the data provided cannot be split by channel.

## What each loss can and cannot tell us

### Steps 1 to 2: start to fit check (−408, 6.9%)

- **Observed.** A fresh visitor to `/portal/join` is redirected to `/portal/join/fit` before seeing anything (verified live). This loss happens **before the patient is asked anything**.
- **Can conclude.** This is not a reaction to the fit questions.
- **Cannot conclude.** The mechanism. Hypotheses:
  - Bounces during load or redirect
  - Bots or prefetch
  - Analytics blocked or lost between the two page loads
  - Returning or signed-in visitors routed elsewhere
  - A counting artifact. Sessions that enter directly at `/fit` hit `/portal/join` only *after* the fit check (the "Setting up your session" pass), so the ordered funnel would count them as starting and then never reaching the fit check.
- **Would confirm.** Path analysis of what sessions do after landing on `/portal/join`, entry pages, and bot filtering.

### Steps 2 to 3: fit check to conditions (−1,912, 34.8%; the largest single loss)

- **What the step contains.** "Fit check" counts page *reach*, and no fit-submit or per-answer event exists (brief). Step 3 therefore requires the patient to answer six questions, pass every rule, **and** survive the session-setup redirect.
- **Can conclude.** This is where most sessions end. It mixes three different things:
  1. **Intended screen-outs:** not in Texas, Medicaid or Medicare, at risk of harm, hospitalized in the past year, under 18, not seeking virtual care. **This is desirable screening loss**, provided the screened-out person is helped well. That help was not observed.
  2. **Voluntary abandonment** by people who would have qualified. **This is undesirable friction.** Candidate causes seen in the walkthrough:
     - On phones, the first answer button sits below the fold.
     - The "continue" answer flips between Yes and No across questions.
     - The page asks six screening questions before offering anything of value.
  3. **Technical failure** during "Setting up your session..." This is undesirable and invisible today.
- **Cannot conclude.**
  - The split between those three.
  - Which question screens out the most people.
  - Whether the people who left were eligible.

  The Texas-only footprint and the Medicaid/Medicare exclusion make it plausible that a large share is desirable. That is a hypothesis, not a finding.
- **Would confirm.**
  - A per-question answer event and an eligibility-outcome event with a reason code (no free text, no protected health information)
  - A session-setup success or failure event
  - Device split

### Steps 3 to 6: conditions, insurance, needs, match reach (−240, −243, −82)

- **Can conclude.** These screens cost about 7% each, which is moderate for low-effort screens. The needs-to-match transition is the cheapest.
- **Hypotheses.**
  - At insurance, the self-pay price ($250 intake) or an unlisted plan.
  - At needs, uncertainty about which option applies.
  - Generic abandonment.
  - `portal.onboarding.insurance_selected` exists but its breakdown was not provided, so insured and uninsured cannot be compared.
- **Would confirm.** Conversion split by selected payer category and by condition count, and time on step.

### Steps 6 to 7: match page to provider selected (−1,104, 36.6%; the second-largest loss)

- **Can conclude.** This is the largest loss **after** screening, among people who passed every eligibility question and saw real availability. That makes it the strongest candidate for undesirable loss in the measured funnel.
- **Cannot conclude.** Why. Hypotheses consistent with the walkthrough:
  - No explanation of why a provider fits
  - Only soonest times shown, with no way to state preferred times
  - Choice overload (43 providers, three at a time)
  - Price realization for self-pay patients
  - Comparison shopping or low intent
  - Wanting to talk to a person first
  - Slot times with no time zone
  - All visible clinicians being nurse practitioners when a patient expected a psychiatrist
- **Measurement caveat.** It is unknown whether `portal.provider_selected` fires on the slot tap or the Book click. That changes what this drop, and the next one, mean.
- **Would confirm.**
  - Provider-card views, profile expansions, "show more" clicks, slot taps versus Book clicks
  - Number of providers and slots shown, and hours to the earliest slot
  - Exit timing, and a short exit question

### Steps 7 to 8: provider selected to reservation created (−145, 7.6%)

- **Hypotheses.** The patient tapped a slot but did not book, or reservation creation failed (for example, the slot was taken or an API error occurred).
- **Would confirm.** Reservation attempt and failure events with error codes.

### Steps 8 to 10: reservation to account created (−1, then −360, 20.4%)

- **Can conclude.** About one in five sessions with a held slot leave on the "About yourself" form, **under a countdown hold** (*inferred*, about 10 minutes, from the payment-page timer).
- **This loss mixes desirable and undesirable causes.**
  - **Desirable, but late:** the age check fires here. Its notice names an 18-to-65 range, so any over-65 screen-outs happen after a slot is held rather than in the fit check. Only the under-18 trigger was observed.
  - **Undesirable:**
    - date-of-birth picker errors (observed: a year that does not register triggers the age gate)
    - reluctance to share contact details
    - the three consents, including controlled-substance and AI-transcription policies
    - an email that already has an account
    - hold expiry
- **Would confirm.** Validation and error events, age-gate firings, consent-step exits, and hold-expired events.

### Steps 10 to 11: account to payment page (0)

- **Pattern.** Automatic redirect, so this is not informative. Steps 8 to 9 have the same pattern.

### After step 11: unmeasured

- **Payment-page reach is not payment.** No payment-success event exists (brief).
- **Payment-page reach is not a booked appointment either.** The walkthrough shows confirmation happening on this page when the card is accepted ("Payment method added and appointment confirmed!"). No event marks it.
- **Everything between booking and the first visit is outside the funnel:** the 24-hour readiness checklist, insurance verification, screening forms, records, ID, reminders, reschedules, cancellations, no-shows, and the visit itself.

## Desirable screening loss versus undesirable friction

| Step    | Likely desirable share                                                                   | Likely undesirable share                                                   | Can the current data separate them?                 |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| 1 to 2  | None (no question asked)                                                                 | Technical, bots, routing artifacts                                         | No                                                  |
| 2 to 3  | Out-of-state, Medicaid/Medicare, safety, level of care, minors, not seeking virtual care | Mobile layout, flipping answer polarity, session-setup failure, low intent | **No.** There are no answer or outcome events.      |
| 3 to 6  | Little (no eligibility rules visible)                                                    | Price, unclear options                                                     | Partly, with payer-split data that was not provided |
| 6 to 7  | Little (already screened)                                                                | Choice, explanation, time fit, trust, price                                | No                                                  |
| 9 to 10 | Age screen-outs, if the 65 limit is enforced (in the wrong place)                        | Date-of-birth input errors, data reluctance, consents, hold expiry         | No                                                  |

**Implication.** "Overall conversion" is not a fair success measure, because it penalizes correct screening. Any metric used later needs an **eligible-patient** denominator, and screen-outs need their own quality measure: were people sent somewhere useful? That framing is for Gate 2. It is not decided here.

## What session-based counting does to these numbers

1. **People are not sessions.**
   - **Undercounts conversion.** One person can produce several sessions: returning later, switching from phone to laptop, retrying. Every abandoned session counts as a drop even if the person converted later, so per-person conversion is probably *higher* than session conversion.
   - **Overcounts the top.** Repeat visits inflate the number of distinct people.
2. **Resumed journeys look like drop-offs.** "Sign in to continue" lets someone resume in a *new* session that starts mid-funnel. That session fails the ordered requirement for earlier steps, so a patient who reserves today and pays tomorrow is counted as lost and never appears among the 1,403.
3. **Identity is unknown for most of the funnel.** Before step 10 the visitor is anonymous, so the first eight steps cannot be stitched across devices or tied to a later visit.
4. **Blocked analytics and bots skew the counts.** Ad blockers remove a non-random slice of users, privacy-minded ones especially. Bots and prefetch inflate step 1.
5. **Cross-route event noise.** The brief lists events firing on routes where they don't belong (for example, `portal.page.fit_check` on `/portal/join`, `reservation.created` on `/portal/join/patient`). That suggests some events are tied to components rather than to journey state. The volumes are small, but it argues for a defined event model.
6. **The end state is structurally out of reach.** A first visit happens hours or days after booking (about 42 hours in the walkthrough), always in a different session. **No session-scoped funnel can measure first-visit completion, however it is instrumented.** It needs a person-level, cross-session journey keyed to a stable patient or lead identifier, with outcomes from the scheduling and clinical systems.

## Instrumentation gaps

- **Eligibility.** No per-question or outcome event, no reason code, and no count of crisis-resource or screen-out screens shown.
- **Session setup.** No success or failure event for the "Setting up your session" step.
- **Errors.** No events for:
  - validation errors
  - age-gate firings
  - reservation conflicts and hold expiry
  - card declines
  - the post-payment "no reservation" error
- **Matching.**
  - No record of what was shown (count, earliest availability, position of the chosen provider)
  - No profile-expansion or "show more" events
  - `provider_selected` semantics unclear
- **Booking.** No `payment_method_added`, no card-authorization result, and no `appointment_confirmed`, which is the real booking milestone.
- **Coverage.** No insurance-verification request or outcome, and no switch-to-self-pay event.
- **Readiness.**
  - No completion events for the screening instruments, health-history forms, records release, primary care provider, ID upload, emergency contact, or vitals
  - No "ready for visit" state
  - Some of this may exist in the application database but is not in the provided telemetry
- **Safety.** No signal that a safety-relevant answer (fit question 3, PHQ-9 item 9, severe scores) was raised and reviewed, or how long review took. The event should carry the fact and the timing, never the answer itself.
- **Visit lifecycle.** No reminders, reschedules, cancellations (with lead time), join attempts, waiting room, visit start, **visit completed**, no-show, or technical failure.
- **After the visit.** No events for summary published or viewed, prescription sent, or follow-up booked.
- **Attribution.** Campaign parameters are captured on `/portal/join` but not carried onto the person, so cohorts cannot be compared by channel through to the visit.

## Events needed to evaluate first-visit completion

These are the minimum to measure the assignment's end state honestly. Names are illustrative, not a final spec. Most of these should be emitted **server-side from the system of record** (scheduling, billing, clinical) and keyed to one pseudonymous journey ID that exists from the first page view and is linked to the patient at account creation. Event properties should carry codes and timings, never clinical answers.

| Stage | Event | Key properties (no protected health information) |
|---|---|---|
| Start | `onboarding_started` | channel, campaign, device, entry route |
| Eligibility | `eligibility_evaluated` | outcome, reason code (state, payer exclusion, age, safety, level of care, modality) |
| Eligibility | `screen_out_resource_shown`, `crisis_resources_shown` | reason code |
| Need | `care_need_captured` | need type, condition count |
| Coverage | `coverage_selected`; `coverage_verified` | payer category, self-pay; result (active, inactive, unknown), cost estimate shown, source |
| Match | `providers_presented` | count, hours to earliest slot, filters applied |
| Match | `slot_selected`; `reservation_created` / `reservation_expired` / `reservation_failed` | hold length, error code |
| Identity | `account_created`; `identity_verified` | method, outcome |
| Consent | `consents_signed` | policy versions |
| Booking | `payment_method_added`; `appointment_confirmed` | authorization result; appointment ID, lead time to visit |
| Readiness | `intake_task_completed` | task (screening, history section, records release, ID, emergency contact, vitals), source (patient-entered or retrieved and confirmed) |
| Readiness | `records_requested` / `records_received` | source type, document count, latency |
| Readiness | `visit_ready` | all required tasks done, hours before visit |
| Safety | `safety_flag_raised` → `safety_flag_reviewed` | flag type code, minutes to review, disposition code |
| Pre-visit | `reminder_sent`; `appointment_rescheduled` / `appointment_cancelled` | channel; actor, lead time |
| Visit | `visit_join_attempted`, `patient_in_waiting_room`, `visit_started` | timestamps, technical-failure code |
| **Visit (end state)** | **`first_visit_completed`** | visit ID, completed as scheduled or late, duration. **Sourced from the clinical record** (for example, a note signed), not from the browser. |
| Visit | `no_show`, `late_cancellation` | |
| After the visit | `visit_summary_published` / `visit_summary_viewed`, `prescription_sent`, `follow_up_booked` | no drug names in analytics |

**What these events would let us answer:**

- what share of *eligible* starters complete a first visit, and within how many days
- where eligible patients are lost: matching, booking, readiness, or no-show
- how long each stage takes
- whether retrieved data reduces patient effort without hurting readiness
- whether safety flags are reviewed within a defined time

## Bottom line

**The provided funnel measures sessions from landing to payment-page reach. It does not measure payment, a confirmed appointment, pre-visit readiness, or the assignment's end state: a completed first visit.** Nothing in the data supports otherwise.

Its strongest signals:

- The largest loss is at the fit check, where desirable and undesirable loss cannot be separated today.
- The largest loss after screening is at provider selection.
- About 20% of held slots end without an account.
- Everything after the payment page is dark.
