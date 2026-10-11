# QA log

This file records the checks that show the prototype works. The live AI evaluation below is written by
`npm run eval:ai`. From milestone 4 on, the visual checklist for every stage, demo patient, and viewport is added
here too (TRD sections 10.3 and 10.4, TAC-33).

<!-- ai-eval:start -->
## Live AI evaluation

Last run: 2026-10-11 06:10 UTC, with `npm run eval:ai`.

Inputs, all invented demo-patient data: the three demo patients' four conversation answers (12 extractions), three
preference notes, the three demo patients' confirmed items for the clinician summary, and three crisis inputs.
Each provider runs on its own, with no fallback to another provider, so any failure appears as a recorded fallback
to the scripted path. Latency is measured with four requests in flight at a time.

| Provider | Models (quality / fast) | Live and valid | Fallbacks to scripted | Follow-ups from the bank | Crisis inputs that reached a model | Live summaries passing the filter | Median latency |
|---|---|---|---|---|---|---|---|
| OpenAI | `gpt-6.1-sol` / `gpt-6-luna` | 18 of 18 | none | 12 of 12 | 0 of 3 | 3 of 3 | 4.0 s |
| Anthropic | `claude-opus-5-5` / `claude-haiku-5-5` | 18 of 18 | none | 12 of 12 | 0 of 3 | 3 of 3 | 2.8 s |
| Google | `gemini-3.8-flash` / `gemini-3.5-flash-lite` | 17 of 18 | intakeExtract: google: timeout | 12 of 12 | 0 of 3 | 3 of 3 | 2.1 s |

**Median latency by task (live calls only)**

| Provider | Preference chips | Conversation extraction | Clinician summary |
|---|---|---|---|
| OpenAI | 3.6 s | 4.4 s | 3.6 s |
| Anthropic | 1.9 s | 2.8 s | 4.4 s |
| Google | 1.0 s | 2.1 s | 3.1 s |

**Sample outputs, for judging quality by eye**

- OpenAI, Jordan's medication answer extracted as: "Extended-release amphetamine salts, 20 mg every morning"
- OpenAI, Maya's clinician summary: Maya, 29, selected anxiety and depression at booking and is seeking a new evaluation. They report feeling anxious most days, lying awake worrying, and feeling exhausted at work, with onset around March and a duration of about six months. They started a new job and report a bigger team and deadlines in the last two months. They cannot fall asleep until after 2 a.m. two or three nights a week. They have tried a meditation app and hydroxyzine as needed from primary care; hydroxyzine causes next-morning grogginess. Their goals are to understand what is going on, discuss whether a daily medication could help, and find a therapist.
- Anthropic, Jordan's medication answer extracted as: "Extended-release amphetamine salts, 20 mg every morning"
- Anthropic, Maya's clinician summary: Maya, 29, is seeking a new evaluation and selected anxiety and depression at booking. They report feeling anxious most days, lying awake worrying, and being unable to fall asleep until after 2 a.m. two or three nights a week. They also report feeling exhausted at work. Maya started a new job, with onset around March and a duration of about six months; in the last two months they have taken on a bigger team and deadlines. They have tried hydroxyzine as needed, prescribed by primary care, which causes next-morning grogginess, and a meditation app. Their goals for care are to understand what's going on, discuss whether a daily medication could help, and find a therapist.
- Google, Jordan's medication answer extracted as: "Extended-release amphetamine salts, 20 mg every morning"
- Google, Maya's clinician summary: Maya is a 29-year-old presenting for an initial evaluation for anxiety and depression. They report feeling anxious most days, lying awake worrying, and feeling exhausted at work, with symptoms beginning around March and lasting about six months. Maya notes these difficulties began after starting a new job, with added triggers from a bigger team and deadlines over the last two months. Sleep issues include being unable to fall asleep until after 2 a.m. two or three nights a week. Prior interventions include a meditation app and hydroxyzine taken as needed from primary care, which causes next-morning grogginess. Maya's goals for care are to understand what is going on, discuss whether a daily medication could help, and find a therapist.
<!-- ai-eval:end -->

