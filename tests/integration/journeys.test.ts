import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import type { FitQuestionId } from "@/domain/types";
import { SYSTEM_OF_RECORD_EVENTS, type EventName } from "@/events/catalog";
import { validateEventProps } from "@/events/privacy";
import { matchProviders } from "@/rules/matching";
import { Device, driveFull, Harness, ok } from "./driver";
import { GOLDEN } from "./golden-events";

describe("golden journeys (TAC-36, TAC-37, TAC-39, TAC-41)", () => {
  for (const persona of ["maya", "jordan", "sam"] as const) {
    it(`${persona}: records exactly the golden sequence, linked and sourced correctly`, async () => {
      const { events, s } = await driveFull(persona);
      expect(events.map((e) => e.name)).toEqual(GOLDEN[persona]);
      expect(s.journey.stage).toBe("after");
      expect(s.journey.counters.rejectedEvents).toBe(0);

      // Linkage: one journey ID; no person before account_created; the same person from then on.
      const accountAt = events.findIndex((e) => e.name === "account_created");
      const personId = events[accountAt].personId;
      expect(personId).toMatch(/^per_/);
      events.forEach((e, i) => {
        expect(e.journeyId).toBe(s.journey.id);
        expect(e.v).toBe(1);
        expect(e.personId).toBe(i < accountAt ? undefined : personId);
        expect(e.source).toBe(SYSTEM_OF_RECORD_EVENTS.has(e.name as EventName) ? "system_of_record" : "patient_action");
        expect(() => validateEventProps(e.name, e.props)).not.toThrow();
      });
    });
  }

  it("adds no duplicate system-of-record events when a journey is read again (exactly once)", async () => {
    const { d, h, events } = await driveFull("maya");
    h.advance(120_000);
    await d.state();
    await d.state();
    expect(await h.store.listEvents(events[0].journeyId)).toHaveLength(events.length);
  });

  it("keeps Maya within the effort budget: at most 14 typed and 60 total inputs (TAC-50)", async () => {
    const { events } = await driveFull("maya");
    const ready = events.find((e) => e.name === "visit_ready")!;
    expect(ready.props.typed_inputs).toBeLessThanOrEqual(14);
    expect(Number(ready.props.typed_inputs) + Number(ready.props.taps)).toBeLessThanOrEqual(60);
  });

  it("captures what each demo patient's path is meant to show", async () => {
    const maya = (await driveFull("maya")).s.journey;
    expect(maya.coverage).toMatchObject({ status: "active", intakeCents: 4000 });
    expect(maya.readiness.pharmacyId).toBe("riverside-austin");
    expect(maya.after?.prescriptionPharmacyId).toBe("riverside-austin");

    const jordan = (await driveFull("jordan")).s.journey;
    expect(jordan.coverage?.mode).toBe("self_pay");
    expect(jordan.readiness.foundRecords).toEqual([]);
    expect(jordan.readiness.foundMedications).toEqual([]);
    expect(jordan.readiness.otherMedications?.[0]).toMatch(/Amphetamine salts XR/);
    expect(jordan.readiness.essentials?.controlledNow).toBe("yes");

    const sam = (await driveFull("sam")).s.journey;
    expect(sam.timeZone).toBe("America/Denver");
    expect(sam.coverage?.mode).toBe("self_pay");
    expect(sam.readiness.safetyFlags).toHaveLength(1);
    expect(sam.booking).toBeDefined(); // the visit stays booked after the safety flag
    expect(sam.after?.prescriptionPharmacyId).toBeUndefined();
  });
});

