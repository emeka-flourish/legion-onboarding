import { describe, expect, it, vi } from "vitest";
import { aiStatus, runTask } from "@/ai/router";
import { clinicianSummaryTask, postFilter, templateSummary, type SummaryInput } from "@/ai/tasks/clinicianSummary";
import { intakeExtractTask, keywordExtract, type IntakeInput } from "@/ai/tasks/intakeExtract";
import { keywordChips, makeChip, preferenceNoteTask } from "@/ai/tasks/preferenceNote";
import { aiConfig, type AiConfig, type ProviderName } from "@/config/ai.config";
import { FOLLOW_UP_IDS, type PromptId } from "@/data/intake";
import { PERSONAS, PERSONA_IDS } from "@/data/personas";
import type { PersonaId, StoryItem } from "@/domain/types";
import { answers, fails, hangs } from "../aiMocks";

const fastConfig = (over: Partial<AiConfig> = {}): AiConfig => ({
  ...aiConfig,
  activeProvider: "openai",
  tasks: {
    preferenceNote: { tier: "fast", timeoutMs: 80 },
    intakeExtract: { tier: "quality", timeoutMs: 80 },
    clinicianSummary: { tier: "quality", timeoutMs: 80 },
  },
  ...over,
});

const allKeys = () => true;
const keysFor = (...providers: ProviderName[]) => (p: ProviderName) => providers.includes(p);

function mayaSummaryInput(items?: StoryItem[]): SummaryInput {
  const story = PERSONAS.maya.story;
  return {
    items: items ?? [...Object.values(story.extract).flatMap((e) => e.items), ...Object.values(story.followUpExtract).flat()],
    firstName: "Maya",
    age: 29,
    conditions: ["anxiety", "depression"],
    careType: "new_evaluation",
    personaId: "maya",
  };
}

const intakeInput = (over: Partial<IntakeInput> = {}): IntakeInput => ({
  promptId: 1,
  answer: "I've been anxious most days and I can't sleep.",
  usedFollowUps: [],
  conditions: ["anxiety"],
  careType: "new_evaluation",
  ...over,
});

