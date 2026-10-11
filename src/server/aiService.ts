// The AI routes (TRD 6.2 and 6.5). Each needs a valid journey at the matching stage. The crisis rule runs inside the
// router before any model call; on a match this layer raises a flag for a person to review and returns
// `{ safety: "crisis" }` so the screen shows the safety panel. The patient's text is never stored or logged.
import { z } from "zod";
import { runTask, type RunResult } from "@/ai/router";
import { clinicianSummaryTask, type SummaryOutput } from "@/ai/tasks/clinicianSummary";
import { intakeExtractTask, type IntakeOutput } from "@/ai/tasks/intakeExtract";
import { preferenceNoteTask, type PreferenceNoteOutput } from "@/ai/tasks/preferenceNote";
import type { AiMeta, TaskSpec } from "@/ai/types";
import { aiConfig } from "@/config/ai.config";
import { FOLLOW_UP_IDS, type FollowUpId } from "@/data/intake";
import { PERSONAS } from "@/data/personas";
import { storyItemSchema } from "@/domain/actions";
import { raiseSafetyFlag, type PendingEvent } from "@/domain/reducer";
import type { Journey, Stage } from "@/domain/types";
import { ageOn } from "@/rules/age";
import { fail, load, NO_JOURNEY, persist, type Result, type ServiceCtx } from "./journeyService";

export type AiReply<O> = (O & { meta: AiMeta }) | { safety: "crisis" };

const followUpId = z.enum(FOLLOW_UP_IDS as [FollowUpId, ...FollowUpId[]]);
const noteBody = z.object({ note: z.string().trim().min(1).max(300) });
const intakeBody = z.object({
  promptId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  answer: z.string().trim().min(1).max(1200),
  followUpOf: followUpId.optional(),
  usedFollowUps: z.array(followUpId).max(FOLLOW_UP_IDS.length).default([]),
});
const summaryBody = z.object({ items: z.array(storyItemSchema).min(1).max(30) });

const dailyCounter = (now: Date) => `ai_live_calls:${now.toISOString().slice(0, 10)}`;

const STAGE_MESSAGE: Partial<Record<Stage, string>> = {
  providers: "Preferences can be added while you're choosing a provider.",
  home: "This part opens after your visit is booked.",
};

async function runForJourney<B, I, G, O>(
  ctx: ServiceCtx,
  cookie: string | undefined,
  raw: unknown,
  body: z.ZodType<B>,
  stage: Stage,
  spec: TaskSpec<I, G, O>,
  toInput: (b: B, j: Journey) => I,
): Promise<Result<AiReply<O>>> {
  const parsed = body.safeParse(raw);
  if (!parsed.success) return fail(400, "invalid_input", "Something in that answer didn't look right. Please check it and try again.");
  const j = await load(ctx, cookie);
  if (!j) return NO_JOURNEY();
  if (j.stage !== stage) return fail(409, "invalid_transition", STAGE_MESSAGE[stage] ?? "That isn't available right now.");

  const today = dailyCounter(ctx.now);
  const cap =
    j.counters.aiCalls >= aiConfig.liveCallsPerJourney
      ? "journey_cap"
      : (await ctx.store.readCounter(today)) >= aiConfig.liveCallsPerDay
        ? "daily_cap"
        : undefined;
  const result: RunResult<O> = await runTask(spec, toInput(parsed.data, j), cap ? { forceScripted: cap } : {});

  if (result.safety === "crisis") {
    const fresh = (await ctx.store.getJourney(j.id)) ?? j;
    const events: PendingEvent[] = [];
    raiseSafetyFlag(fresh, "crisis_language", ctx.now, events);
    await persist(ctx, fresh, events);
    return { status: 200, body: { safety: "crisis" } };
  }
  if (result.liveCalls) {
    await ctx.store.addToCounter(today, result.liveCalls, 2 * 24 * 3600);
    // Re-read before saving, so an action the patient took while the model was working isn't overwritten.
    const fresh = await ctx.store.getJourney(j.id);
    if (fresh) {
      fresh.counters.aiCalls += result.liveCalls;
      await ctx.store.putJourney(fresh);
    }
  }
  return { status: 200, body: { ...result.output, meta: result.meta } };
}

/** POST /api/ai/preference-note: the optional note becomes chips the patient can remove before applying. */
export function aiPreferenceNote(ctx: ServiceCtx, cookie: string | undefined, raw: unknown): Promise<Result<AiReply<PreferenceNoteOutput>>> {
  return runForJourney(ctx, cookie, raw, noteBody, "providers", preferenceNoteTask, (b, j) => ({
    note: b.note,
    personaId: j.personaId,
  }));
}

/** POST /api/ai/intake: one answer in the guided conversation becomes reviewable items and maybe one follow-up. */
export function aiIntake(ctx: ServiceCtx, cookie: string | undefined, raw: unknown): Promise<Result<AiReply<IntakeOutput>>> {
  return runForJourney(ctx, cookie, raw, intakeBody, "home", intakeExtractTask, (b, j) => ({
    promptId: b.promptId,
    answer: b.answer,
    followUpOf: b.followUpOf,
    usedFollowUps: b.usedFollowUps,
    conditions: j.conditions,
    careType: j.careType,
    personaId: j.personaId,
  }));
}

/** POST /api/ai/summary: the reviewed items become the clinician summary, which the patient confirms before saving. */
export function aiSummary(ctx: ServiceCtx, cookie: string | undefined, raw: unknown): Promise<Result<AiReply<SummaryOutput>>> {
  return runForJourney(ctx, cookie, raw, summaryBody, "home", clinicianSummaryTask, (b, j) => {
    const dob = j.readiness.identity?.dob;
    return {
      items: b.items,
      firstName: j.person?.firstName,
      age: dob ? ageOn(dob, ctx.now) : j.personaId ? PERSONAS[j.personaId].age : undefined,
      conditions: j.conditions,
      careType: j.careType,
      personaId: j.personaId,
    };
  });
}
