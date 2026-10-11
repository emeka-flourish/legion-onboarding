# Product brief: AI-native onboarding for Legion Health

**Status.** Sections 1 to 6 are approved (Gates 1 to 6, 2026-10-10). The journey in section 6 includes the seven changes from the integration review in [INTEGRATIONS.md](INTEGRATIONS.md). Gate 7, the architecture, is proposed in [ARCHITECTURE.md](ARCHITECTURE.md).

**Scope.** Onboarding starts when a prospective patient enters Legion and ends only when their first visit has been completed (decision L1). Everything here uses synthetic data and simulated services (L2).

## 1. Starting point (Gate 1, approved)

Today's flow screens people well. After that, though, it asks patients to commit before they have certainty, to choose a provider without being told why, and to retype information Legion could retrieve. None of what happens after the payment page is measured. Emeka's diagnosis, in order of importance:

1. Measurement can't see people or the goal: it counts browser sessions and stops at the payment page.
2. Choosing a provider doesn't build trust: 36.6% of match-page sessions never pick one.
3. Pre-visit readiness is long, repetitive, and typed by hand: about 75 to 80 inputs.
4. Account creation loses one in five held slots.
5. Initial screening works, so keep it.
6. Coverage and cost certainty arrive only after commitment.
7. Trust, tone, and accessibility details matter, at lower priority.

Evidence and Emeka's direction for each are in [discovery/diagnosis.md](../discovery/diagnosis.md), sections 1 and 2, and in STATUS.md decision L10.

## 2. Goals and success metrics (Gate 2, approved)

### Goals

1. **More eligible people complete a first visit.** This is the end state the assignment defines.
2. **Care feels personalized from the first interaction, and that builds trust.** Patients see that Legion understood them, why their provider fits them, and what their coverage and cost will be, all before they commit. Certainty is part of trust.
3. **Less friction along the way.** Patients type less, are never asked the same thing twice, and confirm what Legion can retrieve instead of re-entering it.
4. **Legion can see every person's progress** through the first visit and the step after it.

### Not goals for this rebuild

- Changing who is eligible. The screening criteria stay.
- Changing validated questionnaires or the clinically essential history.
- Live integrations or real transactions (L2).

### Headline metric

**First-visit completion among eligible starters:** the share of people, not sessions, who pass screening and complete a first visit within 14 days of starting.

- It is counted per person, with one journey identifier carried across sessions and devices.
- "Completed" is recorded by the system of record for visits, not by a browser event.
- The 14-day window is an assumption to check against Legion's real availability.

### Stage metrics (each counted per person)

| Stage metric | Today | Problem |
|---|---|---|
| Provider selected, among eligible patients who see matches | 63.4% of match-page sessions | 2 |
| Held reservation becomes an account | 79.6% of sessions | 4 |
| Coverage and expected cost known before booking | Never; checked only after booking and card entry | 6 |
| Readiness complete before the deadline | Not measured | 3 |
| Attended the first visit | Not measured | 1 |
| Took the post-visit next step | Not measured | 1 |

### Guardrails (these must not get worse)

| Guardrail | Why it matters |
|---|---|
| Inputs the patient types before the visit (about 75 to 80 today) | Personalization and safety must not add work |
| Time from start to booking | Certainty steps must not slow people down |
| Share of screened-out people shown a relevant resource | Screening stays humane |
| Every safety flag reviewed by a person within a set time | An AI-led intake must never sit on a risk answer |

### Options considered for the headline metric

| Option | Strength | Weakness |
|---|---|---|
| **Completed first visits ÷ eligible starters, counted per person, within 14 days (chosen)** | Matches the assignment's end state, and correct screen-outs are not counted as failures | Needs identity stitching and visit events from the system of record, which is exactly what problem 1 asks us to build |
| Completed first visits ÷ all starters | Simplest to compute | Counts correct screen-outs as failures, against Emeka's Gate 1 guardrail |
| Booked appointments ÷ starters | Closest to what is measured today | Stops before the goal, and rewards bookings that never become visits |

