import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import type { PersonaId } from "@/domain/types";
import { FIT_QUESTIONS } from "@/rules/eligibility";

/** Saves a full-page screenshot to test-results/screens/<patient>/<viewport>/<nn>-<stage>.png (TRD 10.3). */
export async function shoot(page: Page, info: TestInfo, patient: string, nn: number, stage: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0)); // sticky header and panel draw where they belong
  await page.screenshot({
    path: `test-results/screens/${patient}/${info.project.name}/${String(nn).padStart(2, "0")}-${stage}.png`,
    fullPage: true,
  });
}

/** Zero serious or critical accessibility violations on every stage screen (TRD 10.3). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** No horizontal scroll at phone width (V1). */
export async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Starts a fresh journey as a demo patient through the demo controls, the way a reviewer would. */
export async function startAs(page: Page, persona?: PersonaId) {
  await page.goto("/");
  await page.getByRole("button", { name: "Demo controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  if (persona) {
    const p = PERSONAS[persona];
    await dialog.getByRole("button", { name: new RegExp(`^${p.firstName} ${p.lastName}`) }).click();
  } else {
    await dialog.getByRole("button", { name: /^No demo patient/ }).click();
  }
  await expect(page).toHaveURL(/\/start\/fit$/);
}

/** Answers the six fit questions by tapping, checking each question appears before answering it. */
export async function answerFit(page: Page, answers: Partial<Record<(typeof FIT_QUESTIONS)[number]["id"], boolean>>) {
  for (const q of FIT_QUESTIONS) {
    const value = answers[q.id] ?? q.continueWith;
    await expect(page.getByRole("heading", { name: q.text })).toBeVisible();
    await page.getByRole("button", { name: value ? "Yes" : "No", exact: true }).click();
    if (value !== q.continueWith) return; // screened out or crisis: stop here
  }
}

export async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

/** Taps "Fill this step" in the demo controls until the page reaches `until`. */
export async function fillUntil(page: Page, until: RegExp, times = 24) {
  await page.getByRole("button", { name: "Demo controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  for (let i = 0; i < times && !until.test(page.url()); i++) {
    await dialog.getByRole("button", { name: "Fill this step" }).click();
    await page.waitForTimeout(450);
  }
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(until);
}

/** No confetti, emoji, or celebration copy around screening and questionnaires (TAC-47). */
export async function expectNoCelebration(page: Page) {
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  expect(text).not.toMatch(/congrat|yay|awesome|woohoo|you did it|on a roll/i);
}

/** Waits for the booking review, ticks the three agreements, and books. */
export async function agreeAndBook(page: Page) {
  await expect(page).toHaveURL(/\/start\/book$/);
  const boxes = page.getByRole("checkbox");
  await expect(boxes).toHaveCount(3);
  for (const box of await boxes.all()) await box.check();
  await page.getByRole("button", { name: "Book my visit" }).click();
}
