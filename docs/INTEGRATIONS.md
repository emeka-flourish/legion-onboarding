# Data sources and integrations

**Status.** Research for Gates 6 and 7, done on 2026-10-10. For the service-by-service view (why each one, its limits, and the alternatives not used), see [SERVICES.md](SERVICES.md); this document keeps the research and its sources. The facts come from each vendor's public documentation, or from help articles where the vendor's own pages were silent (sources are at the end). On 2026-10-10, Emeka approved the seven changes in section 4, the fallback for slow coverage checks, and RxNorm as a stretch addition.

## 1. Summary

The concept, "Book fast, arrive ready," stands. The research changes how "Arrive ready" works in four ways:
- the identity check comes first
- retrieval runs in the background
- a pharmacy step is added
- one question covers medications the history can't see

It also adds safeguards for coverage checks that are slow or come back empty. Every vendor stays simulated in the prototype. The AI remains the one live service (Gate 7 later made it a router over OpenAI, Anthropic, and Google), with the free RxNorm API as an optional second.

## 2. The five services named in the brief

| Service | What it does | What it needs and how it answers | Sandbox | Where it fits in the journey |
|---|---|---|---|---|
| **Sohar Health** (in use at Legion) | Eligibility and benefits verification, insurance discovery, and a network-status check for a specific provider | **Verification** needs first and last name, date of birth, state, member ID, payer ID, place of service, and specialty (the example uses psychiatry). **Discovery** needs name, date of birth, state or ZIP, and an NPI. Both answer asynchronously, through polling or a webhook. Sohar says discovery averages about 12 seconds and finds coverage up to 60% of the time. | Self-serve sandbox credentials, with predefined test values | **How you'll pay:** typical cost by plan. **Confirm coverage and cost:** verification, and discovery for "look it up for me." **Best-fit providers:** in-network status per provider. |
| **Metriport** (in use) | One FHIR R4 API for records from health information exchange networks, plus pharmacy, lab, and hospital admission and discharge feeds. Also C-CDA and PDF. | Matches patients on demographics such as name, date of birth, sex at birth, and address, plus identifiers such as a driver's license. Metriport says more demographics give a better match rate. Queries are asynchronous by design, and each source reports back by webhook. | Sandbox with test patients. Production requires a covered entity, an NPI, and a treatment purpose. | **Get ready:** conditions, allergies, labs, hospitalizations, and prior care to confirm |
| **DoseSpot** (existing integration) | E-prescribing, including controlled substances (EPCS), prior authorization, real-time prescription benefit, and the patient's pharmacy choice. Medication history comes through Surescripts. State prescription-monitoring data comes through a Bamboo Health integration. | Medication history covers fills billed to insurance, not cash fills (one EHR's setup looks back 12 months). Prescription-monitoring access needs a prescriber with controlled-substance permissions. | No self-serve sandbox found; access goes through DoseSpot's partner team | **Get ready:** medications and preferred pharmacy. **After the visit:** the prescription is sent. **Before prescribing:** the clinician's prescription-monitoring review. |
| **Verified** (available) | **1-Click Signup** autofills name, birthday, address, sex, and SSN from a verified phone number. **1-Click Health** finds insurance and runs eligibility from name and birthday. | A phone number, or name and birthday | Test users are documented, and keys come through Verified's dashboard | Not used (section 5) |
| **Persona** (available) | Government ID verification, with selfie verification available, through hosted or embedded flows, mobile SDKs, or the API. Fields such as name, date of birth, and address come with the ID check. | ID capture by the patient | A free sandbox that returns sample data ("Alexander J Sample") and lets tests force a pass or a fail | **Get ready:** the ID check, moved to first. Its name, date of birth, and address feed record matching. |

## 3. Other sources considered, and what each would add

- **Particle Health, Health Gorilla, Zus.** These are other routes to outside records.
  - Health Gorilla is a designated TEFCA QHIN and also offers lab data.
  - Particle reaches TEFCA through CommonWell.
  - Zus is a shared-record platform built into clinical tools.

  For onboarding they would duplicate Metriport rather than add a step, so they are not used.
- **Flexpa, and similarly b.well.** These give access to a patient's own health plan data, with the patient's authorization, through a FHIR API, and that data can include claims. They would add a fallback when the records networks find nothing and the patient has a plan, because claims show past providers and fills. The cost is that the patient has to sign in to their health plan. This is a production fallback only.
- **Surescripts and DrFirst.** These provide medication history and prescription benefit data. Legion already reaches Surescripts through DoseSpot, so neither is added.
- **Bamboo Health.** This provides state prescription-monitoring data (NarxCare). Legion reaches it through DoseSpot, and it is used on the clinician's side.
- **Texas Prescription Monitoring Program.** Prescribers must check it before prescribing opioids, benzodiazepines, barbiturates, or carisoprodol. This shapes the controlled-substance message the patient sees and the clinician's summary.
- **Labs.** Recent results arrive through the same records retrieval. Ordering labs is a clinical step after the visit, so there is no separate onboarding step.
- **Provider directories.** These are the sources behind "why this provider":
  - identity and licensure come from the public NPPES NPI Registry and the Texas licensing boards
  - plan participation comes from payer directories and Sohar's network status
  - everything else comes from Legion's credentialing records

  In the prototype, every provider fact carries its source, simulated.
