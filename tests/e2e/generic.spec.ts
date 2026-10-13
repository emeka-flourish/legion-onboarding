import { expect, test, type Page } from "@playwright/test";
import { FOLLOW_UPS, INTAKE_PROMPTS } from "@/data/intake";
import { DIFFICULTY_OPTIONS, FREQUENCY_OPTIONS } from "@/data/questionnaires";
import { agreeAndBook, answerFit, expectAccessible, holdWithName, shoot, startAs } from "./helpers";

// A reviewer's own journey with no demo patient: every stage completes with generic invented results (TAC-53).
const ANSWERS = [
  "I've been feeling anxious and on edge for a few months, and I can't sleep well.",
  "It started last spring after I changed jobs.",
  "I tried therapy for a few months in 2023.",
  "I want to sleep better and feel calmer at work.",
];
const FOLLOW_UP_ANSWER = "Most nights I wake up around 3 a.m.";

async function answerConversation(page: Page) {
  await page.getByRole("button", { name: "Start" }).click();
  for (const [i, answer] of ANSWERS.entries()) {
    await page.getByRole("textbox", { name: INTAKE_PROMPTS[i].text }).fill(answer);
    await page.getByRole("button", { name: "Next" }).click();
    // The scripted extractor may pick one follow-up from the fixed bank; answer it if it does.
    const next = i < 3 ? page.getByRole("textbox", { name: INTAKE_PROMPTS[i + 1].text }) : page.getByRole("heading", { name: "Here's what I noted" });
    const followUp = page.getByRole("textbox", { name: new RegExp(Object.values(FOLLOW_UPS).map((q) => q.replace(/[?.]/g, "\\$&")).join("|")) });
    await expect(next.or(followUp)).toBeVisible();
    if (await followUp.isVisible()) {
      await followUp.fill(FOLLOW_UP_ANSWER);
      await page.getByRole("button", { name: "Next" }).click();
      await expect(next).toBeVisible();
    }
  }
}

test("a journey without a demo patient completes every stage with generic results", async ({ page }, info) => {
  const shot = (nn: number, stage: string) => shoot(page, info, "generic", nn, stage);
  await startAs(page);
  await answerFit(page, {});
  await page.getByRole("button", { name: "Anxiety" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /I'd like an evaluation for anxiety/ }).click();
  await page.getByRole("radio", { name: "Cigna" }).click();
  await page.getByRole("button", { name: "See providers" }).click();
  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await card.getByRole("button", { name: /^Hold / }).click();

  await holdWithName(page, "Alex", "Rivers", /^Use \(512\) 555-01\d\d$/);
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByRole("button", { name: "Use this code" }).click();
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.getByLabel("Member ID").fill("ABC1234567");
  await page.getByLabel("Date of birth").fill("01151990");
  await page.getByRole("button", { name: "Check my coverage" }).click();
  await expect(page.getByText("You're covered")).toBeVisible();
  await page.getByRole("button", { name: "Continue to booking" }).click();
  await agreeAndBook(page);
  await expect(page.getByRole("heading", { name: "You're booked, Alex" })).toBeVisible();
  await shot(1, "home");

  // The ID confirms the name given at the hold, then leads into the records step.
  const prep = page.getByRole("region", { name: "Get ready for your visit" });
  await prep.getByRole("link", { name: /^Verify your identity/ }).click();
  await page.getByRole("button", { name: "Start ID check" }).click();
  await expect(page.getByText("Alex Rivers")).toBeVisible();
  await page.getByRole("button", { name: "Looks right" }).click();

  await page.getByRole("button", { name: "Find my records" }).click();
  await expect(page.getByRole("heading", { name: "Review the health information we found" })).toBeVisible();
  await expect(page.getByText("Primary care visit")).toBeVisible();
  await expect(page.getByRole("region", { name: "Needs your confirmation" })).toContainText("Condition: Seasonal allergies");
  await expect(page.getByText("No fills showed up in the last year.")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and continue" }).click();

  await expect(page).toHaveURL(/\/home\/essentials$/);
  await page.getByRole("radiogroup", { name: /ever been in the hospital/ }).getByRole("radio", { name: "No" }).click();
  await page.getByRole("radiogroup", { name: /controlled substances now/ }).getByRole("radio", { name: "No" }).click();
  await page.getByRole("radiogroup", { name: /^Alcohol$/ }).getByRole("radio", { name: "Now and then" }).click();
  await page.getByRole("radiogroup", { name: /^Cannabis$/ }).getByRole("radio", { name: "Never" }).click();
  await page.getByRole("radiogroup", { name: /other substances/ }).getByRole("radio", { name: "No" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Pat Sample");
  await page.getByLabel("Phone", { exact: true }).fill("(512) 555-0111");
  await page.getByRole("button", { name: "Save" }).click();

  await prep.getByRole("link", { name: /^Four short questions in your own words/ }).click();
  await answerConversation(page);
  await expect(page.getByText("AI · scripted").first()).toBeVisible();
  await shot(2, "story-review");
  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page.getByText(/Alex, \d+, shared the following before the first visit/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm and save" }).click();

  await expect(page).toHaveURL(/\/home\/check-in$/);
  for (let i = 0; i < 8; i++) await page.getByRole("button", { name: i < 7 ? FREQUENCY_OPTIONS[1] : DIFFICULTY_OPTIONS[1], exact: true }).click();
  for (let i = 0; i < 10; i++) await page.getByRole("button", { name: i < 9 ? FREQUENCY_OPTIONS[0] : DIFFICULTY_OPTIONS[0], exact: true }).click();
  await page.getByRole("button", { name: "Back to home" }).click();

  await prep.getByRole("link", { name: /^Choose your pharmacy/ }).click();
  await page.getByRole("radio", { name: /Barton Creek Drug/ }).click();
  await page.getByRole("button", { name: "Use this pharmacy" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "You're ready for your visit, Alex" })).toBeVisible();
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page.getByRole("heading", { name: "What your provider has" })).toBeVisible();
  await expect(page.getByText("No safety flags")).toBeVisible();
  await page.getByRole("button", { name: "Start video" }).click();
  await page.getByRole("button", { name: "End visit" }).click();
  await expect(page.getByText("What's been going on, in your own words")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your prescription" })).toHaveCount(0);
  await shot(3, "after");
  await expectAccessible(page);
  await page.getByRole("region", { name: "Book your follow-up" }).getByRole("button").first().click();
  await expect(page.getByRole("heading", { name: "Your follow-up is booked" })).toBeVisible();
  await page.getByRole("link", { name: "Return to home" }).click();
  await expect(page.getByText("Nothing needs your attention right now.")).toBeVisible();
  await expect(page.getByText("No medications for now.")).toBeVisible();
});
