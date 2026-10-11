# Product brief: AI-native onboarding for Legion Health

**Status.** Sections 1 to 4 are approved (Gates 1 to 4, 2026-10-10). Sections 5 and 6 are proposals for Gates 5 and 6 and are not approved yet. Section 7 lists what Gate 7 still has to settle.

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

## 5. Redesign concept (Gate 5, proposed)

### The idea: "Tell us once"

The patient tells Legion what is going on once, in their own words. From then on, Legion does the work. It reads the story, retrieves what already exists (coverage, records, medications), and explains its recommendations, so the patient's job shrinks to confirming. Fixed rules still make every eligibility and safety decision (principle 7), and every step emits person-level events through the post-visit step (principle 1).

| Today | With "Tell us once" |
|---|---|
| Two pick-lists (conditions, then needs) that never adapt | One guided question answered in the patient's own words, with tappable chips as a fallback. What Legion understood comes back as editable chips to confirm. |
| Insurance is a logo tap, and coverage and cost arrive after booking | Coverage is checked, and the expected cost shown, before any provider is offered |
| 43 providers, three at a time, none explained | The three best-fit providers, each with true "why this fits you" reasons, and a filter for when the patient is free, preset from their story |
| Six fields and three consents under a countdown, after the slot is held | Phone and first name earlier, to save progress. Booking becomes review, consent, and card. |
| About 25 history questions, an unexplained "Current Issues" box, and prior providers typed down to fax numbers | The story, records, and medications arrive prefilled with their sources to confirm. The questionnaires stay word for word, and the rest moves into the visit. |
| Nothing measured after the payment page | One journey identifier from the first page to the post-visit step, with the visit outcome taken from the system of record |

### Options

| Option | Strength | Weakness |
|---|---|---|
| (A) Fix the current flow in place: keep today's steps, and add explanations, an early coverage check, a lighter account, and retrieval in readiness | Lowest risk, and easy to compare with today | Personalization starts only at matching, the two pick-lists and most repeated questions stay, and it reads as polish rather than a rebuild |
| **(B) Tell us once (recommended)** | Personalization starts at the first real interaction (goal 2). It removes two steps and the duplicate questions, puts AI where it is strongest, and carries H1 to H3 in depth. | It adds a free-text moment before booking, softened by chips. It also depends on retrieval services, which are simulated here and have uneven coverage in the real world. |
| (C) Conversation-first concierge: one AI chat runs the whole onboarding | The most visibly AI-driven | Slow for structured details such as insurance, dates, and times. Hard to keep screening deterministic, accessible, and measurable by stage. Conflicts with principles 4 and 7, and with keeping the screening as it is. |

### Three choices inside option B

