# Emeka's observations from the walkthrough

**Source:** `discovery/raw_discovery/voice-notes.md`, an automatic transcript of the voice notes Emeka recorded while walking through Legion's live onboarding on desktop on 2026-10-10. The mobile walkthrough has no narration.

**Purpose:** Preserve what Emeka noticed, in his terms, before any analysis. Nothing here has been checked against the product or the telemetry yet. Where a later document agrees, qualifies, or disagrees, it says so in [opportunities.md](opportunities.md). Quotes are verbatim from the transcript, including its transcription errors (for example, "gab form" for "GAD form").

## What Emeka did

Emeka walked the flow as a prospective patient in Texas. He answered the six fit questions, chose **Anxiety** and **Depression** to see a multi-condition case, chose **no insurance**, and chose **"I'm looking for a new diagnosis or medication"** because he expected it to be "a more complicated use case to support." He booked the first matched provider's 11 a.m. slot, filled in the "About yourself" form, added a card through Stripe Link, and landed on the patient portal. There he completed the GAD-7 and PHQ-9 check-in, then worked through part of the health history (mental health history, release of information, primary care provider). He stopped at the ID upload because he did not want to enter more personal details.

## Positive reactions

- **Fit screen.** "Pretty straightforward filters for people from Texas."
- **Testimonial panel.** "I like the testimonial, you know, split on the right on the desktop view."
- **Purpose of the fit questions.** They make sense "in terms of like initial screening to drop off ... folks that aren't a fit for the product."
- **Fit success state.** "I like the the success visual."
- **Conditions list.** "This makes sense having each of the mental conditions here."
- **Insurance as a screen.** "This is another key screening too. Makes sense."
- **Self-pay pricing.** Noted the self-pay rate of $250 for a new patient and $150 for follow-ups: "Okay, makes sense."
- **Needs step intent.** "Trying to catch the needs of the user." Even though he disliked its look, "it makes it clear how it helps you."
- **Earlier-appointment option.** "This is a okay feature to you know ask for an earlier appointment."
- **Payment.** Stripe Link: "pretty good integration here. Keep things easy for people."
- **Payment page.** "Has a clear what to expect."
- **Portal layout.** "All these are simple cards, simple sections."
- **Release of information / healthcare provider step.** "This is helpful. This is important because it ... does sort of decrease the amount of time that the ... patient spends with the provider in the first visit."
- **Treatment history radio questions.** "This is simple radial form."

## Friction

- **Needs step visuals.** "I don't really like the UI here, the different colors and the contrast. It's a little hard to read."
- **Match page, why this provider.** "It's not totally clear to me why this provider is the best fit for me. Why this is the perfect match for me."
- **Match page, reading bios.** "Now I just have to read along about ... section for [the provider], which I think is maybe not the most user friendly."
- **Match page, selecting.** "This is a little bit difficult to select. The only filtering mechanism that, frankly, I have here is just to use the available times."
- **Match page, loading more providers.** "This sort of progressive load in additional providers does not seem very efficient."
- **Match page, overload.** "There is potentially some like information overload for the user here."
- **Match page, times.** "It only has sort of the soonest available times for each provider. I think this could be better."
- **Match page, comparing.** If someone is unsure when they want to be seen, or likes a specific provider, "it's hard for them to like see why, and it's difficult for them to ... rank order like top three providers."
- **Date of birth.** "That was a little difficult to use, frankly." Later: "There is some friction here with just the actual selection of the date of birth."
- **Payment page text.** "A lot of text to read through, which I don't ... expect people to."
- **Mental health history.** "This is a little bit high friction."
- **Mental health history form.** "I don't like this form. This is a single text field to answer all these questions."
- **"What to expect" preview.** "Quite difficult to use, I think there's a lot of cognitive load for the user."
- **Treatment history navigation.** "I think this form could just be easier to navigate. This takes a lot of a lot of cognitive load to go through."
- **Healthcare provider entry.** "There are some frictions in navigating it here."
- **Overall pre-visit burden.** "I've spent at least almost 10 minutes post the initial onboarding to get through ... the medical history." Some actions must be completed 24 hours before the visit, "but frankly ... I think it's a little bit too high friction."

## Confusion

- **Insurance message for an uninsured patient.** The confirmation said "insurance verification is coming next after confirming the appointment. But I actually don't have any insurance."
- **Portal insurance status.** The home screen showed insurance as incomplete "because I didn't actually enter insurance."
- **Post-visit summary card.** "Post-visit summary is not clear."
- **Pre-appointment check-in.** "Could be better in this experience."

## Errors and edge states he hit

- **Age restriction notice.** After submitting the "About yourself" form: "oops, that's age restriction, because ... I already selected my year of birth, but for some reason it did not register." He had to fix the year to continue.
- **Payment.** "I complete my payments setup. And okay, there was an error there, which was odd, but moving forward."

## Trust, safety, and privacy reactions

- **Benzodiazepine note on the Anxiety card.** "Interesting that it specifically notes the medications that aren't prescribed. So that's communicating something to the ... user here."
- **Stopping before ID and vitals.** "I'm going to actually stop the ... onboarding process right now because I don't want to put in these additional personal details."
- **The payment error** read as "odd," which is a trust signal at the moment money is involved.

## Questions he raised

- **Sign in at the bottom.** "I assume this is for folks who have ... already done the onboarding ... previously in a previous session, so they can catch up to where they were in the form fill in."
- **Mobile date of birth.** "I'm curious what it looks like on mobile. I can check that out later."
- **Why this provider?** Why is the matched provider the right one for him, "based off of exactly what I provided to the system"?
- **The post-visit summary card.** What it means.

## Hypotheses he formed

- **Early screening.** The fit check exists to remove people who are not a fit for the product early.
- **Complex path.** The "new diagnosis or medication" path is probably the more complicated case to support.
- **Earlier appointments.** The "earlier appointment" option may mean Legion is "optimizing for urgency."
- **Records shorten the visit.** Collecting the patient's other healthcare providers shortens the first visit.
- **Unread payment text.** Most people will not read the long payment-page text.

## Ideas he had on the spot

1. **Make the needs step adaptive.** "It could leverage some of the information that the user has provided earlier ... the app already knows what your condition is ... and also has your goal."
2. **Show why a provider matches.** Use "clear, sort of glanceable chips" that explain, "based off of exactly what I provided to the system, ... why this clinician might be the right one for me."
3. **Tie expertise to the patient.** Instead of generic expertise chips, show the match to the patient's condition and goal on the provider card: "why not actually like have that shown for the provider directly?"
4. **Filter by preferred times.** "Having some ability to select my preferred times, and then that actually filtered ... the list of providers available to me."
5. **Replace "show more."** Find something better than loading providers three at a time.
6. **Shortlist or rank providers.** Let people rank-order or compare their top three.
7. **Compress the intake.** "Overall, I'd like to compress this intake form significantly. I think it needs to be compressed."
8. **Ease navigation.** Make the intake forms easier to navigate and lower their cognitive load.

## His stated next step

"Synthesize these my insights into key takeaways, so we can prioritize the redesign."
