import { expect, test, type Page } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { startAs } from "./helpers";

// Every AI result shows a live or scripted tag, and every simulated result shows a "Simulated" tag (TRD 10.3).
async function fill(page: Page, until: RegExp, times = 12) {
  await page.getByRole("button", { name: "Demo controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  for (let i = 0; i < times && !until.test(page.url()); i++) {
    await dialog.getByRole("button", { name: "Fill this step" }).click();
    await page.waitForTimeout(300);
  }
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(until);
}

test("AI results carry an AI tag and simulated results a Simulated tag", async ({ page }) => {
  await startAs(page, "maya");
  await fill(page, /\/start\/providers$/);
  for (const card of await page.getByRole("article").all()) await expect(card.getByText("Simulated provider")).toBeVisible();
  await page.getByRole("textbox", { name: "Anything else that matters to you" }).fill(PERSONAS.maya.preferenceNote!);
  await page.getByRole("button", { name: "Update my matches" }).click();
  await expect(page.getByText(/^AI · (scripted|live \(\w+\))$/)).toBeVisible();

  await fill(page, /\/start\/coverage$/);
  await page.getByRole("button", { name: "Look it up for me" }).click();
  await expect(page.getByText("Simulated", { exact: true })).toBeVisible();

  await fill(page, /\/home$/);
  await expect(page.getByRole("region", { name: /Texts from Legion/ }).or(page.locator("section", { hasText: "Texts from Legion" })).getByText("Simulated", { exact: true })).toBeVisible();

  const prep = page.getByRole("region", { name: "Get ready for your visit" });
  await prep.getByRole("link", { name: /^Verify your identity/ }).click();
  await expect(page.getByText("Simulated", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Home" }).click();

  await prep.getByRole("link", { name: /^Tell your provider what you need help with/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("textbox").fill(PERSONAS.maya.story.answers[1]);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Here's what I noted" }).getByText(/^AI · /)).toBeVisible();
});
