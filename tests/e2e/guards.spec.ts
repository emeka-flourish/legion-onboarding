import { expect, test, type Page } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { answerFit, shoot, startAs } from "./helpers";

async function fillWithDemoControls(page: Page, until: RegExp) {
  await page.getByRole("button", { name: "Demo controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  for (let i = 0; i < 10 && !until.test(page.url()); i++) {
    await dialog.getByRole("button", { name: "Fill this step" }).click();
    await page.waitForTimeout(400);
  }
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(until);
}

test("the welcome back screen names the step and never a health detail", async ({ page }, info) => {
  await startAs(page, "maya");
  await answerFit(page, PERSONAS.maya.fit);
  await page.getByRole("button", { name: "Anxiety" }).click();
  await page.getByRole("button", { name: "Depression" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/start\/help$/);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Continue where you left off: choosing the kind of help.")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/anxiety|depression|adhd|evaluation|medication/i);
  await shoot(page, info, "welcome", 2, "welcome-back");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/start\/help$/);
});

test("the plan lookup asks before sharing anything, and date errors are only input errors", async ({ page }) => {
  await startAs(page, "sam");
  await fillWithDemoControls(page, /\/start\/coverage$/);

  // Consent before retrieval: nothing runs until the tap.
  await page.getByRole("button", { name: "Look it up for me" }).click();
  await expect(page.getByText(/Nothing is shared until you tap the button/)).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);

  // Date of birth: a problem shows next to the field in plain words, never as an age or eligibility decision.
  const dob = page.getByLabel("Date of birth");
  await dob.fill("13");
  await expect(page.getByText("The month should be 01 to 12.")).toBeVisible();
  await dob.fill("02302004");
  await expect(page.getByText("Please enter a real date, like 03/14/1997.")).toBeVisible();
  await dob.fill("01012099");
  await expect(page.getByText("That date is in the future. Please check it.")).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).not.toContainText(/\bage\b|eligib|18|too young|covered/i);
  await expect(page).toHaveURL(/\/start\/coverage$/);
});

test("the browser back button steps back one stage before booking", async ({ page }) => {
  await startAs(page, "jordan");
  await answerFit(page, PERSONAS.jordan.fit);
  await page.getByRole("button", { name: "ADHD" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/start\/help$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/start\/needs$/);
  await expect(page.getByRole("button", { name: "ADHD", pressed: true })).toBeVisible();
});
