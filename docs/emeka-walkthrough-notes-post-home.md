
# Post-booking / Home Experience Feedback

## Overall issue

The post-booking experience currently feels too much like:

> “You’re booked — now here are 6–7 separate things you still need to do.”

That creates unnecessary perceived workload immediately after the user has just completed a major milestone.

The experience should instead feel like:

> “You’re booked. We’ll help you get ready, and we already know or can retrieve a lot of what your provider needs.”

The home screen should also be state-aware. Its hierarchy should change depending on whether the patient is:

1. booked but not ready,
2. ready for the first visit,
3. currently in the visit,
4. post-first-visit / in ongoing care.

---

## 1. Add a clear completion moment after booking/payment

There should be a lightweight celebratory transition between completing booking/payment and landing on the home screen.

The current transition feels abrupt. Then transition into the visit-preparation home state.

This does not need to be overly gamified. A short confirmation animation should be enough to create a clear mental boundary between booking complete & visit preparation begins

---

## 2. Make “Get ready for your visit” the primary home experience before the first visit

Right now the appointment card and Join visit button dominate the page even while required preparation is incomplete.

That hierarchy feels backwards.

Before the patient has completed required prep:

- “Get ready for your visit” should be the dominant module.
- The appointment details should still be visible, but secondary.
- Join Visit should not be the strongest CTA until the patient is actually ready to join.
- Once all required preparation is complete, the prep section can collapse/minimize and the appointment / Join Visit CTA can become dominant.

The home screen should therefore respond dynamically to patient state rather than remain visually static.

---

## 3. Reduce the perceived number of checklist tasks

The current checklist exposes too many independent rows at once:

- Verify your ID
- Let us look for your records
- Tell us what’s going on
- Answer the check-in questions
- Confirm your medications
- Choose your pharmacy
- A few health basics

Even if each task is individually reasonable, the flat list makes the experience feel like a large amount of work.

The tasks should be grouped into a smaller number of meaningful preparation areas.

For example:

### Confirm who you are
- Verify identity

### Review your health information
- Retrieve records
- Confirm medications
- Confirm key health basics

### Tell your provider what you need help with
- AI-assisted intake
- Standard questionnaires

### Confirm where prescriptions should go
- Pharmacy

The goal is to reduce perceived burden while preserving all required information.

---

## 4. Make task dependencies explicit

Some tasks depend on previous tasks, but the current hierarchy does not communicate this well.

For example:

> Confirm your medications  
> Opens after the records step

feels like an unrelated disabled task.

Instead, the experience should make the dependency part of one continuous workflow.

Example:

**Review your health information**
1. Verify identity
2. We look for existing records
3. You review and confirm what we found

Once records are returned, that same workflow can transition from:

> Finding your records...

to:

> Review the health information we found

This makes the system feel coherent and reduces the impression that the patient has another new form to complete.

---

## 5. Treat identity verification as an enabler, not just another checklist item

Identity verification creates downstream value because it allows Legion to retrieve existing medical and pharmacy information.

The UI should make that relationship clearer.

Instead of treating “Verify your ID” and “Let us look for your records” as unrelated tasks, communicate:

> Verify your identity so we can securely find your records and save you from re-entering information.

That makes the patient understand why the task is worth doing.

---

## 6. Simplify the records-permission screen

The current “Your records and medications” permission screen contains useful information, but it is too text-heavy and visually flat.

The patient should first understand the value proposition:

> **Find your health information automatically**
>
> We can look for recent visits, medications, allergies, and conditions so you can review what we find instead of typing everything again.

Primary CTA:

**Find my records**

Secondary CTA:

**I’ll enter them myself**

Move the detailed explanation of:
- where Legion looks,
- what information is shared,
- what may be retrieved,

behind a smaller **How this works** / **Learn more** interaction.

The trust information is important, but it should not overwhelm the primary task.

---

## 7. Improve the asynchronous records-search experience

When records retrieval is taking time, the current “other items” link is too easy to miss.

Do not encourage the user to sit and wait on a loading screen.

Use a prominent action such as:

**Continue with other steps while we search**

or automatically return the patient to the visit-prep home screen and show:

> Records search in progress  
> We’ll let you know when they’re ready.

This better reflects the fact that health-data retrieval may be asynchronous.

---

## 8. Make retrieved health information feel meaningfully useful

The current simulated result is too sparse to demonstrate the value of health-record retrieval.

If Legion successfully retrieves patient information, the result should feel more like a structured health summary.

Possible sections:

### Recent visits
- Primary care annual visit — Date
- Urgent care — Date

### Medications (if they exist)
- Med 1 — last filled Date
- Med 2 — last filled Jul 2026

### Conditions
- Condition 1
- Condition 2

### Allergies
- XX 

### Other relevant history
- recent labs or vitals where clinically useful

### Needs confirmation
- information that may be outdated or incomplete

The important interaction model is:

> Legion retrieves → patient reviews/confirms

rather than:

> Legion retrieves → patient still manually reconstructs the same history.

The experience should visibly demonstrate that the system did work on the patient’s behalf.

---

## 9. Keep pharmacy lower in the hierarchy

Choosing a pharmacy is important, but it should not necessarily appear with the same visual weight as clinically necessary pre-visit work.

The checklist should prioritize work based on what is necessary to make the patient clinically ready for the appointment.

---

# Post-Visit Experience

## 10. Treat visit completion as a handoff into ongoing care

After the first appointment ends, the experience currently confirms that the visit occurred but does not fully answer the patient’s most important immediate questions.

The post-visit page should clearly communicate:

- what happened,
- what the provider recommended,
- whether medication was prescribed or changed,
- where the prescription was sent,
- what the patient needs to do next,
- when they should follow up.

This should feel like a care handoff, not just a completion receipt.

---

## 11. Add medication / prescription status to the post-visit state

When applicable, show a dedicated medication card.

Example:

### Your prescription
**Sertraline 25 mg**
New prescription

Sent to:

**CVS Pharmacy**
123 Main St, Austin, TX

Status:

**Sent to pharmacy**

Optional CTA:

**View prescription details**

All medication and fulfillment data in the demo should remain clearly synthetic/simulated.

This is a high-value moment because patients commonly leave a visit wondering whether a prescription actually went through and where it was sent.

---

## 12. Reorganize the post-visit page around next actions

Something like this hierachy:

### Your first visit is complete

### Care plan
- key plan / provider recommendations
- medications

### What happens next
- actions the patient should take
- what to watch for / when to contact the care team

### Follow-up
- booked appointment or recommended times

### Return to home

The patient should not feel stranded at the end of the simulated visit flow.

Add a clear **Return to home** CTA.

---

## 13. Create a distinct post-first-visit home state

Once the first visit has been completed, the home page should no longer be dominated by onboarding or visit-preparation tasks.

The product should transition into an ongoing-care dashboard.

Suggested hierarchy:

### Next appointment
- date/time
- provider
- manage/reschedule

### Your care plan
- active medications
- relevant next steps

### Recent visit
- initial evaluation
- view visit summary

### Messages / tasks
- anything requiring action
- otherwise clearly indicate that no action is currently needed

The home experience should therefore evolve dynamically:

**Before first visit**
→ focus on getting ready

**Ready for visit**
→ focus on joining the appointment

**After first visit**
→ focus on ongoing care, treatment, and the next appointment