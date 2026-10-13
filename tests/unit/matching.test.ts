import { describe, expect, it } from "vitest";
import { keywordChips } from "@/ai/tasks/preferenceNote";
import { PROVIDERS } from "@/data/providers";
import { matchProviders, pickTimes } from "@/rules/matching";
import { windowOf } from "@/rules/time";
import { NOW, toProviders } from "../helpers";

const withNote = (persona: "maya" | "jordan" | "sam", note: string) => {
  const { journey } = toProviders(persona);
  return matchProviders({ ...journey, preferences: { ...journey.preferences, chips: keywordChips(note) } }, NOW);
};

describe("provider matching", () => {
  it("recommends three for Maya, each with sourced reasons about fit and never about openings (L20)", () => {
    const { journey } = toProviders("maya");
    const m = matchProviders(journey, NOW);
    expect(m.top).toHaveLength(3);
    expect(m.noOpenings).toBe(false);
    for (const card of m.top) {
      expect(card.reasons[0].label).toMatch(/^Focuses on /); // the condition she chose leads
      for (const r of card.reasons) {
        expect(r.source).toMatch(/\(simulated\)$/);
        expect(r.label).not.toMatch(/opening|available/i);
      }
    }
    // What every provider shown shares is said once, for "How matching works."
    expect(m.criteria.map((r) => r.label)).toEqual([
      "Licensed in Texas",
      "In network with Blue Cross Blue Shield of Texas",
      "Does new evaluations",
      "Accepting new patients",
    ]);
    expect(m.matched).toBeLessThanOrEqual(m.totalEligible);
  });

  it("offers two or three times first: the best fits for her times, plus the soonest if it falls outside them", () => {
    const { journey } = toProviders("maya");
    const m = matchProviders(journey, NOW);
    // Providers with openings in her evenings rank first; the rest fall back to their nearest times.
    for (const card of m.all.slice(0, m.matched)) {
      expect(card.slots.length).toBeGreaterThanOrEqual(1);
      expect(card.slots.length).toBeLessThanOrEqual(3);
      expect([...card.slots].sort()).toEqual(card.slots);
      for (const s of card.slots) if (s !== card.soonest) expect(windowOf(s, journey.timeZone)).toBe("weekday_evening");
      if (card.soonest) expect(windowOf(card.soonest, journey.timeZone)).not.toBe("weekday_evening");
      for (const s of card.moreSlots) expect(card.slots).not.toContain(s);
    }
  });

  it("picks the soonest opening and the first two in the chosen times", () => {
    const morning = "2026-10-13T14:00:00.000Z";
    const evenings = ["2026-10-13T23:00:00.000Z", "2026-10-14T00:00:00.000Z", "2026-10-14T23:00:00.000Z"];
    expect(pickTimes({ slots: [morning, ...evenings], inWindow: evenings })).toEqual({
      slots: [morning, evenings[0], evenings[1]],
      soonest: morning,
      more: [evenings[2]],
    });
    expect(pickTimes({ slots: evenings, inWindow: evenings })).toEqual({ slots: evenings, soonest: undefined, more: [] });
    expect(pickTimes({ slots: [morning], inWindow: [] })).toEqual({ slots: [morning], more: [] });
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
    const after = withNote("maya", "A woman who speaks Spanish");
    expect(after.totalEligible).toBe(before.totalEligible);
    expect(after.top).toHaveLength(3);
    expect(after.top.map((c) => c.id).slice(0, 2).sort()).toEqual(["p-lucia", "p-valeria"]);
    expect(after.top.map((c) => c.id)).not.toEqual(before.top.map((c) => c.id));
  });

  it("tells Jordan nobody has openings in his times and offers the nearest instead (TAC-09)", () => {
    const { journey } = toProviders("jordan");
    const m = matchProviders(journey, NOW);
    expect(m.noOpenings).toBe(true);
    expect(m.matched).toBe(0);
    expect(m.top.length).toBeGreaterThan(0);
    expect(m.top.every((c) => c.slots.length > 0 && !c.soonest)).toBe(true);
    expect(m.all.map((c) => c.id).sort()).toEqual(["p-james", "p-nia", "p-omar"]);
    expect(m.criteria.map((r) => r.label)).toContain("Sees self-pay patients");
    for (const card of m.top) expect(card.reasons.map((r) => r.label)).toEqual(expect.arrayContaining(["Focuses on ADHD", "Manages ongoing medication, as you asked"]));
  });

  it("matches Sam's afternoons in Mountain Time", () => {
    const { journey } = toProviders("sam");
    expect(journey.timeZone).toBe("America/Denver");
    const m = matchProviders(journey, NOW);
    expect(m.noOpenings).toBe(false);
    for (const card of m.top) for (const s of card.slots) if (s !== card.soonest) expect(windowOf(s, "America/Denver")).toBe("weekday_afternoon");
  });

  it("drops a slot that was just taken", () => {
    const { journey } = toProviders("maya");
    const first = matchProviders(journey, NOW).top[0].slots[0];
    const after = matchProviders(journey, NOW, { exclude: [first] });
    expect(after.all.flatMap((c) => [...c.slots, ...c.moreSlots])).not.toContain(first);
  });
});

describe("matching on what the patient says (L20)", () => {
  it("recommends a provider experienced with BIPOC patients when asked, and says so on the card", () => {
    const m = withNote("maya", "I'd like someone who sees BIPOC patients");
    for (const card of m.top) expect(card.reasons.map((r) => r.label)).toContain("Experienced caring for BIPOC patients");
  });

  it("makes the provider who matches every stated preference the best match", () => {
    const best = withNote("maya", "A woman who speaks Spanish and sees BIPOC patients").top[0];
    expect(best.id).toBe("p-valeria");
    expect(best.reasons.map((r) => r.label)).toEqual([
      "Focuses on anxiety and depression",
      "A woman, as you asked",
      "Speaks Spanish",
      "Experienced caring for BIPOC patients",
    ]);
  });

  it("lets a stated preference outrank one more matched condition, but never a provider with no matched condition", () => {
    const m = withNote("maya", "someone who works with students");
    expect(m.top[0].reasons.map((r) => r.label)).toContain("Works with students and young adults");
    const man = withNote("maya", "I'd prefer a man");
    for (const card of man.top.slice(0, 2)) expect(card.reasons.map((r) => r.label)).toContain("A man, as you asked");
    for (const card of man.all) expect(card.reasons[0].label).toMatch(/^Focuses on /);
  });

  it("gives every provider a portrait, a plain-language role, and profile details", () => {
    for (const p of PROVIDERS) expect(p.portrait.skin).toBeGreaterThanOrEqual(0);
    for (const card of withNote("sam", "").all) {
      expect(card.role).toMatch(/^(Psychiatric nurse practitioner|Psychiatrist)$/);
      expect(card.licenseSource).toMatch(/^Texas (Board of Nursing|Medical Board)$/);
      expect(card.yearsInPractice).toBeGreaterThan(0);
    }
  });
});
