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
