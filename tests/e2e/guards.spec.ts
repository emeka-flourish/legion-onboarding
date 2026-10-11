import { expect, test, type Page } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { FOLLOW_UPS, INTAKE_PROMPTS } from "@/data/intake";
import { FIT_QUESTIONS } from "@/rules/eligibility";
import { agreeAndBook, answerFit, expectAccessible, shoot, startAs } from "./helpers";

async function fillWithDemoControls(page: Page, until: RegExp) {
  await page.getByRole("button", { name: "Demo controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  for (let i = 0; i < 20 && !until.test(page.url()); i++) {
    await dialog.getByRole("button", { name: "Fill this step" }).click();
    await page.waitForTimeout(500);
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
  await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
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

test("the ID check and the records search run only after an explicit tap, and 988 stays in view", async ({ page }) => {
  await startAs(page, "maya");
  await fillWithDemoControls(page, /\/home$/);
  const journey = async () => (await (await page.request.get("/api/journey")).json()).journey;

  await page.getByRole("link", { name: /Verify your ID/ }).click();
  await expect(page.getByRole("button", { name: "Start ID check" })).toBeVisible();
  expect((await journey()).readiness.tasks.identity).toBe("todo");
  await page.getByRole("button", { name: "Start ID check" }).click();
  await expect(page.getByText("Your ID is verified")).toBeVisible();
  await page.getByRole("button", { name: "Looks right" }).click();

  await page.getByRole("link", { name: /Let us look for your records/ }).click();
  await expect(page.getByRole("button", { name: "Allow the search" })).toBeVisible();
  expect((await journey()).jobs.records).toBeUndefined();
  await page.getByRole("button", { name: "Allow the search" }).click();
  await expect(page.getByText(/Records we found/)).toBeVisible();
  expect((await journey()).jobs.records).toBeDefined();
  await page.getByRole("button", { name: "Your checklist" }).click();

  for (const task of [/Tell us what's going on/, /Answer the check-in questions/]) {
    await page.getByRole("link", { name: task }).click();
    await page.mouse.wheel(0, 4000);
    await expect(page.getByRole("link", { name: "Call or text 988" })).toBeInViewport();
    await page.getByRole("button", { name: "Your checklist" }).click();
  }
});

test("crisis language in the conversation shows help at once and keeps the visit booked (TAC-19)", async ({ page }) => {
  await startAs(page, "jordan");
  await fillWithDemoControls(page, /\/home$/);
  await page.getByRole("link", { name: /Tell us what's going on/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("textbox").fill("Some days I think everyone would be better off dead without me.");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Help is available right now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 988" })).toBeInViewport();
  await expect(page.getByText("Your visit is still booked.", { exact: false })).toBeVisible();
  const journey = (await (await page.request.get("/api/journey")).json()).journey;
  expect(journey.readiness.safetyFlags).toEqual([expect.objectContaining({ type: "crisis_language" })]);
  expect(journey.stage).toBe("home");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("textbox", { name: /How long has this been happening/ })).toBeVisible();
});

test("coverage confirmed after booking follows through on the home page", async ({ page }, info) => {
  await startAs(page, "sam");
  await page.getByRole("button", { name: "Demo controls" }).click();
  await page.getByRole("dialog", { name: "Demo controls" }).getByRole("switch", { name: /Make the insurer slow/ }).click();
  await expect(page.getByRole("dialog", { name: "Demo controls" }).getByRole("switch", { name: /Make the insurer slow/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await fillWithDemoControls(page, /\/start\/coverage$/);

  await page.getByLabel("Member ID").fill(PERSONAS.sam.coverage.memberId);
  await page.getByLabel("Date of birth").fill("05212004");
  await page.getByRole("button", { name: "Check my coverage" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Checking your coverage with Aetna" })).toBeVisible();
  await page.getByRole("button", { name: "Book now, confirm later" }).click();
  await expect(page).toHaveURL(/\/start\/book$/);
  await expect(page.getByText(/We'll confirm your exact cost before your visit/)).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Book my visit" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("We're still confirming your coverage with Aetna")).toBeVisible();
  await shoot(page, info, "coverage-later", 1, "pending");
  await expect(page.getByText("Your Aetna plan isn't active")).toBeVisible({ timeout: 20_000 });
  await shoot(page, info, "coverage-later", 2, "inactive");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Keep my visit with self-pay" }).click();
  await expect(page.getByText("Your Aetna plan isn't active")).toHaveCount(0);
  await expect(page.getByText("$250 for this first visit, $150 for follow-ups (self-pay)")).toBeVisible();
});

test("a time taken a moment earlier offers the next times, with no error screen (TAC-15)", async ({ page }) => {
  await startAs(page, "maya");
  await fillWithDemoControls(page, /\/start\/providers$/);
  await page.getByRole("button", { name: "Demo controls" }).click();
  await page.getByRole("dialog", { name: "Demo controls" }).getByRole("switch", { name: /Make the chosen time get taken/ }).click();
  await page.keyboard.press("Escape");
  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await card.getByRole("button", { name: /^Hold / }).click();
  await expect(page.getByText("That time was just booked by someone else")).toBeVisible();
  await expect(page).toHaveURL(/\/start\/providers$/);
  await page.getByRole("status").filter({ hasText: "That time was just booked" }).getByRole("button").first().click();
  await expect(page).toHaveURL(/\/start\/hold$/);
});

test("a plan confirmed after booking shows its confirmed cost on the home page (TAC-48)", async ({ page }) => {
  await startAs(page, "maya");
  await page.getByRole("button", { name: "Demo controls" }).click();
  await page.getByRole("dialog", { name: "Demo controls" }).getByRole("switch", { name: /Make the insurer slow/ }).click();
  await page.keyboard.press("Escape");
  await fillWithDemoControls(page, /\/start\/coverage$/);
  await page.getByLabel("Member ID").fill(PERSONAS.maya.coverage.memberId);
  await page.getByLabel("Date of birth").fill("03141997");
  await page.getByRole("button", { name: "Check my coverage" }).click();
  await page.getByRole("button", { name: "Book now, confirm later" }).click();
  await agreeAndBook(page);
  await expect(page.getByText("We're still confirming your coverage with Blue Cross Blue Shield of Texas")).toBeVisible();
  await expect(page.getByText("Your coverage is confirmed")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/\$40 copay for this visit/).first()).toBeVisible();
});

test.describe("at 375 × 812", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("every fit question shows both answers without scrolling, the continuing answer first (TAC-03)", async ({ page }) => {
    await startAs(page);
    for (const q of FIT_QUESTIONS) {
      await expect(page.getByRole("heading", { name: q.text })).toBeVisible();
      const answers = page.getByRole("region", { name: q.text }).getByRole("button");
      await expect(answers.nth(0)).toBeInViewport({ ratio: 1 });
      await expect(answers.nth(1)).toBeInViewport({ ratio: 1 });
      await expect(answers.nth(0)).toHaveText(q.continueWith ? "Yes" : "No");
      await answers.nth(0).click();
    }
    await expect(page).toHaveURL(/\/start\/needs$/);
  });
});

test("with RxNorm unreachable, the conversation carries on and simply shows no match (TAC-35)", async ({ page }) => {
  await startAs(page, "maya");
  await fillWithDemoControls(page, /\/home$/);
  const lookup = await (await page.request.get("/api/rxnorm?term=Hydroxyzine")).json();
  expect(lookup).toEqual({ matches: [], meta: { mode: "unavailable", source: "RxNorm", reason: "unreachable" } });

  const story = PERSONAS.maya.story;
  await page.getByRole("link", { name: /Tell us what's going on/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  for (const promptId of [1, 2, 3] as const) {
    await page.getByRole("textbox", { name: INTAKE_PROMPTS[promptId - 1].text }).fill(story.answers[promptId]);
    await page.getByRole("button", { name: "Next" }).click();
    const followUp = story.extract[promptId].followUpId;
    if (followUp && promptId < 3) {
      await page.getByRole("textbox", { name: FOLLOW_UPS[followUp] }).fill(story.followUpAnswers[followUp]!);
      await page.getByRole("button", { name: "Next" }).click();
    }
  }
  // Prompt 3 named hydroxyzine: the note is there, no match is shown, and the conversation moves on.
  await expect(page.getByRole("status").filter({ hasText: "Here's what I noted" })).toContainText("Hydroxyzine");
  await expect(page.getByRole("textbox", { name: FOLLOW_UPS.med_side_effects })).toBeVisible();
  await expect(page.getByText(/Recognized as/)).toHaveCount(0);
});