## Visual checklist, milestone 4: "Book fast" (stages 1 to 8)

Reviewed by eye on 2026-10-10 from the end-to-end screenshots in `test-results/screens/`, at phone size (390 × 844, the
iPhone 13 profile) and desktop size (1440 × 900). The same run checks some things automatically: zero serious or critical
axe violations on every stage screen, no horizontal scroll at phone width on the providers screen, and no insurance wording
for Jordan after he chooses self-pay. All 20 end-to-end tests pass at both sizes.

| Screen | Phone | Desktop | Notes |
|---|---|---|---|
| Welcome | Pass | Pass | One primary action; "Continue with your phone" for returning patients |
| Welcome back | Pass | Pass | Names the step only ("choosing the kind of help"), never a health detail |
| Fit check | Pass | Pass | The question and both answers sit above the fold on a phone (V2). The continuing answer is always first. |
| Needs | Pass | Pass | Expectations appear for each chosen condition. Finishing the fit check shows one calm line, no celebration (V11). |
| Kind of help | Pass | Pass | The options adapt to the chosen conditions |
| How you'll pay | Pass | Pass | The typical cost appears with the plan; self-pay shows $250 and $150 |
| Providers (Maya, Jordan, Sam) | Pass | Pass | "Why these three," different reasons on each card with sources, and a compact time grid (V7). Every time shows its zone: CDT, and MDT for Sam (V4). Jordan's "no openings" notice offers the nearest times and an earlier-opening alert. |
| Hold this time | Pass | Pass | The demo number and demo code are clearly marked as demo |
| Coverage: member ID, lookup consent, waiting, verified, not found, inactive | Pass | Pass | The lookup says what is shared, and with whom, before anything runs. Date problems show next to the field in plain words. |
| Book | Pass | Pass | Review card with the time and zone, cost, "In network with … · verified," the one-line cancellation rule, three consents, and the test card |
| Booked (home placeholder until milestone 5) | Pass | Pass | A calm confirmation |
| Crisis | Pass | Pass | 988 and 911 above the fold on a phone, and no booking button (V8) |
| Screen-out | Pass | Pass | Resources for the reason, and "Change my answer" for a mis-tap |
| Resume by phone | Pass | Pass | The same answer for unknown numbers; nothing about care until the code checks out |

| Check | Result |
|---|---|
| V1. No horizontal scroll at phone width, nothing clipped or overlapping | Pass |
| V2. One clear primary action; fit answers visible without scrolling on a phone | Pass |
| V3. Readable text and buttons, contrast matching axe | Pass, after the fix below |
| V4. Every time shows its zone; Sam's in Mountain Time | Pass |
| V5. "Simulated," "AI," and source tags present without crowding | Pass |
| V6. No over-claiming, no raw errors, no insurance wording for Jordan | Pass |
| V7. Different reasons per card, a "Why these three" line, a readable time grid | Pass, after the fix below |
| V11. No celebration around screening; calm confirmations at milestones | Pass |
| V12. Two columns on desktop with context on the right; on a phone, only the title sits above the main content | Pass |

**Fixed during the review:**
1. Provider initials (brand blue on light blue) measured just under 4.5:1 contrast. They now use the darker brand blue.
2. Each day's times took a full row on a phone, making cards very tall. Times are now a two-line grid: two columns on a phone, three on desktop.
3. Inputs showed a double focus ring, because the global focus outline sat outside Tailwind's layers.
4. "About adhd care" lost its capitals; it now reads "About ADHD care."
5. The inactive-plan button wrapped onto two lines on a phone. The prices moved into the explanation.
6. Screens without a context panel left an empty right column on desktop. They now center.
7. The Next.js development badge covered content in screenshots. It is now turned off; errors still show.

## Visual checklist, milestone 5: "Arrive ready" (stages 9 to 11)