## 3. Design principles (Gate 3, approved)

Each principle is a decision rule. The right-hand column says what it forces in the prototype.

| # | Principle | In the prototype, this means |
|---|---|---|
| 1 | **Measure people, through the visit.** | Every stage emits a person-level event under one journey identifier. "First visit completed" comes from the simulated visit system, not a page view. |
| 2 | **Explain every recommendation in the patient's terms**, using only true, traceable facts. | Each "why this provider" reason maps to a fact in the data: licensure, payer, availability, specialty, or the patient's stated need. AI may phrase a reason but never invent one. |
| 3 | **Confirm, don't type.** Retrieve before asking, never ask twice, and add no steps. | Records, history, and coverage arrive prefilled from simulated services, each showing its source, and the patient confirms or corrects them. |
| 4 | **One clear decision at a time, phone first.** | Short, progressive screens sized for a phone. Long forms are broken into small steps. |
| 5 | **Certainty before commitment.** | Eligibility, coverage, and expected cost are shown before a slot is held or a card is taken. |
| 6 | **Use data the patient can see and agree to.** | Every retrieval has a visible purpose and consent, and every prefilled item shows where it came from. |
| 7 | **Rules decide; AI assists.** | Eligibility, crisis routing, and controlled-substance limits run as fixed, tested rules. AI only extracts, summarizes, explains, and drafts. |
| 8 | **Keep the clinical substance.** | GAD-7 and PHQ-9 appear word for word, and the essential history stays. Shortening comes only from removing duplicates, retrieving, or moving questions into the visit. |
| 9 | **Recognizably Legion.** | Reuse the measured design tokens and the warm tone, make every claim specific and true, and include time zones, contrast, and plain-language errors by default. |

**Decision.** The nine are adopted as drafted, with principle 3 named "Confirm, don't type": the system retrieves and drafts, and the patient confirms. Consolidating to about six was considered and set aside, because it would blur distinctions Emeka drew at Gate 1.

## 4. Primary hypotheses (Gate 4, approved)

The prototype can show each mechanism working and emit the events that would test it, but it cannot measure outcomes. Real tests need Legion's traffic. Each hypothesis names the change, the expected effect, how it would be measured, and why we believe it.

- **H1. Person-level measurement (problem 1, the foundation).** If every stage emits a person-level event under one journey identifier, and the system of record logs first-visit completion, then Legion can measure the headline metric and see where eligible people are lost. *Measured by* the share of journeys with complete stage coverage, from the first page to the post-visit step. *Because* about 76% of sessions end before an account exists, most of today's losses can't be tied to a person.
- **H2. Provider trust (problem 2).** If the match step explains why each provider fits, using only true facts, and lets patients filter by when they are available, then more eligible patients will choose a provider with no extra inputs. More will also attend, because the choice is anchored in fit. *Measured by* provider selection among eligible patients and first-visit attendance. *Because* this is the largest loss among screened-in people. Today 43 options appear with no explanation, and finding a time that fits means scanning every card.
- **H3. Confirm, don't type (problem 3).** If records, history, and coverage are retrieved before asking, and a bounded guided conversation replaces the unexplained "Current Issues" box with details extracted for the patient to confirm, then typed inputs before the visit will fall by at least half and more patients will be ready before the deadline. *Measured by* inputs typed and readiness completed on time. *Because* eight facts are asked two or three times, and patients type prior providers' details down to fax numbers, even though Legion already uses a records-retrieval service.
- **H4. Light identity and resume (problem 4).** If the account starts with phone and name only, with other details collected later and a resume-by-phone option, then fewer held reservations will be lost and returning patients will be counted as the same person. *Measured by* reservations that become accounts and resumed journeys that are linked. *Caveat:* the data can't show what causes today's loss.
- **H5. Certainty before commitment (problem 6).** If coverage and expected cost are shown before a slot or card is taken, and self-pay patients see no insurance messaging, then patients commit with fewer surprises. That supports H4's conversion and attendance. *Measured by* coverage and cost known before booking, and reservations that become accounts.

