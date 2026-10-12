# Entry Screen and Provider Matching Feedback

## 1. Simplify the intro screen

The intro currently includes too much explanatory/demo detail and feels more like documentation than a consumer onboarding entry point.

The primary job of the screen should be to help the user quickly understand:
- what Legion does,
- what happens next,
- why they should trust the experience,
- and how little effort is required to get started.

Reduce the amount of instructional/detail copy.

Suggested hierarchy:

### Headline
See a Texas psychiatric provider by video

### Short supporting copy
Answer a few quick questions, see providers who fit, and hold a time. No account needed until you choose an appointment.

### Primary CTA
Get started

### Trust / social proof
Add a lightweight testimonial or trust signal, for example:

> “I got matched quickly and felt like my provider already understood what I needed.”

Keep demo-specific details available but visually secondary.

Move detailed explanations such as:
- what is simulated,
- analytics behavior,
- technical demo notes,

behind a small “Demo info” / “How this demo works” disclosure accessible via tap / click

The patient-facing product should still feel like a real experience first.

---

## 2. Make natural-language provider preferences a first-class matching control

The natural-language preference field is one of the strongest AI-native parts of the provider-matching experience, but it is currently buried below the provider results.

Move it closer to the top of the provider-matching page.

Group the matching controls more intentionally:

### When works for you? - Make this more space efficient
- Weekday mornings
- Weekday afternoons
- Weekday evenings
- Weekends

### Anything else that matters to you? - Make text field expand on tap / entry
Natural-language input such as:

> “I’d prefer a woman provider who speaks Spanish and has experience with work stress.”

This should feel like one coherent matching interface rather than two unrelated filters.

---

## 3. Let the preference input collapse after processing

The natural-language input should be prominent when the user is actively setting preferences, but it should not permanently push provider results far down the page.

After AI processing, collapse the input into a compact state such as:

**Your preferences**
- Woman provider
- Speaks Spanish
- Work-stress experience

[Edit preferences]

Tapping “Edit preferences” can expand the full natural-language input again.

This preserves the AI-native capability without sacrificing vertical space.

---

## 4. Keep matching controls above the results they affect

The current state places updated/newly matched providers above the “Anything else that matters to you” control.

That creates a confusing information hierarchy.

All matching controls should remain above the provider results.

The structure should be:

1. availability preferences
2. natural-language/provider preferences
3. concise explanation of how matches are ranked
4. provider results

When preferences change, update/re-rank the results below rather than inserting results above the control that caused the change.

---

## 5. Make “why this provider fits you” more prominent

Provider cards currently contain useful information, but the hierarchy is too flat.

The most important information should be the personalized match rationale.

For each provider, prominently show something like:

### Why this provider fits
- Focuses on anxiety
- Matches your preference for a woman provider
- Speaks Spanish
- In network with your insurance
- Has evening availability

Then show secondary details:
- credentials
- years in practice
- languages
- number of openings
- upcoming appointment times

The user should be able to understand in a few seconds why each provider is being recommended.

Do not increase the overall card height significantly. Prefer clearer hierarchy over more content.

---

## 6. Improve the overall provider-card information hierarchy

Provider cards should prioritize:

1. provider name + credentials
2. personalized match reason
3. specialty / relevant experience
4. next-best appointment times
5. secondary trust details such as years in practice / board information

Operational or simulated-source labels should remain visually secondary.

The experience should answer:

> “Why should I choose this provider?”

before:

> “What metadata do we have about this provider?”

---

## 7. Preserve choice while still recommending

Continue showing a small set of ranked providers rather than forcing a single recommendation.

It is useful to:
- rank the best matches,
- explain why,
- show immediate availability,
- and allow the patient to see all providers if desired.

The goal is to reduce decision burden without removing user control.

---

## 8. Collect first and last name when holding the appointment

On the “We’ll hold this time for you” step, collect:

- First name
- Last name
- Mobile number

First name only feels insufficient for a reservation/account-creation step.

Keep the form otherwise minimal.

Do not add email, address, date of birth, or other fields at this stage unless they are needed for the immediate reservation.

The principle should remain:

> ask only for what is required to hold the appointment and let the patient continue later.