// The server layer (TRD 6.2): loads a journey, resolves due simulated services, applies an action through the
// reducer, and persists the journey plus its events. Route handlers are thin wrappers around these functions,
// so integration tests can drive whole journeys without HTTP.
import { aiStatus, type AiStatus } from "@/ai/router";
import { PERSONA_IDS } from "@/data/personas";
import { actionSchema } from "@/domain/actions";
import { toClientState, type ClientState } from "@/domain/client";
import { applyAction, newJourney, TransitionError, type PendingEvent } from "@/domain/reducer";
import type { Journey, PersonaId } from "@/domain/types";
import { buildEvents } from "@/events/emit";
import { newId } from "@/lib/random";
import { matchProviders, type MatchResult } from "@/rules/matching";
import { texasTimeZone } from "@/rules/time";
import { resolveDueJobs } from "@/services/sim/jobs";
import { MAX_FAILED_CODES, type JourneyStore } from "@/store/types";
import { generateCode, normalizePhone, phoneHash, signJourneyId, verifyJourneyCookie } from "./session";

export interface ServiceCtx {
  store: JourneyStore;
  now: Date;
  demoMode: boolean;
}

export interface Failure {
  error: string;
  message: string;
}

/** `cookie`: a signed journey cookie to set, null to clear it, undefined to leave it alone. */
export interface Result<T> {
  status: number;
  body: T | Failure;
  cookie?: string | null;
}

export const fail = (status: number, error: string, message: string): Result<never> => ({ status, body: { error, message } });
export const NO_JOURNEY = () => fail(404, "no_journey", "We couldn't find your progress. It may have expired after seven days.");
const LOCKED = () => fail(429, "locked", "Too many tries. Please wait ten minutes and try again.");

export async function persist(ctx: ServiceCtx, j: Journey, pending: PendingEvent[]) {
  const { events, rejected } = buildEvents(j, pending, ctx.now);
  j.counters.rejectedEvents += rejected;
  await ctx.store.putJourney(j);
  await ctx.store.appendEvents(j.id, events);
}

/** Loads the journey behind a cookie and resolves any simulated service whose answer is due (like a webhook). */
export async function load(ctx: ServiceCtx, cookie: string | undefined): Promise<Journey | null> {
  const id = verifyJourneyCookie(cookie);
  if (!id) return null;
  const j = await ctx.store.getJourney(id);
  if (!j) return null;
  const jobEvents = resolveDueJobs(j, ctx.now);
  if (jobEvents.length) await persist(ctx, j, jobEvents);
  return j;
}

export async function createJourney(
  ctx: ServiceCtx,
  input: { personaId?: unknown; timeZone?: unknown },
): Promise<Result<ClientState>> {
  let personaId: PersonaId | undefined;
  if (input.personaId !== undefined && input.personaId !== null && input.personaId !== "") {
    if (!PERSONA_IDS.includes(input.personaId as PersonaId)) return fail(400, "invalid_input", "Unknown demo patient");
    personaId = input.personaId as PersonaId;
  }
  const timeZone = texasTimeZone(typeof input.timeZone === "string" ? input.timeZone : undefined);
  const j = newJourney(newId("jrn"), ctx.now, { personaId, timeZone });
  await persist(ctx, j, [{ name: "onboarding_started", props: { entry: "web", persona: personaId ?? "none" } }]);
  return { status: 201, body: toClientState(j, ctx.now), cookie: signJourneyId(j.id) };
}

export async function getJourney(ctx: ServiceCtx, cookie: string | undefined): Promise<Result<ClientState & { ai: AiStatus }>> {
  const j = await load(ctx, cookie);
  return j ? { status: 200, body: { ...toClientState(j, ctx.now), ai: aiStatus(j.counters.aiCalls) } } : NO_JOURNEY();
}

export type ActBody = ClientState & { demoCode?: string; alternatives?: string[] };

