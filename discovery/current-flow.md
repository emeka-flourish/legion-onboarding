# Current onboarding flow, as observed

## Sources and method

| Source | What it covers | How it was inspected |
|---|---|---|
| Desktop recording (`raw_discovery/desktop-walkthrough.mov`, 18 min 17 s, 2026-10-10) | The whole flow from the fit check through payment, plus the patient portal up to the ID upload | Frames sampled every second with macOS AVFoundation. Frames were kept when the screen changed (200 frames), and four short stretches were re-sampled every 0.25 to 0.5 seconds: fit questions, PHQ-9 item 9, release of information, and the post-payment transition. Every kept frame was viewed. |
| Mobile recording (`raw_discovery/mobile-walkthrough.MP4`, 1 min 38 s, iOS Safari) | Fit check through provider selection, ending on the empty "About yourself" form | Same method, every 0.5 seconds (96 frames). All were viewed. |
| Live site, read-only (2026-10-10) | `/portal/join` and `/portal/join/fit` only | Opened in the in-app browser. Computed styles and layout were read with JavaScript at 1440, 1024, and 375 px widths. No answer was clicked and nothing was submitted. |
| Emeka's voice notes | His reactions (see [user-observations.md](user-observations.md)) | Read in full |

**Privacy handling.** The recordings show Emeka's real name, contact details, date of birth, and card. These documents describe those fields by type only. Clinicians are referred to by position ("first card"), not by name. `raw_discovery/screens/` holds 17 cropped frames, checked to contain none of these details.

**Scope rule.** Only screens that were actually seen are described. Anything inferred is labeled *inferred*. Anything not seen is listed under open questions at the end.

## Journey at a glance

| # | Stage | Route | Telemetry milestone (brief) | What the patient does | What Legion decides or shows |
|---|---|---|---|---|---|
| 0 | Entry | `/portal/join` | 1. Start (5,898 sessions) | Nothing. A fresh visitor is redirected straight to the fit check (verified live). | Redirect |
| 1 | Fit check | `/portal/join/fit` | 2. Fit check (page reach) | Six yes/no questions, one per card, auto-advancing | Eligibility (rules not visible); "We think we'll be a great fit" |
| 1b | Session setup | `/portal/join` again | (none) | Waits about 3 s ("Setting up your session...") | Creates an anonymous onboarding session (*inferred*) |
| 2 | Conditions | `/portal/join/conditions` | 3. Conditions | Multi-select of 7 options | Shows condition-specific messages (for example, the benzodiazepine dose limit) |
| 3 | Insurance | `/portal/join/insurance` | 4. Insurance | Picks a payer, "Other", or "None" | Shows self-pay pricing when "None" is chosen |
| 4 | Needs | `/portal/join/needs` | 5. Needs | Picks 1 of 3 care-need types | Shows a short explanation for the chosen type |
| 5 | Match and booking | `/portal/join/match` | 6 to 8. Match, provider selected, reservation created | Waits through the "finding your match" animation, browses providers, picks a time, books | Filters and orders providers (logic not visible); holds the slot (*inferred* about 10 min) |
| 6 | Basic info and account | `/portal/join/patient` | 9 to 10. Patient details, account created | 6 fields and 3 consents | Age check (the notice names 18 to 65); creates the account |
| 7 | Payment and confirmation | `/portal/join/payment` | 11. Payment page (the last measured step) | Adds a card ($1 authorization) | Confirms the appointment |
| 8 | Patient portal: readiness | `/portal/dashboard` | Not measured | Checklist: insurance, medical history, pre-appointment check-in, all "due 24 hours before your appointment" | Tracks completion; branches questions |
| 9 | First visit and after | Not observed | Not measured | "Join Video Call" link on the dashboard | Not observed |

## Stage by stage

### 0. Entry: `/portal/join`

- On a fresh visit, `/portal/join` redirects to `/portal/join/fit` before showing anything (verified live on 2026-10-10). The patient makes no decision between telemetry steps 1 and 2.
- After the fit check, the patient passes through `/portal/join` a second time, which shows "Setting up your session..." for about 3 seconds before the conditions page.

