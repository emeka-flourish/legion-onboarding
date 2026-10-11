# Comparing Emeka's observations with the independent analysis

**Inputs:**

- [user-observations.md](user-observations.md) (Emeka's voice notes)
- [current-flow.md](current-flow.md) (frame-by-frame review of both recordings, plus read-only inspection of the live entry pages)
- [funnel-analysis.md](funnel-analysis.md) (the brief's PostHog data)
- [design-system.md](design-system.md) (measured UI values)

**What this is not.** This is a current-state comparison. It names problems worth investigating. It does not propose a redesign, features, or vendors. Claims about causes are hypotheses unless the evidence column says otherwise.

## 1. Areas of agreement

| Emeka's observation | Independent evidence | Strength |
|---|---|---|
| **The fit questions are early screening, and that makes sense.** | Six eligibility and safety questions, each explaining what happens if care is ruled out. The substance (licensure state, payer exclusion, safety, level of care, age, modality) is clinically or legally necessary. | Strong |
| **The needs step is hard to read.** | Measured contrast for white text on the selected colors: about 3.2:1 (green) and 4.4:1 (blue). Both fail WCAG AA for normal text, and the secondary lines are smaller and lighter still. | Strong |
| **The needs step ignores what Legion already knows.** | Options and copy are identical regardless of conditions, payer, or fit answers. | Strong (fact). Whether it should adapt is a design question. |
| **It's unclear why a provider is the "perfect match."** | No card ties the patient's answers to the provider. "Perfect match found!" heads a list of 43 with no ranking explanation. The only labels are "Soonest available" and an undefined "Highly recommended." | Strong |
| **Choosing a provider is hard; times are the only real filter; loading three at a time is inefficient; information overload.** | 43 providers, three per click, each card with a bio and 6 to 9 slot buttons. On mobile, one card is taller than the phone screen. No way to state preferred days or times. The largest loss after screening sits here: 36.6% of sessions that reach the match page never select a provider. | Strong on friction. The data shows *where* sessions stop, not *why*. |
| **Only the soonest times are shown.** | Each card shows its earliest 2 to 3 dates, with "+N more times" hidden. | Strong |
| **Date of birth is hard to enter.** | Confirmed in the recording. The year chosen did not register, which triggered a misleading "Age Restriction Notice" and cost about a minute to fix. | Strong |
| **Confusing insurance messages for an uninsured patient.** | Confirmed in three places: the payment page's "Insurance verification next," the "$0-$40 per session" estimate, and the dashboard's "Insurance: Incomplete," all after "None" was chosen. | Strong |
| **The payment step showed an odd error.** | Confirmed: a success toast, then about 2.5 seconds of "You don't have an appointment reservation," then a redirect. | Strong |
| **Too much text on the payment page.** | Four dense policy bullets, a fee schedule, and a footnote, partly irrelevant to this patient. | Moderate. Some disclosure is required (see section 2). |
| **The intake is long, high in cognitive load, and should be compressed.** | Roughly 75 to 80 inputs before the visit, counting only what was seen. Several facts are asked two or three times ([current-flow.md](current-flow.md), "Information asked for more than once"). | Strong on burden. See section 2 on *how* to compress. |
| **Collecting other providers' information is valuable because it shortens the first visit.** | Legion's own copy says the same: records let "your provider start your visit already up to speed," including possible same-day stimulant prescribing. | Strong. Section 3 notes how it is collected. |
| **The benzodiazepine note on the Anxiety tile "communicates something."** | It sets expectations for a controlled-substance policy at the moment of intent, before any commitment. | Agree |
| **Stripe Link made payment easy.** | One-tap card fill, and a $1 authorization rather than a charge. | Agree |
| **The portal's card layout is simple and clear.** | A single column, a checklist with status chips, one "Action needed" banner. | Agree |

## 2. Observations that need qualification

1. **"A single text field to answer all these questions."**
   - The Mental Health History form is not one field. It is 11 short sections, one question at a time.
   - What appears above the first answer box is a "What to expect" preview listing every question (about 25, with "(conditional)" tags), and it was expanded when first seen. That makes it look like one box for everything.
   - The real problems are that preview, plus a heavy reliance on free-text boxes (current issues, other medications, allergies, trauma, personal life, family history, medical history, substance use). Free text is high effort for patients and hard to use downstream, though it is also where nuance lives.

2. **"Compress the intake significantly."**
   - Agreed on patient effort, but much of the content is clinically load-bearing for a prescriber's first visit:
     - controlled-substance use
     - hospitalizations
     - substance use
     - medical conditions and allergies, for drug safety
     - the screening instruments
   - GAD-7 and PHQ-9 are validated questionnaires. Their wording and response scale should stay intact.
   - The evidence points to compression through four levers rather than cutting clinical substance:
     - removing duplicates
     - retrieving what already exists elsewhere
     - asking only what changes the first-visit plan
     - moving the rest into the visit
   - Clinicians need to decide which is which.

3. **"The needs step should use earlier answers."**
   - Partly. The needs question (existing diagnosis, new diagnosis, or unsure) is not answered by the conditions list.
   - The larger gaps are that nothing visibly uses the answer afterward (matching doesn't explain it, and intake doesn't adapt to it) and that personalizing copy can't fix the contrast problem.
   - Any adaptation must stay out of eligibility decisions, which are deterministic by project rule.

4. **"The earlier-appointment checkbox means Legion optimizes for urgency."**
   - It may equally be a cancellation backfill or waitlist mechanism that keeps clinician schedules full.
   - The data cannot tell these apart. It is worth asking Legion.

5. **"The chips are generic rather than about me."**
   - True, and the expertise chips also barely differ between providers. Most list ADHD, anxiety, depression, PTSD, trauma, and mood disorders. So even as generic information they don't help a patient choose.
   - Every provider seen was a psychiatric nurse practitioner. Whether patients on the "new diagnosis" path expect a psychiatrist is an open question.

6. **"The match page lags while it searches."**
   - The roughly 4-second checklist ("Checking Legion's 106+ providers...") looks like a staged animation. Whether it reflects real computation can't be told.
   - If it is staged, it adds waiting and signals a precision ("perfect match") that the results don't show.

7. **"The sign-in box lets people resume."**
   - Only after an account exists. The box appears from step 1, but accounts are created at step 5.
   - About three-quarters of sessions (76%) end before an account exists, so they have nothing to sign into. Whether their answers persist in the browser is unknown.
   - When people do resume, the session-based funnel counts them as lost ([funnel-analysis.md](funnel-analysis.md)).

8. **"The payment error was odd."**
   - It was not a payment failure. The card succeeded and the appointment was confirmed, then the page briefly rendered a "no reservation" state.
   - The risk is the doubt it creates about whether the booking happened, at the moment money changes hands.

9. **"Ten minutes of pre-visit work is too much."**
   - The minutes alone may be acceptable for a 60-minute psychiatric intake if they demonstrably make the visit better or shorter.
   - The stronger problems are:
     - asks that duplicate earlier ones
     - asks that could be retrieved
     - unclear requirements ("Must be completed 24 hours before" next to "Skip This Form")
     - that none of it is measured
   - The 10 minutes also included narration.

10. **"I like the testimonial split."**
    - On desktop, yes. On phones the testimonial sits above the first question and pushes the first answer below the fold (measured 820 px on an 812 px screen), on the step with the largest raw loss.
    - The data has no device split, so the size of the effect is unknown.

11. **"The fit check filters non-fits."**
    - It also contains the **crisis screen** ("Are you currently at risk of harming yourself or others?"). That makes it a safety routing point, not only a product-fit check.
    - What happens after a "Yes" was not observed.

12. **"The post-visit summary card is not clear."**
    - Before a first visit it is simply an empty state. The issue is more its prominence while readiness tasks are pending than its clarity.

## 3. Important things not in the voice notes

### Safety and eligibility

- **PHQ-9 item 9** ("Thoughts that you would be better off dead, or of hurting yourself...") is asked in the portal days before the visit. It looks like an ordinary question, with no safety message on screen, and the screener ends in an "All Forms Complete!" success box. What happens after a positive answer, and who reviews it and how fast, is unknown. By project rule, safety routing must be deterministic or human.
- **An age rule that appears late.** The fit check asks only "18 or older." The age notice on the "About yourself" form names an upper limit of 65 too, and it appears after a provider slot is already held. If the 65 limit is enforced, patients over 65 pass the fit check and are stopped only after reserving. Only the under-18 trigger was observed.
- **Answer polarity flips.** The "continue" answer flips between Yes and No across the six fit questions. On a form that includes a crisis question, that raises the risk of misclicks in both directions.

### Money and coverage

- **Coverage is not checked before commitment.** Insurance is a logo tap, and verification happens after booking and card entry. A cost estimate ("most patients pay $0-$40") is shown before any verification.
  - The brief says Legion already uses an eligibility-verification service, but it is not visible in the pre-booking flow.
- **Material terms appear late and dense.** The $250 late-cancellation and no-show fee sits on the payment page inside a dense block.
- **Confusing card statement.** The statement descriptor names a different company ("getHealthie.com"). A $1 authorization from an unfamiliar name can look like fraud on a bank statement.

### Time and reliability

- **No time zone on slot times.** The dashboard shows the appointment in the device's zone ("PDT" in the recording). Legion only serves Texas, and a patient on a phone set to another zone could miss the visit and owe the no-show fee. *Inferred* from the observed behavior.
- **Commitment steps run under a countdown.** The "About yourself" and payment steps sit under an approximately 10-minute hold (*inferred*). This is where 20% of reserved sessions end without an account.
- **Developer text reaches patients.** Raw validation text appeared on the release-of-information form ("Invalid enum value. Expected 'pcp' | ...").

### Records and data the patient types by hand

- **Records are requested by hand.** The release-of-information form has the patient type each prior provider's name, address, phone, and fax.
  - The brief says Legion already uses an HIE-connected records service. If it runs today, it isn't visible to the patient.
- **Several facts could plausibly be retrieved** rather than typed: identity, coverage, medications, history ([current-flow.md](current-flow.md), "Information that may be retrievable").

### Measurement

- **The funnel ends where the second half of the walkthrough begins.** Everything in the portal (screening, history, records, ID, readiness) and everything after it (reminders, the visit, no-shows) produces no events in the provided data.
- **The provided telemetry cannot measure the assignment's end state.** It cannot tell whether anyone completes a first visit, and session-based counting makes resumed journeys look like losses.

### Mobile and accessibility

- **The first answer is below the fold** on phones.
- **Long provider cards.** On mobile each provider card is taller than the screen, and the list holds 43 of them.
- **Contrast failures** on the needs cards, stepper labels (≈ gray-400), and gray text on the slate testimonial panel.

### Trust and tone

- **Over-claiming copy.**
  - "Great news! We've got you covered" appears before insurance is chosen.
  - "Perfect match" heads 43 options.
  - The loading checklist cites "106+ providers," and the result is 43 options with no indication of how they were narrowed.
- **Celebratory moments next to sensitive clinical content:** confetti and "Progress! 🎯" after the anxiety screener, and playful "You're on a roll! 🚀" style cards between history forms. Whether that tone suits mental-health screening is worth testing with patients.

## 4. Unresolved questions

Questions only Legion's systems or team can answer. The full list is in [current-flow.md](current-flow.md); these are the ones the comparison made sharper:

1. **Positive safety answers.** What happens after fit question 3 "Yes," a positive PHQ-9 item 9, or a severe score? Who is alerted, and how fast?
2. **Matching inputs.** Do conditions, need type, or payer actually change which providers appear, or only availability and licensure? What does "Highly recommended" mean? What does "Legion clinician" distinguish from?
3. **Provider types.** Is the all-nurse-practitioner lineup deliberate for every need type, including new diagnoses?
4. **The fit-check drop.** How much of it is screen-outs, and which question screens out the most?
5. **Follow-up.** Does anyone follow up with people who give contact details but don't book, or who book but don't finish readiness tasks?
6. **Readiness.** Which readiness tasks are truly required before the visit, and what happens if they are missing?
7. **Records retrieval.** Is the existing records integration used at all before the first visit?
8. **The earlier-appointment opt-in.** What does it trigger: a waitlist, automatic rescheduling, or outreach?
9. **Coverage problems.** For insured patients, what happens when verification after booking fails?
10. **First-visit completion.** What share of booked first visits actually happen today (completed, no-show, cancelled)? This is the missing number behind the whole assignment.

## 5. Candidate problem areas worth investigating later

These are problem statements, not solutions, ordered by my initial view of how much each matters to **first-visit completion**, weighing evidence strength and likely size. The ordering is open to challenge at Gate 1.

1. **The journey from booking to the completed visit is invisible.**
   - There is no person-level, cross-session record, no event after payment-page reach, and no completed-visit outcome. Until this exists, no redesign can show it improved the assignment's goal.
   - *Type of gap:* measurement, a prerequisite.

2. **Pre-visit readiness is long, duplicative, typed by hand, and unmeasured.**
   - About 75 to 80 inputs, facts asked repeatedly, records and history typed from memory, unclear requirements, and safety-relevant answers collected without visible review.
   - This sits between "booked" and "visited," the stretch the current funnel ignores. It is also where retrieved data could most plausibly replace typing.
   - *Type of loss:* likely undesirable, size unknown.

3. **Qualified patients stall at provider choice.**
   - 36.6% of sessions that reach the match page never select a provider. That is the largest measured loss among people who already passed screening.
   - It coincides with no match explanation, no way to express time or clinician preferences, a long list, mobile length, and missing time zones.
   - *Type of loss:* likely undesirable.

4. **The commitment cluster leaks under time pressure.**
   - Reservation, then contact details, consents, and payment, under a countdown: 20% of held slots end without an account.
   - Date-of-birth errors misfire the age check, any over-65 screen-outs happen here rather than up front, and a contradictory error appears after success.
   - *Type of loss:* mixed. Age screen-outs are desirable but misplaced; input errors are undesirable.

5. **Screening loss is large and cannot be interpreted.**
   - 34.8% of sessions are lost at the fit check, with no way to separate correct screen-outs from abandonment or failures. Phone layout and answer polarity add avoidable risk, and the screen-out and crisis paths are unobserved.
   - *Type of loss:* probably mostly desirable, unproven.

6. **Coverage and cost certainty arrive after commitment.**
   - Insurance is a logo tap; verification and real cost come after booking and card entry; self-pay patients see insurance messages; fees are buried.
   - *Type of loss:* risk of losses and no-shows after booking, plus trust damage. Size unknown.

7. **Trust, tone, and accessibility details.**
   - Overclaiming copy, celebration next to sensitive questions, raw errors, contrast failures, and missing time zones. Each is small, but together they shape trust in a mental-health product.
   - *Type of loss:* cross-cutting.

**What would most change this ordering:**

- the device split for the fit-check loss
- the screen-out share by question
- Legion's actual first-visit show rate
- whether readiness tasks are enforced