export async function act(ctx: ServiceCtx, cookie: string | undefined, raw: unknown): Promise<Result<ActBody>> {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, "invalid_input", "Something in that answer didn't look right. Please check it and try again.");
  }
  const action = parsed.data;
  const j = await load(ctx, cookie);
  if (!j) return NO_JOURNEY();

  const extra: { phoneHash?: string; codeValid?: boolean; existingPersonId?: string } = {};
  let demoCode: string | undefined;

  if (action.type === "HOLD_START") {
    const e164 = normalizePhone(action.phone);
    if (e164) {
      extra.phoneHash = phoneHash(e164);
      if ((await ctx.store.failedCodes(extra.phoneHash)) >= MAX_FAILED_CODES) return LOCKED();
      const code = generateCode();
      await ctx.store.setCode(extra.phoneHash, code);
      if (ctx.demoMode) demoCode = code;
    }
  }

  if (action.type === "HOLD_VERIFY" && j.pendingPerson) {
    const hash = j.pendingPerson.phoneHash;
    if ((await ctx.store.failedCodes(hash)) >= MAX_FAILED_CODES) return LOCKED();
    const expected = await ctx.store.takeCode(hash);
    extra.codeValid = expected !== null && expected === action.code;
    if (!extra.codeValid) {
      if (expected) await ctx.store.setCode(hash, expected); // the patient can try again
      if ((await ctx.store.recordFailedCode(hash)) >= MAX_FAILED_CODES) return LOCKED();
    } else {
      await ctx.store.clearFailedCodes(hash);
      // Person-level dedupe (TRD 7.2): a phone that already belongs to a person keeps that person's ID.
      const known = await ctx.store.findByPhone(hash);
      if (known && known !== j.id) {
        const other = await ctx.store.getJourney(known);
        if (other?.person) extra.existingPersonId = other.person.personId;
      }
    }
  }

  let result;
  try {
    result = applyAction(j, action, { now: ctx.now, demoMode: ctx.demoMode, ...extra });
  } catch (e) {
    if (e instanceof TransitionError) return fail(e.code === "invalid_input" ? 422 : 409, e.code, e.message);
    throw e;
  }
  if (action.type === "HOLD_VERIFY" && extra.codeValid && result.journey.person) {
    await ctx.store.setPhone(result.journey.person.phoneHash, result.journey.id);
  }
  await persist(ctx, result.journey, result.events);
  return {
    status: 200,
    body: { ...toClientState(result.journey, ctx.now), demoCode, alternatives: result.reply?.alternatives },
  };
}

export async function providers(ctx: ServiceCtx, cookie: string | undefined): Promise<Result<MatchResult>> {
  const j = await load(ctx, cookie);
  if (!j) return NO_JOURNEY();
  if (j.stage !== "providers") return fail(409, "invalid_transition", "Providers are shown after you choose how you'll pay");
  const m = matchProviders(j, ctx.now, { coverageVerified: j.coverage?.status === "active", exclude: j.demo.takenSlots });
  const earliest = m.top.flatMap((c) => c.slots).sort()[0];
  await persist(ctx, j, [
    {
      name: "providers_presented",
      props: {
        count: m.top.length,
        eligible_count: m.totalEligible,
        no_openings: m.noOpenings,
        hours_to_earliest: earliest ? Math.round((new Date(earliest).getTime() - ctx.now.getTime()) / 3_600_000) : -1,
      },
    },
  ]);
  return { status: 200, body: m };
}

export async function resumeStart(ctx: ServiceCtx, input: { phone?: unknown }): Promise<Result<{ sent: true; demoCode?: string }>> {
  const e164 = typeof input.phone === "string" ? normalizePhone(input.phone) : null;
  if (!e164) return fail(422, "invalid_input", "Please enter a 10-digit US mobile number.");
  const hash = phoneHash(e164);
  if ((await ctx.store.failedCodes(hash)) >= MAX_FAILED_CODES) return LOCKED();
  const journeyId = await ctx.store.findByPhone(hash);
  if (!journeyId) return { status: 200, body: { sent: true } }; // same answer whether or not the number is known
  const code = generateCode();
  await ctx.store.setCode(hash, code);
  return { status: 200, body: { sent: true, demoCode: ctx.demoMode ? code : undefined } };
}

export async function resumeVerify(
  ctx: ServiceCtx,
  input: { phone?: unknown; code?: unknown },
): Promise<Result<ClientState>> {
  const e164 = typeof input.phone === "string" ? normalizePhone(input.phone) : null;
  const code = typeof input.code === "string" ? input.code.trim() : "";
  if (!e164 || !/^\d{6}$/.test(code)) return fail(422, "invalid_input", "Please enter your number and the 6-digit code.");
  const hash = phoneHash(e164);
  if ((await ctx.store.failedCodes(hash)) >= MAX_FAILED_CODES) return LOCKED();
  const expected = await ctx.store.takeCode(hash);
  if (expected === null || expected !== code) {
    if (expected) await ctx.store.setCode(hash, expected);
    if ((await ctx.store.recordFailedCode(hash)) >= MAX_FAILED_CODES) return LOCKED();
    return fail(401, "invalid_code", "That code doesn't match. Please try again.");
  }
  await ctx.store.clearFailedCodes(hash);
  const journeyId = await ctx.store.findByPhone(hash);
  const j = journeyId ? await ctx.store.getJourney(journeyId) : null;
  if (!j) return NO_JOURNEY();
  const jobEvents = resolveDueJobs(j, ctx.now); // answers that arrived while the patient was away
  j.sessions += 1;
  await persist(ctx, j, [...jobEvents, { name: "journey_resumed", props: { method: "phone", session: j.sessions } }]);
  return { status: 200, body: toClientState(j, ctx.now), cookie: signJourneyId(j.id) };
}

/** Demo "simulate a return visit": forget the cookie on this device. */
export function forget(): Result<{ ok: true }> {
  return { status: 200, body: { ok: true }, cookie: null };
}

export async function loadForView(ctx: ServiceCtx, cookie: string | undefined): Promise<Journey | null> {
  return load(ctx, cookie);
}
