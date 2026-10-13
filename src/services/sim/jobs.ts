// Simulated asynchronous services (Sohar eligibility and discovery, Metriport records, DoseSpot medication
// history). A job resolves the next time the journey is read after its readyAt time, like a webhook arriving.
import { PERSONAS } from "@/data/personas";
import type { EventName, EventProps } from "@/events/catalog";
import type { FoundRecord, JobKind, Journey, ServiceJob } from "@/domain/types";
import { DELAYS_MS, scaled } from "./delays";

export const COVERAGE_SOURCE = "Eligibility check · Sohar (simulated)";

// Journeys without a demo patient get one generic invented record source (TRD 6.4).
const GENERIC_SOURCE = "Capitol Primary Care · records network (simulated)";
const GENERIC_RECORDS: FoundRecord[] = [
  { id: "rec-generic-1", kind: "visit", label: "Primary care visit", detail: "Annual checkup; no changes", date: "2026-01-15", source: GENERIC_SOURCE },
  { id: "rec-generic-2", kind: "lab", label: "Blood pressure and heart rate", detail: "120/78, 70 beats a minute", date: "2026-01-15", source: GENERIC_SOURCE },
  {
    id: "rec-generic-3",
    kind: "condition",
    label: "Seasonal allergies",
    date: "2021-04-02",
    source: GENERIC_SOURCE,
    needsConfirmation: "Noted in 2021. Uncheck it if it no longer applies.",
  },
];

export interface JobEvent {
  name: EventName;
  props?: EventProps;
}

export function startJob(kind: JobKind, now: Date, delayMs: number): ServiceJob {
  return {
    kind,
    startedAt: now.toISOString(),
    readyAt: new Date(now.getTime() + delayMs).toISOString(),
    status: "pending",
  };
}

function resolveJob(j: Journey, job: ServiceJob, now: Date, events: JobEvent[]): void {
  const persona = j.personaId ? PERSONAS[j.personaId] : undefined;
  job.status = "complete";

  if (job.kind === "coverage_discover" && j.coverage) {
    const found = persona ? persona.coverage.lookup === "found" : true;
    events.push({ name: "coverage_verified", props: { result: found ? "found" : "not_found", cost_shown: false, source: "sohar_sim" } });
    if (!found) {
      j.coverage.status = "not_found";
      return;
    }
    // Discovery found the plan: verify it straight away, as Sohar's flow does.
    j.coverage.memberIdLast4 = (persona?.coverage.memberId ?? "000000001234").slice(-4);
    j.jobs.coverage_verify = startJob("coverage_verify", now, scaled(DELAYS_MS.coverage_verify));
    return;
  }

  if (job.kind === "coverage_verify" && j.coverage) {
    const active = persona ? persona.coverage.verify === "active" : true;
    j.coverage.status = active ? "active" : "inactive";
    j.coverage.source = COVERAGE_SOURCE;
    if (active) {
      j.coverage.intakeCents = persona?.coverage.intakeCents ?? 4_000;
      j.coverage.followUpCents = persona?.coverage.followUpCents ?? 4_000;
    } else {
      j.coverage.inactiveSince = persona?.coverage.inactiveSince;
    }
    events.push({ name: "coverage_verified", props: { result: j.coverage.status, cost_shown: active, source: "sohar_sim" } });
    return;
  }

  if (job.kind === "records") {
    j.readiness.foundRecords = persona ? persona.records : GENERIC_RECORDS;
    events.push({ name: "records_received", props: { count: j.readiness.foundRecords.length, source: "metriport_sim" } });
  }

  if (job.kind === "med_history") {
    j.readiness.foundMedications = persona ? persona.medications : [];
    events.push({ name: "med_history_received", props: { count: j.readiness.foundMedications.length, source: "surescripts_sim" } });
  }

  if (j.jobs.records?.status === "complete" && j.jobs.med_history?.status === "complete") {
    j.readiness.tasks.records = "done";
  }
}

/** Resolves every job whose time has come. Mutates and returns the journey plus system-of-record events. */
export function resolveDueJobs(j: Journey, now: Date): JobEvent[] {
  const events: JobEvent[] = [];
  // Loop because resolving discovery can start verification.
  for (let pass = 0; pass < 3; pass++) {
    const due = Object.values(j.jobs).filter((job) => job && job.status === "pending" && new Date(job.readyAt) <= now);
    if (due.length === 0) break;
    for (const job of due) resolveJob(j, job!, now, events);
  }
  return events;
}

export function pendingJobs(j: Journey): JobKind[] {
  return Object.values(j.jobs)
    .filter((job) => job?.status === "pending")
    .map((job) => job!.kind);
}
