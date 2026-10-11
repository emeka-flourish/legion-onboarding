# Product brief: AI-native onboarding for Legion Health

**Status.** Section 1 is approved (Gate 1, 2026-10-10). Sections 2 to 4 are proposals for Gates 2 to 4 and are not approved yet. The concept and journey (Gates 5 and 6) will be added once these are settled.

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

## 2. Goals and success metrics (Gate 2, proposed)

### Goals

1. **More eligible people complete a first visit.** This is the end state the assignment defines.
2. **Less work and more certainty along the way.** Patients type less, know their coverage and cost before committing, and choose a provider they trust.
3. **Legion can see every person's progress** through the first visit and the step after it.

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
| **Completed first visits ÷ eligible starters, counted per person, within 14 days (recommended)** | Matches the assignment's end state, and correct screen-outs are not counted as failures | Needs identity stitching and visit events from the system of record, which is exactly what problem 1 asks us to build |
| Completed first visits ÷ all starters | Simplest to compute | Counts correct screen-outs as failures, against Emeka's Gate 1 guardrail |
| Booked appointments ÷ starters | Closest to what is measured today | Stops before the goal, and rewards bookings that never become visits |

The prototype will emit these events under one journey identifier and show one person's progression end to end. How it shows them is part of Gates 6 and 7.

## 3. Design principles (Gate 3, proposed)

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

**Options.** (A) Adopt the nine as drafted. (B) Consolidate to about six so they are easier to remember, for example by merging 2 with 6 and 3 with 4, and treating 9 as a build constraint.

**Recommendation: A, with one change.** Principle 3 is renamed "Confirm, don't type." That names the AI-native idea of this rebuild in three words: the system retrieves and drafts, and the patient confirms. Merging would blur distinctions Emeka drew at Gate 1. Explaining a recommendation (2) is a different promise from asking consent to use data (6). Removing typing (3) is a different problem from pacing screens on a phone (4).

## 4. Primary hypotheses (Gate 4, proposed)

The prototype can show each mechanism working and emit the events that would test it, but it cannot measure outcomes. Real tests need Legion's traffic. Each hypothesis names the change, the expected effect, how it would be measured, and why we believe it.

- **H1. Person-level measurement (problem 1, the foundation).** If every stage emits a person-level event under one journey identifier, and the system of record logs first-visit completion, then Legion can measure the headline metric and see where eligible people are lost. *Measured by* the share of journeys with complete stage coverage, from the first page to the post-visit step. *Because* about 76% of sessions end before an account exists, most of today's losses can't be tied to a person.
- **H2. Provider trust (problem 2).** If the match step explains why each provider fits, using only true facts, and lets patients filter by when they are available, then more eligible patients will choose a provider with no extra inputs. More will also attend, because the choice is anchored in fit. *Measured by* provider selection among eligible patients and first-visit attendance. *Because* this is the largest loss among screened-in people. Today 43 options appear with no explanation, and finding a time that fits means scanning every card.
- **H3. Confirm, don't type (problem 3).** If records, history, and coverage are retrieved before asking, and a bounded guided conversation replaces the unexplained "Current Issues" box with details extracted for the patient to confirm, then typed inputs before the visit will fall by at least half and more patients will be ready before the deadline. *Measured by* inputs typed and readiness completed on time. *Because* eight facts are asked two or three times, and patients type prior providers' details down to fax numbers, even though Legion already uses a records-retrieval service.
- **H4. Light identity and resume (problem 4).** If the account starts with phone and name only, with other details collected later and a resume-by-phone option, then fewer held reservations will be lost and returning patients will be counted as the same person. *Measured by* reservations that become accounts and resumed journeys that are linked. *Caveat:* the data can't show what causes today's loss.
- **H5. Certainty before commitment (problem 6).** If coverage and expected cost are shown before a slot or card is taken, and self-pay patients see no insurance messaging, then patients commit with fewer surprises. That supports H4's conversion and attendance. *Measured by* coverage and cost known before booking, and reservations that become accounts.

**Options for where the prototype goes deep.**

| Option | Strength | Weakness |
|---|---|---|
| **(A) All five at equal depth** | Complete | Shallow everywhere within the build budget |
| **(B) H1, H2, and H3 in depth; H4 and H5 as lighter steps in the same journey (recommended)** | Follows Emeka's top three priorities, and puts AI where it is strongest: retrieving, extracting, and explaining | H4 and H5 are shown but not explored in depth |
| **(C) The measured losses only: H1, H2, and H4** | Strongest current evidence | Leaves the unmeasured stretch between booking and the visit untouched, and that stretch is where the assignment's goal is decided |

**Recommendation: B.** Every stage of the journey still appears end to end, as the definition of done requires.

**Requirements, not hypotheses.** These are not tested; they simply have to hold. The crisis path runs on fixed rules and is never exercised in production. Every safety flag is reviewed by a person. The questionnaires stay word for word (L3, L10).

## 5. Questions carried to Gates 5 to 7

From [discovery/diagnosis.md](../discovery/diagnosis.md), section 6:

- **Identity (Gate 6).** Where is a light identity created, and what does it ask for?
- **Prefill and consent (Gate 7).** What prefill is acceptable for a health account, and with what consent?
- **Readiness (Gates 5 and 6).** Which readiness items are required before the visit, and which move into it? The prototype will state its assumption openly.
- **The guided conversation (Gates 5 and 7).** How tightly is it bounded: what may it ask, extract, and say?
- **Provider facts (Gates 5 and 7).** Which facts power "why this provider," and which exist in the simulated dataset?
- **Questions only Legion can answer:** matching logic, safety review, follow-up, and today's attendance rate.