1. **Where the guided conversation sits.** Recommended: before matching, in place of the two pick-lists, so the patient's story shapes the provider reasons and everything after. The same story later replaces the "Current Issues" box, so it is asked only once. The alternative is the Gate 1 idea as first stated: use it only in readiness, in place of the "Current Issues" box. That protects the pre-booking steps, but personalization starts later.
2. **How many providers to show first.** Recommended: the top three by fit, each with reasons, plus "See all providers." The alternative is the full list, with reasons on every card.
3. **Where the light identity sits.** Recommended: right after the story and before the coverage check. That is the first point with progress worth saving, the coverage check needs a person, and an early identity lets measurement link sessions (H1). The phone number is used only to resume and for reminders, never to prefill details (Emeka's caution at Gate 1). The alternative is after a time is chosen, as today but lighter.

## 6. End-to-end journey (Gate 6, proposed)

### Demo patient (synthetic)

Maya Torres, 29, lives in Austin, Texas. Anxiety has been affecting her sleep and work, and she wants an evaluation and to talk about medication. She works days, so evenings suit her. She has a commercial plan (Blue Cross Blue Shield of Texas). The simulated records and pharmacy networks hold a short history for her. Every detail is invented.

### Stages

| # | Stage | What the patient does | What Legion does (rules, AI, simulated services) | Main events |
|---|---|---|---|---|
| 1 | **Check fit** (kept) | Answers the six yes/no questions, as today, with the phone layout fixed and the continuing answer made consistent | Fixed eligibility rules. Screen-outs get reason codes and relevant resources. A "Yes" to the risk-of-harm question opens the crisis path. | `onboarding_started`, `eligibility_evaluated`, `screen_out_resource_shown`, `crisis_resources_shown` |
| 2 | **Tell us what's going on** (new) | Writes or dictates a few sentences, or taps chips, then confirms "Here's what we heard" | A crisis-language rule checks the text first. AI then sorts the concerns, care goal, and time preferences into Legion's categories. Rules add condition-specific expectations, such as the benzodiazepine limit. | `care_need_captured` (need type, condition count, input mode, edits) |
| 3 | **Save your progress** | Gives a first name and mobile number, then a texted code (simulated) | Creates the person and links the journey to them. The patient can resume by phone number on any device. | `account_created` (method: phone), `journey_resumed` |
| 4 | **Coverage and cost** | Picks a plan and enters member ID and date of birth, or chooses "No insurance" or "Look it up for me" | A real-time eligibility check (simulated) shows the result, its source, and the expected cost per visit. Self-pay patients see only self-pay pricing. | `coverage_selected`, `coverage_verified` (result, cost shown, source) |
| 5 | **Meet your best-fit providers** | Sees three providers, each with "why this fits you" reasons, adjusts "when works for you" (preset from her story), and picks a time shown in Central Time | Rules filter (licensed in Texas, takes her plan, accepts new patients) and rank (needs, care goal, availability). AI may phrase a one-line summary from those facts only. | `providers_presented` (count, hours to earliest slot, filters), `slot_selected` |
| 6 | **Book** | Reviews provider, time, cost, and a one-line cancellation rule, agrees to the three policies on one screen, and adds a card (test mode) | Holds the slot quietly. If the time was just taken, it offers the provider's next times instead of an error. | `reservation_created`, `consents_signed`, `payment_method_added`, `appointment_confirmed` (from the scheduling system) |
| 7 | **Get ready** | Works through a short checklist, mostly by confirming: (a) a summary for her clinician drafted from her story, plus a few follow-ups from a fixed question bank; (b) records found through the records network, each with its source; (c) medications from pharmacy history; (d) GAD-7 and PHQ-9, word for word, one question at a time; (e) an ID check; (f) substance use and an emergency contact | Retrieves only after consent with a visible purpose. AI drafts the summary and turns retrieved facts into items to confirm. Any answer other than "Not at all" to PHQ-9 item 9 shows crisis resources on screen and raises a safety flag for same-day human review (fixed rule). | `intake_task_completed` (task, retrieved or typed), `records_received`, `visit_ready`, `safety_flag_raised`, `safety_flag_reviewed` |
| 8 | **The visit** | Gets reminders (simulated texts), joins from the link, and has the visit (simulated) | The visit system records joining, start, and completion | `reminder_sent`, `visit_join_attempted`, `visit_started`, **`first_visit_completed`** (from the clinical record) |
| 9 | **After the visit** | Reads a plain-language summary and takes one next step: sees that her prescription went to her pharmacy, and books a follow-up with the same provider in one tap | A clinician-reviewed summary, an e-prescription, and scheduling (all simulated) | `visit_summary_viewed`, `prescription_sent`, `follow_up_booked` |

**Journey view for Legion (H1 in depth).** An internal page shows Maya's events under one journey identifier across two sessions, since she resumes by phone. It marks which events came from the browser and which from systems of record. It also shows a synthetic cohort funnel, counted per person, with the headline metric, stage metrics, and guardrails. Analytics events carry codes and timings only, never clinical answers.

### Exception states shown

1. **Safety path (rule-based).** Crisis language in the story, or a positive PHQ-9 item 9, leads to crisis resources and a flag for human review. This is principle 7 where it matters most.
2. **Coverage problem.** An inactive plan is explained in plain words, with the self-pay price or a different plan offered. There is no dead end and no surprise later.
3. **A time that was just taken** (cheap to add). The patient is offered the provider's next times instead of an error.

### Readiness: what stays before the visit (an assumption that needs Legion's clinical judgment)

- **Required before the visit:** consents, the ID check, GAD-7 and PHQ-9, current medications including controlled substances, hospitalizations, substance use, allergies, and an emergency contact.
- **Retrieved and confirmed rather than typed:** diagnoses, prior providers and their records, medications, and allergies where available.
- **Moved into the visit:** personal and social history, family history, and physical details beyond the essentials.

**Expected patient effort** (an estimate, to verify once built): about 50 inputs before the visit, most of them one-tap confirmations, with about ten typed fields. Today it is 75 to 80, many of them typed.

## 7. Questions for Gate 7 (architecture, live versus simulated)

- **Services.** Which run live in sandbox and which are simulated: eligibility, records, pharmacy history, identity verification, payment test mode, texts, and the video visit.
- **The model.** Whether the guided conversation and the summaries call a live model or a scripted stand-in for the demo, and how it is bounded: what it may ask, extract, and say.
- **Consent.** How prefill and retrieval consent is shown, given Emeka's caution about phone-linked prefill.
- **Events.** How events are stored and shown without a production database.
- **Provider facts.** Which facts power "why this provider" in the simulated dataset.
- **Questions only Legion can answer:** matching logic, safety review, follow-up, and today's attendance rate.
