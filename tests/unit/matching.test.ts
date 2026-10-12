import { describe, expect, it } from "vitest";
import { matchProviders } from "@/rules/matching";
import { windowOf } from "@/rules/time";
import { NOW, toProviders } from "../helpers";

describe("provider matching", () => {
  it("shows exactly three providers for Maya, each with sourced, differing reasons and a shared header", () => {
    const { journey } = toProviders("maya");
    const m = matchProviders(journey, NOW);
    expect(m.top).toHaveLength(3);
    expect(m.noOpenings).toBe(false);
    for (const card of m.top) {
      expect(card.reasons.length).toBeGreaterThan(0);
      for (const r of card.reasons) expect(r.source).toMatch(/\(simulated\)$/);
      for (const s of card.slots) expect(windowOf(s, journey.timeZone)).toBe("weekday_evening");
    }
    const shared = m.sharedReasons.map((r) => r.label);
    expect(shared).toContain("Licensed in Texas");
    expect(shared).toContain("In network with Blue Cross Blue Shield of Texas");
    expect(shared).toContain("Does new evaluations");
    for (const card of m.top) for (const r of card.reasons) expect(shared).not.toContain(r.label);
  });

  it("never shows providers who aren't licensed in Texas or aren't accepting new patients", () => {
    for (const persona of ["maya", "jordan", "sam"] as const) {
      const ids = matchProviders(toProviders(persona).journey, NOW).all.map((c) => c.id);
      expect(ids).not.toContain("p-ethan");
      expect(ids).not.toContain("p-priya");
    }
  });

  it("changes Maya's top three when she switches from evenings to mornings (TAC-08)", () => {
    const { journey } = toProviders("maya");
    const evenings = matchProviders(journey, NOW).top.map((c) => c.id);
    const mornings = matchProviders({ ...journey, preferences: { ...journey.preferences, windows: ["weekday_morning"] } }, NOW).top.map(
      (c) => c.id,
    );
    expect(mornings).not.toEqual(evenings);
  });

  it("re-orders with preference chips but never removes anyone (TAC-11)", () => {
    const { journey } = toProviders("maya");
    const before = matchProviders(journey, NOW);
    const after = matchProviders(
      {
        ...journey,
        preferences: {
          ...journey.preferences,
          chips: [
            { kind: "gender", value: "woman", label: "Woman provider" },
            { kind: "language", value: "spanish", label: "Speaks Spanish" },
          ],
        },
      },
      NOW,
    );
    expect(after.totalEligible).toBe(before.totalEligible);
    expect(after.top).toHaveLength(3);
    expect(after.top[0].id).toBe("p-lucia");
    expect(after.top.map((c) => c.id)).not.toEqual(before.top.map((c) => c.id));
  });

  it("tells Jordan nobody has openings in his times and offers the nearest instead (TAC-09)", () => {
    const { journey } = toProviders("jordan");
    const m = matchProviders(journey, NOW);
    expect(m.noOpenings).toBe(true);
    expect(m.top.length).toBeGreaterThan(0);
    expect(m.top.every((c) => c.slots.length > 0)).toBe(true);
    expect(m.all.map((c) => c.id).sort()).toEqual(["p-james", "p-nia", "p-omar"]);
    expect(m.sharedReasons.map((r) => r.label)).toContain("Sees self-pay patients");
  });

  it("matches Sam's afternoons in Mountain Time", () => {
    const { journey } = toProviders("sam");
    expect(journey.timeZone).toBe("America/Denver");
    const m = matchProviders(journey, NOW);
    expect(m.noOpenings).toBe(false);
    for (const card of m.top) for (const s of card.slots) expect(windowOf(s, "America/Denver")).toBe("weekday_afternoon");
  });

  it("says why each provider fits this patient, and keeps experience as a trust detail, not a reason", () => {
    const { journey } = toProviders("maya");
    const m = matchProviders(
      {
        ...journey,
        preferences: {
          ...journey.preferences,
          chips: [
            { kind: "gender", value: "woman", label: "Woman provider" },
            { kind: "language", value: "spanish", label: "Speaks Spanish" },
            { kind: "other", value: "work stress", label: "Work stress" },
          ],
        },
      },
      NOW,
    );
    const lucia = m.top[0];
    expect(lucia.id).toBe("p-lucia");
    expect(lucia.reasons.map((r) => r.label)).toEqual([
      expect.stringMatching(/^\d+ evening openings in the next 2 weeks$/),
      "Focuses on anxiety and depression",
      "Speaks Spanish",
      "Focus includes work stress",
    ]);
    // All three are women, so that preference is said once for all of them (L14: cards show what differs).
    expect(m.sharedReasons.map((r) => r.label)).toContain("Matches your preference for a woman provider");
    for (const card of m.all) {
      expect(card.reasons.map((r) => r.code)).not.toContain("experience");
      expect(card.yearsInPractice).toBeGreaterThan(0);
      expect(card.licenseSource).toMatch(/^Texas (Board of Nursing|Medical Board)$/);
    }
  });

  it("drops a slot that was just taken", () => {
    const { journey } = toProviders("maya");
    const first = matchProviders(journey, NOW).top[0].slots[0];
    const after = matchProviders(journey, NOW, { exclude: [first] });
    expect(after.all.flatMap((c) => c.slots)).not.toContain(first);
  });
});