### 1. Fit check: `/portal/join/fit`

Screens: [01-fit-q1-texas.jpg](raw_discovery/screens/01-fit-q1-texas.jpg), [02-fit-q3-risk-of-harm.jpg](raw_discovery/screens/02-fit-q3-risk-of-harm.jpg), [03-fit-complete.jpg](raw_discovery/screens/03-fit-complete.jpg), mobile [17-mobile-fit-q1-below-fold.jpg](raw_discovery/screens/17-mobile-fit-q1-below-fold.jpg).

- **Frame.** The title reads "Let's Make Sure We're the Right Fit" with the subtitle "Please read the following carefully and only proceed if you are a good fit for the care we provide." Below it are "Question N of 6" and a six-segment progress bar (green done, blue current, gray upcoming), and from question 2 on, a "Go back" link. An info box, "Your Safety & Care Come First," says that if a question doesn't apply, "it means you deserve the right kind of care." The footer reads "Your responses help us ensure you receive appropriate care. All information is confidential." On desktop, a rotating patient testimonial fills the right half.
- **Questions, in order, with the answer that continues:**
  1. "Are you based in Texas?" (**Yes** continues). "No" promises to "point you to resources."
  2. "Do you currently have Medicaid or Medicare as your insurance?" (**No** continues). The copy says Legion is "unable to serve patients who have Medicaid or Medicare, even on a cash-pay basis."
  3. "Are you currently at risk of harming yourself or others?" (**No** continues). "Yes" promises to "connect you immediately to crisis resources for urgent support."
  4. "Have you been hospitalized for mental health or substance use in the past year?" (**No** continues). An inpatient stay means "we may not be the ideal intensity of care."
  5. "Are you 18 years or older?" (**Yes** continues)
  6. "Are you looking for virtual care only?" (**Yes** continues)
- **Interaction.** One tap answers and auto-advances, and the card slides out. The continuing answer is "Yes" for questions 1, 5, and 6 and "No" for questions 2, 3, and 4.
- **Completion.** "Yay! We're All Done! 🎉 We think we'll be a great fit for you!" followed by a Continue button. In the recording, the six questions took under a minute.
- **Screen-outs.** No disqualifying answer was given in the recordings. Emeka separately observed that disqualifying answers link to resources for people who aren't a fit (reported at the Gate 1 review). The crisis path, answering "Yes" to the risk-of-harm question, was not observed.

### 2. Conditions: `/portal/join/conditions`

Screen: [04-conditions-multi-select.jpg](raw_discovery/screens/04-conditions-multi-select.jpg).

- **Frame (steps 2 to 7).** "Step 1 of 6 · 17% Complete" sits above a progress bar labeled Conditions, Insurance, How can we help you?, Find Match, Basic Info, Payment Method. A "Need help? Call us" button sits at the top right, and the header avatar shows "A" (anonymous). Each step ends with an "Already started your journey? ... Sign in to continue" box.
- **Question.** "What brings you here? Understanding your needs helps us match you with the right care team. Select all that apply." The tiles are ADHD, Depression, Anxiety, Bipolar Disorder, PTSD, I'm not sure, and Other.
- **Selection feedback.** A selected tile gets a colored border and check, and expands with a message:
  - **Anxiety** (amber): "💊 We do not prescribe benzodiazepines over 1mg a day."
  - **Depression** (blue): "🤝 You're not alone, we've helped thousands of patients get relief."
  - Messages for the other conditions were not seen.

### 3. Insurance: `/portal/join/insurance`

Screen: [05-insurance-none-self-pay.jpg](raw_discovery/screens/05-insurance-none-self-pay.jpg).

- **Content.** The headline "Great news! We've got you covered. We accept most major insurance plans. Select yours below." appears before anything is selected. Logo tiles: Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Oscar Health, Other Insurance, None (No Insurance). Continue stays disabled until a tile is chosen.
- **Choosing "None"** shows: "No problem! Our self-pay rate is $250 for New Patient Intakes & $150 for Followups. We'll help you get started."
- **Not seen.** What choosing a payer or "Other" asks for. Member ID, plan, and eligibility are not collected here. The payment page later says verification happens after booking.

