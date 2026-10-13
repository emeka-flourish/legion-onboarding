# Decisions and tradeoffs

> **At a glance**
> - The decisions that shaped the rebuild, most important first. Each says what we chose, what we weighed it against, why, and what it costs.
> - The evidence behind them is in [discovery/diagnosis.md](../discovery/diagnosis.md); the approved goals, principles, and journey in [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md); the gate-by-gate record in [STATUS.md](../STATUS.md).

| # | Decision | The tradeoff we accepted |
|---|---|---|
| 1 | Measure people through the first visit, not sessions to the payment page | Server-side instrumentation and identity linkage cost more than adding page events |
| 2 | "Book fast, arrive ready": light taps before booking, the depth after | More happens after booking, so prep has to be easy and the visit stays booked regardless |
| 3 | Earn trust at matching with true, sourced reasons and preferences in the patient's words | Fewer impressive claims, and cards need tight hierarchy |
| 4 | A light account at "hold this time," and resume by phone | The rest of the profile arrives later: the email at booking, identity and address at the ID check |
| 5 | Know the cost before the card | When an insurer is slow, "book now, confirm later" relaxes certainty |
| 6 | Confirm, don't type: retrieve with consent, the patient confirms | Depends on vendor match rates, so empty results need a good path |
| 7 | A guided conversation instead of the "Current Issues" box; questionnaires word for word | The conversation is AI, so it needs bounds and evaluation |
| 8 | Safety decided by fixed rules and reviewed by people | A broad crisis rule raises some false alarms |
| 9 | AI bounded, confirmed by the patient, behind a router with a scripted fallback | Less open-ended AI, in exchange for reliability and safety |
| 10 | Vendors simulated; the AI and RxNorm live | The demo can't prove vendor match rates |
| 11 | Home follows the patient's state, and the first visit hands off into ongoing care | A little beyond onboarding's end, kept light |
| 12 | Scope held to the journey; production concerns documented, not built | Some reviewers may want depth in one area over breadth |

## 1. Measure people through the first visit

- **Chose:** one journey ID from the first page, linked to a person at account creation; outcomes recorded by the systems that own them (scheduling, eligibility, records, the visit); a headline of first-visit completion among people who pass screening, counted per person within 14 days.
- **Weighed against:** adding a payment-success event to today's PostHog funnel; client-side events through the visit.
- **Why:** the assignment ends at the first visit, and today's funnel counts browser sessions and stops at the payment page (1,403 of 5,898 sessions). About 76% of sessions end before an account exists, so they can't be tied to a person. Client-side events can't see outcomes that happen in other systems.
- **Cost:** backend work and identity linkage. The demo shows the design working end to end, including data-quality checks and the journey view.

## 2. Book fast, arrive ready

- **Chose:** before booking, quick taps that each personalize the next step; after booking, retrieval and a guided conversation replace the heavy intake.
- **Weighed against:** a conversation-first concierge before matching (the first proposal), and polishing today's flow in place.
- **Why:** the biggest losses among eligible people come before the account: 36.6% of match-page sessions never pick a provider, and one in five held slots never becomes an account. An empty text box before booking is the slowest input there is. After booking, motivation is higher, and the intake is what needs replacing.
- **Cost:** more work happens after booking. So prep retrieves before it asks, groups into four areas, and never cancels the visit; anything left undone, the provider covers in the visit.

## 3. Earn trust at matching