**Decision.** H1, H2, and H3 are built in depth. H4 and H5 appear as lighter steps in the same journey, and every stage still appears end to end. Two alternatives were set aside: giving all five equal depth, which would be shallow everywhere, and building only the losses measured today (H1, H2, H4), which would leave the stretch between booking and the visit untouched.

**Requirements, not hypotheses.** These are not tested; they simply have to hold. The crisis path runs on fixed rules and is never exercised in production. Every safety flag is reviewed by a person. The questionnaires stay word for word (L3, L10).

## 5. Redesign concept (Gate 5, approved)

### The idea: "Book fast, arrive ready"

The journey runs at two speeds under one journey identifier.

- **Book fast.** Before payment, the patient moves through quick, low-effort taps. Each tap personalizes what comes next, so they reach a booked visit as quickly as possible and never face a blank page.
- **Arrive ready.** After booking, the patient has a provider and a time, and the clinician needs depth. Here a guided conversation and retrieved records replace the heavy intake: Legion drafts, and the patient confirms.

The journey identifier runs from the first page to the step after the visit. AI goes where there is reading and writing to do, taps go where speed matters, and fixed rules decide wherever safety or eligibility is involved.

| Today | Book fast, arrive ready |
|---|---|
| Three tap steps (conditions, insurance, needs) that never adapt | The same quick taps, but the care-type options adapt to the conditions chosen, and choosing a plan shows the typical cost for it |
| Three providers at a time, ordered by soonest availability, none explained, showing only the soonest dates | The three best fits, re-ranked by a "When works for you?" bar, each with reasons that differ between providers and times in the patient's own time zone. An optional "Anything else that matters to you?" note appears after the results. |
| Six fields, three consents, and an unreliable date picker under a countdown, after the slot is held | First name, mobile number, and a texted code to hold the chosen time. Progress is saved in the browser before that. |
| Coverage and cost confirmed only after booking and card entry | A plan tap before matching, and the exact coverage check before the card |
| About 25 history questions, an unexplained "Current Issues" box, and prior providers typed down to fax numbers | A short guided conversation, plus retrieved records and medications to confirm. GAD-7 and PHQ-9 stay word for word, and family and social history move into the visit. |
| Nothing measured after the payment page | One journey identifier from the first page to the step after the visit, with outcomes from the systems of record |

### How the concept was chosen

The first proposal, "Tell us once," put the guided conversation before matching. Emeka moved it after booking, for two reasons. Before payment, low cognitive load wins, and an empty text box is the slowest input there is. After booking, motivation is higher, and the heavy intake is what needs replacing. That intake is also where Legion most likely loses patients without seeing it. Emeka also moved account creation to after the patient has seen providers who can help, to earn trust first.

Two alternatives were set aside:
- **Fixing the current flow in place:** polish, with personalization arriving late.
- **A conversation-first concierge:** slow for structured details, and hard to keep safe and measurable.

### Decisions within the concept (approved 2026-10-10)

1. **The optional note.** It appears only after the provider results, with example chips. AI turns it into preference chips that re-order the list but never silently remove anyone.
2. **What counts as commitment: handing over the card.**
   - The plan tap comes before matching.
   - The exact coverage check (member ID, or "look it up for me") comes after the light account and before the card. If "look it up for me" finds nothing, the patient enters the member ID instead.
   - If the plan doesn't answer within about 15 seconds, the patient can still book, with the typical cost shown. Coverage is then confirmed before the visit, and cancellation is free if it falls through.
