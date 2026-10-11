import { PERSONAS } from "@/data/personas";
import type { Action } from "@/domain/actions";
import { applyAction, newJourney, type Ctx, type PendingEvent } from "@/domain/reducer";
import type { FitQuestionId, Journey, PersonaId } from "@/domain/types";

// Monday, October 12, 2026, 10:00 a.m. Central.
export const NOW = new Date("2026-10-12T15:00:00.000Z");
export const later = (ms: number, from: Date = NOW) => new Date(from.getTime() + ms);

export const ctx = (overrides: Partial<Ctx> = {}): Ctx => ({ now: NOW, demoMode: true, ...overrides });

export function run(j: Journey, actions: Action[], c: Partial<Ctx> = {}) {
  const events: PendingEvent[] = [];
  let current = j;
  for (const a of actions) {
    const r = applyAction(current, a, ctx(c));
    current = r.journey;
    events.push(...r.events);
  }
  return { journey: current, events };
}

export function fitActions(personaId: PersonaId): Action[] {
  return (Object.entries(PERSONAS[personaId].fit) as [FitQuestionId, boolean][]).map(([questionId, answer]) => ({
    type: "ANSWER_FIT",
    questionId,
    answer,
  }));
}

/** A demo patient's journey advanced to the provider step. */
export function toProviders(personaId: PersonaId, id = `jrn_${personaId}`) {
  const p = PERSONAS[personaId];
  return run(newJourney(id, NOW, { personaId, timeZone: "America/Chicago" }), [
    ...fitActions(personaId),
    { type: "SET_CONDITIONS", conditions: p.conditions },
    { type: "SET_CARE_TYPE", careType: p.careType },
    { type: "SET_PLAN", plan: p.plan },
  ]);
}

export const names = (events: { name: string }[]) => events.map((e) => e.name);