### 4. Needs: `/portal/join/needs`

Screen: [06-needs-new-diagnosis.jpg](raw_discovery/screens/06-needs-new-diagnosis.jpg).

- **Question.** "How can we help you? Everyone's health journey is unique." It is single-select, with three rows:
  - "I already have a diagnosis and need medication support." When selected, it fills blue and adds "Our providers specialize in managing existing conditions..."
  - "I'm looking for a new diagnosis or medication." When selected, it fills purple and adds "We conduct thorough evaluations..."
  - "I'm not sure, but I need help." When selected, it fills green and adds "No worries! We'll work with you to understand your needs..."
- **Generic copy.** The options and copy are the same regardless of earlier answers.

### 5. Match and booking: `/portal/join/match`

Screens: [07-match-loading-checklist.jpg](raw_discovery/screens/07-match-loading-checklist.jpg), [08-match-slot-selected-book.jpg](raw_discovery/screens/08-match-slot-selected-book.jpg).

- **Wait state.** "Finding your perfect match" shows an animated checklist: Reviewing your insurance, Checking Legion's 106+ providers, Verifying providers who work with cash pay, Analyzing your treatment needs, Matching you with the right provider. Beside it, "What happens next?" lists four bullets. Then "Perfect match found! Based on your preferences, we've found providers that would be a great fit for you." The animation takes about 4 seconds. Whether it reflects real computation is unknown.
- **List.** "Your Matched Providers" starts with three cards. A full-width "Show More Providers (N remaining)" button adds three at a time; with nine cards showing, it read "34 remaining." For this persona (Texas, self-pay, anxiety and depression, new diagnosis), that is **43 providers**. Every card seen listed the credential *Psychiatric Mental Health Nurse Practitioner*.
- **Expertise chips** overlap heavily: most list ADHD, anxiety, depression, PTSD, trauma, and mood disorders, with occasional extras such as OCD, psychosis, or medication management.
- **Card anatomy:**
  - an optional badge ("⚡ Soonest available" or "❤️ Highly recommended")
  - photo, name, a "Legion clinician" badge, and a star rating with review count
  - credential, and "Areas of Expertise" chips with colored dots
  - "About [first name]," truncated with "show more"
  - "Earliest available: [day, date, time] · N times across M available dates"
  - a slot grid (2 to 3 dates by 3 times; one column on mobile) and "+ N more times"
