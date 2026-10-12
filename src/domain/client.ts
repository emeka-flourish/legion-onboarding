// The view of a journey that is safe to send to the browser, plus values the screens need.
import { PERSONAS, visitFor } from "@/data/personas";
import { providerById } from "@/data/providers";
import { followUpSlots } from "@/services/sim/scheduling";
import { costLine } from "@/rules/cost";
import { readinessStatus } from "@/rules/readiness";
import { DELAYS_MS, scaled } from "@/services/sim/delays";
import { pendingJobs } from "@/services/sim/jobs";
import type { JobKind, Journey } from "./types";

export type ClientJourney = Omit<Journey, "pendingPerson" | "person"> & {
  pendingPerson?: { firstName: string; lastName: string };
  person?: { personId: string; firstName: string; lastName?: string };
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
    provider?: { id: string; name: string; initials: string; credential: string; focusNote: string };
    followUpSlots?: string[];
  };
}

export function toClientState(j: Journey, now: Date): ClientState {
  const { pendingPerson, person, ...rest } = j;
  const providerId = j.booking?.providerId ?? j.selection?.providerId;
  const p = providerId ? providerById(providerId) : undefined;
  const coverageJob = j.jobs.coverage_verify ?? j.jobs.coverage_discover;
  const waited = coverageJob?.status === "pending" ? now.getTime() - new Date(coverageJob.startedAt).getTime() : undefined;
  return {
    journey: {
      ...rest,
      pendingPerson: pendingPerson ? { firstName: pendingPerson.firstName, lastName: pendingPerson.lastName } : undefined,
      person: person ? { personId: person.personId, firstName: person.firstName, lastName: person.lastName } : undefined,
    },
    derived: {
      readiness: readinessStatus(j, now),
      pendingJobs: pendingJobs(j),
      costLine: costLine(j.coverage),
      personaName: j.personaId ? `${PERSONAS[j.personaId].firstName} ${PERSONAS[j.personaId].lastName}` : undefined,
      canConfirmLater: waited !== undefined && waited >= scaled(DELAYS_MS.confirm_later_after),
      coverageWaitMs: waited,
      provider: p ? { id: p.id, name: p.name, initials: p.initials, credential: p.credential, focusNote: p.focusNote } : undefined,
      followUpSlots:
        j.stage === "after" && j.booking
          ? followUpSlots(j.booking.providerId, j.id, new Date(j.booking.start), visitFor(j.personaId).followUpWeeks)
          : undefined,
    },
  };
}
