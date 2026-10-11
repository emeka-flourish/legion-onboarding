# Gate 1: current-state diagnosis and handoff

**Status.** Emeka reviewed the discovery documents on 2026-10-10 and set the order and direction in sections 1 and 2. Those are his Gate 1 decisions. The primary session records them in `STATUS.md`.

**Not yet approved.** Sections 3 to 6 are the discovery session's synthesis and proposals, meant as inputs for Gates 2 to 4.

**Read this first.** It summarizes the evidence, and the supporting documents listed in section 7 hold the detail. It supersedes the provisional ordering in [opportunities.md](opportunities.md), section 5. Discovery is closed.

## 1. The diagnosis, in Emeka's order of importance

| # | Problem | Evidence in brief | Emeka's direction |
|---|---|---|---|
| 1 | **Measurement can't see people or the goal** | Counts browser sessions; stops at payment-page reach | Rebuild instrumentation: person-based, through the post-visit step, synced with the backend |
| 2 | **Choosing a provider doesn't build trust** | 36.6% of match-page sessions never pick a provider; no "why this provider"; no time filter | Build trust through personalization without adding clicks or inputs |
| 3 | **Pre-visit readiness is long, repetitive, and typed by hand** | About 75 to 80 inputs, facts asked repeatedly, records typed from memory | Remove duplicates, pre-retrieve records and history, reveal questions progressively |
| 4 | **Account creation loses one in five held slots** | 20.4% leave the "About yourself" form under a countdown, with input glitches | Start with phone and name; resume by phone number; be careful with phone-linked prefill |
| 5 | **Initial screening works** | 34.8% loss at the fit check, mostly intended screen-outs | Keep it. People who don't fit already get resource links. |
| 6 | **Coverage and cost certainty arrive after commitment** | Insurance verified only after booking and card | Fix it; it costs trust |
| 7 | **Trust, tone, and accessibility details** | Over-claiming copy, raw errors, contrast, missing time zones | Agree; lower priority for this rebuild |

### 1. Measurement can't see people or the goal

**What's wrong.** Legion's telemetry counts browser sessions and stops when a session reaches the payment page. It cannot see payment, the confirmed booking, readiness, the visit, or anything after, so it cannot measure the assignment's end state. Because it counts sessions, a patient who returns later to finish is counted as lost.

**Evidence** ([funnel-analysis.md](funnel-analysis.md)):

- The funnel ends at payment-page reach: 1,403 sessions, 23.8% of starts. No payment-success, booking, or completion event exists.
- About 76% of sessions end before an account exists, so most of the funnel can't be tied to a person or stitched across devices.
- Everything Emeka did in the patient portal (screening, history, records, ID) produces no events in the data provided.

**Emeka's direction.**

- The rebuild must correct the instrumentation.
- It should be person-based and follow each patient through the post-visit step.
- It should be synced with the backend, so outcomes come from the systems of record, not only from the browser.

**Guardrails.**

- Events carry codes and timings, never clinical answers.
- The headline denominator is eligible patients, so correct screening isn't counted as failure.

**Signal that it's fixed.**

- One journey identifier links every stage from the first page to the post-visit next step.
- "First visit completed" is recorded by the system of record.
- The event list in [funnel-analysis.md](funnel-analysis.md) is the starting point.

### 2. Choosing a provider doesn't build trust

**What's wrong.** Patients who passed screening and saw real availability are asked to choose from a long list that never explains itself.

**Evidence** ([current-flow.md](current-flow.md), stage 5):

- 36.6% of sessions that reach the match page never select a provider (1,104 sessions in 30 days). This is the largest loss among people who already passed screening.
- No card says why the provider fits the patient.
- Expertise tags barely differ between providers.
- "Perfect match found!" heads 43 options, loaded three at a time.
- The only way to find a time that works is to scan each card. Only each provider's soonest dates show, slot times carry no time zone, and on a phone one card is taller than the screen.

**Emeka's direction.**

