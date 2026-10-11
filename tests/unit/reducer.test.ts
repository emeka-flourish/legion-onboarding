import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { applyAction, newJourney, TransitionError } from "@/domain/reducer";
import type { Journey } from "@/domain/types";
import { matchProviders } from "@/rules/matching";
import { resolveDueJobs } from "@/services/sim/jobs";
import { ctx, fitActions, later, names, NOW, run, toProviders } from "../helpers";

const expectError = (fn: () => unknown, code: TransitionError["code"]) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(TransitionError);
    expect((e as TransitionError).code).toBe(code);
    return;
  }
  throw new Error("expected a TransitionError");
};

/** Maya through booking, with coverage resolved. */
function mayaBooked() {
  const { journey } = toProviders("maya");
  const slot = matchProviders(journey, NOW).top[0];
  let j = run(journey, [{ type: "SELECT_SLOT", providerId: slot.id, slotStart: slot.slots[0] }]).journey;
  j = run(j, [{ type: "HOLD_START", firstName: "Maya", phone: "x" }], { phoneHash: "hash-maya" }).journey;
  j = run(j, [{ type: "HOLD_VERIFY", code: "123456" }], { codeValid: true }).journey;
  j = run(j, [{ type: "COVERAGE_SUBMIT", method: "member_id", memberId: "XKB903318842", dob: "1997-03-14" }]).journey;
  expectError(() => applyAction(j, { type: "COVERAGE_CONTINUE" }, ctx()), "invalid_transition"); // still checking
  resolveDueJobs(j, later(60_000));
  expect(j.coverage?.status).toBe("active");
  const booked = run(j, [
    { type: "COVERAGE_CONTINUE" },
    { type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" },
  ]);
  return booked;
}

describe("fit check", () => {
  it("routes a Yes to the risk-of-harm question straight to crisis, and nothing books after that (TAC-01)", () => {
    const { journey, events } = run(newJourney("j1", NOW, { timeZone: "America/Chicago" }), [
      { type: "ANSWER_FIT", questionId: "texas", answer: true },
      { type: "ANSWER_FIT", questionId: "risk_of_harm", answer: true },
    ]);
    expect(journey.stage).toBe("crisis");
    expect(events).toContainEqual({ name: "crisis_resources_shown", props: { trigger: "fit_check" } });
    expectError(() => applyAction(journey, { type: "SET_CONDITIONS", conditions: ["anxiety"] }, ctx()), "invalid_transition");
  });

  it("screens out with a reason code and a resource event (TAC-02)", () => {
    const { journey, events } = run(newJourney("j2", NOW, { timeZone: "America/Chicago" }), [
      { type: "ANSWER_FIT", questionId: "texas", answer: false },
    ]);
    expect(journey.stage).toBe("not_a_fit");
    expect(journey.eligibility).toEqual({ outcome: "screened_out", reasonCode: "not_texas" });
    expect(events).toContainEqual({ name: "screen_out_resource_shown", props: { reason: "not_texas" } });
  });

  it("lets a screened-out patient change the answer that screened them out, but never undoes a crisis", () => {
    const out = run(newJourney("j4", NOW, { timeZone: "America/Chicago" }), [
      { type: "ANSWER_FIT", questionId: "texas", answer: false },
      { type: "GO_BACK" },
    ]).journey;
    expect(out.stage).toBe("fit");
    expect(out.fit.texas).toBeUndefined();
    expect(out.eligibility).toBeUndefined();
    expect(run(out, [{ type: "ANSWER_FIT", questionId: "texas", answer: true }]).journey.stage).toBe("fit");

    const crisis = run(newJourney("j5", NOW, { timeZone: "America/Chicago" }), [{ type: "ANSWER_FIT", questionId: "risk_of_harm", answer: true }]).journey;
    expectError(() => applyAction(crisis, { type: "GO_BACK" }, ctx()), "invalid_transition");
  });

  it("moves an eligible person on to needs", () => {
    const { journey, events } = run(newJourney("j3", NOW, { personaId: "maya", timeZone: "America/Chicago" }), fitActions("maya"));
    expect(journey.stage).toBe("needs");
    expect(events.at(-1)).toEqual({ name: "eligibility_evaluated", props: { outcome: "eligible" } });
  });
});

describe("book fast", () => {
  it("gives each demo journey its own fictional 555-01xx phone number", () => {
    const a = newJourney("a", NOW, { personaId: "maya", timeZone: "America/Chicago" });
    expect(a.demoPhone).toMatch(/^\(512\) 555-01\d\d$/);
    const many = new Set(Array.from({ length: 20 }, (_, i) => newJourney(`j${i}`, NOW, { personaId: "maya", timeZone: "x" }).demoPhone));
    expect(many.size).toBeGreaterThan(1);
  });

  it("rejects a time that isn't offered", () => {
    const { journey } = toProviders("maya");
    expectError(
      () => applyAction(journey, { type: "SELECT_SLOT", providerId: "p-amara", slotStart: "2026-10-12T15:00:00.000Z" }, ctx()),
      "invalid_input",
    );
  });

  it("holds a chosen time, then asks for name and phone", () => {
    const { journey } = toProviders("maya");
    const card = matchProviders(journey, NOW).top[0];
    const r = applyAction(journey, { type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] }, ctx());
    expect(r.journey.stage).toBe("hold");
    expect(names(r.events)).toEqual(["slot_selected", "reservation_created"]);
  });

  it("offers alternatives when the chosen time was just taken, and won't take it again (TAC-15)", () => {
    const { journey } = toProviders("maya");
    const card = matchProviders(journey, NOW).top[0];
    const armed = run(journey, [{ type: "DEMO_SET", takeChosenSlot: true }]).journey;
    const r = applyAction(armed, { type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] }, ctx());
    expect(r.journey.stage).toBe("providers");
    expect(names(r.events)).toEqual(["slot_selected", "reservation_failed"]);
    expect(r.reply?.alternatives?.length).toBeGreaterThan(0);
    expect(r.reply?.alternatives).not.toContain(card.slots[0]);
    expectError(() => applyAction(r.journey, { type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] }, ctx()), "invalid_input");
  });

  it("creates the person only with a valid code, and reuses a known person's ID (TAC-38)", () => {
    const { journey } = toProviders("maya");
    const card = matchProviders(journey, NOW).top[0];
    let j = run(journey, [{ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] }]).journey;
    expectError(() => applyAction(j, { type: "HOLD_START", firstName: "Maya", phone: "bad" }, ctx()), "invalid_input");
    j = run(j, [{ type: "HOLD_START", firstName: "Maya", phone: "x" }], { phoneHash: "h1" }).journey;
    expectError(() => applyAction(j, { type: "HOLD_VERIFY", code: "000000" }, ctx({ codeValid: false })), "invalid_input");
    const fresh = applyAction(j, { type: "HOLD_VERIFY", code: "123456" }, ctx({ codeValid: true }));
    expect(fresh.journey.person?.personId).toMatch(/^per_/);
    expect(fresh.journey.stage).toBe("coverage");
    expect(names(fresh.events)).toEqual(["account_created"]);
    const reused = applyAction(j, { type: "HOLD_VERIFY", code: "123456" }, ctx({ codeValid: true, existingPersonId: "per_known" }));
    expect(reused.journey.person?.personId).toBe("per_known");
  });

  it("lets a patient book before a slow plan answers, but only after 15 seconds (TAC-14)", () => {
    const { journey } = toProviders("maya");
    const card = matchProviders(journey, NOW).top[0];
    let j = run(journey, [
      { type: "DEMO_SET", slowInsurer: true },
      { type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] },
    ]).journey;
    j = run(j, [{ type: "HOLD_START", firstName: "Maya", phone: "x" }], { phoneHash: "h" }).journey;
    j = run(j, [{ type: "HOLD_VERIFY", code: "123456" }], { codeValid: true }).journey;
    j = run(j, [{ type: "COVERAGE_SUBMIT", method: "member_id", memberId: "XKB903318842", dob: "1997-03-14" }]).journey;
    expectError(() => applyAction(j, { type: "COVERAGE_CONFIRM_LATER" }, ctx()), "invalid_transition");
    expectError(
      () => applyAction(j, { type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" }, ctx()),
      "invalid_transition",
    );
    const r = applyAction(j, { type: "COVERAGE_CONFIRM_LATER" }, ctx({ now: later(1_000) })); // DEMO_FAST: 15 s / 20
    expect(r.journey.stage).toBe("book");
    expect(r.journey.coverage?.confirmLater).toBe(true);
  });

  it("books with consents and records system-of-record events with effort counts", () => {
    const { journey, events } = mayaBooked();
    expect(journey.stage).toBe("home");
    expect(names(events)).toEqual(["consents_signed", "payment_method_added", "appointment_confirmed", "reminder_sent"]);
    const confirmed = events.find((e) => e.name === "appointment_confirmed")!;
    expect(confirmed.props).toMatchObject({ coverage_confirm_later: false });
    expect(typeof confirmed.props!.typed_inputs).toBe("number");
    expect(typeof confirmed.props!.taps).toBe("number");
  });

  it("goes back one step before booking", () => {
    const { journey } = toProviders("maya");
    expect(run(journey, [{ type: "GO_BACK" }]).journey.stage).toBe("pay");
  });
});

