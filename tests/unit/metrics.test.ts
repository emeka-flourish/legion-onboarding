import { describe, expect, it } from "vitest";
import type { JourneyEvent } from "@/domain/types";
import { computeFunnel, groupByPerson } from "@/events/metrics";
import { checkQuality, missingFromChain, nextExpected } from "@/events/quality";

// A fixed fixture with hand-computed answers (TAC-40). Six people; person A started twice, on two devices.
const T0 = Date.parse("2026-10-01T15:00:00Z");
const MIN = 60_000;
let n = 0;
function ev(journeyId: string, name: string, minutes: number, props: JourneyEvent["props"] = {}, personId?: string): JourneyEvent {
  return {
    id: `e${n++}`,
    v: 1,
    name,
    journeyId,
    personId,
    session: 1,
    ts: new Date(T0 + minutes * MIN).toISOString(),
    source: "patient_action",
    props,
  };
}
const eligible = { outcome: "eligible" };

const A = "pA";
const personA = [
  ev("a1", "onboarding_started", 0),
  ev("a1", "eligibility_evaluated", 1, eligible),
  ev("a1", "providers_presented", 3),
  ev("a1", "reservation_created", 4),
  ev("a1", "account_created", 5, {}, A),
  ev("a1", "appointment_confirmed", 10, { coverage_confirm_later: false }, A),
  ev("a1", "trust_pulse_answered", 11, { score: 5 }, A),
  ev("a1", "safety_flag_raised", 60, { type: "phq9_item9" }, A),
  ev("a1", "safety_flag_reviewed", 90, { type: "phq9_item9", minutes_to_review: 30 }, A),
  ev("a1", "visit_ready", 120, { hours_before_visit: 30, typed_inputs: 12 }, A),
  ev("a1", "visit_started", 3 * 24 * 60, {}, A),
  ev("a1", "first_visit_completed", 3 * 24 * 60 + 50, {}, A),
  ev("a1", "follow_up_booked", 3 * 24 * 60 + 60, {}, A),
  // A second device: a new journey that verified the same phone, so it carries the same person ID.
  ev("a2", "onboarding_started", 4 * 24 * 60),
  ev("a2", "eligibility_evaluated", 4 * 24 * 60 + 1, eligible),
  ev("a2", "providers_presented", 4 * 24 * 60 + 2),
  ev("a2", "reservation_created", 4 * 24 * 60 + 3),
  ev("a2", "account_created", 4 * 24 * 60 + 4, {}, A),
];
const personB = [ev("b1", "onboarding_started", 0), ev("b1", "eligibility_evaluated", 1, eligible), ev("b1", "providers_presented", 2), ev("b1", "reservation_created", 3)];
const C = "pC";
const personC = [
  ev("c1", "onboarding_started", 0),
  ev("c1", "eligibility_evaluated", 1, eligible),
  ev("c1", "providers_presented", 3),
  ev("c1", "reservation_created", 4),
  ev("c1", "account_created", 5, {}, C),
  ev("c1", "appointment_confirmed", 20, { coverage_confirm_later: true }, C),
  ev("c1", "trust_pulse_answered", 21, { score: 3 }, C),
  ev("c1", "safety_flag_raised", 60, { type: "crisis_language" }, C),
  ev("c1", "safety_flag_reviewed", 360, { type: "crisis_language", minutes_to_review: 300 }, C),
  ev("c1", "visit_ready", 400, { hours_before_visit: 10, typed_inputs: 16 }, C),
  ev("c1", "visit_started", 20 * 24 * 60, {}, C),
  ev("c1", "first_visit_completed", 20 * 24 * 60 + 50, {}, C), // after 14 days: not in the headline
];
const personD = [ev("d1", "onboarding_started", 0), ev("d1", "eligibility_evaluated", 1, { outcome: "screened_out" }), ev("d1", "screen_out_resource_shown", 1)];
const personE = [ev("e1", "onboarding_started", 0), ev("e1", "eligibility_evaluated", 1, { outcome: "screened_out" })];
const personF = [ev("f1", "onboarding_started", 0), ev("f1", "eligibility_evaluated", 1, eligible), ev("f1", "providers_presented", 2)];
const ALL = [...personA, ...personB, ...personC, ...personD, ...personE, ...personF];

