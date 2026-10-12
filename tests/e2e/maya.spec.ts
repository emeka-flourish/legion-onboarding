import { expect, test } from "@playwright/test";
import { PERSONAS } from "@/data/personas";
import { answerFit, expectAccessible, expectNoCelebration, expectNoSideScroll, holdWithName, passBookedMoment, shoot, startAs, topOf } from "./helpers";
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
  await expectNoCelebration(page);
  await page.getByRole("button", { name: "Anxiety" }).click();
  await page.getByRole("button", { name: "Depression" }).click();
  await expect(page.getByText("We do not prescribe benzodiazepines over 1 mg a day.")).toBeVisible();
  await expect(page.getByText(/checks your Texas prescription monitoring record first/)).toBeVisible();
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

  // Stage 5: the matching controls sit together above the results they change (feedback items 2 to 4).
  await expect(page).toHaveURL(/\/start\/providers$/);
  const controls = page.getByRole("region", { name: "Your matching preferences" });
  await expect(controls.getByRole("button", { name: "Weekday evenings", pressed: true })).toBeVisible();
  const note = page.getByRole("textbox", { name: "Anything else that matters to you" });
  await expect(note).toHaveAttribute("rows", "1"); // one line until tapped
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  expect(await topOf(controls)).toBeLessThan(await topOf(cards.first()));
  await expect(page.getByText(/^Ranked by openings in your times/)).toBeVisible();
  await expect(page.getByText("All three:")).toBeVisible();
  await expect(cards.first().getByRole("button", { name: /\d{1,2}:\d{2} [AP]M C[DS]T/ }).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/perfect match/i);
  // Each card leads with why this provider fits (items 5 and 6); every reason keeps its source.
  await expect(cards.first().getByText(/^Why \S+ fits you$/)).toBeVisible();
  const reasons = cards.first().getByRole("list", { name: /^Why .* fits$/ }).getByRole("listitem");
  for (const reason of await reasons.all()) await expect(reason).toContainText(/\(simulated\)/);
  await expect(cards.first().getByText(/years in practice · Licensed by the Texas/)).toBeVisible();
  const seeAll = page.getByRole("button", { name: /^See all \d+ providers$/ });
  const before = await seeAll.textContent();

  // The note opens up when tapped, and AI reads it into preferences that re-rank the list.
  await note.click();
  await expect(note).toHaveAttribute("rows", "3");
  await note.fill(maya.preferenceNote!);
  await page.getByRole("button", { name: "Update my matches" }).click();
  // It folds into a short summary, and the controls stay above the re-ranked results.
  const summary = controls.getByRole("list", { name: "Your preferences" });
  await expect(summary).toContainText("Woman provider");
  await expect(summary).toContainText("Speaks Spanish");
  await expect(note).toHaveCount(0);
  await expect(controls.getByText("AI · scripted")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Re-ranked for your preferences" })).toBeVisible();
  await expect(cards).toHaveCount(3); // chips re-order; nobody is hidden (TAC-11)
  await expect(seeAll).toHaveText(before!);
  await expect(cards.first().getByText("Speaks Spanish").first()).toBeVisible();
  expect(await topOf(controls)).toBeLessThan(await topOf(cards.first()));

  // Editing adds to what she chose, and the list re-ranks below.
  await controls.getByRole("button", { name: "Edit preferences" }).click();
  await expect(controls.getByRole("button", { name: "Remove Woman provider" })).toBeVisible();
  await note.fill("Someone with experience with work stress");
  await page.getByRole("button", { name: "Update my matches" }).click();
  await expect(summary).toContainText("Work stress");
  await expect(summary).toContainText("Woman provider");
  await expect(cards.first().getByText("Focus includes work stress")).toBeVisible();
  await shoot(page, info, "maya", 5, "providers");
  await expectAccessible(page);
  if (info.project.name === "mobile") await expectNoSideScroll(page);

  await cards.first().getByRole("button", { name: /\d{1,2}:\d{2} [AP]M/ }).first().click();
  await cards.first().getByRole("button", { name: /^Hold / }).click();

  // Stage 6: hold the time with a first and last name, a mobile number, and a texted code (item 8).
  await holdWithName(page, maya.firstName, maya.lastName, /^Use \(512\) 555-01\d\d$/);
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

  // A short, calm moment marks the booking before visit prep starts (post-booking item 1). It leaves on its own.
  await expect(page.getByRole("status").filter({ hasText: "You're booked" })).toBeVisible();
  await page.waitForTimeout(1_000); // the check has drawn in
  await page.screenshot({ path: `test-results/screens/maya/${info.project.name}/10-booked-moment.png` });
  await passBookedMoment(page, { dismiss: false });
  await expect(page.getByRole("heading", { name: "You're booked, Maya" })).toBeVisible();
  await expect(page.getByText(/Please finish (by|before your visit)/)).toBeVisible(); // a day before, or before the visit if it's sooner
  await shoot(page, info, "maya", 10, "home");
  await expectAccessible(page);
  await page.getByRole("button", { name: "4, quite sure" }).click(); // the optional trust question
  await expect(page.getByText("Thanks. This helps us get matching right.")).toBeVisible();

  await arriveReady(page, "maya", shooter(page, info, "maya"));
});