describe("arrive ready", () => {
  function homeWithRecords(): Journey {
    let j = mayaBooked().journey;
    expectError(() => applyAction(j, { type: "RECORDS_CONSENT" }, ctx()), "invalid_transition"); // ID first
    j = run(j, [{ type: "ID_VERIFY" }, { type: "RECORDS_CONSENT" }]).journey;
    expectError(
      () => applyAction(j, { type: "CONFIRM_FOUND", recordIds: [], medicationIds: [], otherMedications: [] }, ctx()),
      "invalid_transition",
    );
    resolveDueJobs(j, later(60_000));
    return j;
  }

  it("verifies identity first and fills the details the record search needs (TAC-16)", () => {
    const j = run(mayaBooked().journey, [{ type: "ID_VERIFY" }]).journey;
    expect(j.readiness.identity).toMatchObject({ legalName: "Maya Elena Torres", ageVerified: true, reviewFlag: false });
    expect(j.readiness.identity?.source).toMatch(/Persona \(simulated\)/);
  });

  it("finds Maya's two record sources and her medication once the searches finish (TAC-22)", () => {
    const j = homeWithRecords();
    expect(j.readiness.tasks.records).toBe("done");
    expect(j.readiness.foundRecords).toHaveLength(3);
    expect(new Set(j.readiness.foundRecords!.map((r) => r.source)).size).toBe(2);
    expect(j.readiness.foundMedications?.[0].pharmacyId).toBe("riverside-austin");
  });

  it("raises one safety flag for a positive PHQ-9 item 9 and keeps the visit booked (TAC-21)", () => {
    const j = mayaBooked().journey;
    const first = applyAction(j, { type: "CHECKIN_ANSWER", instrument: "phq9", index: 8, value: 1 }, ctx());
    expect(names(first.events)).toEqual(["safety_flag_raised", "crisis_resources_shown"]);
    expect(first.journey.booking).toBeDefined();
    const again = applyAction(first.journey, { type: "CHECKIN_ANSWER", instrument: "phq9", index: 8, value: 2 }, ctx());
    expect(again.journey.readiness.safetyFlags).toHaveLength(1);
  });

  it("records visit_ready with effort counts once every required task is done, then completes the visit", () => {
    let j = homeWithRecords();
    const p = PERSONAS.maya;
    const answers = [
      ...p.checkIn.gad7.map((value, index) => ({ type: "CHECKIN_ANSWER" as const, instrument: "gad7" as const, index, value })),
      ...p.checkIn.phq9.map((value, index) => ({ type: "CHECKIN_ANSWER" as const, instrument: "phq9" as const, index, value })),
    ];
    const r = run(j, [
      { type: "STORY_CONFIRM", items: [{ kind: "concern", text: "Anxious most days" }], summary: { text: p.story.summary, mode: "scripted" }, typedAnswers: 6 },
      ...answers,
      { type: "CONFIRM_FOUND", recordIds: ["rec-maya-1", "rec-maya-2", "rec-maya-3"], medicationIds: ["med-maya-1"], otherMedications: [] },
      { type: "SET_PHARMACY", pharmacyId: "riverside-austin" },
      { type: "SET_ESSENTIALS", ...p.essentials },
      { type: "TRUST_PULSE", score: 5 },
    ]);
    j = r.journey;
    const ready = r.events.find((e) => e.name === "visit_ready");
    expect(ready?.props).toMatchObject({ typed_inputs: j.counters.typed });
    expect(j.trustPulse).toBe(5);
    expect(names(r.events)).toContain("trust_pulse_answered");
    const visit = run(j, [{ type: "JOIN_VISIT" }, { type: "END_VISIT" }]);
    expect(visit.journey.stage).toBe("after");
    expect(names(visit.events)).toEqual(["reminder_sent", "visit_join_attempted", "visit_started", "first_visit_completed", "prescription_sent"]);
    expect(visit.journey.after?.prescriptionPharmacyId).toBe("riverside-austin");
  });

  it("asks the trust question once only", () => {
    const j = run(mayaBooked().journey, [{ type: "TRUST_PULSE", score: 4 }, { type: "TRUST_PULSE", score: 1 }]);
    expect(j.journey.trustPulse).toBe(4);
    expect(names(j.events)).toEqual(["trust_pulse_answered"]);
  });
});

describe("demo-only actions", () => {
  it("refuse to run outside demo mode", () => {
    const j = newJourney("j", NOW, { timeZone: "America/Chicago" });
    expectError(() => applyAction(j, { type: "DEMO_SET", slowInsurer: true }, ctx({ demoMode: false })), "invalid_transition");
  });
});