describe("identity across sessions and devices", () => {
  it("resumes the same journey on a second device by phone, as session 2 (TAC-13)", async () => {
    const h = new Harness();
    const laptop = new Device(h);
    const p = PERSONAS.maya;
    let s = await laptop.start("maya");
    for (const [questionId, answer] of Object.entries(p.fit) as [FitQuestionId, boolean][]) {
      s = await laptop.do({ type: "ANSWER_FIT", questionId, answer });
    }
    await laptop.do({ type: "SET_CONDITIONS", conditions: p.conditions });
    await laptop.do({ type: "SET_CARE_TYPE", careType: p.careType });
    await laptop.do({ type: "SET_PLAN", plan: p.plan });
    const card = (await laptop.providers()).top[0];
    s = await laptop.do({ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] });
    const hold = await laptop.do({ type: "HOLD_START", firstName: "Maya", phone: s.journey.demoPhone! });
    s = await laptop.do({ type: "HOLD_VERIFY", code: hold.demoCode! });

    const phone = new Device(h);
    const resumed = ok(await phone.resume(s.journey.demoPhone!));
    expect(resumed.journey.id).toBe(s.journey.id);
    expect(resumed.journey.stage).toBe("coverage");
    expect(resumed.journey.sessions).toBe(2);
    await phone.do({ type: "COVERAGE_SUBMIT", method: "member_id", memberId: p.coverage.memberId, dob: p.coverage.dob });
    const events = await h.store.listEvents(s.journey.id);
    const resumeEvent = events.find((e) => e.name === "journey_resumed")!;
    expect(resumeEvent.props).toEqual({ method: "phone", session: 2 });
    expect(events.at(-1)).toMatchObject({ name: "coverage_check_started", session: 2 });
  });

  it("reuses a known person's ID when a new journey verifies the same phone (TAC-38)", async () => {
    const h = new Harness();
    const first = await driveFull("maya", h);
    const firstPerson = first.events.find((e) => e.name === "account_created")!.personId;
    const d = new Device(h);
    let s = await d.start();
    for (const [questionId, answer] of Object.entries(PERSONAS.maya.fit) as [FitQuestionId, boolean][]) {
      s = await d.do({ type: "ANSWER_FIT", questionId, answer });
    }
    await d.do({ type: "SET_CONDITIONS", conditions: ["anxiety"] });
    await d.do({ type: "SET_CARE_TYPE", careType: "new_evaluation" });
    await d.do({ type: "SET_PLAN", plan: "none" });
    const card = (await d.providers()).top[0];
    await d.do({ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] });
    const hold = await d.do({ type: "HOLD_START", firstName: "Maya", phone: first.s.journey.demoPhone! });
    s = await d.do({ type: "HOLD_VERIFY", code: hold.demoCode! });
    expect(s.journey.person?.personId).toBe(firstPerson);
  });

  it("locks resuming after five wrong codes, for ten minutes (TAC-52)", async () => {
    const h = new Harness();
    const { s } = await driveFull("jordan", h);
    const phone = new Device(h);
    for (let i = 0; i < 4; i++) expect((await phone.resume(s.journey.demoPhone!, "000000")).status).toBe(401);
    expect((await phone.resume(s.journey.demoPhone!, "000000")).status).toBe(429);
    expect((await phone.resume(s.journey.demoPhone!)).status).toBe(429); // even the right code
    h.advance(11 * 60_000);
    expect((await phone.resume(s.journey.demoPhone!)).status).toBe(200);
  });
});

describe("exits and exceptions", () => {
  it("ends at crisis resources after a Yes to risk of harm; nothing else is accepted (TAC-01)", async () => {
    const d = new Device(new Harness());
    await d.start();
    await d.do({ type: "ANSWER_FIT", questionId: "texas", answer: true });
    await d.do({ type: "ANSWER_FIT", questionId: "medicaid_medicare", answer: false });
    const s = await d.do({ type: "ANSWER_FIT", questionId: "risk_of_harm", answer: true });
    expect(s.journey.stage).toBe("crisis");
    expect((await d.raw({ type: "SET_CONDITIONS", conditions: ["anxiety"] })).status).toBe(409);
  });

  it("screens out with a reason code (TAC-02)", async () => {
    const h = new Harness();
    const d = new Device(h);
    const started = await d.start();
    const s = await d.do({ type: "ANSWER_FIT", questionId: "texas", answer: false });
    expect(s.journey.eligibility?.reasonCode).toBe("not_texas");
    const names = (await h.store.listEvents(started.journey.id)).map((e) => e.name);
    expect(names).toContain("screen_out_resource_shown");
  });

  it("lets a patient book before a slow plan answers, then shows the outcome on the home screen (TAC-14, TAC-48)", async () => {
    const h = new Harness();
    const d = new Device(h);
    const p = PERSONAS.maya;
    let s = await d.start("maya");
    for (const [questionId, answer] of Object.entries(p.fit) as [FitQuestionId, boolean][]) {
      s = await d.do({ type: "ANSWER_FIT", questionId, answer });
    }
    await d.do({ type: "SET_CONDITIONS", conditions: p.conditions });
    await d.do({ type: "SET_CARE_TYPE", careType: p.careType });
    await d.do({ type: "SET_PLAN", plan: p.plan });
    await d.do({ type: "DEMO_SET", slowInsurer: true });
    const card = (await d.providers()).top[0];
    s = await d.do({ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] });
    const hold = await d.do({ type: "HOLD_START", firstName: "Maya", phone: s.journey.demoPhone! });
    await d.do({ type: "HOLD_VERIFY", code: hold.demoCode! });
    await d.do({ type: "COVERAGE_SUBMIT", method: "member_id", memberId: p.coverage.memberId, dob: p.coverage.dob });
    h.advance(500);
    expect((await d.state()).derived.canConfirmLater).toBe(false);
    h.advance(400); // 15 s scaled by DEMO_FAST
    expect((await d.state()).derived.canConfirmLater).toBe(true);
    await d.do({ type: "COVERAGE_CONFIRM_LATER" });
    s = await d.do({ type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" });
    expect(s.journey.coverage).toMatchObject({ confirmLater: true, status: "pending" });
    h.advance(3_000); // the slow plan finally answers
    s = await d.state();
    expect(s.journey.coverage?.status).toBe("active");
    expect(s.derived.costLine).toMatch(/\$40 copay/);
  });

  it("offers alternatives when the chosen time was just taken, then books one (TAC-15)", async () => {
    const d = new Device(new Harness());
    const p = PERSONAS.jordan;
    let s = await d.start("jordan");
    for (const [questionId, answer] of Object.entries(p.fit) as [FitQuestionId, boolean][]) {
      s = await d.do({ type: "ANSWER_FIT", questionId, answer });
    }
    await d.do({ type: "SET_CONDITIONS", conditions: p.conditions });
    await d.do({ type: "SET_CARE_TYPE", careType: p.careType });
    await d.do({ type: "SET_PLAN", plan: p.plan });
    await d.do({ type: "DEMO_SET", takeChosenSlot: true });
    const card = (await d.providers()).top[0];
    const taken = await d.do({ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] });
    expect(taken.journey.stage).toBe("providers");
    expect(taken.alternatives?.length).toBeGreaterThan(0);
    s = await d.do({ type: "SELECT_SLOT", providerId: card.id, slotStart: taken.alternatives![0] });
    expect(s.journey.stage).toBe("hold");
  });

  it("answers bad input and missing journeys in plain words", async () => {
    const d = new Device(new Harness());
    expect((await d.raw({ type: "SET_PLAN", plan: "none" })).status).toBe(404);
    await d.start();
    const bad = await d.raw({ type: "NOT_AN_ACTION" });
    expect(bad.status).toBe(400);
    expect((bad.body as { message: string }).message).not.toMatch(/enum|expected|zod/i);
  });
});

