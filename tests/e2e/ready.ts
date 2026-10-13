// "Arrive ready" steps, tapped through the way a patient would (TRD 10.3), in the visit-prep areas the home
// screen shows since Emeka's walkthrough feedback: who you are, your health information, what you need help
// with, and the pharmacy.
import { expect, type Page, type TestInfo } from "@playwright/test";
import { FOLLOW_UPS, INTAKE_PROMPTS, type PromptId } from "@/data/intake";
import { PERSONAS } from "@/data/personas";
import { DIFFICULTY_OPTIONS, FREQUENCY_OPTIONS } from "@/data/questionnaires";
import type { PersonaId } from "@/domain/types";
import { expectAccessible, shoot, topOf } from "./helpers";

type Shot = (nn: number, stage: string) => Promise<void>;

export function shooter(page: Page, info: TestInfo, patient: string): Shot {
  return (nn, stage) => shoot(page, info, patient, nn, stage);
}

const prepRegion = (page: Page) => page.getByRole("region", { name: "Get ready for your visit" });

async function openStep(page: Page, name: RegExp | string) {
  await expect(page).toHaveURL(/\/home$/);
  await prepRegion(page).getByRole("link", { name }).click();
}

/** An area that isn't in hand is folded to one line; tapping it opens its first open step. */
async function openArea(page: Page, title: string) {
  await expect(page).toHaveURL(/\/home$/);
  await prepRegion(page).getByRole("link", { name: new RegExp(`^${title}`) }).click();
}

/** Before the patient is ready, getting ready leads the page and joining is the quieter action. */
export async function expectPrepLeads(page: Page) {
  const prep = prepRegion(page);
  await expect(prep.getByRole("heading", { name: "Get ready for your visit" })).toBeVisible();
  await expect(prep.getByText(/^\d of 4 done$/)).toBeVisible();
  for (const area of ["Confirm who you are", "Review your health information", "Tell your provider what you need help with", "Choose where prescriptions go"]) {
    await expect(prep.getByRole("heading", { name: area })).toBeVisible();
  }
  // Only the area in hand is open: four lines to look at, not seven tasks (feedback item 3).
  await expect(prep.getByRole("link", { name: /^Find your records/ })).toHaveCount(0);
  await expect(prep.getByText("Starts once you've verified your identity")).toBeVisible();
  expect(await topOf(prep)).toBeLessThan(await topOf(page.getByRole("region", { name: "Your visit", exact: true })));
}