- This moment must convey trust through personalization. The chosen provider is what motivates the patient to finish readiness and attend.
- Patients should be able to filter by when they're available, and see why each suggested provider is a good fit.
- The fix must not add friction. Minimize clicks and inputs.

**Guardrails.**

- Every "why this provider" reason must be true and traceable to facts the system holds: licensure, payer, availability, specialties, and the patient's stated needs.
- AI may phrase the explanation but must not invent reasons or decide eligibility (decision L3).

**Signal that it's fixed.**

- More eligible patients select a provider, with no more inputs or time to choose.
- Booked patients attend.

### 3. Pre-visit readiness is long, repetitive, and typed by hand

**What's wrong.** After booking, the patient faces a long intake, much of it repeated or already available elsewhere. It has unclear requirements, and none of it is measured.

**Evidence** ([current-flow.md](current-flow.md), stage 8):

- **Volume.** Roughly 75 to 80 inputs before the visit, counting only what was observed. Eight facts are asked two or three times.
- **Records.** Records are requested by having the patient type each prior provider's details, down to fax numbers. Yet the brief says Legion already uses a service that retrieves medical records from health information exchanges.
- **The "Current Issues" box.** The Mental Health History form opens with a preview of about 25 questions above a single "Current Issues" text box. Emeka's screenshots confirm this, and the box's purpose isn't clear to the patient.
- **Unclear requirements.** "Must be completed 24 hours before your appointment" sits next to "Skip This Form."
- **Self-harm question.** The depression questionnaire's self-harm question (PHQ-9 item 9) is asked days before the visit, with no visible safety handling.

**Emeka's direction.**

- **Remove duplicates.**
- **Retrieve before asking.** Pre-retrieve records and history as much as possible.
- **Reveal progressively.** Show questions a few at a time, especially on mobile.
- **Keep the validated questionnaires word for word:** GAD-7 (anxiety) and PHQ-9 (depression).
- **Keep the clinically essential history:** controlled substances, hospitalizations, substance use, conditions, and allergies.
- **Shorten only three ways:** removing duplicates, pulling data that already exists, and moving the rest into the visit.
- **Idea for the redesign concept (Gate 5):** replace the unexplained free-text box with a guided conversation. It would capture the patient's story, extract initial details, and use them to shape the rest of the questionnaire.

**Guardrails.**

- Retrieved or extracted information is shown to the patient to confirm, with its source.
- Questionnaire wording and answer scales stay unchanged.
- Safety-relevant answers trigger fixed-rule handling and human review, never a model's judgment (L3).

**Signal that it's fixed.**

- Fewer inputs typed by the patient, and no fact asked twice.
- More patients are ready before the deadline, and the clinician has what they need.

### 4. Account creation loses one in five held slots

**What's wrong.** After a slot is held, the patient gives contact details, consents, and a card under a countdown, and input glitches along the way cost committed patients.

**Evidence** ([funnel-analysis.md](funnel-analysis.md), [current-flow.md](current-flow.md), stages 6 and 7):

- 20.4% of sessions that reach the "About yourself" form leave without an account (360 sessions in 30 days). Each one had already held a provider slot.
- The form runs under a roughly ten-minute hold. It has three consent checkboxes.
- A date-of-birth bug triggered a misleading age notice. That notice also names an upper age limit of 65 that the fit check never asks about.
- A contradictory error appeared right after payment succeeded.
- The data doesn't show which of these causes the loss.

**Emeka's direction.**

- The cause is unclear, but the glitches probably contribute, and prefilling may help.
- Consider creating the account with just phone and name, and collecting other details later.
- A patient who comes back in a new session resumes by entering their phone number. This would be a more legible version of today's "Sign in to continue" footer.
- **Caution:** Emeka is unsure whether prefilling details tied to a phone number is wise for a health account. Patients may see it as invasive, except where they are explicitly giving insurance information. To be resolved at Gate 7.

**Guardrail.** Input errors must never appear as an eligibility decision.

**Signal that it's fixed.**

- More reservations become accounts.
- Resumed journeys are linked to the same person.
- No patient is screened out because of an input error.

### 5. Initial screening works, so keep it

**Evidence.**