describe("journeys without a demo patient (TAC-53)", () => {
  it("complete every stage with generic invented results", async () => {
    const h = new Harness();
    const d = new Device(h);
    let s = await d.start(undefined, "America/Chicago");
    for (const [questionId, answer] of Object.entries(PERSONAS.maya.fit) as [FitQuestionId, boolean][]) {
      s = await d.do({ type: "ANSWER_FIT", questionId, answer });
    }
    await d.do({ type: "SET_CONDITIONS", conditions: ["depression"] });
    await d.do({ type: "SET_CARE_TYPE", careType: "not_sure" });
    await d.do({ type: "SET_PLAN", plan: "cigna" });
    const m = await d.providers();
    expect(m.top.length).toBe(3);
    s = await d.do({ type: "SELECT_SLOT", providerId: m.top[0].id, slotStart: m.top[0].slots[0] });
    expect(s.journey.demoPhone).toBeUndefined();
    const hold = await d.do({ type: "HOLD_START", firstName: "Alex", phone: "(512) 555-0199" });
    await d.do({ type: "HOLD_VERIFY", code: hold.demoCode! });
    await d.do({ type: "COVERAGE_SUBMIT", method: "lookup", dob: "1990-01-01" });
    h.advance(2_000);
    await d.state();
    h.advance(2_000);
    s = await d.state();
    expect(s.journey.coverage?.status).toBe("active");
    await d.do({ type: "COVERAGE_CONTINUE" });
    await d.do({ type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" });
    await d.do({ type: "ID_VERIFY" });
    await d.do({ type: "RECORDS_CONSENT" });
    h.advance(1_000);
    s = await d.state();
    expect(s.journey.readiness.identity?.legalName).toBe("Alex Sample");
    expect(s.journey.readiness.foundRecords).toHaveLength(1);
    expect(s.journey.readiness.foundMedications).toEqual([]);
    await d.do({ type: "JOIN_VISIT" });
    s = await d.do({ type: "END_VISIT" });
    expect(s.journey.after?.prescriptionPharmacyId).toBeUndefined();
  });

  it("matches providers for any plan the reviewer picks", () => {
    const j = { id: "jrn_g", conditions: ["anxiety" as const], careType: "new_evaluation" as const, plan: "uhc" as const, coverage: undefined, preferences: { windows: [], chips: [], earlierOpeningAlert: false }, timeZone: "America/Chicago" };
    expect(matchProviders(j, new Date("2026-10-12T15:00:00.000Z")).top).toHaveLength(3);
  });
});
