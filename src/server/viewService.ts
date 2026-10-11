// The journey view for Legion (TRD 7.7): this journey's timeline, the per-person funnel for live demo journeys and an
// invented cohort, today versus the rebuild, data quality, and people in progress. Demo mode only: it reads every
// demo journey, and "Mark reviewed" acts on other journeys the way a care-team tool would.
import { z } from "zod";
import { applyAction, TransitionError } from "@/domain/reducer";
import type { Journey, JourneyEvent, SafetyFlag, Stage } from "@/domain/types";
import { TODAY_FUNNEL, TODAY_SOURCE } from "@/events/baseline";
import { computeFunnel, countStages, type Funnel } from "@/events/metrics";
import { checkQuality, missingFromChain, nextExpected, type QualityReport } from "@/events/quality";
import { SYNTHETIC_NOTE, SYNTHETIC_PEOPLE, syntheticEvents } from "@/events/synthetic";
import { readinessStatus } from "@/rules/readiness";
import { fail, load, persist, type Result, type ServiceCtx } from "./journeyService";

const WEEK_MS = 7 * 24 * 3_600_000;
const MAX_JOURNEYS = 200;

export interface Cohort {
  people: number;
  funnel: Funnel;
  stages: { label: string; people: number }[];
}

export interface JourneyView {
  thisJourney: {
    journeyId: string;
    personId?: string;
    stage: Stage;
    sessions: number;
    events: JourneyEvent[];
    linkedAt?: string;
    nextExpected: string[];
    missing: string[];
  } | null;
  live: Cohort;
  synthetic: Cohort & { note: string };
  today: { source: string; rows: typeof TODAY_FUNNEL };
  quality: QualityReport;
  inProgress: {
    journeyId: string;
    shortId: string;
    stage: Stage;
    readiness: { done: number; total: number };
    openFlags: Pick<SafetyFlag, "id" | "type" | "raisedAt">[];
    nextExpected: string[];
    updatedAt: string;
  }[];
}

const NOT_AVAILABLE = () => fail(404, "not_available", "The journey view is only available in demo mode.");

// The invented cohort never changes, so it is computed once per server instance.
let syntheticCache: (Cohort & { note: string }) | null = null;
function synthetic(): Cohort & { note: string } {
  if (!syntheticCache) {
    const events = syntheticEvents();
    syntheticCache = { people: SYNTHETIC_PEOPLE, funnel: computeFunnel(events), stages: countStages(events), note: SYNTHETIC_NOTE };
  }
  return syntheticCache;
}

export async function journeyView(ctx: ServiceCtx, cookie: string | undefined): Promise<Result<JourneyView>> {
  if (!ctx.demoMode) return NOT_AVAILABLE();
  const mine = await load(ctx, cookie); // resolves this device's due jobs first, like any read of it
  const ids = (await ctx.store.listJourneyIds(ctx.now.getTime() - WEEK_MS)).slice(-MAX_JOURNEYS);
  const loaded = await Promise.all(
    ids.map(async (id) => {
      const journey = id === mine?.id ? mine : await ctx.store.getJourney(id);
      return journey ? { journey, events: await ctx.store.listEvents(id) } : null;
    }),
  );
  const journeys = loaded.filter((x): x is { journey: Journey; events: JourneyEvent[] } => x !== null);
  const allEvents = journeys.flatMap((j) => j.events);

  let thisJourney: JourneyView["thisJourney"] = null;
  if (mine) {
    const events = journeys.find((j) => j.journey.id === mine.id)?.events ?? (await ctx.store.listEvents(mine.id));
    thisJourney = {
      journeyId: mine.id,
      personId: mine.person?.personId,
      stage: mine.stage,
      sessions: mine.sessions,
      events,
      linkedAt: events.find((e) => e.name === "account_created")?.id,
      nextExpected: nextExpected(mine),
      missing: missingFromChain(mine.stage, events),
    };
  }

  const finished = (j: Journey) => j.stage === "crisis" || j.stage === "not_a_fit" || (j.stage === "after" && Boolean(j.after?.followUpStart));
  const inProgress = journeys
    .filter((j) => !finished(j.journey) || j.journey.readiness.safetyFlags.some((f) => !f.reviewedAt))
    .sort((a, b) => b.journey.updatedAt.localeCompare(a.journey.updatedAt))
    .map(({ journey: j }) => {
      const r = readinessStatus(j);
      return {
        journeyId: j.id,
        shortId: j.id.slice(-6),
        stage: j.stage,
        readiness: { done: r.doneCount, total: r.total },
        openFlags: j.readiness.safetyFlags.filter((f) => !f.reviewedAt).map(({ id, type, raisedAt }) => ({ id, type, raisedAt })),
        nextExpected: nextExpected(j),
        updatedAt: j.updatedAt,
      };
    });

  return {
    status: 200,
    body: {
      thisJourney,
      live: (() => {
        const funnel = computeFunnel(allEvents);
        return { people: funnel.people, funnel, stages: countStages(allEvents) };
      })(),
      synthetic: synthetic(),
      today: { source: TODAY_SOURCE, rows: TODAY_FUNNEL },
      quality: checkQuality(journeys),
      inProgress,
    },
  };
}

const reviewBody = z.object({ journeyId: z.string().min(1).max(64), flagId: z.string().min(1).max(40) });

/** "Mark reviewed" in the people-in-progress panel: a person on the care team reviewed the flag (simulated). */
export async function reviewFlag(ctx: ServiceCtx, raw: unknown): Promise<Result<{ ok: true }>> {
  if (!ctx.demoMode) return NOT_AVAILABLE();
  const parsed = reviewBody.safeParse(raw);
  if (!parsed.success) return fail(400, "invalid_input", "That request didn't look right.");
  const j = await ctx.store.getJourney(parsed.data.journeyId);
  if (!j) return fail(404, "no_journey", "That journey has expired.");
  try {
    const result = applyAction(j, { type: "DEMO_REVIEW_FLAG", flagId: parsed.data.flagId }, { now: ctx.now, demoMode: true });
    await persist(ctx, result.journey, result.events);
  } catch (e) {
    if (e instanceof TransitionError) return fail(409, e.code, e.message);
    throw e;
  }
  return { status: 200, body: { ok: true } };
}
