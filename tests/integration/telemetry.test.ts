import { describe, expect, it } from "vitest";
import { computeFunnel } from "@/events/metrics";
import { PERSONAS } from "@/data/personas";
import { checkQuality } from "@/events/quality";
import { journeyView, reviewFlag } from "@/server/viewService";
import { driveFull, driveToHome, Harness, ok } from "./driver";

describe("telemetry over real journeys", () => {
  it("finds no quality issues in the demo patients' full journeys", async () => {
    const h = new Harness();
    const runs = [await driveFull("maya", h), await driveFull("jordan", h), await driveFull("sam", h)];
    const journeys = await Promise.all(
      runs.map(async (r) => ({ journey: (await h.store.getJourney(r.s.journey.id))!, events: await h.store.listEvents(r.s.journey.id) })),
    );
    const report = checkQuality(journeys);
    expect(report).toMatchObject({ journeys: 3, validationFailures: 0, outOfOrder: [], duplicates: [], linkageGaps: [], completeChains: 3 });

    const f = computeFunnel(journeys.flatMap((j) => j.events));
    expect(f.people).toBe(3);
    expect(f.headline).toMatchObject({ numerator: 3, denominator: 3 });
    expect(f.stages.find((s) => s.id === "next_step")).toMatchObject({ numerator: 3, denominator: 3 });
    expect(f.guardrails.find((g) => g.id === "flags_on_time")).toMatchObject({ numerator: 0, denominator: 1 }); // Sam's flag isn't reviewed in this run
    expect(f.trust).toMatchObject({ median: 5, answered: 3 });
  });
});

describe("the journey view (TRD 7.7)", () => {
  it("assembles the panels, and Mark reviewed records the review on that journey (TAC-42, TAC-55)", async () => {
    const h = new Harness();
    const maya = await driveFull("maya", h);
    // Sam stops at the check-in with his PHQ-9 item 9 flag open.
    const sam = await driveToHome("sam", h);
    for (const [index, value] of PERSONAS.sam.checkIn.phq9.entries()) await sam.d.do({ type: "CHECKIN_ANSWER", instrument: "phq9", index, value });

    const view = ok(await journeyView(h.ctx(), maya.d.cookie));
    expect(view.thisJourney).toMatchObject({ journeyId: maya.s.journey.id, stage: "after", sessions: 1, missing: [] });
    expect(view.thisJourney!.linkedAt).toBe(view.thisJourney!.events.find((e) => e.name === "account_created")!.id);
    expect(view.live.people).toBe(2);
    expect(view.live.funnel.headline).toMatchObject({ numerator: 1, denominator: 2 });
    expect(view.synthetic.people).toBe(400);
    expect(view.synthetic.funnel.headline.denominator).toBeGreaterThan(200);
    expect(view.today.rows[0]).toEqual({ label: "Start", sessions: 5_898 });
    expect(view.quality).toMatchObject({ validationFailures: 0, outOfOrder: [], duplicates: [], linkageGaps: [] });

    const samRow = view.inProgress.find((r) => r.stage === "home")!;
    expect(samRow.openFlags).toHaveLength(1);
    expect(samRow.readiness).toEqual({ done: 0, total: 6 });
    expect(ok(await reviewFlag(h.ctx(), { journeyId: samRow.journeyId, flagId: samRow.openFlags[0].id }))).toEqual({ ok: true });
    const events = await h.store.listEvents(samRow.journeyId);
    expect(events.at(-1)).toMatchObject({ name: "safety_flag_reviewed", source: "system_of_record", props: { type: "phq9_item9" } });
    const after = ok(await journeyView(h.ctx(), maya.d.cookie));
    expect(after.inProgress.find((r) => r.journeyId === samRow.journeyId)!.openFlags).toEqual([]);
    expect(after.live.funnel.guardrails.find((g) => g.id === "flags_on_time")).toMatchObject({ numerator: 1, denominator: 1 });
  });

  it("is only available in demo mode", async () => {
    const h = new Harness();
    const { d } = await driveToHome("jordan", h);
    expect((await journeyView({ ...h.ctx(), demoMode: false }, d.cookie)).status).toBe(404);
    expect((await reviewFlag({ ...h.ctx(), demoMode: false }, { journeyId: "x", flagId: "y" })).status).toBe(404);
  });
});
