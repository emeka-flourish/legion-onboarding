import { expect, test } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { answerFit, expectAccessible, shoot, startAs } from "./helpers";

// Sam Rivera: El Paso, so every time is in Mountain Time. His plan lookup finds nothing, his member ID shows the
// plan inactive, and he switches to self-pay with a plain next step at each point (exception 3).
const sam = PERSONAS.sam;

test("Sam books fast: Mountain Time, lookup not found, inactive plan, self-pay", async ({ page }, info) => {
  await startAs(page, "sam");
  await answerFit(page, sam.fit);

  await page.getByRole("button", { name: "Depression" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /I'd like an evaluation for depression/ }).click();
  await page.getByRole("radio", { name: "Aetna" }).click();
  await page.getByRole("button", { name: "See providers" }).click();

  await expect(page).toHaveURL(/\/start\/providers$/);
  await expect(page.getByRole("button", { name: "Weekday afternoons", pressed: true })).toBeVisible();
  await expect(page.getByText(/your time zone, Mountain Time/)).toBeVisible();
  const card = page.getByRole("article").first();
  await expect(card.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M M[DS]T/ }).first()).toBeVisible();
  await shoot(page, info, "sam", 5, "providers");
  await card.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await card.getByRole("button", { name: /^Hold .*M[DS]T$/ }).click();

  await page.getByLabel("First name").fill(sam.firstName);
  await page.getByRole("button", { name: /^Use \(915\) 555-01\d\d$/ }).click();
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByRole("button", { name: "Use this code" }).click();
  await page.getByRole("button", { name: "Verify and continue" }).click();

  // "Look it up for me" says what is shared, and with whom, before anything runs.
  await expect(page).toHaveURL(/\/start\/coverage$/);
  await page.getByRole("button", { name: "Look it up for me" }).click();
  await expect(page.getByText(/we'll share your first name \(Sam\), date of birth, and state \(Texas\)/)).toBeVisible();
  await page.getByLabel("Date of birth").fill("05212004");
  await shoot(page, info, "sam", 7, "coverage-consent");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Share and look up my plan" }).click();
  await expect(page.getByText("We couldn't find your plan with those details")).toBeVisible();
  await shoot(page, info, "sam", 8, "coverage-not-found");
  await page.getByRole("button", { name: "Enter my member ID instead" }).click();

  await page.getByLabel("Member ID").fill(sam.coverage.memberId);
  await page.getByLabel("Date of birth").fill("05212004");
  await page.getByRole("button", { name: "Check my coverage" }).click();
  await expect(page.getByText("Your Aetna plan isn't active")).toBeVisible();
  await expect(page.getByText(/ended on September 30, 2026/)).toBeVisible();
  await shoot(page, info, "sam", 9, "coverage-inactive");
  await expectAccessible(page);
  await page.getByRole("button", { name: /Use self-pay/ }).click();

  await expect(page).toHaveURL(/\/start\/book$/);
  await expect(page.getByText("$250 for this first visit, $150 for follow-ups (self-pay)")).toBeVisible();
  await expect(page.getByText(/M[DS]T$/).first()).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await shoot(page, info, "sam", 10, "book");
  await page.getByRole("button", { name: "Book my visit" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText(/M[DS]T/)).toBeVisible();
});