export async function verifyId(page: Page, shot?: Shot) {
  await expectPrepLeads(page);
  // The one next step is the main button, and it's the ID check (approved order, L15).
  const next = prepRegion(page).getByRole("link", { name: /^Next: / });
  await expect(next).toHaveText("Next: Verify your identity");
  await expect(prepRegion(page).getByText(/so we can securely find your records/)).toBeVisible();
  await next.click();
  await expect(page).toHaveURL(/\/home\/id$/);
  // Nothing runs until the explicit tap (consent before retrieval).
  await expect(page.getByRole("button", { name: "Start ID check" })).toBeVisible();
  await page.getByRole("button", { name: "Start ID check" }).click();
  await expect(page.getByText("Your ID is verified")).toBeVisible();
  await expect(page.getByText("ID check · Persona (simulated)")).toBeVisible();
  for (const field of ["Legal name", "Date of birth", "Sex at birth", "Address"]) {
    await expect(page.getByText(field, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Edit ${field.toLowerCase()}` })).toBeVisible(); // L21
  }
  if (shot) await shot(11, "id");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Looks right" }).click();
  // The ID check leads straight into the records step it unlocks.
  await expect(page).toHaveURL(/\/home\/records$/);
}

/** Consent, then the patient carries on while the search runs, and home says when the records are ready. */
export async function allowRecords(page: Page, shot?: Shot) {
  await expect(page.getByRole("heading", { name: "Find your health information automatically" })).toBeVisible();
  await expect(page.getByText(/so you can review what we find instead of typing everything again/)).toBeVisible();
  // The detail sits one tap away.
  await expect(page.getByText("Where we look")).toBeHidden();
  await page.getByText("How this works").click();
  await expect(page.getByText("Where we look")).toBeVisible();
  if (shot) await shot(12, "records-consent");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Find my records" }).click();
  // The search takes a moment here (a fraction of the real time), so the patient moves on straight away.
  await expect(page.getByRole("heading", { name: "Finding your records…" })).toBeVisible();
  await page.getByRole("link", { name: "Continue with other steps while we search" }).click();
  await expect(page).toHaveURL(/\/home$/);
  // Home shows the search, then says the records are ready, without the patient waiting on it.
  await expect(prepRegion(page).getByText(/We'll let you know when they're ready|Your records are ready|Nothing turned up in the search/).first()).toBeVisible();
  await expect(prepRegion(page).getByText(/Your records are ready|Nothing turned up in the search/)).toBeVisible();
}

export async function tellStory(page: Page, persona: PersonaId, shot?: Shot) {
  const story = PERSONAS[persona].story;
  await openArea(page, "Tell your provider what you need help with");
  await expect(page.getByText(/An AI assistant organizes your answers for your provider/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Call or text 988" })).toHaveAttribute("href", "tel:988");
  await page.getByRole("button", { name: "Start" }).click();
  for (const promptId of [1, 2, 3, 4] as PromptId[]) {
    const prompt = INTAKE_PROMPTS[promptId - 1].text;
    await page.getByRole("textbox", { name: prompt }).fill(story.answers[promptId]);
    await page.getByRole("button", { name: "Next" }).click();
    const followUp = story.extract[promptId].followUpId;
    if (followUp) {
      const box = page.getByRole("textbox", { name: FOLLOW_UPS[followUp] });
      await expect(box).toBeVisible();
      if (promptId === 1 && shot) await shot(14, "story-follow-up");
      await box.fill(story.followUpAnswers[followUp]!);
      await page.getByRole("button", { name: "Next" }).click();
    }
  }
  await expect(page.getByRole("heading", { name: "Here's what I noted" })).toBeVisible();
  if (shot) await shot(15, "story-review");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page.getByText(story.summary)).toBeVisible();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  // The conversation leads into the check-in, the other half of telling the provider what's going on.
  await expect(page).toHaveURL(/\/home\/check-in$/);
}

export async function checkIn(page: Page, persona: PersonaId, shot?: Shot) {
  const answers = PERSONAS[persona].checkIn;
  await expect(page).toHaveURL(/\/home\/check-in$/);
  await expect(page.getByRole("link", { name: "Call or text 988" })).toBeVisible();
  const tap = async (label: string) => page.getByRole("button", { name: label, exact: true }).click();
  for (const [i, v] of answers.gad7.entries()) {
    if (i === 0 && shot) await shot(16, "check-in");
    await tap(i < 7 ? FREQUENCY_OPTIONS[v] : DIFFICULTY_OPTIONS[v]);
  }
  for (const [i, v] of answers.phq9.entries()) {
    await tap(i < 9 ? FREQUENCY_OPTIONS[v] : DIFFICULTY_OPTIONS[v]);
    if (i === 8 && v > 0) {
      // A fixed rule: help shows at once, and the visit stays booked.
      await expect(page.getByRole("heading", { name: "Help is available right now" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Call 988" })).toBeInViewport();
      if (shot) await shot(17, "check-in-safety");
      await page.getByRole("button", { name: "Continue" }).click();
    }
  }
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\p{Extended_Pictographic}|congrat|yay|awesome/iu); // a plain thank-you (TAC-47)
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

/** The retrieved health summary: review and confirm, then straight on to health basics. */
export async function confirmFound(page: Page, persona: PersonaId, shot?: Shot) {
  const p = PERSONAS[persona];
  const found = p.records.length + p.medications.length;
  await openStep(page, found ? /^Review the health information we found/ : /^Tell us your medications/);
  await expect(page).toHaveURL(/\/home\/records$/);
  if (found) {
    await expect(page.getByRole("heading", { level: 1, name: "Review the health information we found" })).toBeVisible();
    await expect(page.getByText(`We found ${found} item${found === 1 ? "" : "s"}`, { exact: false })).toBeVisible();
    for (const r of p.records) await expect(page.getByText(r.label, { exact: false }).first()).toBeVisible();
    for (const m of p.medications) await expect(page.getByText(m.name)).toBeVisible();
  } else {
    await expect(page.getByText(/didn't find records/)).toBeVisible();
  }
  if (persona === "maya") {
    // A structured summary, with what may be outdated asked about first (feedback item 8).
    for (const section of ["Needs your confirmation", "Recent visits", "Conditions", "Allergies", "Other relevant history"]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
    await expect(page.getByRole("region", { name: "Needs your confirmation" })).toContainText("Hydroxyzine HCl");
    await expect(page.getByText(/Uncheck it if you've stopped taking it/)).toBeVisible();
  }
  if (!p.medications.length) await expect(page.getByText("No fills showed up in the last year.")).toBeVisible();
  for (const other of p.otherMedications) {
    await page.getByLabel("Medication name and dose").fill(other);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("button", { name: `Remove ${other}` })).toBeVisible();
  }
  if (shot) await shot(18, "confirm-found");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Confirm and continue" }).click();
  await expect(page).toHaveURL(/\/home\/essentials$/);
}

export async function essentials(page: Page, persona: PersonaId, shot?: Shot) {
  const e = PERSONAS[persona].essentials;
  await expect(page).toHaveURL(/\/home\/essentials$/);
  const yesNo = (v: string) => (v === "yes" ? "Yes" : "No");
  const freq = { never: "Never", occasionally: "Now and then", weekly: "Weekly", daily: "Daily" } as const;
  const group = (name: RegExp) => page.getByRole("radiogroup", { name });
  await group(/ever been in the hospital/).getByRole("radio", { name: yesNo(e.hospitalizedEver) }).click();
  const controlled = group(/controlled substances now/);
  if (persona === "jordan") {
    // Prefilled from the cash-paid stimulant he added (TAC-43).
    await expect(controlled.getByRole("radio", { name: "Yes" })).toHaveAttribute("aria-checked", "true");
  } else {
    await controlled.getByRole("radio", { name: yesNo(e.controlledNow) }).click();
  }
  if (persona === "maya") await expect(page.getByText("Penicillin", { exact: true })).toBeVisible();
  await group(/^Alcohol$/).getByRole("radio", { name: freq[e.alcohol] }).click();
  await group(/^Cannabis$/).getByRole("radio", { name: freq[e.cannabis] }).click();
  await group(/other substances/).getByRole("radio", { name: yesNo(e.otherSubstances) }).click();
  await page.getByLabel("Name", { exact: true }).fill(e.contactName);
  await page.getByLabel("Phone", { exact: true }).fill(e.contactPhone);
  if (shot) await shot(19, "essentials");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function choosePharmacy(page: Page, persona: PersonaId, shot?: Shot) {
  const p = PERSONAS[persona];
  if (p.pharmacyFromHistory) await expect(prepRegion(page).getByText("We found Riverside Pharmacy in your history")).toBeVisible();
  await openStep(page, /^Choose your pharmacy/);
  if (p.pharmacyFromHistory) {
    await expect(page.getByRole("radio", { checked: true })).toContainText("Riverside Pharmacy");
    await expect(page.getByText(/Prefilled from your pharmacy history/)).toBeVisible();
    // It can be changed (TAC-23), and changed back.
    await page.getByRole("radio", { name: /Barton Creek Drug/ }).click();
    await expect(page.getByRole("radio", { checked: true })).toContainText("Barton Creek Drug");
    await page.getByRole("radio", { name: /Riverside Pharmacy/ }).click();
  } else {
    const names: Record<string, string> = { "heights-houston": "Heights Community Pharmacy", "mesa-elpaso": "Mesa Street Pharmacy" };
    await page.getByRole("radio", { name: new RegExp(names[p.pharmacyChoice]) }).click();
  }
  if (shot) await shot(20, "pharmacy");
  await page.getByRole("button", { name: "Use this pharmacy" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function haveVisit(page: Page, persona: PersonaId, shot?: Shot, atVisit?: () => Promise<void>) {
  // Ready: joining leads the page, and the finished prep folds away.
  await expect(page.getByRole("heading", { level: 1, name: /^You're ready for your visit/ })).toBeVisible();
  await expect(prepRegion(page).getByText("All 4 done. Review what you shared.")).toBeVisible();
  expect(await topOf(page.getByRole("region", { name: "Your visit", exact: true }))).toBeLessThan(await topOf(prepRegion(page)));
  if (shot) await shot(21, "home-ready");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page).toHaveURL(/\/visit$/);
  await expect(page.getByRole("heading", { name: "What your provider has" })).toBeVisible();
  await expect(page.getByText(PERSONAS[persona].story.summary)).toBeVisible();
  await expect(page.getByText(/GAD-7 \(anxiety\): \d+/)).toBeVisible();
  if (atVisit) await atVisit();
  if (shot) await shot(22, "visit-waiting");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Start video" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  if (shot) await shot(23, "visit-video");
  await page.getByRole("button", { name: "End visit" }).click();
  await expect(page).toHaveURL(/\/after$/);
}

const PHARMACY_NAME: Record<string, string> = { maya: "Riverside Pharmacy", jordan: "Heights Community Pharmacy" };

/** The care handoff after the first visit, then the ongoing-care home it leads to (feedback items 10 to 13). */
export async function afterVisit(page: Page, persona: PersonaId, shot?: Shot) {
  const p = PERSONAS[persona];
  const rx = p.visit.prescription;
  await expect(page.getByRole("heading", { level: 1, name: "Your first visit is complete" })).toBeVisible();
  for (const section of ["What you talked about", "Your care plan", "What happens next"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
  await expect(page.getByText(p.visit.plan[0])).toBeVisible();
  await expect(page.getByText("When to contact your care team")).toBeVisible();
  if (rx) {
    const card = page.getByRole("region", { name: "Your prescription" });
    await expect(card).toContainText(rx.name);
    await expect(card).toContainText(PHARMACY_NAME[persona]);
    await expect(card).toContainText("Sent to pharmacy");
    await expect(card).toContainText(rx.change === "new" ? "New prescription" : "Renewed prescription");
    await card.getByText("View prescription details").click();
    await expect(card.getByText(rx.quantity)).toBeVisible();
    if (rx.controlled) await expect(card).toContainText("prescription monitoring record");
  } else {
    await expect(page.getByRole("heading", { name: "Your prescription" })).toHaveCount(0);
    await expect(page.getByText("No new prescription today.")).toBeVisible();
  }
  if (shot) await shot(24, "after");
  await expectAccessible(page);
  await page.getByRole("region", { name: "Book your follow-up" }).getByRole("button").first().click();
  await expect(page.getByRole("heading", { name: "Your follow-up is booked" })).toBeVisible();

  // Home is now the ongoing-care dashboard: the next appointment leads, and no prep is left.
  await page.getByRole("link", { name: "Return to home" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Your care with / })).toBeVisible();
  await expect(prepRegion(page)).toHaveCount(0);
  const next = page.getByRole("region", { name: "Next appointment" });
  await expect(next).toBeVisible();
  for (const section of ["Your care plan", "Recent visit", "Messages and tasks"]) await expect(page.getByRole("heading", { name: section })).toBeVisible();
  if (rx) await expect(page.getByText(`Pick up your prescription at ${PHARMACY_NAME[persona]} when they text you`)).toBeVisible();
  if (shot) await shot(25, "home-ongoing");
  await expectAccessible(page);
  // Manage the appointment: move it to another offered time.
  const before = await next.locator("p").first().innerText();
  await next.getByRole("button", { name: "Change time" }).click();
  await next.getByRole("button").first().click();
  await expect(next.getByRole("button", { name: "Change time" })).toBeVisible();
  expect(await next.locator("p").first().innerText()).not.toBe(before);
  await page.getByRole("link", { name: "View visit summary" }).click();
  await expect(page).toHaveURL(/\/after$/);
}

/** The whole "Arrive ready" half, in the order a patient meets it. */
export async function arriveReady(page: Page, persona: PersonaId, shot?: Shot, atVisit?: () => Promise<void>) {
  await verifyId(page, shot);
  await allowRecords(page, shot);
  await tellStory(page, persona, shot);
  await checkIn(page, persona, shot);
  await confirmFound(page, persona, shot);
  await essentials(page, persona, shot);
  await choosePharmacy(page, persona, shot);
  await haveVisit(page, persona, shot, atVisit);
  await afterVisit(page, persona, shot);
}