Reviewed by eye on 2026-10-11 from the end-to-end screenshots, at phone and desktop sizes, for Maya, Jordan, Sam, and a
journey without a demo patient. The same run checks automatically: zero serious or critical axe violations on every new
screen, the ID check and the records search waiting for an explicit tap, the 988 line staying in view while scrolling the
conversation and the check-in, and the crisis panel appearing at once for crisis language. All 30 end-to-end runs pass
(15 tests at both sizes).

| Screen | Phone | Desktop | Notes |
|---|---|---|---|
| Home: visit card, trust question, checklist, texts | Pass | Pass | Required and Optional labels, the deadline, locked rows explained ("Opens after your ID check"), simulated texts tagged |
| Home, ready | Pass | Pass | A calm "You're ready for your visit"; every item marked Done |
| Coverage confirmed after booking | Pass | Pass | Sam with a slow insurer: "still confirming," then "Your Aetna plan isn't active" with "Keep my visit with self-pay," which switches the cost |
| ID check | Pass | Pass | Purpose first, nothing runs until "Start ID check," then the details with their source |
| Records consent | Pass | Pass | Why, where we look, what we get, and what we share, before "Allow the search" or "Not now" |
| Confirm medications and records | Pass | Pass | Each found item with its source and a checkbox; "Anything else you take?" caught Jordan's cash-paid stimulant |
| Guided conversation | Pass | Pass | The AI disclosure opens it; one follow-up at most; "Here's what I noted" with an AI tag; every note editable |
| Clinician summary | Pass | Pass | AI-tagged, confirmed by the patient before saving |
| Check-in (GAD-7, PHQ-9) | Pass | Pass | Word for word, one question per screen, 988 in view; Sam's item 9 shows the safety panel at once and the visit stays booked |
| Pharmacy | Pass | Pass | Maya's prefilled from her fill history, with the source |
| Health basics (essential history) | Pass | Pass | Five short forms; Maya's penicillin allergy to confirm; Jordan's "controlled substances now" prefilled Yes |
| Visit: waiting room and "What your provider has" | Pass | Pass | Summary, scores with bands, safety flags with review status, medications and records with sources; Jordan's monitoring check pending |
| Visit: video | Pass | Pass | Initials, a timer, "Simulated video," End visit |
| After the visit | Pass | Pass | The summary marked as reviewed by the clinician (simulated), the prescription to the chosen pharmacy (none for Sam), one-tap follow-up times |

| Check | Result |
|---|---|
| V1. No horizontal scroll or clipping at phone width | Pass |
| V2. One clear primary action per screen | Pass |
| V3. Contrast matching axe | Pass, after the fix below |
| V4. Every time shows its zone (follow-ups switch to CST after November 1) | Pass |
| V5. AI, Simulated, and source tags present without crowding | Pass |
| V6. No over-claiming copy, no raw errors | Pass |
| V8. The safety panel is unmistakable, with 988 and 911 above the fold and no booking button | Pass |
| V9. Recognizably Legion: tokens, Inter, warm tone | Pass |
| V10. Waiting states ("Searching…", "Noting this down") never leave a blank screen | Pass |
| V11. No celebration around questionnaires; calm confirmations at booked, ready, and visit complete | Pass |
| V12. Two columns on desktop; context below the action on a phone | Pass |

**Fixed during the review:**
1. Locked checklist rows were faded with opacity, which dropped their text below 4.5:1 contrast. They now use a muted background with full-strength text.
2. Typing the next answer while the previous one was still being noted could be wiped when the reply arrived. The answer box is now read-only during that moment.
3. The trust question's word labels wrapped in narrow buttons on a phone. It is now a 1 to 5 scale with words at each end.
4. The visit date wrapped awkwardly beside its icon, and the pharmacy source repeated "fill history." Both are tidied.

## Visual checklist, milestone 6: the journey view (`/journey`)