describe("per-person funnel (TAC-40)", () => {
  const f = computeFunnel(ALL);

  it("counts each person once, across journeys and devices", () => {
    expect(groupByPerson(ALL).size).toBe(6);
    expect(f.people).toBe(6);
  });

  it("puts the headline first: first visit within 14 days, among eligible starters", () => {
    expect(f.headline).toMatchObject({ numerator: 1, denominator: 4, rate: 0.25 });
  });

  it("computes the six stage rates", () => {
    const r = Object.fromEntries(f.stages.map((s) => [s.id, [s.numerator, s.denominator]]));
    expect(r).toEqual({
      selected: [3, 4],
      account: [2, 3],
      cost_known: [1, 2],
      ready_on_time: [1, 2],
      attended: [2, 2],
      next_step: [1, 2],
    });
  });

  it("computes the four guardrails and the trust measure", () => {
    const g = Object.fromEntries(f.guardrails.map((x) => [x.id, "value" in x ? x.value : [x.numerator, x.denominator]]));
    expect(g).toEqual({ typed: 14, minutes_to_book: 15, resources: [1, 2], flags_on_time: [1, 2] });
    expect(f.trust).toEqual({ median: 4, shareHigh: 0.5, answered: 2 });
  });

  it("reports no rate rather than a misleading zero when nobody is in the denominator", () => {
    const empty = computeFunnel([]);
    expect(empty.headline.rate).toBeNull();
    expect(empty.trust.median).toBeNull();
  });
});

describe("data-quality checks (TRD 7.8)", () => {
  const journey = (id: string, stage: Parameters<typeof missingFromChain>[0], rejectedEvents = 0) => ({
    id,
    stage,
    counters: { typed: 0, taps: 0, aiCalls: 0, rejectedEvents },
  });
  const clean = [
    ev("q1", "onboarding_started", 0),
    ev("q1", "eligibility_evaluated", 1, eligible),
    ev("q1", "care_need_captured", 2),
    ev("q1", "coverage_selected", 3),
    ev("q1", "providers_presented", 4),
    ev("q1", "slot_selected", 5),
    ev("q1", "reservation_created", 6),
    ev("q1", "account_created", 7, {}, "pQ"),
    ev("q1", "consents_signed", 8, {}, "pQ"),
    ev("q1", "payment_method_added", 8, {}, "pQ"),
    ev("q1", "appointment_confirmed", 8, {}, "pQ"),
    ev("q1", "reminder_sent", 8, { kind: "confirmation" }, "pQ"),
  ];

  it("passes a clean journey, with its chain complete", () => {
    const r = checkQuality([{ journey: journey("q1", "home"), events: clean }]);
    expect(r).toMatchObject({ validationFailures: 0, outOfOrder: [], duplicates: [], linkageGaps: [], completeChains: 1 });
  });

  it("catches an out-of-order event, a duplicate system-of-record event, and a linkage gap", () => {
    const planted = [
      ...clean.slice(0, 6),
      ev("q2", "appointment_confirmed", 6, {}, "pQ"), // before the reservation and the account
      ...clean.slice(6, 8),
      ev("q2", "payment_method_added", 8), // after the account, but no person ID
      ev("q2", "payment_method_added", 8, {}, "pQ"), // a duplicate
    ].map((e) => ({ ...e, journeyId: "q2" }));
    const r = checkQuality([{ journey: journey("q2", "home", 1), events: planted }]);
    expect(r.validationFailures).toBe(1);
    expect(r.outOfOrder.map((i) => i.event)).toContain("appointment_confirmed");
    expect(r.duplicates.map((i) => i.event)).toEqual(["payment_method_added"]);
    expect(r.linkageGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "appointment_confirmed", detail: "has a person ID before the account existed" }),
        expect.objectContaining({ event: "payment_method_added", detail: "is missing the person ID after the account" }),
      ]),
    );
    expect(r.completeChains).toBe(0);
    expect(missingFromChain("home", planted)).toEqual(["consents_signed"]);
  });

  it("names what should happen next", () => {
    const tasks = { identity: "done", records: "done", story: "done", check_in: "todo", confirm_found: "done", pharmacy: "done", essentials: "todo" } as const;
    expect(nextExpected({ stage: "home", readiness: { tasks } as never, after: undefined })).toEqual(["intake_task_completed (2 left)", "visit_ready"]);
    expect(nextExpected({ stage: "after", readiness: {} as never, after: { summaryViewed: true } })).toEqual(["follow_up_booked"]);
    expect(nextExpected({ stage: "after", readiness: {} as never, after: { summaryViewed: true, followUpStart: "x" } })).toEqual([]);
  });
});