- 34.8% of sessions are lost at the fit check. That is probably mostly intended screen-outs, but it can't be proven without answer-level events.
- Each question explains what happens if care is ruled out.
- Emeka observed that people who don't fit get links to resources.

**Emeka's direction.** He is less concerned here: the fit checks do a good job. Keep them largely as they are.

**Carry forward anyway** (not a redesign):

- **Measure outcomes.** Record eligibility outcomes with reason codes as part of problem 1, so intended screen-outs can be told apart from people who just left.
- **The crisis path** (answering "Yes" to "Are you currently at risk of harming yourself or others?") was not observed. It must not be tested in production. Design it from first principles with fixed rules.
- **Layout fixes.** Two fixes for the build:
  - On phones, the first answer sits below the fold.
  - The answer that lets you continue flips between Yes and No across questions.

### 6. Coverage and cost certainty arrive after commitment

**Evidence.**

- Insurance is a single logo tap. Verification and the real cost come only after booking and card entry.
- A self-pay patient sees "insurance verification next," a "$0 to $40 per session" estimate, and "Insurance: Incomplete."
- The $250 late-cancellation and no-show fee sits in dense text on the payment page.

**Emeka's direction.** Agreed. This may cost trust, so fix it.

**Signal that it's fixed.**

- Patients know their coverage status and expected cost before they commit.
- Self-pay patients see no insurance messaging.

### 7. Trust, tone, and accessibility details

**Evidence.**

- Over-claiming copy: "Great news! We've got you covered" appears before insurance is chosen, and "Perfect match" heads 43 options.
- Celebration screens appear around sensitive screening.
- Raw developer error text reaches patients.
- Some text fails contrast standards.
- Appointment times have no time zone.

**Emeka's direction.** Agreed, but lower priority for this rebuild.

**Discovery note.** Several of these cost nothing in a new build: time zones, contrast, plain-language errors, and accurate claims. Do those by default, and spend no separate effort on the rest.

## 2. Other answers Emeka gave at Gate 1

- **The "single text field"** is the "Current Issues" box under the expanded question preview, as Emeka's screenshots confirm. The problem is that its purpose isn't clear. See the guided-conversation idea in problem 3.
- **Shortening the intake:** agreed as described in problem 3, with progressive reveal, especially on mobile.
- **Screen-out paths:** Emeka observed the resource links for people who don't fit, so there's no need to test them in production. Never answer "Yes" to the risk-of-harm question in production.
- **Discovery is closed.** The findings are committed and merged into the feature branch.

## 3. Insights to carry into the next phase

1. **The blind spot is the goal.** Everything between booking and the first visit is unmeasured, and that is where readiness, cost certainty, and attendance are decided. A rebuild that only polishes the measured funnel can't show it moved the assignment's goal.
2. **The provider is the reason to finish.** Trust built when choosing a provider carries the patient through readiness and to the visit. Personalization there matters for attendance, not only for selection (Emeka).
3. **Legion asks patients to type what it can already retrieve.** The brief says Legion already uses a records-retrieval service and an insurance-eligibility service. Yet the patient re-types history, prior providers, and coverage. The AI-native leverage is "confirm, don't type": retrieve and extract, then let the patient confirm.
4. **An early identity helps both measurement and resuming.** A light identity (phone and name) lets separate sessions join into one person, and lets patients pick up where they left off. Where it sits in the flow is a Gate 6 decision, weighed against Emeka's privacy caution.
5. **Today, commitment comes before certainty.** Slot, contact details, and card all come before coverage, cost, and readiness. Moving certainty ahead of commitment is a trust lever (problem 6) and may reduce drop-off at problem 4.
6. **Free text is where friction and nuance both live.** The "Current Issues" box is the hardest input and the richest one. Emeka's guided-conversation idea targets it. Anything extracted must be confirmable and stay within the safety rules.
7. **Safety answers arrive before anyone reads them.** Self-harm screening happens days before a clinician sees it, with no visible review. Any AI-led intake must make the safety path explicit, rule-based, and reviewed by a person.
8. **Legion's visual language and warm tone are assets.** The problems are specificity and accuracy, not warmth. The design system can be reused as is ([design-system.md](design-system.md)).