- **Ordering.** The first card is "Soonest available." The order of the others is not explained. No card says why it matches the patient.
- **Booking.**
  - Picking a slot outlines it in green and reveals "☐ I would like an earlier appointment if one becomes available" (likely the brief's `portal.reschedule_preferences.saved`).
  - A primary button reads "Book appointment for Monday 12th October at 11:00am," with the note "Please note: Your first appointment will last approximately 1 hour."
- **Time zones.** No time zone is shown next to slot times. The dashboard later shows the same appointment as "11:00 AM PDT," the recording machine's zone. For a Texas patient, *inferred*: slots are shown in browser-local time.
- **Availability for this persona.** The earliest slot was about 38 hours after booking, which happened on a Saturday afternoon. Providers showed 7 to 34 open times each over the next 2 to 3 available dates.
- **Telemetry.** Selecting a provider and creating a reservation happen here (brief events `portal.provider_selected` and `portal.provider.reservation.created`). From the recording alone, it is not clear whether "provider selected" fires on the slot tap or on the Book button.

### 6. Basic info and account: `/portal/join/patient`

Screens: [10-patient-form-empty-mobile.jpg](raw_discovery/screens/10-patient-form-empty-mobile.jpg), [09-patient-age-restriction-modal.jpg](raw_discovery/screens/09-patient-age-restriction-modal.jpg).

- **Form.** "Step 5 of 6 · 83% Complete." "Tell us about yourself — We need some basic information to create your account."
  - Fields: First Name, Last Name, Email, Phone Number, Date of Birth (a calendar popover with month and year dropdowns, opening on the current month), and "How did you first hear about Legion Health?" (a select).
  - Three consent checkboxes:
    - Terms of Service, Privacy Policy, and HIPAA Notice
    - Treatment Consent Policy and Controlled Substance Policy
    - Recording & AI Transcription Policy
  - Button: "Save my info & Continue."
- **Error seen.** The birth year chosen in the year dropdown did not register, so the date stayed in 2026. On submit, an "Age Restriction Notice" modal said "people under the age of 18 and above 65 may be best served with forms of care other than telehealth... we want to steer you toward in-person care or specialists." The real problem was the input, not the patient's age. Fixing the year took about a minute.
- **Age rule.** The notice names an upper limit of 65 as well as 18, and it appears here, after a slot is already reserved. The fit check only asked about 18 or older. Only the under-18 trigger was observed; whether patients over 65 are blocked outright or merely warned was not.
- **Success.** A toast: "Account created — Your account has been created and your progress has been saved. You can return later by logging in with your email." No password was asked for. *Inferred*: email-based sign-in.

### 7. Payment and confirmation: `/portal/join/payment`

Screens: [11-payment-what-to-expect.jpg](raw_discovery/screens/11-payment-what-to-expect.jpg), [12-payment-success-then-reservation-error.jpg](raw_discovery/screens/12-payment-success-then-reservation-error.jpg).

- **Header and hold timer.**
  - "Step 6 of 6." "Complete Your Booking: Review your appointment details and add payment information to confirm your booking."
  - A blue banner reads "Time remaining to complete booking: 8:02 — Please add your payment method to secure this appointment." That was its reading when the page first appeared, roughly two minutes after the Book click.
  - *Inferred*: an approximately 10-minute hold that starts at booking and also covers the "About yourself" step.
- **"Your Selected Appointment."** A card with date, time, "60 minute session," the provider, an "Intake Appointment" tag, and a "Change Appointment" button.
- **Insurance message.** "Insurance verification next: After confirming your appointment, you'll verify your insurance and receive an accurate estimate of your copay before your visit." This appeared even though the patient chose "None."
- **"What to expect."**
  - **When we charge.** Claims go to insurance about 5 days after the visit, and the card is charged for any balance.
  - **Your estimated cost.** "Based on your insurance coverage, most patients pay $0-$40 per session" (also shown to this self-pay patient).
  - **Cancellation policy.** Free up to 48 hours before. Late cancellations and no-shows (not arriving within 10 minutes) cost $250 for initial visits and $100 for follow-ups.
  - **Insurance and cash pay.** Without eligible coverage at visit time, the patient owes $250 for the intake and $150 for follow-ups.
  - A link to the financial policy.
- **Card entry.**
  - "Your payment information is encrypted and securely processed by Stripe."
  - A card field with Stripe Link autofill.
  - "We will try to authorize your card with a $1 transaction. Your statement description will be getHealthie.com - our payment provider." *Inferred*: Healthie is part of Legion's practice and billing stack.
  - Buttons: Cancel, Complete Payment Setup. A "How your payment info is protected" panel follows.
- **Confirmation, then an error.**
  - A toast confirms: "Success — Payment method added and appointment confirmed!"
  - For about 2.5 seconds, the page then replaces itself with "You don't have an appointment reservation. Please select an appointment time first," plus a "Select Appointment Time" button.
  - It then redirects to `/portal/dashboard?appointmentConfirmed=true`.
- **Telemetry.** No telemetry event marks the confirmation (brief).

### 8. Patient portal: readiness for the first visit (`/portal/dashboard`)

Screens: [13-dashboard-checklist.jpg](raw_discovery/screens/13-dashboard-checklist.jpg), [14-health-history-preview.jpg](raw_discovery/screens/14-health-history-preview.jpg), [15-phq9-item9.jpg](raw_discovery/screens/15-phq9-item9.jpg), [16-roi-raw-validation-error.jpg](raw_discovery/screens/16-roi-raw-validation-error.jpg).

**Dashboard.**

- "Hey [first name]! Here's your care summary." An amber banner reads "Action needed: Must be completed 24 hours before your appointment."
- **New Patient Checklist:**
  - **Insurance** (Incomplete): "Verify insurance or choose cash-pay." This was shown even though "None" was already chosen.
  - **Medical History** (Incomplete, later "In Progress · 33%")
  - **Pre-Appointment Check-In** (Incomplete, later "Complete," with a "Get help ↗" link)
- **Next Appointment:** day and date, "11:00 AM PDT · 60 minutes," a "Join Video Call" link, and Reschedule and Cancel buttons.
- **Navigation tiles:** Insurance (with a red dot), Billing, Payment, Support ↗.
- **Post-Visit Summaries:** "No post-visit summaries available at this time."

**Pre-Appointment Check-In: GAD-7 and PHQ-9.**

- Framed as "Complete these mental health screening forms before your appointment."
- A link reads "Need to correct a submitted answer? View assessment and support options."
- One question per screen, with a four-option segmented control (Not at all, Several days, Over half the days, Nearly every day), plus "Skip This Form," Previous, and Next. Each instrument is followed by a functional-impact question.
- Answers save per section. Completing the GAD-7 showed a confetti card ("Progress! 🎯"). Completing the PHQ-9 showed an "All Forms Complete!" success box.
- **PHQ-9 item 9** ("Thoughts that you would be better off dead, or of hurting yourself in some way") appears as an ordinary question, with no safety message or crisis resource on screen. Emeka answered "Not at all," so what happens after a positive answer was not observed.

**Health History** ("Complete these forms to provide your complete medical background"): six forms, each with its own progress segment.

1. **Mental Health History.** 11 sections, "About 5 minutes."
   - A "Preview questions" view lists every question above the first section's single text box. This is likely the source of the "single text field" impression.
   - The sections:
     - Current Issues (free text)
     - Treatment History (a checklist of conditions, ever hospitalized, hospitalized in the last 12 months, details)
     - Benzodiazepine, Opiate, and Stimulant Medications (currently taking, which, dose)
     - Other Health History (other psychiatric medications, allergies, trauma)
     - Personal Information (work, school, relationships, hobbies)
     - Family Mental Health History
     - Medical History (chronic conditions)
     - Physical Information (height, weight, gender, and gender registered with insurance)
     - Substance Use History
   - The form autosaves per section ("Last saved ...").
2. **Release of Information.**
   - "Why this matters: When you send us your most recent records, your provider starts your visit already up to speed... faster access to medications (including potential same-day stimulant prescriptions, subject to clinical judgment and legal requirements)."
   - The patient types each prior provider's type, name, address, phone, and fax.
   - The patient then chooses the information categories to release, the reason for disclosure, and the authorization terms (citing Texas Health & Safety Code § 181.154(c) and 45 C.F.R. § 164.502(a)(1)).
   - The patient types a full name, a typed signature, and a signature style.
   - **Validation leaked raw developer text to the patient:** "Invalid enum value. Expected 'pcp' | 'psychiatrist' | 'therapist' | 'specialist' | 'other', received ''." It also showed "Provider and/or Clinic Name is required" and "Invalid US phone number."
3. **Primary Care Provider.** "Helps us close the loop and avoid duplicate work." Do you have one? Yes or No.
4. **Upload Your ID.** "Quick identity check so pharmacies and payers don't hold things up." Front and back photos (JPG, PNG, or PDF). Emeka stopped here.
5. **Emergency Contact** (label only, not opened).
6. **Your Most Recent Vital Signs** (label only, not opened).

**Celebration screens.** Each completed form shows a celebration ("Awesome! Next up?", "You're on a roll! 🚀", "Boom! Next?") and a "Form Completed!" toast.

### 9. First visit and after

Not observed. The only artifacts are the "Join Video Call" link, the Reschedule and Cancel buttons, the "Post-Visit Summaries" placeholder, and the "Recording & AI Transcription Policy" consent. That consent suggests visits are recorded or transcribed with AI (*inferred*).

## Inputs requested before the first visit

Counting only what was observed, the patient makes **roughly 75 to 80 discrete inputs** before the visit. That excludes emergency contact, vital signs, insurance verification, and the details of the "Yes" branches, none of which were reached.

| Stage | Inputs |
|---|---|
| Fit check | 6 yes/no |
| Conditions, insurance, needs | 3 selections |
| Match | Provider and time, plus an optional earlier-appointment opt-in |
| About yourself | 6 fields and 3 consents |
| Payment | Card |
| GAD-7 and PHQ-9 | 18 answers |
| Mental health history | About 25 questions (16 always asked, 9 conditional) |
| Release of information | About 10 fields and choices per prior provider, plus signature |
| Primary care provider and ID | 1 answer and 2 photos |

In the recording, the narrated, deliberate walkthrough took about 10 minutes from the first fit question to a confirmed booking. After that, about 8 more minutes in the portal completed the check-in and 3 of the 6 health-history forms. These times include narration, so they are not patient benchmarks.

## Decisions Legion makes (observed or clearly implied)

| Decision | Where | Visible basis |
|---|---|---|
| Eligibility: state, Medicaid or Medicare, risk of harm, recent hospitalization, age 18 or older, virtual-only | Fit check | Self-reported yes/no. Outcomes of disqualifying answers not observed. |
| Age outside 18 to 65 (the notice's wording; only under-18 observed) | About yourself (after reservation) | Date of birth |
| Condition-specific expectations (for example, benzodiazepines capped at 1 mg/day) | Conditions | Selected conditions |
| Self-pay pricing disclosure | Insurance | "None" selected |
| Which providers appear, and in what order | Match | Not explained. The loading checklist mentions insurance, cash pay, and treatment needs. |
| Slot hold and its expiry | Match to payment | Countdown timer |
| Account creation, card authorization ($1), appointment confirmation | About yourself, payment | Form submit and card success |
| Readiness requirements and deadline (24 hours before the visit) | Portal | Checklist status |
| Question branching | Portal forms | Earlier answers ("conditional") |

## Waits and choice points

- **Waits.**
  - "Setting up your session..." (about 3 s)
  - the match animation (about 4 s)
  - button-level "Loading," "Processing...," "Saving your progress...," and "Completing form..."
  - the dashboard "Loading..."
  - the calendar wait from booking to visit (about 2 days here)
- **Choices.**
  - conditions, payer, need type, provider, time slot, earlier-appointment opt-in
  - referral source, consents, payment method
  - which portal form to do first, and whether to "Skip This Form"

## Error and edge states visible

| State | Where | Notes |
|---|---|---|
| Continue disabled until a choice is made | Insurance | Expected behavior |
| Age Restriction Notice triggered by a date-of-birth input error | About yourself | The message blames age, not the input |
| Booking hold countdown | Payment | Expiry not observed |
| Success, then "You don't have an appointment reservation" for about 2.5 s, then redirect | Payment | Contradictory state right after confirmation |
| "Please enter your card details to continue" | Payment | Inline validation |
| Insurance "Incomplete" for a self-pay patient | Portal | Re-asks a decision already made |
| Raw developer validation text, plus required-field and phone errors | Release of information | Leaks implementation details |
| "Unsaved changes. Continue to save this section." | Portal forms | Data loss risk if the patient leaves mid-section |

## Clinically necessary friction versus likely accidental friction

This is a first pass for discussion, not a verdict.

| Likely necessary (the substance, not necessarily the form) | Likely accidental |
|---|---|
| **Eligibility.** State licensure, age, payer exclusions, the risk-of-harm screen, level of care. | **Below-the-fold question.** On a 375×812 phone, the testimonial puts the first answer button at 820 px, below the fold (measured). |
| **Controlled-substance expectations and consent.** | **Answer polarity.** The "continue" answer flips between Yes and No across fit questions. |
| **Validated screening (GAD-7, PHQ-9 including item 9).** | **Premature reassurance.** "Great news! We've got you covered" appears before the patient chooses insurance. |
| **Medication, substance, hospitalization, and medical history** before a prescriber's first visit. | **Age check placement.** The age notice (which names 65 as an upper limit) appears only after a reservation, triggered here by a date-picker error. |
| **Identity verification** before prescribing and dispensing. | **Mismatched copy.** Insurance and cost estimates are shown to a self-pay patient. |
| **HIPAA, treatment, recording, and financial consents; release authorization for records.** | **Error flash** after a successful payment. |
| **A payment method on file** (business need, given the no-show policy). | **Duplicate questions.** The same facts are asked twice or more (next section). |
| | **Manual record requests.** Prior providers are typed in, down to fax numbers. |
| | **Raw validation messages.** Developer text reaches the patient. |
| | **Explanation and filters.** No "why this provider" and no time-preference filter. |
| | **Readiness signals.** "Must be completed" sits next to "Skip This Form." |
| | **Slot time zone.** None is shown. |

## Information asked for more than once

| Fact | First asked | Asked again |
|---|---|---|
| Age | Fit check (18 or older) | Date of birth, with the 18 to 65 notice |
| Coverage | Insurance step | Payment page ("insurance verification next"), dashboard "Insurance: Incomplete" |
| Conditions | Conditions step | Mental health history treatment-history checklist, Current Issues |
| Psychiatric hospitalization | Fit check (past year) | Mental health history (ever, past 12 months, details) |
| Benzodiazepines | Conditions (dose policy message) | Mental health history benzodiazepine section |
| Name | About yourself | Release of information full name and signature |
| Identity | About yourself | ID photo upload |
| Prior providers | Release of information | Primary care provider form |

## Information that may be retrievable rather than typed

These are candidates only. Whether each is feasible, with which source and consent, is a later gate.

| Requested from the patient | Could plausibly come from (category of source) |
|---|---|
| Name, date of birth, phone, address | Identity and demographic prefill services |
| Coverage, member ID, eligibility, cost estimate | Insurance discovery and eligibility checks (the brief notes Legion already uses one for eligibility) |
| Prior diagnoses, hospitalizations, chronic conditions, allergies, prior providers, recent vital signs | Health information exchange or longitudinal record retrieval (the brief notes Legion already uses one) |
| Current and past medications, including controlled substances | Pharmacy-fill and prescription-history data, and the state prescription monitoring program (PDMP) |
| Government ID photos | Identity verification services |
| Height and weight | Records, or patient-confirmed |

Things that must still come from the patient include current symptoms and goals, the screening instruments, preferences, emergency contact, and consents. The *way* they are asked is still open.

## Questions the observable product cannot answer

1. **Screen-outs.** Emeka observed that disqualifying answers link to outside resources. Do the resources differ by reason, and does any person follow up?
2. **Risk-of-harm "Yes."** What happens when a patient answers "Yes" to the risk-of-harm question? Is it a resource screen only, or does it alert anyone?
3. **PHQ-9 item 9.** What happens after a positive item 9 or a severe score, given these are completed days before the visit? Who sees it, and how fast?
4. **Matching.** How does matching work (licensure, payer credentialing, expertise, need type, availability, ratings)? What does "Highly recommended" mean? How does "106+ providers" become 43?
5. **Insured patients.** For insured patients, how many providers and slots appear, and what does picking a payer ask for?
6. **The hold.** How long is the slot hold, and what happens when it expires? What does the earlier-appointment opt-in actually do?
7. **Event timing.** Does `portal.provider_selected` fire on the slot tap or the Book click?
8. **Insurance verification.** How does insurance verification work after booking (automated or manual)? What happens if coverage fails?
9. **Readiness enforcement.** Are readiness tasks enforced? What happens if they are not done 24 hours before? Which are required, given "Skip This Form"?
10. **Sign-in.** How does sign-in work (email link or code), and does "Sign in to continue" resume mid-flow progress?
11. **The visit.** What does the visit look like: video platform, waiting room, the no-show rule in practice, same-day prescribing, and the post-visit summary contents?
12. **Records retrieval.** Is the existing medical-records retrieval integration used anywhere in onboarding? The patient-facing release form suggests records are requested by hand.
13. **Time zones.** Are slot times always shown in browser-local time, and what does a Texas patient on a phone set to another zone see?
14. **Unobserved forms.** What do the unobserved forms (emergency contact, vital signs, insurance) and the ADHD, bipolar, and PTSD condition messages say?