- **Wearables and other patient-generated data.** Sleep and activity data could enrich the picture for anxiety or depression. But a web app can't read Apple Health without a native app, it would add another consent, and it isn't needed to complete a first visit. It is better suited to care between visits.
- **NLM RxNorm API.** It is public, with no license needed for normal use. It matches free-text drug names, such as those mentioned in the guided conversation, to standard drug concepts. This is an optional live addition (section 6).

## 4. What changes in the journey (approved)

1. **The ID check comes first in "Get ready."**
   - Record matching needs legal name, date of birth, sex at birth, and address, and an ID scan supplies them without typing.
   - It also replaces the self-reported age from the fit check with a verified date of birth. A mismatch goes to a person to review and never becomes an automatic eligibility decision.
   - The check stays after booking, so it doesn't cost the trust that booking first was meant to build.
2. **Retrieval runs in the background.** Records and medication history answer in minutes, not instantly. While they load, the checklist shows "Searching…" and the patient does the guided conversation and the questionnaires. Items to confirm appear when they arrive.
3. **Coverage checks can be slow or come back empty.**
   - "Look it up for me" falls back to entering the member ID, since Sohar says discovery finds coverage up to 60% of the time.
   - If the plan doesn't answer within about 15 seconds, the patient can still book, with the typical cost shown. Coverage is then confirmed before the visit, and cancellation is free if it falls through. Emeka approved this, accepting that it relaxes "certainty before the card" when a check is slow.
4. **Preferred pharmacy is added to "Get ready."** E-prescribing after the visit needs a pharmacy. It is prefilled from fill history, and the patient confirms or changes it.
5. **One question covers medications the history can't see.** Fill history covers only insurance-billed fills. So the medications step always asks about anything else, including cash-paid and over-the-counter medications. It is one question, not a list.
6. **Provider reasons show their source.**
   - "In network with your plan" rests on Legion's credentialing records before the account exists.
   - Once coverage is confirmed, Sohar's network status verifies it for each provider.
7. **The controlled-substance message states the Texas rule plainly.**
   - If a benzodiazepine is considered, the provider reviews the state prescription-monitoring record first, as Texas law requires.
   - The clinician's summary shows that review as a pending step (simulated).

## 5. Why Verified is not used

Verified's distinctive strength is autofilling identity from a phone number, including name, birthday, address, sex, and even SSN. That is exactly the phone-linked prefill Emeka was cautious about at Gate 1, and it would arrive before the journey has earned the patient's trust. Its insurance lookup overlaps with Sohar, which Legion already uses. It could be tested later as an opt-in at the ID step.

## 6. Live versus simulated (input to Gate 7)

- **Vendors stay simulated.** Sandboxes exist for Sohar (self-serve), Metriport, and Persona (free), but they return canned test data, which is what the simulations show anyway. They would also need accounts and keys. DoseSpot has no self-serve sandbox. A live sandbox would add setup without changing what a reviewer sees.
- **Simulations behave like the real services.** They answer asynchronously, can come back empty, and use field names close to each vendor's documented inputs.
- **The AI stays the one live service,** with a scripted fallback. (At Gate 7 this became a router over OpenAI, Anthropic, and Google.)
- **Optional live addition: the RxNorm API.** It needs no key, is small to build, and is genuinely live. It would match drug names mentioned in the guided conversation to standard names. It was approved as a stretch goal and has since been built (milestone 9).

## Sources

- Metriport: [platform API](https://www.metriport.com/platform/api), [create patient](https://docs.metriport.com/medical-api/api-reference/patient/create-patient)
- Sohar Health: [quickstart](https://docs.soharhealth.com/documentation/getting-started/quickstart), [discovery guide](https://docs.soharhealth.com/documentation/guides/discovery), [discovery product page](https://www.soharhealth.com/products/discovery)
- DoseSpot: [product site](https://dosespot.com/), [integration overview (PDF)](https://go.dosespot.com/hubfs/DoseSpot/File%20Downloads/DoseSpot_Integration%20Overview.pdf?hsLang=en), [Healthie: e-Rx medication history](https://help.gethealthie.com/article/1099-e-rx-medication-history), [Healthie: PDMP](https://help.gethealthie.com/article/976-prescription-drug-monitoring-programs-pdmp)
- Verified: [documentation](https://docs.verified.inc/)
- Persona: [documentation](https://docs.withpersona.com/), [sandbox versus production](https://help.withpersona.com/articles/6I2kGhfPvSuUjYq4z6tpmB), [government ID via API](https://docs.withpersona.com/integration-guide-gov-id-via-api)
- Texas Prescription Monitoring Program: [Texas Medical Board FAQ](https://www.tmb.texas.gov/249-prescription-monitoring-program-pmp-check-mandated-each-and-every-time-physician-or-authorized), [TMLT: before you prescribe](https://tmlt.org/articles/before-you-prescribe-texas-prescription-monitoring-program)
- Records networks: [Particle, Health Gorilla, and others compared](https://nirmitee.io/blog/particle-health-vs-health-gorilla-vs-redox-vs-direct-ehr-integration/), [Health Gorilla and Particle](https://www.cbinsights.com/compare/health-gorilla-vs-particle-health)
- Flexpa: [documentation](https://www.flexpa.com/docs)
- NLM RxNorm API: [API overview](https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html)
- NPPES NPI Registry: [API page](https://npiregistry.cms.hhs.gov/api-page)
