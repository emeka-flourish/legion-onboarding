// The view of a journey that is safe to send to the browser, plus values the screens need.
import { PERSONAS } from "@/data/personas";
import { costLine } from "@/rules/cost";
import { readinessStatus } from "@/rules/readiness";
import { DELAYS_MS, scaled } from "@/services/sim/delays";
import { pendingJobs } from "@/services/sim/jobs";
import type { JobKind, Journey } from "./types";

export type ClientJourney = Omit<Journey, "pendingPerson" | "person"> & {
  pendingPerson?: { firstName: string };
  person?: { personId: string; firstName: string };
};

export interface ClientState {
  journey: ClientJourney;
  derived: {
    readiness: ReturnType<typeof readinessStatus>;
    pendingJobs: JobKind[];
    costLine: string;
    personaName?: string;
    canConfirmLater: boolean;
    coverageWaitMs?: number;
  };
}

export function toClientState(j: Journey, now: Date): ClientState {
  const { pendingPerson, person, ...rest } = j;
  const coverageJob = j.jobs.coverage_verify ?? j.jobs.coverage_discover;
  const waited = coverageJob?.status === "pending" ? now.getTime() - new Date(coverageJob.startedAt).getTime() : undefined;
  return {
    journey: {
      ...rest,
      pendingPerson: pendingPerson ? { firstName: pendingPerson.firstName } : undefined,
      person: person ? { personId: person.personId, firstName: person.firstName } : undefined,
    },
    derived: {
      readiness: readinessStatus(j),
      pendingJobs: pendingJobs(j),
      costLine: costLine(j.coverage),
      personaName: j.personaId ? `${PERSONAS[j.personaId].firstName} ${PERSONAS[j.personaId].lastName}` : undefined,
      canConfirmLater: waited !== undefined && waited >= scaled(DELAYS_MS.confirm_later_after),
      coverageWaitMs: waited,
    },
  };
}
