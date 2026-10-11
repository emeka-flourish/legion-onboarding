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
