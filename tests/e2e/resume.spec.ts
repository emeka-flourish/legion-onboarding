import { expect, test } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { answerFit, shoot, startAs } from "./helpers";

// Two browser contexts act as two devices: the phone that held the time, and a laptop later (TRD 10.3).
test("a patient who held a time can resume on another device with their phone number", async ({ page, browser }, info) => {
  const maya = PERSONAS.maya;
  await startAs(page, "maya");
  await answerFit(page, maya.fit);
  await page.getByRole("button", { name: "Anxiety" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /I'd like an evaluation/ }).click();
  await page.getByRole("radio", { name: "Blue Cross Blue Shield of Texas" }).click();
  await page.getByRole("button", { name: "See providers" }).click();
  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await card.getByRole("button", { name: /^Hold / }).click();
  await page.getByLabel("First name").fill(maya.firstName);
  const useNumber = page.getByRole("button", { name: /^Use \(512\) 555-01\d\d$/ });
  const phone = (await useNumber.textContent())!.replace(/^Use /, "");
  await useNumber.click();
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByRole("button", { name: "Use this code" }).click();
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/start\/coverage$/);

  const laptop = await browser.newContext(info.project.use);
  const other = await laptop.newPage();
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "See a Texas psychiatric provider by video" })).toBeVisible();
  await shoot(other, info, "welcome", 1, "welcome");
  await other.getByRole("link", { name: "Continue with your phone" }).click();
  await other.getByLabel("Mobile number").fill(phone);
  await other.getByRole("button", { name: "Text me a code" }).click();
  await expect(other.locator("main")).not.toContainText(/anxiety|blue cross|evaluation/i);
  await shoot(other, info, "resume", 1, "code");
  await other.getByRole("button", { name: "Use this code" }).click();
  await other.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(other).toHaveURL(/\/start\/coverage$/);
  await expect(other.getByRole("heading", { name: "Let's confirm your coverage and cost" })).toBeVisible();
  await laptop.close();
});

test("an unknown number gets the same answer, so nobody can probe for accounts", async ({ page }) => {
  await page.goto("/resume");
  await page.getByLabel("Mobile number").fill("(512) 555-0199");
  await page.getByRole("button", { name: "Text me a code" }).click();
  await expect(page.getByText("If that number has a Legion account, we sent it a 6-digit code.")).toBeVisible();
  await expect(page.getByText("Demo code")).toHaveCount(0);
});
