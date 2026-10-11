import { expect, test } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { answerFit, expectAccessible, expectNoSideScroll, shoot, startAs } from "./helpers";

// Jordan Ellis: self-pay, ADHD medication, free only mornings and weekends. No insurance wording may appear
// after he chooses "No insurance" (TAC-06), and no openings in his times shows the nearest ones (exception 4).
const jordan = PERSONAS.jordan;
const INSURANCE_WORDS = /insurance|copay|in network|member id|coverage/i;

test("Jordan books fast: self-pay pricing, no openings in his times, no insurance wording", async ({ page }, info) => {
  await startAs(page, "jordan");
  await answerFit(page, jordan.fit);

  await expect(page).toHaveURL(/\/start\/needs$/);
  await page.getByRole("button", { name: "ADHD" }).click();
  await expect(page.getByText(/Stimulant prescriptions need a verified ID/)).toBeVisible();
  await shoot(page, info, "jordan", 2, "needs");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/start\/help$/);
  await page.getByRole("button", { name: /I was diagnosed with ADHD and need medication support/ }).click();

  await expect(page).toHaveURL(/\/start\/pay$/);
  await page.getByRole("radio", { name: "No insurance" }).click();
  await expect(page.getByText("Self-pay is $250 for your first visit and $150 for follow-ups.")).toBeVisible();
  await shoot(page, info, "jordan", 4, "pay");
  await page.getByRole("button", { name: "See providers" }).click();

  await expect(page).toHaveURL(/\/start\/providers$/);
  await expect(page.getByRole("button", { name: "Weekday mornings", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Weekends", pressed: true })).toBeVisible();
  await expect(page.getByText("No openings in your chosen times over the next two weeks")).toBeVisible();
  await page.getByRole("checkbox", { name: "Text me if an earlier time opens up" }).check();
  await expect(page.getByRole("checkbox", { name: "Text me if an earlier time opens up" })).toBeChecked();
  await expect(page.getByRole("article").first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(INSURANCE_WORDS);
  await expect(page.locator("aside")).not.toContainText(INSURANCE_WORDS);
  await shoot(page, info, "jordan", 5, "providers");
  await expectAccessible(page);
  if (info.project.name === "mobile") await expectNoSideScroll(page);
  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await card.getByRole("button", { name: /^Hold / }).click();

  await expect(page).toHaveURL(/\/start\/hold$/);
  await page.getByLabel("First name").fill(jordan.firstName);
  await page.getByRole("button", { name: /^Use \(713\) 555-01\d\d$/ }).click();
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByRole("button", { name: "Use this code" }).click();
  await page.getByRole("button", { name: "Verify and continue" }).click();

  // Self-pay goes straight from the account to booking: no coverage step.
  await expect(page).toHaveURL(/\/start\/book$/);
  await expect(page.getByText("$250 for this first visit, $150 for follow-ups (self-pay)")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(INSURANCE_WORDS);
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await shoot(page, info, "jordan", 8, "book");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Book my visit" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("Your visit is booked")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(INSURANCE_WORDS);
});
