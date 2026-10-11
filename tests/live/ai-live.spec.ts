import { expect, test } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { fillUntil, startAs } from "../e2e/helpers";

// TAC-29 in the real screens: with a provider key in .env.local, AI results are tagged live with that provider.
test("live AI: preference chips and a conversation answer carry a live tag", async ({ page }) => {
  const maya = PERSONAS.maya;
  await startAs(page, "maya");
  await fillUntil(page, /\/start\/providers$/);
  await page.getByRole("textbox", { name: "Anything else that matters to you" }).fill(maya.preferenceNote!);
  await page.getByRole("button", { name: "Update my matches" }).click();
  await expect(page.getByText(/^AI · live \((OpenAI|Anthropic|Google)\)$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Speaks Spanish" })).toBeVisible();

  await fillUntil(page, /\/home$/);
  await page.getByRole("link", { name: /Tell us what's going on/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("textbox").fill(maya.story.answers[1]);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Here's what I noted" }).getByText(/^AI · live \(/)).toBeVisible();
});