describe("AI router", () => {
  it("uses the scripted fallback when no provider has a key", async () => {
    const factory = vi.fn();
    const r = await runTask(preferenceNoteTask, { note: "A woman, please" }, {}, { config: fastConfig(), hasKey: () => false, factory });
    expect(r.safety).toBeUndefined();
    if (r.safety) return;
    expect(r.meta).toMatchObject({ mode: "scripted", fallbackReason: "no_keys" });
    expect(r.output.chips).toEqual([{ kind: "gender", value: "woman", label: "Woman provider" }]);
    expect(factory).not.toHaveBeenCalled();
  });

  it("uses the scripted fallback when AI_PROVIDER is scripted, even with keys", async () => {
    const factory = vi.fn();
    const r = await runTask(preferenceNoteTask, { note: "evenings" }, {}, { config: fastConfig({ activeProvider: "scripted" }), hasKey: allKeys, factory });
    expect(!r.safety && r.meta).toMatchObject({ mode: "scripted", fallbackReason: "configured" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("makes a live call to the active provider with its fast model for preference chips", async () => {
    const factory = vi.fn(() => answers({ chips: [{ kind: "language", value: "Spanish" }, { kind: "gender", value: "female" }] }));
    const r = await runTask(preferenceNoteTask, { note: "Spanish-speaking woman" }, {}, { config: fastConfig(), hasKey: allKeys, factory });
    if (r.safety) throw new Error("unexpected crisis");
    expect(r.meta).toMatchObject({ mode: "live", provider: "openai", model: "gpt-6-luna" });
    expect(r.meta.fallbackReason).toBeUndefined();
    expect(r.liveCalls).toBe(1);
    expect(factory).toHaveBeenCalledWith("openai", "gpt-6-luna");
    expect(r.output.chips).toEqual([
      { kind: "language", value: "spanish", label: "Speaks Spanish" },
      { kind: "gender", value: "woman", label: "Woman provider" },
    ]);
  });

  it("switches provider with AI_PROVIDER and uses the quality model for extraction", async () => {
    const factory = vi.fn(() => answers({ items: [{ kind: "concern", text: "Anxious most days" }], followUpId: null }));
    const r = await runTask(intakeExtractTask, intakeInput(), {}, { config: fastConfig({ activeProvider: "anthropic" }), hasKey: allKeys, factory });
    expect(!r.safety && r.meta).toMatchObject({ mode: "live", provider: "anthropic", model: "claude-opus-5-5" });
  });

  it("applies AI_MODEL_QUALITY to the active provider only", async () => {
    vi.stubEnv("AI_MODEL_QUALITY", "gpt-test-override");
    const factory = vi.fn(() => answers({ items: [], followUpId: null }));
    await runTask(intakeExtractTask, intakeInput(), {}, { config: fastConfig(), hasKey: allKeys, factory });
    expect(factory).toHaveBeenCalledWith("openai", "gpt-test-override");
    vi.unstubAllEnvs();
  });

  it("falls back to the next provider on a timeout, then to scripted when every provider times out", async () => {
    const factory = vi.fn((p: ProviderName) => (p === "openai" ? hangs() : answers({ chips: [] })));
    const r = await runTask(preferenceNoteTask, { note: "anyone" }, {}, { config: fastConfig(), hasKey: allKeys, factory });
    expect(!r.safety && r.meta).toMatchObject({ mode: "live", provider: "anthropic", fallbackReason: "openai: timeout" });

    const all = await runTask(preferenceNoteTask, { note: "evenings" }, {}, { config: fastConfig(), hasKey: allKeys, factory: () => hangs() });
    if (all.safety) throw new Error("unexpected crisis");
    expect(all.meta.mode).toBe("scripted");
    expect(all.meta.fallbackReason).toBe("openai: timeout; anthropic: timeout; google: timeout");
    expect(all.liveCalls).toBe(3);
    expect(all.output.chips[0]).toMatchObject({ kind: "time", value: "weekday_evening" });
  });

  it("falls back when the output fails the schema or the provider errors", async () => {
    const factory = vi.fn((p: ProviderName) =>
      p === "openai" ? answers({ unexpected: true }) : p === "anthropic" ? fails() : answers({ items: [], followUpId: null }),
    );
    const r = await runTask(intakeExtractTask, intakeInput(), {}, { config: fastConfig(), hasKey: allKeys, factory });
    expect(!r.safety && r.meta).toMatchObject({
      mode: "live",
      provider: "google",
      fallbackReason: "openai: schema; anthropic: provider_error",
    });
  });

  it("skips providers without a key", async () => {
    const factory = vi.fn(() => answers({ chips: [] }));
    const r = await runTask(preferenceNoteTask, { note: "x y" }, {}, { config: fastConfig(), hasKey: keysFor("google"), factory });
    expect(!r.safety && r.meta).toMatchObject({ mode: "live", provider: "google" });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("stops trying providers when the time budget runs out", async () => {
    const factory = vi.fn();
    const r = await runTask(preferenceNoteTask, { note: "x y" }, {}, { config: fastConfig({ totalBudgetMs: 1_000 }), hasKey: allKeys, factory });
    expect(!r.safety && r.meta).toMatchObject({ mode: "scripted", fallbackReason: "openai: budget" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("never calls a model for crisis language", async () => {
    const factory = vi.fn(() => answers({ chips: [] }));
    const deps = { config: fastConfig(), hasKey: allKeys, factory };
    for (const r of [
      await runTask(preferenceNoteTask, { note: "Honestly I want to kill myself" }, {}, deps),
      await runTask(intakeExtractTask, intakeInput({ answer: "Some days I think everyone would be better off dead without me." }), {}, deps),
      await runTask(clinicianSummaryTask, mayaSummaryInput([{ kind: "concern", text: "Thinking about suicide" }]), {}, deps),
    ]) {
      expect(r).toMatchObject({ safety: "crisis" });
    }
    expect(factory).not.toHaveBeenCalled();
  });

  it("sends a summary that fails the post-filter to the template, not to another model", async () => {
    const factory = vi.fn(() => answers({ text: "Maya likely has generalized anxiety disorder. You should start sertraline 50 mg daily and increase as needed." }));
    const r = await runTask(clinicianSummaryTask, mayaSummaryInput(), {}, { config: fastConfig(), hasKey: allKeys, factory });
    if (r.safety) throw new Error("unexpected crisis");
    expect(r.meta).toMatchObject({ mode: "scripted", fallbackReason: "openai: post_filter" });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(r.output.text).toBe(PERSONAS.maya.story.summary);
  });

  it("forces the scripted fallback once a journey reaches its live-call cap", async () => {
    const factory = vi.fn();
    const r = await runTask(preferenceNoteTask, { note: "x y" }, { forceScripted: "journey_cap" }, { config: fastConfig(), hasKey: allKeys, factory });
    expect(!r.safety && r.meta).toMatchObject({ mode: "scripted", fallbackReason: "journey_cap" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("reports its status for the demo controls", () => {
    const config = fastConfig();
    expect(aiStatus(0, { config, hasKey: () => false })).toEqual({ mode: "scripted", reason: "no_keys" });
    expect(aiStatus(0, { config: fastConfig({ activeProvider: "scripted" }), hasKey: allKeys })).toEqual({ mode: "scripted", reason: "configured" });
    expect(aiStatus(3, { config, hasKey: keysFor("anthropic") })).toEqual({ mode: "live", provider: "anthropic", model: "claude-opus-5-5", liveCallsLeft: 37 });
    expect(aiStatus(40, { config, hasKey: allKeys })).toEqual({ mode: "scripted", reason: "journey_cap", liveCallsLeft: 0 });
  });
});

describe("preference chips", () => {
  it("reads Maya's note into the same chips as her demo preset", () => {
    expect(keywordChips(PERSONAS.maya.preferenceNote!)).toEqual(PERSONAS.maya.preferenceChips);
  });

  it("maps common preferences and caps the list at five", () => {
    expect(keywordChips("A man who speaks Mandarin, evenings after work, someone who gets trauma").map((c) => `${c.kind}:${c.value}`)).toEqual([
      "gender:man",
      "language:mandarin",
      "focus:ptsd",
      "time:weekday_evening",
    ]);
    expect(keywordChips("woman, Spanish, Arabic, Hindi, mornings, weekends, sleep")).toHaveLength(5);
    expect(keywordChips("No preference really")).toEqual([]);
  });

  it("drops chips the matcher can't use and keeps labels fixed", () => {
    expect(makeChip("gender", "nonbinary")).toBeNull();
    expect(makeChip("language", "English")).toBeNull();
    expect(makeChip("language", "Spanish!!")).toBeNull();
    expect(makeChip("focus", "trauma")).toEqual({ kind: "focus", value: "ptsd", label: "Trauma-informed" });
    expect(makeChip("focus", "sleep")).toEqual({ kind: "other", value: "sleep", label: "Sleep" });
    expect(makeChip("time", "weekday evening")).toEqual({ kind: "time", value: "weekday_evening", label: "Weekday evenings" });
    expect(makeChip("time", "midnight")).toBeNull();
  });

  it("drops unknown kinds and duplicates from live output", () => {
    const f = preferenceNoteTask.finalize(
      { chips: [{ kind: "gender", value: "woman" }, { kind: "gender", value: "female" }, { kind: "other", value: "x" }] },
      { note: "" },
    );
    expect(f).toEqual({ ok: true, output: { chips: [{ kind: "gender", value: "woman", label: "Woman provider" }] } });
  });
});

describe("guided conversation extraction", () => {
  it("returns each demo patient's canned items and follow-up for their canned answers", () => {
    for (const id of PERSONA_IDS) {
      const p = PERSONAS[id];
      for (const promptId of [1, 2, 3, 4] as PromptId[]) {
        const out = intakeExtractTask.scripted(intakeInput({ promptId, answer: ` ${p.story.answers[promptId]}  `, personaId: id }));
        expect(out).toEqual(p.story.extract[promptId]);
      }
      for (const [followUp, answer] of Object.entries(p.story.followUpAnswers)) {
        const out = intakeExtractTask.scripted(intakeInput({ answer: answer!, followUpOf: followUp as never, personaId: id }));
        expect(out).toEqual({ items: p.story.followUpExtract[followUp as never], followUpId: null });
      }
    }
  });

  it("never repeats a follow-up the conversation already used", () => {
    const out = intakeExtractTask.scripted(
      intakeInput({ promptId: 1, answer: PERSONAS.maya.story.answers[1], personaId: "maya", usedFollowUps: ["sleep_impact"] }),
    );
    expect(out.followUpId).toBeNull();
  });

  it("extracts medications, doses, and a fitting follow-up without a model", () => {
    const out = keywordExtract(intakeInput({ promptId: 3, answer: "I took sertraline 50 mg for a year. It helped a bit but I stopped." }));
    expect(out.items).toContainEqual({ kind: "medication_mentioned", text: "Sertraline 50 mg" });
    expect(out.items.some((i) => i.kind === "prior_treatment")).toBe(true);
    expect(out.followUpId).toBe("med_side_effects");

    expect(keywordExtract(intakeInput({ promptId: 3, answer: "I was on Lexapro in college." })).followUpId).toBe("med_dose");
    expect(keywordExtract(intakeInput({ promptId: 1 })).followUpId).toBe("sleep_impact");
    expect(keywordExtract(intakeInput({ promptId: 1, usedFollowUps: ["sleep_impact"] })).followUpId).toBeNull();
    expect(keywordExtract(intakeInput({ promptId: 4, answer: "Feel better." })).followUpId).toBe("goal_clarify");
    expect(keywordExtract(intakeInput({ promptId: 2, answer: "For about two years, worse lately." })).items[0].kind).toBe("duration");
  });

  it("keeps items short, few, and free of follow-ups when answering a follow-up", () => {
    const long = Array.from({ length: 12 }, (_, i) => `Thing number ${i} has been really hard for me lately at home and at work.`).join(" ");
    const out = keywordExtract(intakeInput({ answer: long }));
    expect(out.items.length).toBeLessThanOrEqual(8);
    for (const i of out.items) expect(i.text.length).toBeLessThanOrEqual(80);
    expect(keywordExtract(intakeInput({ answer: "Two nights a week.", followUpOf: "sleep_impact" }))).toEqual({
      items: [{ kind: "concern", text: "Two nights a week" }],
      followUpId: null,
    });
  });

  it("cleans live output: clipped items, at most eight, and no used or nested follow-up", () => {
    const raw = {
      items: Array.from({ length: 10 }, (_, i) => ({ kind: "concern" as const, text: `Item ${i} ${"word ".repeat(30)}` })),
      followUpId: "sleep_impact" as const,
    };
    const used = intakeExtractTask.finalize(raw, intakeInput({ usedFollowUps: ["sleep_impact"] }));
    expect(used.ok && used.output.items.length).toBe(8);
    expect(used.ok && used.output.items.every((i) => i.text.length <= 80 && !i.text.endsWith(" "))).toBe(true);
    expect(used.ok && used.output.followUpId).toBeNull();
    const nested = intakeExtractTask.finalize({ items: [], followUpId: "work_impact" }, intakeInput({ followUpOf: "sleep_impact" }));
    expect(nested.ok && nested.output.followUpId).toBeNull();
    const fresh = intakeExtractTask.finalize({ items: [], followUpId: "work_impact" }, intakeInput());
    expect(fresh.ok && fresh.output.followUpId).toBe("work_impact");
  });

  it("only offers follow-ups from the fixed bank", () => {
    expect(FOLLOW_UP_IDS).toEqual(["sleep_impact", "work_impact", "onset_trigger", "med_dose", "med_side_effects", "therapy_history", "goal_clarify"]);
  });
});

describe("clinician summary", () => {
  const canned = (id: PersonaId): SummaryInput => {
    const p = PERSONAS[id];
    return {
      items: [...Object.values(p.story.extract).flatMap((e) => e.items), ...Object.values(p.story.followUpExtract).flat()],
      firstName: p.firstName,
      age: p.age,
      conditions: p.conditions,
      careType: p.careType,
      personaId: id,
    };
  };

  it("accepts the demo patients' summaries, which only restate what they said", () => {
    for (const id of PERSONA_IDS) expect(postFilter(PERSONAS[id].story.summary, canned(id))).toEqual({ ok: true });
  });

  it.each([
    ["You might find it helpful to keep a sleep diary.", "second_person"],
    ["We recommend a trial of therapy.", "advice"],
    ["Maya would benefit from a daily medication.", "advice"],
    ["A provider could start an SSRI at the first visit.", "prescribing"],
    ["Symptoms are consistent with generalized anxiety.", "assessment"],
    ["Maya likely has generalized anxiety disorder.", "assessment"],
    ["Maya was diagnosed with anxiety last year.", "ungrounded_diagnosis"],
    ["Maya reports panic attacks at work.", "ungrounded_diagnosis"],
    ["Maya has tried sertraline in the past.", "ungrounded_medication"],
    ["Maya takes hydroxyzine 25 mg at night.", "ungrounded_dose"],
  ])("rejects %j (%s)", (text, rule) => {
    expect(postFilter(text, canned("maya"))).toEqual({ ok: false, rule });
  });

  it("allows a dose, medication, and diagnosis the patient stated", () => {
    expect(postFilter("Jordan was diagnosed with ADHD in college and takes amphetamine salts 20 mg each morning.", canned("jordan"))).toEqual({ ok: true });
  });

  it("uses the canned summary only for the canned items, and the template otherwise", () => {
    expect(clinicianSummaryTask.scripted(canned("sam")).text).toBe(PERSONAS.sam.story.summary);
    const edited = { ...canned("maya"), items: [{ kind: "concern" as const, text: "Anxious most days" }, { kind: "goal" as const, text: "Find a therapist" }] };
    expect(clinicianSummaryTask.scripted(edited).text).toBe(
      "Maya, 29, shared the following before the first visit. Concerns: anxious most days. Goals for care: find a therapist.",
    );
  });

  it("keeps the template under 900 characters however many items there are", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ kind: "concern" as const, text: `A fairly long concern number ${i} about daily life and work` }));
    const text = templateSummary({ items, conditions: ["anxiety"] });
    expect(text.length).toBeLessThanOrEqual(900);
    expect(text.startsWith("The patient shared the following")).toBe(true);
  });

  it("trims an over-long live summary at a sentence, or rejects it", () => {
    const long = `${"Maya has been anxious most days at work. ".repeat(30)}`;
    const f = clinicianSummaryTask.finalize({ text: long }, canned("maya"));
    expect(f.ok && f.output.text.length).toBeLessThanOrEqual(900);
    expect(f.ok && f.output.text.endsWith(".")).toBe(true);
    expect(clinicianSummaryTask.finalize({ text: "Too short." }, canned("maya"))).toEqual({ ok: false, reason: "schema" });
  });
});