Reviewed by eye on 2026-10-11 from the end-to-end screenshots, at desktop and phone sizes. The same run checks
automatically: all five panels render, the timeline shows the link point and system-of-record sources, the headline metric
comes first, data quality reports zero validation failures, "Mark reviewed" records `safety_flag_reviewed`, axe finds no
serious or critical violations, and the page has no horizontal scroll on a phone.

| Panel | Desktop | Phone | Notes |
|---|---|---|---|
| 1. This journey | Pass | Pass | Every event in order with its plain name, code, source badge, and properties (codes only); the link point; sessions; the next expected events |
| 2. Funnel, counted per person | Pass | Pass | Live demo journeys beside an invented cohort labeled as invented; headline first, then six stage rates, four guardrails, and the trust median |
| 3. Today versus the rebuild | Pass | Pass | Today's session funnel stops at "Payment page reached"; the rebuild counts people through the first visit and the follow-up |
| 4. Data quality | Pass | Pass | Validation failures, out-of-order events, duplicates, linkage gaps, and complete chains, each green at zero issues |
| 5. People in progress | Pass | Pass | Short journey ID, stage, readiness out of six, open flags with "Mark reviewed," and the next expected events; the table scrolls inside its panel on a phone |

**Fixed during the review:**
1. The safety-flag guardrail counted flags but said "people." It now says "flags."
2. Panel headings read as "4.Data quality" to screen readers. They now include the space.
3. The rebuild column said live counts were "in brackets"; they're in parentheses.

<!-- rxnorm-eval:start -->
## Live RxNorm check

Last run: 2026-10-11 08:17 UTC, with `npm run eval:ai`. Each name is cleaned
of dose, release form, and timing, then matched with RxNav's approximate-term search. Matches resolve to the
ingredient or brand level, so a fuzzy match can never put a wrong strength in front of a clinician.

| Mentioned as | Looked up as | RxNorm match | RxCUI | Time |
|---|---|---|---|---|
| Hydroxyzine | `hydroxyzine` | hydroxyzine | 5553 (ingredient) | 703 ms |
| Amphetamine salts XR 20 mg each morning | `amphetamine salts` | amphetamine aspartate / amphetamine sulfate / dextroamphetamine saccharate / dextroamphetamine sulfate | 822929 (ingredients) | 498 ms |
| Sertraline 50 mg | `sertraline` | sertraline | 36437 (ingredient) | 251 ms |
| Lexapro | `lexapro` | Lexapro (brand of escitalopram) | 352741 (brand name) | 393 ms |
| Adderall | `adderall` | Adderall (brand of amphetamine aspartate / amphetamine sulfate / dextroamphetamine saccharate / dextroamphetamine sulfate) | 84815 (brand name) | 358 ms |
| Wellbutrin XL 150 mg | `wellbutrin` | Wellbutrin (brand of bupropion) | 42568 (brand name) | 357 ms |
| notarealdrug | `notarealdrug` | no match | none | 120 ms |
<!-- rxnorm-eval:end -->

## Visual check, milestone 9: the RxNorm stretch

Reviewed by eye on 2026-10-11 from the live test's screenshots (`npm run e2e:live`, desktop), where a live model extracted
Maya's medication and live RxNorm matched it.

| Screen | Result | Notes |
|---|---|---|
| Guided conversation, review step | Pass | Under "Medications mentioned," "Hydroxyzine as needed" shows "Recognized as hydroxyzine" with a green "Live · RxNorm" tag, next to the "AI · live (OpenAI)" tag on the notes |
| Provider's panel at the visit | Pass | The conversation's medication is listed as mentioned by the patient, with "RxNorm: hydroxyzine · RxCUI 5553" and the live tag |
| Any screen with RxNorm unreachable | Pass | The whole deterministic suite runs with RxNorm unreachable; nothing extra shows and nothing waits |

**Fixed during the review:**
1. When two answers said the same thing, the review list showed the note twice. The review step now merges identical notes.
2. In the provider's panel, source tags in the records list ran on after the text. Every source tag there now sits on its own line.