## 4. Candidate design principles (inputs to Gate 3, not yet approved)

| # | Principle | Where it comes from |
|---|---|---|
| 1 | **Measure people, through the visit.** Every stage emits a person-level event, and outcomes come from the systems of record. | Emeka, problem 1 |
| 2 | **Explain every recommendation in the patient's terms**, using only true, traceable facts. | Emeka, problem 2; decision L3 |
| 3 | **Fewer inputs and fewer clicks.** Never ask twice, retrieve before asking, and let patients confirm instead of type. No fix may add steps. | Emeka, problems 2 to 4 |
| 4 | **Reveal progressively.** One clear decision at a time, designed for the phone first. | Emeka, intake and mobile |
| 5 | **Certainty before commitment.** Eligibility, coverage, and cost are known before a slot or a card is taken. | Emeka, problem 6; problem 4 evidence |
| 6 | **Use data the patient can see and agree to.** Retrieve or prefill only with a visible purpose and consent, and show where each piece of information came from. | Emeka's privacy caution |
| 7 | **Rules decide; AI assists.** Eligibility, safety, and controlled substances are decided by explicit rules or people. AI extracts, summarizes, explains, and drafts. | Decision L3 |
| 8 | **Keep the clinical substance.** Validated questionnaires stay word for word, and essential history stays. Shorten only by removing duplicates, retrieving, and moving questions into the visit. | Emeka |
| 9 | **Recognizably Legion.** Reuse the design system and the warm tone, and make every claim specific and true. | Design system; problem 7 |

## 5. Inputs for Gate 2: goals and metrics (candidates, not yet approved)

| Kind | Candidate |
|---|---|
| **Headline metric** | Share of eligible starters, counted as people rather than sessions, who complete a first visit within a set window (for example, 14 days) |
| **Stage metrics** | Provider selected, among eligible patients · reservation to account · coverage and cost known before booking · readiness complete before the deadline · attendance at the first visit · post-visit next step taken |
| **Guardrails** | Inputs the patient types before the visit · time from start to booking · share of screened-out people shown a relevant resource · every safety flag reviewed by a person within a defined time |

## 6. Open questions for later gates

| Question | Gate | Discovery's view |
|---|---|---|
| Where in the flow is a light identity created, and what does it ask for? | 6 | Emeka suggests phone and name at account creation. It should come no earlier than saving progress requires. |
| What prefill is acceptable for a health account, and with what consent? | 7 | Emeka is cautious. Looking up insurance seems acceptable when the patient asks for it. |
| Which readiness items are required before the visit, and which move into it? | 5 and 6 | Needs clinical judgment. The prototype should state its assumption openly. |
| How tightly is the guided conversation bounded: what may it ask, extract, and say? | 5 and 7 | Questionnaires stay word for word, and safety handling follows fixed rules. |
| Which facts power "why this provider," and which exist in a mocked dataset? | 5 and 7 | Licensure, payer, availability, specialties, and the patient's stated needs |
| Questions only Legion can answer: matching logic, safety review, follow-up, today's attendance rate | — | Listed in [opportunities.md](opportunities.md), section 4, and [current-flow.md](current-flow.md) |

**Notes for the prototype.**

- Discovery used no real clinician names or photos. The prototype should use synthetic providers too.
- Synthetic patients only (decision L2).

## 7. Supporting documents

- [opportunities.md](opportunities.md): Emeka's observations compared with the independent analysis. Its section 5 ordering is superseded by section 1 above.
- [current-flow.md](current-flow.md): the observed journey stage by stage, with links to 17 screenshots.
- [funnel-analysis.md](funnel-analysis.md): conversion numbers, instrumentation gaps, and the events needed to measure first-visit completion.
- [user-observations.md](user-observations.md): Emeka's walkthrough notes.
- [design-system.md](design-system.md) and [design-system.html](design-system.html): measured design tokens and component specimens. Open the HTML file in a browser.
