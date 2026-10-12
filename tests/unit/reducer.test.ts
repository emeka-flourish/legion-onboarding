import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { actionSchema } from "@/domain/actions";
import { applyAction, newJourney, TransitionError } from "@/domain/reducer";
import { validateEventProps } from "@/events/privacy";
import type { Journey } from "@/domain/types";
import { matchProviders } from "@/rules/matching";
import { resolveDueJobs } from "@/services/sim/jobs";
import { followUpSlots } from "@/services/sim/scheduling";
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
  j = run(j, [{ type: "HOLD_START", firstName: "Maya", lastName: "Torres", phone: "x" }], { phoneHash: "hash-maya" }).journey;
  j = run(j, [{ type: "HOLD_VERIFY", code: "123456" }], { codeValid: true }).journey;
  j = run(j, [{ type: "COVERAGE_SUBMIT", method: "member_id", memberId: "XKB903318842", dob: "1997-03-14" }]).journey;
  expectError(() => applyAction(j, { type: "COVERAGE_CONTINUE" }, ctx()), "invalid_transition"); // still checking
  resolveDueJobs(j, later(60_000));
  expect(j.coverage?.status).toBe("active");
  const booked = run(j, [
    { type: "COVERAGE_CONTINUE" },
    { type: "BOOK", email: "patient@example.com", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" },
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
    expectError(() => applyAction(j, { type: "HOLD_START", firstName: "Maya", lastName: "Torres", phone: "bad" }, ctx()), "invalid_input");
    j = run(j, [{ type: "HOLD_START", firstName: "Maya", lastName: "Torres", phone: "x" }], { phoneHash: "h1" }).journey;
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
    j = run(j, [{ type: "HOLD_START", firstName: "Maya", lastName: "Torres", phone: "x" }], { phoneHash: "h" }).journey;
    j = run(j, [{ type: "HOLD_VERIFY", code: "123456" }], { codeValid: true }).journey;
    j = run(j, [{ type: "COVERAGE_SUBMIT", method: "member_id", memberId: "XKB903318842", dob: "1997-03-14" }]).journey;
    expectError(() => applyAction(j, { type: "COVERAGE_CONFIRM_LATER" }, ctx()), "invalid_transition");
    expectError(
      () => applyAction(j, { type: "BOOK", email: "patient@example.com", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" }, ctx()),
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
    // The email deferred from the hold is asked at booking and kept on the account, never in an event (L21).
    expect(journey.person?.email).toBe("patient@example.com");
    expect(JSON.stringify(events)).not.toContain("@");
    const confirmed = events.find((e) => e.name === "appointment_confirmed")!;
    expect(confirmed.props).toMatchObject({ coverage_confirm_later: false });
    expect(typeof confirmed.props!.typed_inputs).toBe("number");
    expect(typeof confirmed.props!.taps).toBe("number");
  });

  it("needs a real email to book, and stores it trimmed and in lowercase (L21)", () => {
    const book = { type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" };
    expect(actionSchema.safeParse({ ...book }).success).toBe(false);
    expect(actionSchema.safeParse({ ...book, email: "maya at example dot com" }).success).toBe(false);
    expect(actionSchema.parse({ ...book, email: "  Maya.Torres@Example.COM " })).toMatchObject({ email: "maya.torres@example.com" });
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
    expect(j.readiness.identity).toMatchObject({ legalName: "Maya Elena Torres", state: "TX", ageVerified: true, reviewFlag: false, reviewReasons: [] });
    expect(j.readiness.identity?.fromId).toMatchObject({ legalName: "Maya Elena Torres", addressLine: "2104 Elm Ridge Dr" });
    expect(j.readiness.identity?.source).toMatch(/Persona \(simulated\)/);
  });

  it("lets the patient correct what the ID read, with fixed rules deciding when a person checks (L21, TAC-74)", () => {
    const j = run(mayaBooked().journey, [{ type: "ID_VERIFY" }]).journey;
    // A new Texas address saves without a review, and the event names the field, never the value.
    const moved = applyAction(j, { type: "ID_CORRECT", address: { line: "48 Barton Springs Rd", city: "Austin", state: "TX", zip: "78746" } }, ctx());
    expect(moved.journey.readiness.identity).toMatchObject({ addressLine: "48 Barton Springs Rd", zip: "78746", reviewFlag: false, reviewReasons: [] });
    expect(moved.journey.readiness.identity?.fromId.addressLine).toBe("2104 Elm Ridge Dr");
    expect(moved.events).toEqual([{ name: "identity_details_corrected", props: { field: "address", review_flag: false } }]);
    expect(() => validateEventProps("identity_details_corrected", moved.events[0].props!)).not.toThrow();
    // A changed birth date goes to a person, age still comes from the ID, and the visit stays booked.
    const older = applyAction(moved.journey, { type: "ID_CORRECT", dob: "1990-03-14" }, ctx());
    expect(older.journey.readiness.identity).toMatchObject({ dob: "1990-03-14", ageVerified: true, reviewFlag: true, reviewReasons: ["dob_changed"] });
    expect(older.journey.booking).toBeDefined();
    expect(older.events).toEqual([{ name: "identity_details_corrected", props: { field: "dob", review_flag: true } }]);
    // Saving without a change records nothing, and an impossible or future date is refused in plain words.
    expect(applyAction(older.journey, { type: "ID_CORRECT", dob: "1990-03-14" }, ctx()).events).toEqual([]);
    expectError(() => applyAction(older.journey, { type: "ID_CORRECT", dob: "1990-02-30" }, ctx()), "invalid_input");
    expectError(() => applyAction(older.journey, { type: "ID_CORRECT", dob: "2030-01-01" }, ctx()), "invalid_input");
  });

  it("refuses a correction before the ID check", () => {
    expectError(() => applyAction(mayaBooked().journey, { type: "ID_CORRECT", legalName: "Maya Torres" }, ctx()), "invalid_transition");
  });

  it("finds Maya's health summary from two clinics and her medication once the searches finish (TAC-22)", () => {
    const j = homeWithRecords();
    expect(j.readiness.tasks.records).toBe("done");
    expect(j.readiness.foundRecords).toHaveLength(7);
    expect(new Set(j.readiness.foundRecords!.map((r) => r.kind))).toEqual(new Set(["visit", "condition", "allergy", "lab"]));
    expect(new Set(j.readiness.foundRecords!.map((r) => r.source)).size).toBe(2);
    expect(j.readiness.foundMedications?.[0]).toMatchObject({ pharmacyId: "riverside-austin", needsConfirmation: expect.any(String) });
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

  it("keeps the last name given at the hold, and counts it as a typed input", () => {
    const { journey } = toProviders("maya");
    const slot = matchProviders(journey, NOW).top[0];
    let j = run(journey, [{ type: "SELECT_SLOT", providerId: slot.id, slotStart: slot.slots[0] }]).journey;
    const typed = j.counters.typed;
    j = run(j, [{ type: "HOLD_START", firstName: "Maya", lastName: "Torres", phone: "x" }], { phoneHash: "h" }).journey;
    expect(j.counters.typed - typed).toBe(3);
    j = run(j, [{ type: "HOLD_VERIFY", code: "123456" }], { codeValid: true }).journey;
    expect(j.person).toMatchObject({ firstName: "Maya", lastName: "Torres" });
  });

  it("books the follow-up once, then records a change of time as a reschedule", () => {
    const j = homeWithRecords();
    const after = run(j, [{ type: "JOIN_VISIT" }, { type: "END_VISIT" }]).journey;
    const slots = followUpSlots(after.booking!.providerId, after.id, new Date(after.booking!.start), PERSONAS.maya.visit.followUpWeeks);
    const booked = run(after, [{ type: "BOOK_FOLLOW_UP", slotStart: slots[0] }]);
    expect(names(booked.events)).toEqual(["follow_up_booked"]);
    const same = run(booked.journey, [{ type: "BOOK_FOLLOW_UP", slotStart: slots[0] }]);
    expect(same.events).toEqual([]);
    const moved = run(booked.journey, [{ type: "BOOK_FOLLOW_UP", slotStart: slots[1] }]);
    expect(names(moved.events)).toEqual(["follow_up_rescheduled"]);
    expect(moved.journey.after?.followUpStart).toBe(slots[1]);
  });

  it("offers Sam's follow-up sooner, as his provider asked", () => {
    const visit = new Date("2026-10-15T20:00:00.000Z");
    const days = (s: string) => (new Date(s).getTime() - visit.getTime()) / 86_400_000;
    for (const s of followUpSlots("p-marcus", "j-sam", visit, PERSONAS.sam.visit.followUpWeeks)) expect(days(s)).toBeLessThan(21);
    for (const s of followUpSlots("p-marcus", "j-sam", visit, PERSONAS.maya.visit.followUpWeeks)) expect(days(s)).toBeGreaterThan(25);
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
