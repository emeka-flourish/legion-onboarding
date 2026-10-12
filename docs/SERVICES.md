# Services: what each one does, why, and what we left out

> **At a glance**
> - Every outside service the journey touches, in production and in this demo, with why it was chosen, where it falls short, and what we considered instead.
> - **Two services are live in the demo:** the AI model providers (when a key is set) and the National Library of Medicine's RxNorm drug vocabulary. **Everything else is simulated** and tagged "Simulated" on screen.
> - The simulations behave like the real services: they answer asynchronously, can come back empty, and use field names close to each vendor's documented inputs.
> - The vendor research behind these choices, with sources, is in [INTEGRATIONS.md](INTEGRATIONS.md). How the services fit together is in [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. The map

| Job in the journey | Production service | In this demo | Status |
|---|---|---|---|
| Plan lookup, eligibility, exact cost, provider network status | **Sohar Health** (Legion's current vendor) | Simulated, asynchronous, with a different answer for each demo patient | Simulated |
| Records: visits, conditions, allergies, labs | **Metriport** (Legion's current vendor) | Simulated, arriving in the background | Simulated |
| Medication history, preferred pharmacy, e-prescribing | **DoseSpot** (Legion's existing integration; Surescripts history inside it) | Simulated | Simulated |
| Prescription-monitoring check before controlled substances | **Bamboo Health** (state PDMP data), through DoseSpot, used by the clinician | Shown to the clinician as a pending step | Simulated |
| Identity check, which supplies the details record matching needs | **Persona** | Simulated | Simulated |
| Drug names the patient mentions | **NLM RxNorm API** (RxNav) | Called live | **Live** |
| The guided conversation, preference chips, clinician summary | **OpenAI** by default; **Anthropic** and **Google** switchable | Called live when a key is set; scripted otherwise | **Live** |
| Provider facts behind "why this provider" | Legion's credentialing records, the NPPES NPI Registry, Texas licensing boards | Invented profiles, each fact tagged with its source | Simulated |
| Holding a time, booking, follow-ups | Legion's scheduling system | Simulated calendars generated relative to today | Simulated |
| Card on file | **Stripe** (Legion uses it today) | Simulated card step, never charged | Simulated |
| Codes and reminders by text | Legion's SMS provider | Simulated; the code shows on screen | Simulated |
| The video visit | Legion's visit platform | A simulated visit room | Simulated |
| Analytics | Server-side events into **PostHog** and the warehouse | An event log and the `/journey` view | Built in |
| Storage | Legion's database | **Upstash Redis** on Vercel; memory locally | Demo only |
| Hosting | Legion's hosting, under a BAA | **Vercel** | Demo only |

## 2. Healthcare data and workflow services

### Sohar Health: coverage, cost, and network status

- **What it does here.** It checks the patient's plan before the card (eligibility and benefits, giving the exact copay), finds a plan from name and date of birth when the patient doesn't have their card ("Look it up for me"), and confirms each shown provider is in network.
- **Why.** Legion already uses it, and one API covers discovery, verification, and per-provider network status. That makes "certainty before commitment" (goal 2) possible without a new vendor.
- **Limitations and how the journey handles them.**
  - It answers asynchronously, by polling or webhook. The journey shows a named waiting state and never a blank screen.
  - Sohar says discovery finds coverage up to about 60% of the time, so "Look it up for me" always falls back to entering the member ID.
  - A plan can be slow to answer. After about 15 seconds the patient can book with the typical cost shown, and coverage is confirmed before the visit with free cancellation if it falls through (approved at Gate 6).
- **Alternatives.** Verified's 1-Click Health also finds insurance from name and birthday, but it overlaps with Sohar and comes bundled with phone-linked identity prefill (see "Not used"). Patient-mediated sources such as Flexpa need the patient to sign in to their health plan, which is too much effort before booking.

### Metriport: records from health information exchanges

- **What it does here.** With the patient's consent, after the ID check, it looks for past visits, conditions, allergies, labs, and hospital stays, so the patient confirms a health summary instead of typing a history.
- **Why.** Legion already uses it, and one FHIR API reaches the national exchange networks.
- **Limitations.**
  - Matching depends on demographics: legal name, date of birth, sex at birth, and address. That is why the ID check comes first: it supplies them without typing.
  - Results arrive over minutes, source by source, by webhook. The patient keeps going ("Continue with other steps while we search"), and home says when the records are ready.
  - It can find nothing. Jordan's search comes back empty, and the medications question still catches what he takes.
  - Production needs a covered entity, an NPI, and a treatment purpose.
- **Alternatives.** Particle Health, Health Gorilla (a TEFCA QHIN, with lab data), and Zus reach similar networks. For onboarding they would duplicate Metriport rather than add a step.

### DoseSpot, with Surescripts and Bamboo Health inside it: medications and prescribing

- **What it does here.** Before the visit: medication fill history to confirm, and the pharmacy prefilled from that history. After the visit: the e-prescription to the chosen pharmacy, including controlled substances (EPCS). For the clinician: the state prescription-monitoring record through Bamboo Health.
- **Why.** It is Legion's existing integration, so medication history, pharmacy choice, and prescribing come from one place the clinicians already use.
- **Limitations.**
  - Fill history covers insurance-billed fills only, so cash fills, samples, and over-the-counter medicines are missing. The journey always asks one question, "Anything else you take?", which catches Jordan's cash-paid stimulant.
  - Texas requires a prescription-monitoring check before prescribing opioids, benzodiazepines, barbiturates, or carisoprodol. The prototype also shows it before stimulants, matching the "review of your history first" message ADHD patients see. The clinician's panel shows the check as a pending step; it is never automated away.
  - No self-serve sandbox was found; access goes through DoseSpot's partner team.
- **Alternatives.** Surescripts or DrFirst directly would duplicate what Legion already reaches through DoseSpot.

### Persona: the identity check

- **What it does here.** The first visit-prep step. A photo of a driver's license or state ID returns legal name, date of birth, sex at birth, and address. These feed record matching, replace the self-reported age from the fit check, and satisfy pharmacies' ID needs for some prescriptions.
- **Why.** It turns the most error-prone typing (legal name, date of birth, address) into one capture, and the verified details are what the records search needs.
- **Limitations.** It adds a camera step. It sits after booking, so it doesn't cost the trust that booking first was meant to build, and a date-of-birth mismatch goes to a person to review, never to an automatic eligibility decision.
- **Alternatives.** Verified can prefill identity from a phone number (see "Not used"). Typing demographics by hand is what today's flow does.

### NLM RxNorm: the one live healthcare data service in the demo

- **What it does here.** When a patient mentions a medication in the guided conversation ("hydroxyzine as needed"), the name is matched live to RxNorm and shown as "Recognized as hydroxyzine," and the provider's panel lists the RxNorm concept with its ID.
- **Why.** It is free, public, needs no key, and is the standard drug vocabulary. A real live lookup next to the simulations shows how a vendor call behaves.
- **Limitations and guardrails.**
  - A fuzzy match on a full phrase such as "Amphetamine salts XR 20 mg" can land on a different strength. So names are cleaned of dose, release form, and timing, and matches resolve to the ingredient or brand level only. The patient's own words keep the dose.
  - Any failure returns no match, and the conversation carries on. The automated suites run with RxNorm unreachable on purpose to prove it.
  - It is called only from the visit-prep stage, never with a crisis phrase, and answers are cached.
- **Alternatives.** DoseSpot's own drug database would do the same in production, since prescribing already lives there.

### Provider facts behind "why this provider"

- **Production.** Identity and licensure from the NPPES NPI Registry and the Texas licensing boards; plan participation from payer directories and Sohar's network status; focus, languages, and availability from Legion's credentialing and scheduling records.
- **Demo.** Twenty invented providers with illustrated placeholder portraits (drawn in code, never photos) and tags for focus areas and communities, such as work stress, BIPOC patients, LGBTQ+, students, and veterans, so a patient's note can match them. Every reason on a card names its source, and every source is marked simulated.
- **Why it matters.** Diagnosis problem 2: 36.6% of match-page sessions never pick a provider, and today's page shows no reasons. A reason the patient can't trust doesn't help, so every reason must be true and traceable.

## 3. Platform services

### The AI model providers: OpenAI, Anthropic, and Google, behind one router

- **What they do here.** Three bounded language tasks: turning the optional note into preference chips, turning conversation answers into short notes the patient confirms, and drafting the clinician summary the patient approves. The full design and the evaluation plan are in [AI.md](AI.md).
- **Why a router of three.**
  - OpenAI goes first (Gate 7), and Anthropic and Google take over on a missing key, a timeout, a provider error, or output that fails the schema. A scripted fallback answers when none is available, so the demo never breaks.
  - Switching provider or model is one setting in [`src/config/ai.config.ts`](../src/config/ai.config.ts), which lets Legion compare providers on the same evaluation.
- **Limitations.** Live output varies between runs, within fixed bounds. Production needs a BAA and zero data retention with whichever provider is used; check each provider's current terms.
- **Alternatives considered.**
  - **One provider only.** Simpler, but a single outage would stop the conversation, and there would be no like-for-like comparison.
  - **Vercel AI Gateway.** One key, built-in fallbacks, and spend tracking: a reasonable production option. The direct router was chosen to keep the crisis check, the per-journey and daily caps, and the scripted fallback in our own code, and to make each provider's data terms an explicit choice.
  - **Agent frameworks and retrieval (RAG).** Not needed. The tasks are three short, structured calls with fixed outputs, and there is nothing to retrieve.

### Scheduling, payment, texts, and the video visit

- **Scheduling.** Legion's system of record for holds, bookings, and follow-ups (today's card statement names Healthie, which suggests it is part of Legion's practice stack). A hold lasts 10 minutes and renews while the patient is active (an assumption, TRD section 13). In the demo, calendars are generated relative to today, so dates never go stale, and "a time taken a moment earlier" offers the next times instead of an error.
- **Stripe.** Legion uses it today. The card is saved at booking. Stripe test mode was considered for the demo, but it needs test keys and adds little to the thesis.
- **Texts.** The six-digit code that creates the account and resumes on any device, plus the confirmation and reminders. In the demo the code shows on screen, and five wrong codes lock resuming for that number for ten minutes.
- **Video.** Legion's visit platform. Joining, starting, and completing the visit are system-of-record events, which is what lets the funnel end at "first visit completed" rather than "payment page reached."

### Analytics: PostHog and the warehouse

- **Production.** Every event is recorded server-side under one journey ID, linked to a person at account creation. Outcomes come from systems of record (scheduling, eligibility, records, the visit platform), not from page code. Events go to PostHog and the warehouse with codes and timings only, never answers.
- **Demo.** An event log in the store and the `/journey` view: this journey's timeline, the per-person funnel for live demo journeys and an invented 400-person cohort, today versus the rebuild, data-quality checks, and people in progress.
- **Why.** Diagnosis problem 1, Emeka's first priority: today's telemetry counts browser sessions and stops at the payment page. The rebuild counts people through the first visit. The design is in [ARCHITECTURE.md](ARCHITECTURE.md), section 1.6.
- **Alternatives.** Client-side page analytics alone (today's approach) can't see outcomes that happen in other systems. Segment or Amplitude would work as well as PostHog, but PostHog is already in place.

### Storage and hosting for the demo: Upstash Redis on Vercel

- **What it does here.** Holds each journey and its events for seven days, so the hosted demo works for anyone, across devices, with resume by phone.
- **Why.** A small key-value store is all a demo journey needs, and Vercel's marketplace provisions it with the environment variables set. Locally and in tests, an in-memory store with the same contract replaces it.
- **Limitations.** Not a system of record. It has no relational queries, and the cohort view reads the last week of demo journeys only.
- **Alternatives.** Postgres (for example, Neon) would be the choice for a real product, and production would use Legion's own database. For a demo, it adds schema and migrations without changing what a reviewer sees.

## 4. Considered and not used

| Option | What it would add | Why not |
|---|---|---|
| **Verified** (1-Click Signup and 1-Click Health) | Name, birthday, address, sex, and even SSN prefilled from a phone number; insurance found from name and birthday | Phone-linked prefill before the journey has earned trust is exactly what Emeka was cautious about at Gate 1, and its insurance lookup overlaps with Sohar. It could be tested later as an opt-in at the ID step. |
| **Particle Health, Health Gorilla, Zus** | Other routes to exchange records | They duplicate Metriport for onboarding |
| **Flexpa, b.well** | The patient's own plan data, including claims | A production fallback when the networks find nothing; too much effort before booking, since the patient signs in to their plan |
| **Surescripts or DrFirst directly** | Medication history and benefit data | Legion already reaches Surescripts through DoseSpot |
| **Wearables** | Sleep and activity data | A web app can't read Apple Health without a native app, it adds a consent, and it isn't needed to complete a first visit. Better suited to care between visits. |
| **Live vendor sandboxes** (Sohar, Metriport, Persona) | Real API calls | The sandboxes return canned test data, which is what the simulations show, and they need accounts and keys |
| **Stripe test mode** | A real payment form | Needs test keys and adds little to the thesis |
| **Vercel AI Gateway** | One key and managed fallbacks | Kept the safety check, caps, and fallback in our own router; a reasonable production option |
| **A relational database for the demo** | Queries and migrations | A key-value store with a seven-day expiry covers a demo; production uses Legion's database |
