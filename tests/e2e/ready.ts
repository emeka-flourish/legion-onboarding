// "Arrive ready" steps, tapped through the way a patient would (TRD 10.3).
import { expect, type Page, type TestInfo } from "@playwright/test";
import { FOLLOW_UPS, INTAKE_PROMPTS, type PromptId } from "@/data/intake";
import { PERSONAS } from "@/data/personas";
import { DIFFICULTY_OPTIONS, FREQUENCY_OPTIONS } from "@/data/questionnaires";
import type { PersonaId } from "@/domain/types";
import { expectAccessible, shoot } from "./helpers";

type Shot = (nn: number, stage: string) => Promise<void>;

export function shooter(page: Page, info: TestInfo, patient: string): Shot {
  return (nn, stage) => shoot(page, info, patient, nn, stage);
}

async function openTask(page: Page, title: RegExp | string) {
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("link", { name: title }).click();
}

export async function verifyId(page: Page, shot?: Shot) {
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("region", { name: "Get ready for your visit" }).getByRole("link").first()).toContainText("Verify your ID"); // ID first
  await openTask(page, /Verify your ID/);
  await expect(page).toHaveURL(/\/home\/id$/);
  // Nothing runs until the explicit tap (consent before retrieval).
  await expect(page.getByRole("button", { name: "Start ID check" })).toBeVisible();
  await page.getByRole("button", { name: "Start ID check" }).click();
  await expect(page.getByText("Your ID is verified")).toBeVisible();
  await expect(page.getByText("ID check · Persona (simulated)")).toBeVisible();
  for (const field of ["Legal name", "Date of birth", "Sex at birth", "Address"]) await expect(page.getByText(field, { exact: true })).toBeVisible();
  if (shot) await shot(11, "id");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Looks right" }).click();
}

export async function allowRecords(page: Page, shot?: Shot) {
  await openTask(page, /Let us look for your records/);
  await expect(page.getByRole("heading", { name: "Can we look for your records?" })).toBeVisible();
  if (shot) await shot(12, "records-consent");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Allow the search" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Searching health record networks|Checking pharmacy fill history/ }).first()).toBeVisible();
  await expect(page.getByText(/Records we found|didn.t find records/).first()).toBeVisible();
  await page.getByRole("link", { name: "Your checklist" }).or(page.getByRole("button", { name: "Your checklist" })).click();
}

export async function tellStory(page: Page, persona: PersonaId, shot?: Shot) {
  const story = PERSONAS[persona].story;
  await openTask(page, /Tell us what's going on/);
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
      if (promptId === 1 && shot) await shot(13, "story-follow-up");
      await box.fill(story.followUpAnswers[followUp]!);
      await page.getByRole("button", { name: "Next" }).click();
    }
  }
  await expect(page.getByRole("heading", { name: "Here's what I noted" })).toBeVisible();
  if (shot) await shot(14, "story-review");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page.getByText(story.summary)).toBeVisible();
  if (shot) await shot(15, "story-summary");
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function checkIn(page: Page, persona: PersonaId, shot?: Shot) {
  const answers = PERSONAS[persona].checkIn;
  await openTask(page, /Answer the check-in questions/);
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
  await page.getByRole("button", { name: "Back to your checklist" }).click();
}

export async function confirmFound(page: Page, persona: PersonaId, shot?: Shot) {
  const p = PERSONAS[persona];
  await openTask(page, /Confirm your medications/);
  for (const r of p.records) await expect(page.getByText(r.label, { exact: false }).first()).toBeVisible();
  for (const m of p.medications) await expect(page.getByText(m.name)).toBeVisible();
  if (!p.records.length) await expect(page.getByText(/didn't find records/)).toBeVisible();
  if (!p.medications.length) await expect(page.getByText("No fills showed up in the last year.")).toBeVisible();
  for (const other of p.otherMedications) {
    await page.getByLabel("Medication name and dose").fill(other);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("button", { name: `Remove ${other}` })).toBeVisible();
  }
  if (shot) await shot(18, "confirm-found");
  await expectAccessible(page);
  await page.getByRole("button", { name: /^Confirm/ }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function choosePharmacy(page: Page, persona: PersonaId, shot?: Shot) {
  const p = PERSONAS[persona];
  await openTask(page, /Choose your pharmacy/);
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
  if (shot) await shot(19, "pharmacy");
  await page.getByRole("button", { name: "Use this pharmacy" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function essentials(page: Page, persona: PersonaId, shot?: Shot) {
  const e = PERSONAS[persona].essentials;
  await openTask(page, /A few health basics/);
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
  if (shot) await shot(20, "essentials");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

export async function haveVisit(page: Page, persona: PersonaId, shot?: Shot, atVisit?: () => Promise<void>) {
  await expect(page.getByText("You're ready for your visit")).toBeVisible();
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

export async function afterVisit(page: Page, persona: PersonaId, shot?: Shot) {
  const p = PERSONAS[persona];
  await expect(page.getByText("Your first visit is complete")).toBeVisible();
  await expect(page.getByText(p.visit.plan[0])).toBeVisible();
  const pharmacyNames: Record<string, string> = { maya: "Riverside Pharmacy", jordan: "Heights Community Pharmacy" };
  if (p.visit.prescribes) {
    await expect(page.getByRole("heading", { name: "Your prescription was sent" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Your prescription was sent" })).toContainText(pharmacyNames[persona]);
  }
  else await expect(page.getByRole("heading", { name: "Your prescription was sent" })).toHaveCount(0);
  if (shot) await shot(24, "after");
  await expectAccessible(page);
  await page.getByRole("region", { name: "Book your follow-up" }).getByRole("button").first().click();
  await expect(page.getByRole("heading", { name: "Your follow-up is booked" })).toBeVisible();
}

/** The whole "Arrive ready" half, in the approved checklist order. */
export async function arriveReady(page: Page, persona: PersonaId, shot?: Shot, atVisit?: () => Promise<void>) {
  await verifyId(page, shot);
  await allowRecords(page, shot);
  await tellStory(page, persona, shot);
  await checkIn(page, persona, shot);
  await confirmFound(page, persona, shot);
  await choosePharmacy(page, persona, shot);
  await essentials(page, persona, shot);
  await haveVisit(page, persona, shot, atVisit);
  await afterVisit(page, persona, shot);
}
