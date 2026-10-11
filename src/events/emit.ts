import type { Journey, JourneyEvent } from "@/domain/types";
import { newId } from "@/lib/random";
import { SYSTEM_OF_RECORD_EVENTS, type EventName, type EventProps } from "./catalog";
import { validateEventProps } from "./privacy";

/**
 * Turns pending events into stored events, stamped with schema version, journey, person, session, and source.
 * An event that fails validation is rejected and counted, never stored (TRD 7.3).
 */
export function buildEvents(
  j: Journey,
  pending: { name: EventName; props?: EventProps }[],
  now: Date,
): { events: JourneyEvent[]; rejected: number } {
  const events: JourneyEvent[] = [];
  let rejected = 0;
  pending.forEach((p, i) => {
    const props = p.props ?? {};
    try {
      validateEventProps(p.name, props);
    } catch {
      rejected += 1;
      return;
    }
    events.push({
      id: newId("evt"),
      v: 1,
      name: p.name,
      journeyId: j.id,
      personId: j.person?.personId,
      session: j.sessions,
      // Keep a stable order for events created in the same instant.
      ts: new Date(now.getTime() + i).toISOString(),
      source: SYSTEM_OF_RECORD_EVENTS.has(p.name) ? "system_of_record" : "patient_action",
      props,
    });
  });
  return { events, rejected };
}