3. **Account and resume.** The account is created at "hold this time," with first name, mobile number, and a texted code. Before that, progress is saved in the browser, expires after seven days, and the resume screen shows no health details. After it, the patient resumes by phone.
4. **What makes a best fit** (a stated assumption, since Legion's real matching logic is unknown).
   - A provider is shown only if they are licensed in Texas, take the patient's plan or self-pay, offer the type of care requested, and are accepting new patients.
   - Ranking is by openings in the patient's chosen times over the next 14 days, then focus on the patient's conditions, then stated preferences.
   - Only reasons that differ between providers are shown, and each reason shows its source. Before the account exists, "In network with your plan" rests on Legion's credentialing records. Once coverage is confirmed, it is verified for each provider.
   - If nobody fits the chosen times, the page says so and offers the nearest times and an alert for an earlier opening.
5. **What the guided conversation replaces** (a stated assumption that needs Legion's clinical judgment).
   - It replaces the "Current Issues" box and the narrative parts of the history.
   - GAD-7, PHQ-9, controlled substances, hospitalizations, substance use, and allergies stay as short forms.
   - Family and social history move into the visit. **Emeka will revisit this once the working prototype shows how the experience looks and feels.**
   - Required items are due 24 hours before the visit, with reminders, and the visit is never cancelled automatically.
6. **Safety.** A positive PHQ-9 item 9, or crisis language, shows 988 and 911 guidance immediately and raises a flag for same-day human review. The appointment stays booked. The real response time is Legion's call.
7. **Age.** The prototype keeps "18 or older," and the 65 upper limit seen in the current product is listed as an open question for Legion.

## 6. End-to-end journey (Gate 6, approved)

### Demo patients (all invented)

| Patient | Profile | What the patient's path demonstrates |
|---|---|---|
| **Maya Torres**, 29, Austin (Central Time) | Anxiety and depression. Wants an evaluation and to discuss medication. Prefers evenings. Active Blue Cross Blue Shield PPO. Records and pharmacy history found. | The full happy path, through the guided conversation, the visit, and a booked follow-up |
| **Jordan Ellis**, 34, Houston (Central Time) | ADHD diagnosed years ago. Wants medication management. Self-pay. Free only early mornings or weekends. | Self-pay pricing with no insurance messaging, controlled-substance expectations set by rules, no openings in his chosen times, and a records search that finds nothing, with a short fallback. His medication history misses a prescription he paid for in cash, and the follow-up question about other medications catches it. |
| **Sam Rivera**, 22, El Paso (Mountain Time) | Depression. Wants an evaluation. His plan comes back inactive. | Time-zone handling, and the inactive-coverage path to self-pay. During preparation, a positive PHQ-9 item 9 shows crisis resources and raises a same-day review flag while the visit stays booked. |

Any patient can also trigger two exits. A "Yes" to the risk-of-harm question leads to crisis resources only, with no booking. A non-safety screen-out, such as living outside Texas, leads to resources matched to the reason.

### Stages

| # | Stage | What the patient does | What Legion does (rules, AI, simulated services) | Main events |
|---|---|---|---|---|
| | **Book fast** | | | |
| 1 | **Check fit** (kept) | Answers six yes/no questions, with the phone layout fixed and the continuing answer made consistent | Fixed eligibility rules. Screen-outs get reason codes and resources. A "Yes" to the risk-of-harm question opens the crisis path. | `onboarding_started`, `eligibility_evaluated`, `screen_out_resource_shown`, `crisis_resources_shown` |
| 2 | **What brings you here** | Taps one or more conditions | Rules add condition-specific expectations, such as the benzodiazepine limit or the stimulant policy. Where a benzodiazepine might be considered, they also explain that, under Texas law, the provider checks the state prescription-monitoring record first. | `care_need_captured` (condition count) |
| 3 | **What kind of help** | One tap. The options adapt to the conditions chosen. | | `care_need_captured` (need type) |
| 4 | **How you'll pay** | Taps a plan or "No insurance" | Shows the typical cost for that plan type, or the self-pay price | `coverage_selected` |
| 5 | **Your best-fit providers** | Sees three, sets "When works for you?", optionally adds a note, and picks a time shown in their own time zone | Rules filter and rank, and each reason shows its source. AI turns the optional note into preference chips, and may phrase a one-line summary from the facts only. | `providers_presented`, `filter_applied`, `slot_selected` |
| 6 | **Hold this time** | Gives a first name and mobile number, then a texted code (simulated) | Creates the person and links the anonymous journey to them. The patient can resume by phone from here on. | `reservation_created`, `account_created`, `journey_resumed` |
| 7 | **Confirm coverage and cost** (insured patients only) | Enters a member ID, or chooses "look it up for me" (which falls back to the member ID if nothing is found), plus date of birth | An exact eligibility check (simulated, answering after a short wait) shows the result, its source, and the cost, and confirms each provider's network status. An inactive plan gets a plain explanation, with self-pay or another plan offered. If the plan doesn't answer within about 15 seconds, the patient can book with the typical cost shown, and coverage is confirmed before the visit, with free cancellation if it falls through. | `coverage_verified` (result, cost shown, source) |
| 8 | **Book** | Reviews provider, time, cost, and a one-line cancellation rule, agrees to the three policies on one screen, and adds a card (simulated) | Holds the slot quietly. If the time was just taken, it offers the next times. | `consents_signed`, `payment_method_added`, `appointment_confirmed` (from the scheduling system) |
| | **Arrive ready** | | | |
| 9 | **Get ready** | Lands on their home page after booking and works through a checklist, in this order: (a) verify their ID; (b) allow the records and medication search, which runs in the background; (c) the guided conversation; (d) GAD-7 and PHQ-9; (e) confirm what was found, plus one question about medications the history can't see, such as cash-paid or over-the-counter ones; (f) preferred pharmacy, prefilled from fill history; (g) substance use and an emergency contact | The ID check supplies legal name, date of birth, sex, and address for record matching, and verifies age. A mismatch goes to a person for review. The ID check comes first but blocks nothing except the record search. Records and medication history arrive after a wait, shown as "Searching…". AI runs the bounded conversation, extracts items to confirm, and drafts the clinician summary, which shows the prescription-monitoring review as pending. Rules handle safety answers. | `identity_verified`, `records_requested`, `records_received`, `intake_task_completed`, `visit_ready`, `safety_flag_raised`, `safety_flag_reviewed` |
| 10 | **The visit** | Gets reminders, joins, and has the visit (simulated) | The visit system records joining, start, and completion | `reminder_sent`, `visit_join_attempted`, `visit_started`, **`first_visit_completed`** (from the clinical record) |
| 11 | **After the visit** | Reads a plain-language summary, books a follow-up in one tap, and sees the prescription sent to the pharmacy confirmed in step 9 | A clinician-reviewed summary, an e-prescription, and scheduling (all simulated) | `visit_summary_viewed`, `prescription_sent`, `follow_up_booked` |

**Journey view for Legion (H1 in depth).** An internal page shows a patient's events under one journey identifier across sessions, including a return visit. It marks which events came from the browser and which from systems of record. It also shows a synthetic cohort funnel, counted per person, with the headline metric, stage metrics, and guardrails. Analytics events carry codes and timings only, never clinical answers.

### Exception states

1. **Crisis at the fit check.** A "Yes" to the risk-of-harm question shows crisis resources only, with no booking.
2. **Safety during preparation.** A positive PHQ-9 item 9, or crisis language in the conversation, shows crisis resources and raises a same-day review flag. The visit stays booked.
3. **Coverage problems.** Each has a plain next step:
   - an inactive plan, with self-pay or another plan offered
   - a lookup that finds nothing, which falls back to the member ID
   - a plan that is slow to answer, where the patient can book with the typical cost and coverage is confirmed before the visit
4. **No openings in the chosen times.** The page says so, and offers the nearest times and an alert for an earlier opening.
5. **Records not found.** A short fallback, or the patient brings the information to the visit.
6. **A time that was just taken.** The next times are offered instead of an error.
7. **A non-safety screen-out.** Resources matched to the reason.

**Expected patient effort** (an estimate, to verify once built): about 50 inputs before the visit, most of them one-tap confirmations, with about ten typed fields. Today it is 75 to 80, many of them typed.

## 7. Architecture

Gate 7, the architecture and the choice of which services are live and which are simulated, is proposed in [ARCHITECTURE.md](ARCHITECTURE.md).
