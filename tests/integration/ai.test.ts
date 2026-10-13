import { afterEach, describe, expect, it, vi } from "vitest";
import { setModelFactoryForTests } from "@/ai/providers";
import type { IntakeOutput } from "@/ai/tasks/intakeExtract";
import type { AiMeta } from "@/ai/types";
import type { FollowUpId, PromptId } from "@/data/intake";
import { PERSONAS } from "@/data/personas";
import type { StoryItem } from "@/domain/types";
import { aiIntake, aiPreferenceNote, aiSummary, type AiReply } from "@/server/aiService";
import { getJourney, type Result } from "@/server/journeyService";
import { answers } from "../aiMocks";
import { Device, driveToHome, driveToProviders, Harness, ok } from "./driver";

/** Pretends an OpenAI key is set and answers with mock models, so nothing reaches a real provider. */
function mockOpenAi(factory: () => ReturnType<typeof answers>) {
  vi.stubEnv("AI_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
  const spy = vi.fn(factory);
  setModelFactoryForTests(spy);
  return spy;
}

function reply<O>(r: Result<AiReply<O>>): O & { meta: AiMeta } {
  const body = ok(r);
  if ("safety" in body) throw new Error("unexpected crisis reply");
  return body;
}

afterEach(() => {
  setModelFactoryForTests();
  vi.unstubAllEnvs();
});

const CRISIS_ANSWER = "Honestly some days I think everyone would be better off dead without me.";

describe("AI routes", () => {
  it("work without keys and are tagged scripted", async () => {
    const { d, h } = await driveToProviders("maya");
    const note = reply(await aiPreferenceNote(h.ctx(), d.cookie, { note: PERSONAS.maya.preferenceNote }));
    expect(note.chips).toEqual(PERSONAS.maya.preferenceChips);
    expect(note.meta).toMatchObject({ mode: "scripted", fallbackReason: "configured" });
    expect(ok(await getJourney(h.ctx(), d.cookie)).ai).toEqual({ mode: "scripted", reason: "configured" });
  });

  it("return live results when the active provider has a key, and count the calls", async () => {
    const spy = mockOpenAi(() => answers({ chips: [{ kind: "gender", value: "woman" }] }));
    const { d, h } = await driveToProviders("maya");
    const note = reply(await aiPreferenceNote(h.ctx(), d.cookie, { note: "A woman, please" }));
    expect(note.meta).toMatchObject({ mode: "live", provider: "openai", model: "gpt-6-luna" });
    expect(note.chips).toEqual([{ kind: "gender", value: "woman", label: "Woman provider" }]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((await d.state()).journey.counters.aiCalls).toBe(1);
    expect(ok(await getJourney(h.ctx(), d.cookie)).ai).toEqual({ mode: "live", provider: "openai", model: "gpt-6.1-sol", liveCallsLeft: 39 });
  });

  it("hand crisis language in the conversation to a person and never call a model (TAC-19)", async () => {
    const spy = mockOpenAi(() => answers({ items: [], followUpId: null }));
    const { d, h } = await driveToHome("maya");
    const r = await aiIntake(h.ctx(), d.cookie, { promptId: 1, answer: CRISIS_ANSWER });
    expect(r).toEqual({ status: 200, body: { safety: "crisis" } });
    expect(spy).not.toHaveBeenCalled();
    const s = await d.state();
    expect(s.journey.readiness.safetyFlags).toEqual([expect.objectContaining({ type: "crisis_language" })]);
    expect(s.journey.stage).toBe("home"); // the booking stays in place
    const events = await h.store.listEvents(s.journey.id);
    const raised = events.filter((e) => e.name === "safety_flag_raised");
    expect(raised).toHaveLength(1);
    expect(raised[0].props).toEqual({ type: "crisis_language" });
    expect(events.some((e) => e.name === "crisis_resources_shown" && e.props.trigger === "crisis_language")).toBe(true);
    expect(JSON.stringify([s, events])).not.toContain("better off dead");
  });

  it("show crisis resources for a crisis preference note without blocking booking", async () => {
    const { d, h } = await driveToProviders("jordan");
    expect(ok(await aiPreferenceNote(h.ctx(), d.cookie, { note: "I want to kill myself" }))).toEqual({ safety: "crisis" });
    const m = await d.providers();
    const s = await d.do({ type: "SELECT_SLOT", providerId: m.top[0].id, slotStart: m.top[0].slots[0] });
    expect(s.journey.stage).toBe("hold");
    expect(s.journey.readiness.safetyFlags).toHaveLength(1);
  });

  it("fall back to scripted after 40 live calls in one journey (TAC-52)", async () => {
    const spy = mockOpenAi(() => answers({ chips: [] }));
    const { d, h } = await driveToProviders("maya");
    const id = (await d.state()).journey.id;
    const j = (await h.store.getJourney(id))!;
    j.counters.aiCalls = 40;
    await h.store.putJourney(j);
    const note = reply(await aiPreferenceNote(h.ctx(), d.cookie, { note: "evenings" }));
    expect(note.meta).toMatchObject({ mode: "scripted", fallbackReason: "journey_cap" });
    expect(spy).not.toHaveBeenCalled();
    expect(ok(await getJourney(h.ctx(), d.cookie)).ai).toMatchObject({ mode: "scripted", reason: "journey_cap" });
  });

  it("fall back to scripted once the day's live calls across all journeys are used", async () => {
    vi.stubEnv("AI_DAILY_LIVE_CALLS", "2");
    const spy = mockOpenAi(() => answers({ chips: [] }));
    const h = new Harness();
    const { d: first } = await driveToProviders("maya", h);
    const { d: second } = await driveToProviders("jordan", h);
    expect(reply(await aiPreferenceNote(h.ctx(), first.cookie, { note: "mornings" })).meta.mode).toBe("live");
    expect(reply(await aiPreferenceNote(h.ctx(), second.cookie, { note: "mornings" })).meta.mode).toBe("live");
    const capped = reply(await aiPreferenceNote(h.ctx(), first.cookie, { note: "mornings" }));
    expect(capped.meta).toMatchObject({ mode: "scripted", fallbackReason: "daily_cap" });
    expect(spy).toHaveBeenCalledTimes(2);
    h.advance(24 * 3600 * 1000); // a new UTC day
    expect(reply(await aiPreferenceNote(h.ctx(), second.cookie, { note: "mornings" })).meta.mode).toBe("live");
  });

  it("check the journey, the stage, and the input", async () => {
    const h = new Harness();
    const d = new Device(h);
    expect((await aiPreferenceNote(h.ctx(), undefined, { note: "hi there" })).status).toBe(404);
    await d.start("maya");
    expect((await aiPreferenceNote(h.ctx(), d.cookie, { note: "hi there" })).status).toBe(409);
    expect((await aiIntake(h.ctx(), d.cookie, { promptId: 1, answer: "hello there" })).status).toBe(409);
    expect((await aiSummary(h.ctx(), d.cookie, { items: [{ kind: "goal", text: "Feel better" }] })).status).toBe(409);
    const { d: p, h: ph } = await driveToProviders("maya");
    expect((await aiPreferenceNote(ph.ctx(), p.cookie, { note: "x".repeat(301) })).status).toBe(400);
    expect((await aiPreferenceNote(ph.ctx(), p.cookie, {})).status).toBe(400);
    const { d: home, h: hh } = await driveToHome("jordan");
    expect((await aiIntake(hh.ctx(), home.cookie, { promptId: 5, answer: "hello there" })).status).toBe(400);
    expect((await aiIntake(hh.ctx(), home.cookie, { promptId: 1, answer: "hi", followUpOf: "not_a_follow_up" })).status).toBe(400);
    expect((await aiSummary(hh.ctx(), home.cookie, { items: [] })).status).toBe(400);
  });

  it("don't overwrite an action the patient took while the model was working", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    mockOpenAi(() => answers({ chips: [] }, gate));
    const { d, h } = await driveToProviders("jordan");
    const pending = aiPreferenceNote(h.ctx(), d.cookie, { note: "mornings please" });
    await d.do({ type: "SET_EARLIER_ALERT", on: true });
    release();
    reply(await pending);
    const s = await d.state();
    expect(s.journey.preferences.earlierOpeningAlert).toBe(true);
    expect(s.journey.counters.aiCalls).toBe(1);
  });

  it("run Maya's whole guided conversation and store only what she confirmed (TAC-18)", async () => {
    const { d, h } = await driveToHome("maya");
    await d.do({ type: "ID_VERIFY" });
    await d.do({ type: "RECORDS_CONSENT" });
    const story = PERSONAS.maya.story;
    const items: StoryItem[] = [];
    const used: FollowUpId[] = [];
    for (const promptId of [1, 2, 3, 4] as PromptId[]) {
      const first: IntakeOutput = reply(await aiIntake(h.ctx(), d.cookie, { promptId, answer: story.answers[promptId], usedFollowUps: used }));
      items.push(...first.items);
      if (first.followUpId) {
        used.push(first.followUpId);
        const answer = story.followUpAnswers[first.followUpId]!;
        const next = reply(await aiIntake(h.ctx(), d.cookie, { promptId, answer, followUpOf: first.followUpId, usedFollowUps: used }));
        expect(next.followUpId).toBeNull();
        items.push(...next.items);
      }
    }
    expect(used).toEqual(["sleep_impact", "med_side_effects"]);
    const summary = reply(await aiSummary(h.ctx(), d.cookie, { items }));
    expect(summary.text).toBe(story.summary);
    const s = await d.do({ type: "STORY_CONFIRM", items, summary: { text: summary.text, mode: summary.meta.mode }, typedAnswers: 4 + used.length });
    expect(s.journey.readiness.tasks.story).toBe("done");
    expect(s.journey.readiness.story).toEqual(items);

    // No sentence the patient typed is stored anywhere: not in the journey, not in its events.
    const stored = JSON.stringify([await h.store.getJourney(s.journey.id), await h.store.listEvents(s.journey.id)]);
    const sentences = [...Object.values(story.answers), ...Object.values(story.followUpAnswers)]
      .flatMap((a) => a!.split(/(?<=[.!?])\s+/))
      .map((x) => x.replace(/[.!?]$/, ""))
      .filter((x) => x.length > 20);
    expect(sentences.length).toBeGreaterThan(8);
    for (const sentence of sentences) expect(stored).not.toContain(sentence);
  });

  it("raise a flag when a confirmed item was edited to include crisis language", async () => {
    const { d, h } = await driveToHome("jordan");
    const s = await d.do({
      type: "STORY_CONFIRM",
      items: [{ kind: "concern", text: "Sometimes I want to end my life" }],
      summary: { text: "Jordan shared one concern.", mode: "scripted" },
      typedAnswers: 1,
    });
    expect(s.journey.readiness.safetyFlags).toEqual([expect.objectContaining({ type: "crisis_language" })]);
    const events = (await h.store.listEvents(s.journey.id)).map((e) => e.name);
    expect(events.slice(-3)).toEqual(["safety_flag_raised", "crisis_resources_shown", "intake_task_completed"]);
  });
});

describe("resuming on another device", () => {
  it("records search results that arrived while the patient was away, exactly once", async () => {
    const { d, h } = await driveToHome("maya");
    await d.do({ type: "ID_VERIFY" });
    const s = await d.do({ type: "RECORDS_CONSENT" });
    h.advance(60_000); // the searches finish while nobody has the app open
    const laptop = new Device(h);
    ok(await laptop.resume(s.journey.demoPhone!));
    await laptop.state();
    await d.state();
    const names = (await h.store.listEvents(s.journey.id)).map((e) => e.name);
    expect(names.filter((n) => n === "records_received")).toHaveLength(1);
    expect(names.filter((n) => n === "med_history_received")).toHaveLength(1);
    expect(names.indexOf("records_received")).toBeLessThan(names.indexOf("journey_resumed"));
  });
});
