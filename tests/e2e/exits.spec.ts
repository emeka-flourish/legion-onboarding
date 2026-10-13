import { expect, test } from "@playwright/test";
import { answerFit, expectAccessible, shoot, startAs } from "./helpers";

test("a Yes to the risk-of-harm question shows crisis resources and no way to book (TAC-01, V8)", async ({ page }, info) => {
  await startAs(page);
  await answerFit(page, { risk_of_harm: true });
  await expect(page).toHaveURL(/\/start\/crisis$/);
  await expect(page.getByRole("heading", { name: "Let's get you support right now" })).toBeVisible();
  const call988 = page.getByRole("link", { name: "Call 988" });
  await expect(call988).toHaveAttribute("href", "tel:988");
  await expect(page.getByRole("link", { name: "Text 988" })).toHaveAttribute("href", "sms:988");
  await expect(page.getByRole("link", { name: "911" })).toHaveAttribute("href", "tel:911");
  await expect(call988).toBeInViewport();
  await expect(page.getByRole("link", { name: "911" })).toBeInViewport();
  await expect(page.getByRole("button", { name: /book|continue|providers/i })).toHaveCount(0);
  await shoot(page, info, "exits", 1, "crisis");
  await expectAccessible(page);

  // There's no way around it: other steps send the patient back here.
  await page.goto("/start/needs");
  await expect(page).toHaveURL(/\/start\/crisis$/);
});

test("a screen-out shows resources for its reason, and a mis-tap can be changed (TAC-02)", async ({ page }, info) => {
  await startAs(page);
  await answerFit(page, { texas: false });
  await expect(page).toHaveURL(/\/start\/not-a-fit$/);
  await expect(page.getByRole("heading", { name: "Our providers can only see patients in Texas right now" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open FindTreatment\.gov/ })).toHaveAttribute("href", "https://findtreatment.gov");
  await shoot(page, info, "exits", 2, "not-a-fit");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Change my answer" }).click();
  await expect(page).toHaveURL(/\/start\/fit$/);
  await expect(page.getByRole("heading", { name: "Are you based in Texas?" })).toBeVisible();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Medicaid or Medicare/ })).toBeVisible();
});
