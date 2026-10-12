import { expect, test, type Page } from "@playwright/test";
import { FOLLOW_UPS, INTAKE_PROMPTS } from "@/data/intake";
import { PERSONAS } from "@/data/personas";
import { fillUntil, startAs } from "../e2e/helpers";

const maya = PERSONAS.maya;

/** Answers the four prompts with Maya's words. A live model picks its own follow-ups, so answer whichever comes. */
async function talkAsMaya(page: Page) {
  await page.getByRole("button", { name: "Start" }).click();
  const followUp = page.getByRole("textbox", { name: new RegExp(Object.values(FOLLOW_UPS).map((q) => q.replace(/[?.]/g, "\\$&")).join("|")) });
  for (const [i, prompt] of INTAKE_PROMPTS.entries()) {
    await page.getByRole("textbox", { name: prompt.text }).fill(maya.story.answers[prompt.id]);
    await page.getByRole("button", { name: "Next" }).click();
    const next = i < 3 ? page.getByRole("textbox", { name: INTAKE_PROMPTS[i + 1].text }) : page.getByRole("heading", { name: "Here's what I noted" });
    await expect(next.or(followUp)).toBeVisible();
    if (await followUp.isVisible()) {
      await followUp.fill("Mostly grogginess the next morning, and trouble falling asleep.");
      await page.getByRole("button", { name: "Next" }).click();
      await expect(next).toBeVisible();
    }
  }
}

// TAC-29 and TAC-35 in the real screens: live AI results carry a live tag, and a medication Maya mentions is
// recognized by the live RxNorm service.
test("live AI and live RxNorm: chips, conversation notes, and a recognized medication", async ({ page }) => {
  await startAs(page, "maya");
  await fillUntil(page, /\/start\/providers$/);
  await page.getByRole("textbox", { name: "Anything else that matters to you" }).fill(maya.preferenceNote!);
  await page.getByRole("button", { name: "Update my matches" }).click();
  await expect(page.getByText(/^AI · live \((OpenAI|Anthropic|Google)\)$/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Your preferences" })).toContainText("Speaks Spanish");

  await fillUntil(page, /\/home$/);
  await page.getByRole("region", { name: "Get ready for your visit" }).getByRole("link", { name: /^Tell your provider what you need help with/ }).click();
  await talkAsMaya(page);
  await expect(page.getByText(/^AI · live \(/).first()).toBeVisible();
  await expect(page.getByText(/Recognized as hydroxyzine/i).first()).toBeVisible();
  await expect(page.getByText("Live · RxNorm").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/live/screens/rxnorm-review.png", fullPage: true });

  // Saved with the note, the match reaches the provider's panel with its RxCUI.
  await page.getByRole("button", { name: "Looks right" }).click();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page).toHaveURL(/\/home\/check-in$/); // the conversation leads into the check-in
  await page.goto("/home");
  await fillUntil(page, /\/visit$/, 30);
  const panel = page.getByRole("region", { name: "What your provider has" });
  await expect(panel.getByText(/RxNorm: hydroxyzine · RxCUI 5553/i)).toBeVisible();
  await expect(panel.getByText("Live · RxNorm")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/live/screens/rxnorm-provider-panel.png", fullPage: true });
});

test("live RxNorm resolves the demo patients' medications to ingredients, never a strength", async ({ page }) => {
  await startAs(page, "jordan");
  await fillUntil(page, /\/home$/);
  const look = async (term: string) => (await (await page.request.get(`/api/rxnorm?term=${encodeURIComponent(term)}`)).json()) as {
    matches: { rxcui: string; name: string; tty: string; ingredient?: { name: string } }[];
    meta: { mode: string };
  };
  const salts = await look("Amphetamine salts XR 20 mg each morning");
  expect(salts.meta.mode).toBe("live");
  expect(salts.matches[0].name).toMatch(/amphetamine/i);
  expect(salts.matches[0].name).not.toMatch(/\bMG\b/);
  const brand = await look("Lexapro");
  expect(brand.matches[0]).toMatchObject({ tty: "BN", ingredient: { name: "escitalopram" } });
});
