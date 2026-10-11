import { expect, test } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { answerFit, expectAccessible, expectNoSideScroll, shoot, startAs } from "./helpers";
import { arriveReady, shooter } from "./ready";

// Maya Torres: the full happy path. Milestone 4 covers "Book fast" (stages 1 to 8); milestone 5 continues it.
const maya = PERSONAS.maya;

test("Maya's whole journey: book fast with her note and verified coverage, then arrive ready, visit, and follow up", async ({ page }, info) => {
  await startAs(page, "maya");
  await shoot(page, info, "maya", 1, "fit");
  await expectAccessible(page);
  await answerFit(page, maya.fit);

  // Stage 2: what brings you here, with condition expectations.
  await expect(page).toHaveURL(/\/start\/needs$/);
  await expect(page.getByText("You're a fit for our care.")).toBeVisible();
  await page.getByRole("button", { name: "Anxiety" }).click();
  await page.getByRole("button", { name: "Depression" }).click();
  await expect(page.getByText("We do not prescribe benzodiazepines over 1 mg a day.")).toBeVisible();
  await shoot(page, info, "maya", 2, "needs");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continue" }).click();

  // Stage 3: the options adapt to her conditions.
  await expect(page).toHaveURL(/\/start\/help$/);
  await shoot(page, info, "maya", 3, "help");
  await expectAccessible(page);
  await page.getByRole("button", { name: /I'd like an evaluation for anxiety and depression/ }).click();

  // Stage 4: the typical cost appears with the plan.
  await expect(page).toHaveURL(/\/start\/pay$/);
  await page.getByRole("radio", { name: "Blue Cross Blue Shield of Texas" }).click();
  await expect(page.getByText(/Most patients with Blue Cross Blue Shield of Texas pay \$0 to \$40 per visit/)).toBeVisible();
  await shoot(page, info, "maya", 4, "pay");
  await expectAccessible(page);
  await page.getByRole("button", { name: "See providers" }).click();

  // Stage 5: three best fits, her evening preset, shared and per-card reasons, times with zones.
  await expect(page).toHaveURL(/\/start\/providers$/);
  await expect(page.getByRole("button", { name: "Weekday evenings", pressed: true })).toBeVisible();
  await expect(page.getByText("Why these three")).toBeVisible();
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.first().getByRole("button", { name: /\d{1,2}:\d{2} [AP]M C[DS]T/ }).first()).toBeVisible();
  const seeAll = page.getByRole("button", { name: /^See all \d+ providers$/ });
  const before = await seeAll.textContent();

  await page.getByRole("textbox", { name: "Anything else that matters to you" }).fill(maya.preferenceNote!);
  await page.getByRole("button", { name: "Update my matches" }).click();
  await expect(page.getByRole("button", { name: "Remove Woman provider" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Speaks Spanish" })).toBeVisible();
  await expect(page.getByText("AI · scripted")).toBeVisible();
  await expect(cards).toHaveCount(3); // chips re-order; nobody is hidden (TAC-11)
  await expect(seeAll).toHaveText(before!);
  await expect(cards.first().getByText("Speaks Spanish").first()).toBeVisible();
  await shoot(page, info, "maya", 5, "providers");
  await expectAccessible(page);
  if (info.project.name === "mobile") await expectNoSideScroll(page);

  await cards.first().getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await cards.first().getByRole("button", { name: /^Hold / }).click();

  // Stage 6: hold the time with a first name, a mobile number, and a texted code.
  await expect(page).toHaveURL(/\/start\/hold$/);
  await page.getByLabel("First name").fill(maya.firstName);
  await page.getByRole("button", { name: /^Use \(512\) 555-01\d\d$/ }).click();
  await shoot(page, info, "maya", 6, "hold");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByRole("button", { name: "Use this code" }).click();
  await page.getByRole("button", { name: "Verify and continue" }).click();

  // Stage 7: the exact coverage check before the card.
  await expect(page).toHaveURL(/\/start\/coverage$/);
  await page.getByLabel("Member ID").fill(maya.coverage.memberId);
  await page.getByLabel("Date of birth").fill("03141997");
  await expect(page.getByLabel("Date of birth")).toHaveValue("03/14/1997");
  await shoot(page, info, "maya", 7, "coverage");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Check my coverage" }).click();
  await expect(page.getByText("You're covered")).toBeVisible();
  await expect(page.getByText("Your cost for this visit: $40 copay")).toBeVisible();
  await shoot(page, info, "maya", 8, "coverage-verified");
  await page.getByRole("button", { name: "Continue to booking" }).click();

  // Stage 8: review, three consents on one screen, the simulated card, book.
  await expect(page).toHaveURL(/\/start\/book$/);
  await expect(page.getByText(/In network with Blue Cross Blue Shield of Texas · verified/)).toBeVisible();
  await expect(page.getByText("Free to cancel or reschedule up to 24 hours before your visit.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Book my visit" })).toBeDisabled();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await shoot(page, info, "maya", 9, "book");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Book my visit" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "You're booked, Maya" })).toBeVisible();
  await shoot(page, info, "maya", 10, "home");
  await expectAccessible(page);
  await page.getByRole("button", { name: "4, quite sure" }).click(); // the optional trust question
  await expect(page.getByText("Thanks. This helps us get matching right.")).toBeVisible();

  await arriveReady(page, "maya", shooter(page, info, "maya"));
});
