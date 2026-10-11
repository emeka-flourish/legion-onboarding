// Drives journeys through the server layer (no HTTP) with a memory store and a controllable clock.
import { PERSONAS } from "@/data/personas";
import type { Action } from "@/domain/actions";
import type { ClientState } from "@/domain/client";
import type { FitQuestionId, PersonaId } from "@/domain/types";
import {
  act,
  createJourney,
  getJourney,
  providers,
  resumeStart,
  resumeVerify,
  type Result,
  type ServiceCtx,
} from "@/server/journeyService";
import { MemoryStore } from "@/store/memory";
import { NOW } from "../helpers";

export function ok<T>(r: Result<T>): T {
  if (r.status >= 300) throw new Error(`${r.status}: ${JSON.stringify(r.body)}`);
  return r.body as T;
}

export class Harness {
  t = NOW.getTime();
  store = new MemoryStore(() => this.t);
  ctx = (): ServiceCtx => ({ store: this.store, now: new Date(this.t), demoMode: true });
  advance(ms: number) {
    this.t += ms;
  }
}

/** One browser: holds its own cookie, like a phone or a laptop. */
export class Device {
  cookie?: string;
  constructor(private h: Harness) {}

  async start(personaId?: PersonaId, timeZone?: string) {
    const r = await createJourney(this.h.ctx(), { personaId, timeZone });
    this.cookie = r.cookie ?? undefined;
    return ok(r);
  }
  async state() {
    return ok(await getJourney(this.h.ctx(), this.cookie));
  }
  async do(action: Action) {
    return ok(await act(this.h.ctx(), this.cookie, action));
  }
  raw(action: unknown) {
    return act(this.h.ctx(), this.cookie, action);
  }
  async providers() {
    return ok(await providers(this.h.ctx(), this.cookie));
  }
  async resume(phone: string, code?: string): Promise<Result<ClientState>> {
    const started = await resumeStart(this.h.ctx(), { phone });
    if (started.status >= 300) return started as Result<never>; // e.g. locked after too many wrong codes
    const sent = ok(started);
    const r = await resumeVerify(this.h.ctx(), { phone, code: code ?? sent.demoCode });
    if (r.cookie) this.cookie = r.cookie;
    return r;
  }
}

const CONSENTS = { terms: true, treatment: true, recording: true } as const;

/** A demo patient's full approved journey, from the first page to the follow-up booking. */
export async function driveFull(personaId: PersonaId, h = new Harness()) {
  const p = PERSONAS[personaId];
  const d = new Device(h);
  let s = await d.start(personaId);
  for (const [questionId, answer] of Object.entries(p.fit) as [FitQuestionId, boolean][]) {
    s = await d.do({ type: "ANSWER_FIT", questionId, answer });
  }
  await d.do({ type: "SET_CONDITIONS", conditions: p.conditions });
  await d.do({ type: "SET_CARE_TYPE", careType: p.careType });
  await d.do({ type: "SET_PLAN", plan: p.plan });
  const m = await d.providers();
  if (m.noOpenings) await d.do({ type: "SET_EARLIER_ALERT", on: true });
  const card = m.top[0];
  s = await d.do({ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] });
  const hold = await d.do({ type: "HOLD_START", firstName: p.firstName, phone: s.journey.demoPhone! });
  s = await d.do({ type: "HOLD_VERIFY", code: hold.demoCode! });

  if (personaId === "maya") {
    await d.do({ type: "COVERAGE_SUBMIT", method: "member_id", memberId: p.coverage.memberId, dob: p.coverage.dob });
    h.advance(1_000);
    await d.state();
    await d.do({ type: "COVERAGE_CONTINUE" });
  }
  if (personaId === "sam") {
    await d.do({ type: "COVERAGE_SUBMIT", method: "lookup", dob: p.coverage.dob });
    h.advance(1_000);
    await d.state(); // not found
    await d.do({ type: "COVERAGE_TRY_AGAIN" });
    await d.do({ type: "COVERAGE_SUBMIT", method: "member_id", memberId: p.coverage.memberId, dob: p.coverage.dob });
    h.advance(1_000);
    await d.state(); // inactive
    await d.do({ type: "COVERAGE_USE_SELF_PAY" });
  }

  await d.do({ type: "BOOK", consents: CONSENTS, cardLast4: "4242" });
  await d.do({ type: "TRUST_PULSE", score: 5 });
  await d.do({ type: "ID_VERIFY" });
  await d.do({ type: "RECORDS_CONSENT" });
  h.advance(1_000);
  s = await d.state();

  const items = [
    ...Object.values(p.story.extract).flatMap((e) => e.items),
    ...Object.values(p.story.followUpExtract).flat(),
  ];
  await d.do({
    type: "STORY_CONFIRM",
    items,
    summary: { text: p.story.summary, mode: "scripted" },
    typedAnswers: 4 + Object.keys(p.story.followUpAnswers).length,
  });
  for (const [index, value] of p.checkIn.gad7.entries()) await d.do({ type: "CHECKIN_ANSWER", instrument: "gad7", index, value });
  for (const [index, value] of p.checkIn.phq9.entries()) await d.do({ type: "CHECKIN_ANSWER", instrument: "phq9", index, value });
  await d.do({
    type: "CONFIRM_FOUND",
    recordIds: (s.journey.readiness.foundRecords ?? []).map((r) => r.id),
    medicationIds: (s.journey.readiness.foundMedications ?? []).map((m) => m.id),
    otherMedications: p.otherMedications,
  });
  await d.do({ type: "SET_PHARMACY", pharmacyId: p.pharmacyFromHistory ?? p.pharmacyChoice });
  await d.do({ type: "SET_ESSENTIALS", ...p.essentials });
  await d.do({ type: "JOIN_VISIT" });
  await d.do({ type: "END_VISIT" });
  s = await d.do({ type: "VIEW_SUMMARY" });
  s = await d.do({ type: "BOOK_FOLLOW_UP", slotStart: s.derived.followUpSlots![0] });
  const events = await h.store.listEvents(s.journey.id);
  return { d, h, s, events };
}