- **Chose:** a recommendation. One line says how many providers matched; then a "Best match" and two "Other strong matches," each card answering who the provider is, why they fit, and when they can be seen. "Why [name] fits you" lists fit only (the patient's conditions, then what they asked for, then the care they want), and every reason is true and names its source; availability shows as two or three times, never as a reason. A note in the patient's own words, such as "sees BIPOC patients," becomes preference chips that re-rank the list but never hide anyone. Details sit behind "View profile" and "How matching works." "See all" stays.
- **Weighed against:** a single "best match" (fewer choices, but less control); filters alone (more taps); AI-written rationale (persuasive, but not traceable).
- **Why:** today's page explains nothing and headlines "Perfect match found!" over 43 options. Trust comes from reasons a patient can check. AI only turns words into chips; rules rank.
- **Cost:** fewer impressive claims, and a ranking that is a stated assumption: openings in the chosen times, then condition fit, with each stated preference counting twice a matched condition. After Emeka's walkthrough, the controls moved above the results and the screen was cut to who, why, and when.

## 4. A light account at "hold this time," and resume by phone

- **Chose:** first name, last name, mobile number, and a texted code create the account when the patient holds a time. Before that, progress is saved in the browser for seven days with no health details on the resume screen. After it, the patient resumes on any device with the phone number.
- **Weighed against:** today's six-field form under a countdown; email sign-up; Verified's phone-linked prefill.
- **Why:** 20.4% of held slots are lost at today's form. Phone-linked prefill pulls in identity before the journey has earned trust, which Emeka was cautious about.
- **Then the rest of the profile (L21):** the email at booking, for the receipt and visit details; legal name, date of birth, sex at birth, and address from the ID check, where the patient can correct any of them. A new address just saves, since IDs often carry an old one. A changed legal name or date of birth, or an address outside Texas, goes to a person, and the visit stays booked.
- **Cost:** legal name, date of birth, and address arrive later, from the ID check, so the records search waits for it. That dependency is shown to the patient as part of one workflow. The email adds one typed field at booking.

## 5. Know the cost before the card

- **Chose:** the typical cost at the plan tap, the exact coverage check after the light account and before the card, member-ID entry when "look it up for me" finds nothing, and "book now, confirm later" with free cancellation when an insurer takes more than about 15 seconds.
- **Weighed against:** today's order, where coverage is verified only after booking and the card.
- **Why:** cost surprises after commitment cost trust (diagnosis problem 6).
- **Cost:** a slow insurer relaxes certainty. Home follows through when the answer arrives, including switching to self-pay if the plan turns out inactive.

## 6. Confirm, don't type

- **Chose:** the ID check first, then, with consent, records and medication history retrieved in the background. The patient reviews a health summary (visits, medications, conditions, allergies, other relevant history, and what needs confirming) and adds anything missing with one question.
- **Weighed against:** today's 25 or so history questions typed from memory; document upload; patient-mediated sources such as Flexpa.
- **Why:** about 75 to 80 inputs today, mostly typed. Maya's journey takes 16 typed inputs.
- **Cost:** match rates depend on the vendors. Jordan's search finds nothing, and the "anything else you take?" question catches the cash-paid stimulant fill history would miss.

## 7. A guided conversation, and questionnaires word for word

- **Chose:** four short questions in the patient's own words, at most one follow-up each from a fixed bank, notes the patient edits, and a summary they confirm. GAD-7 and PHQ-9 stay word for word in their own step.
- **Weighed against:** keeping the unexplained "Current Issues" box; a free chatbot.
- **Why:** the provider needs structure, and the patient shouldn't have to guess what to write. Validated instruments can't be paraphrased.
- **Cost:** it's AI, so it needs bounds and evaluation (decision 9). Family and social history aren't asked for separately: in production they would be drawn from the same conversation, configurable later (L22).

## 8. Safety decided by fixed rules, reviewed by people

- **Chose:** fixed rules for crisis language, PHQ-9 item 9, eligibility, and controlled substances. A crisis check runs before every model call. After booking, a flag goes to same-day human review and the visit stays booked; at the fit check, a crisis answer shows resources with no booking.
- **Weighed against:** a model classifying risk.
- **Why:** these calls must be predictable, testable, and explainable.
- **Cost:** the rule is broad on purpose, so some false alarms reach a person. That costs a review, never care.

## 9. AI bounded, confirmed, and routed

- **Chose:** three small jobs with fixed output shapes; labels written by code; a filter on the clinician summary; nothing saved until the patient confirms. A router tries OpenAI, then Anthropic, then Google, then a scripted answer; calls are capped per journey and per day.
- **Weighed against:** one provider; open-ended chat; an agent framework.
- **Why:** reliability and safety matter more than breadth here, and the router lets Legion compare providers on the same evaluation. See [AI.md](AI.md).
- **Cost:** less open-ended AI. In return the demo never breaks, and every AI result says whether it was live or scripted.

## 10. Vendors simulated; the AI and RxNorm live

- **Chose:** simulations of Sohar, Metriport, DoseSpot, Persona, scheduling, Stripe, texts, and the visit, each tagged "Simulated," answering asynchronously and sometimes empty, with field names close to each vendor's documented inputs. The AI providers and RxNorm are real calls.
- **Weighed against:** vendor sandboxes; Stripe test mode.
- **Why:** the sandboxes return canned test data (what the simulations show anyway) and need accounts and keys; real patient data can't be used. The AI is where the thesis lives, so it is real.
- **Cost:** the demo can't prove vendor match rates or latencies. See [SERVICES.md](SERVICES.md).

## 11. Home follows the patient's state; the visit hands off into ongoing care

- **Chose (after Emeka's walkthrough):** a calm "You're booked" moment; a home that leads with getting ready until the patient is ready, then with joining the visit; after the visit, a care handoff (the plan, the prescription and where it went, what to do next, when to call, the follow-up) and an ongoing-care home.
- **Weighed against:** a static home with a seven-row checklist, and an after-visit receipt.
- **Why:** a booking followed by seven tasks feels like a burden; grouped, state-aware prep feels like help. Patients often leave a visit unsure whether a prescription went through.
- **Cost:** a little beyond onboarding's end, kept to one dashboard.

## 12. What we deliberately didn't build

- **Not built:** real vendor integrations, payments, texts, or video; a native app; provider-side and care-team tools beyond "Mark reviewed"; Spanish screens; messaging.
- **Documented instead:** the production architecture, service choices, and AI evaluation plan, so the path from demo to production is clear.
- **Open with Legion, as stated assumptions:** the real matching logic, the hold length, the safety-review time, and the 65 upper age limit (TRD section 13). Family and social history are settled: in production they come from the guided conversation (L22).
