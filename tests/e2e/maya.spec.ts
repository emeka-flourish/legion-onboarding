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

  // Stage 5: who, why, and when (L20). Compact controls on top, one line of reassurance, a recommended best match.
  await expect(page).toHaveURL(/\/start\/providers$/);
  const controls = page.getByRole("region", { name: "Your matching preferences" });
  await expect(controls.getByRole("button", { name: "Weekday evenings", pressed: true })).toBeVisible();
  const note = page.getByRole("textbox", { name: "Anything else that matters to you" });
  await expect(note).toHaveAttribute("rows", "1"); // one line until tapped
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  expect(await topOf(controls)).toBeLessThan(await topOf(cards.first()));
  // One line of reassurance; how matching works waits behind a tap.
  await expect(page.getByText(/^\d+ providers matched your care needs, insurance, and availability\.$/)).toBeVisible();
  await expect(page.getByText("Every provider here is:")).toBeHidden();
  await page.getByText("How matching works").click();
  await expect(page.getByText("Every provider here is:")).toBeVisible();
  await expect(page.locator("main details").getByText("In network with Blue Cross Blue Shield of Texas")).toBeVisible();
  await page.getByText("How matching works").click();
  // A recommendation, then the other strong matches.
  const best = page.getByRole("region", { name: "Best match" }).getByRole("article");
  await expect(best).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Other strong matches" }).getByRole("article")).toHaveCount(2);
  await expect(page.locator("main")).not.toContainText(/perfect match/i);
  // Each card: who, why they fit (fit, never openings), and two or three times with more on request.
  await expect(best.getByText(/^Why \S+ fits you$/)).toBeVisible();
  await expect(best.getByRole("img", { name: "Simulated provider" })).toBeVisible();
  const reasons = best.getByRole("list", { name: /^Why .* fits$/ }).getByRole("listitem");
  await expect(reasons.first()).toContainText("Focuses on anxiety and depression");
  for (const reason of await reasons.all()) {
    await expect(reason).toContainText(/\(simulated\)/); // each reason's source, for screen readers
    await expect(reason).not.toContainText(/opening/i);
  }
  const times = best.getByRole("button", { name: /\d{1,2}:\d{2} [AP]M C[DS]T/ });
  expect(await times.count()).toBeLessThanOrEqual(3);
  await best.getByRole("button", { name: "See more times" }).click();
  expect(await times.count()).toBeGreaterThan(3);
  await best.getByRole("button", { name: "Fewer times" }).click();
  // Credentials and the rest wait behind "View profile."
  await expect(best.getByText(/years in practice/)).toBeHidden();
  await best.getByRole("button", { name: /^View profile/ }).click();
  const profile = page.getByRole("dialog");
  await expect(profile.getByText(/\d+ years in practice\. Licensed by the Texas/)).toBeVisible();
  await expect(profile.getByText("Why we matched you")).toBeVisible();
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(profile).toHaveCount(0);
  const seeAll = page.getByRole("button", { name: /^See all \d+ providers$/ });
  const before = await seeAll.textContent();

  // The note opens up when tapped, and AI reads it into preferences that re-rank the list.
  await note.click();
  await expect(note).toHaveAttribute("rows", "3");
  await note.fill("A woman who speaks Spanish and sees BIPOC patients");
  await page.getByRole("button", { name: "Update my matches" }).click();
  const summary = controls.getByRole("list", { name: "Your preferences" });
  for (const chip of ["Woman provider", "Speaks Spanish", "Experience with BIPOC patients"]) await expect(summary).toContainText(chip);
  await expect(note).toHaveCount(0);
  await expect(controls.getByText("AI · scripted")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Re-ranked for your preferences" })).toBeVisible();
  await expect(cards).toHaveCount(3); // chips re-order; nobody is hidden (TAC-11)
  await expect(seeAll).toHaveText(before!);
  // The provider who matches everything she asked for becomes the best match, and the card says why.
  await expect(best.getByRole("heading", { name: /^Valeria Ortiz/ })).toBeVisible();
  const why = best.getByRole("list", { name: /^Why .* fits$/ });
  for (const reason of ["A woman, as you asked", "Speaks Spanish", "Experienced caring for BIPOC patients"]) await expect(why.getByText(reason)).toBeVisible();
  expect(await topOf(controls)).toBeLessThan(await topOf(cards.first()));

  // Adding more keeps what she chose, and any preference comes off in one tap.
  await controls.getByRole("button", { name: "Add a preference" }).click();
  await note.fill("Someone with experience with work stress");
  await page.getByRole("button", { name: "Update my matches" }).click();
  await expect(summary).toContainText("Work stress");
  await expect(summary).toContainText("Woman provider");
  await controls.getByRole("button", { name: "Remove Work stress" }).click();
  await expect(summary).not.toContainText("Work stress");
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
  // The email the hold left out is asked here, for the receipt and visit details (L21, TAC-73).
  const email = page.getByRole("textbox", { name: "Email" });
  await page.getByRole("button", { name: "Book my visit" }).click();
  await expect(page.getByText("Please enter your email address.")).toBeVisible();
  await expect(email).toBeFocused();
  await expect(page).toHaveURL(/\/start\/book$/);
  await email.fill(maya.email);
  await expect(page.getByText("Please enter your email address.")).toBeHidden();
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
