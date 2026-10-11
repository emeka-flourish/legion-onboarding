import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoSideScroll, fillUntil, shoot, startAs } from "./helpers";

test("the journey view shows all five panels for a finished journey (TAC-42, TAC-56)", async ({ page }, info) => {
  await startAs(page, "maya");
  await fillUntil(page, /\/home$/);
  await page.getByRole("button", { name: "4, quite sure" }).click();
  await fillUntil(page, /\/after$/, 40);
  await page.getByRole("region", { name: "Book your follow-up" }).getByRole("button").first().click();
  await expect(page.getByRole("heading", { name: "Your follow-up is booked" })).toBeVisible();

  await page.goto("/journey");
  for (const title of ["This journey", "Funnel, counted per person", "Today versus the rebuild", "Data quality", "People in progress"]) {
    await expect(page.getByRole("heading", { name: new RegExp(title) })).toBeVisible();
  }
  const timeline = page.getByRole("list", { name: "Events in order" });
  await expect(timeline.getByText("Account created", { exact: true })).toBeVisible();
  await expect(timeline.getByText(/Linked to person per_/)).toBeVisible();
  await expect(timeline.getByText("System of record").first()).toBeVisible();
  await expect(timeline.getByText("First visit completed", { exact: true })).toBeVisible();

  const funnel = page.getByRole("region", { name: /Funnel, counted per person/ });
  await expect(funnel.getByText("First visit completed within 14 days, among eligible starters").first()).toBeVisible();
  await expect(funnel.getByText("Trust in the provider choice (median, 1 to 5)").first()).toBeVisible();
  await expect(funnel.getByText(/Invented cohort of 400 people/)).toBeVisible();

  const quality = page.getByRole("region", { name: "4. Data quality" });
  await expect(quality.getByText("Validation failures").locator("..")).toContainText("0");
  await expect(page.getByText(/Payment page reached/)).toBeVisible();
  await shoot(page, info, "journey-view", 1, "journey-view");
  await expectAccessible(page);
  if (info.project.name === "mobile") await expectNoSideScroll(page);
});

test("people in progress shows open safety flags, and Mark reviewed records the review (TAC-55)", async ({ page }, info) => {
  await startAs(page, "sam");
  await fillUntil(page, /\/home$/);
  // ID, records, the conversation, then the check-in, where Sam's PHQ-9 item 9 raises a flag.
  await page.getByRole("button", { name: "Demo controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  for (let i = 0; i < 4; i++) {
    await dialog.getByRole("button", { name: "Fill this step" }).click();
    await page.waitForTimeout(600);
  }
  await page.keyboard.press("Escape");
  const journey = (await (await page.request.get("/api/journey")).json()).journey;
  expect(journey.readiness.safetyFlags).toHaveLength(1);
  const shortId = journey.id.slice(-6);

  await page.goto("/journey");
  const row = page.getByRole("row").filter({ hasText: shortId });
  await expect(row).toContainText("PHQ-9 item 9");
  await expect(row).toContainText("Getting ready");
  await shoot(page, info, "journey-view", 2, "people-in-progress");
  await row.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(row).toContainText("None");
  const events = (await (await page.request.get("/api/journey-view")).json()).thisJourney.events as { name: string }[];
  expect(events.at(-1)!.name).toBe("safety_flag_reviewed");
});
