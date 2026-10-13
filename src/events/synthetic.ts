// An invented cohort for the journey view's funnel (TRD 7.7, panel 2). It shows what the measurement would report
// at scale. The rates below are illustrative assumptions, not predictions or results.
import type { JourneyEvent } from "@/domain/types";
import { mulberry32 } from "@/lib/random";

export const SYNTHETIC_PEOPLE = 400;
export const SYNTHETIC_NOTE =
  "Invented cohort of 400 people with illustrative rates. It shows what the measurement reports; it is not a prediction or a result.";

const START = Date.parse("2026-09-01T15:00:00Z");
const MIN = 60_000;

export function syntheticEvents(people = SYNTHETIC_PEOPLE, seed = 20261010): JourneyEvent[] {
  const rand = mulberry32(seed);
  const chance = (p: number) => rand() < p;
  const between = (a: number, b: number) => a + rand() * (b - a);
  const events: JourneyEvent[] = [];
  let n = 0;

  for (let i = 0; i < people; i++) {
    const journeyId = `syn_${String(i).padStart(3, "0")}`;
    const personId = `synp_${String(i).padStart(3, "0")}`;
    const t0 = START + Math.floor(between(0, 25)) * 24 * 60 * MIN;
    let t = t0;
    let linked = false;
    const add = (name: string, props: JourneyEvent["props"] = {}, minutesLater = 1) => {
      t += minutesLater * MIN;
      events.push({
        id: `se${n++}`,
        v: 1,
        name,
        journeyId,
        personId: linked ? personId : undefined,
        session: 1,
        ts: new Date(t).toISOString(),
        source: "patient_action",
        props,
      });
    };

    add("onboarding_started", { entry: "web", persona: "none" }, 0);
    if (!chance(0.7)) {
      add("eligibility_evaluated", { outcome: "screened_out", reason: "not_texas" });
      add("screen_out_resource_shown", { reason: "not_texas" }, 0);
      continue;
    }
    add("eligibility_evaluated", { outcome: "eligible" });
    if (!chance(0.92)) continue;
    add("providers_presented", { count: 3 }, between(1, 3));
    if (!chance(0.72)) continue;
    add("reservation_created", { hold_minutes: 10 }, between(1, 4));
    if (!chance(0.92)) continue;
    linked = true;
    add("account_created", { method: "phone" });
    if (!chance(0.88)) continue;
    const visitDays = between(2, 10);
    add("appointment_confirmed", { coverage_confirm_later: !chance(0.9), lead_hours: Math.round(visitDays * 24) }, between(2, 15));
    if (chance(0.55)) {
      const r = rand();
      add("trust_pulse_answered", { score: r < 0.4 ? 5 : r < 0.75 ? 4 : r < 0.9 ? 3 : r < 0.97 ? 2 : 1 });
    }
    if (chance(0.04)) {
      add("safety_flag_raised", { type: "phq9_item9" }, between(30, 600));
      const minutes = chance(0.9) ? Math.round(between(20, 200)) : Math.round(between(300, 600));
      add("safety_flag_reviewed", { type: "phq9_item9", minutes_to_review: minutes }, minutes);
    }
    const visitAt = t0 + visitDays * 24 * 60 * MIN;
    const r = rand();
    if (r < 0.84) {
      const hoursBefore = r < 0.72 ? between(24, visitDays * 24 - 2) : between(1, 23);
      t = Math.max(t, visitAt - hoursBefore * 60 * MIN);
      add("visit_ready", { hours_before_visit: Math.round(hoursBefore), typed_inputs: Math.round(between(12, 16)) }, 0);
    }
    if (!chance(0.86)) continue;
    t = Math.max(t, visitAt);
    add("visit_started", {}, 0);
    add("first_visit_completed", { within_14_days: true }, 50);
    if (chance(0.74)) add("follow_up_booked", { weeks_out: 4 }, 5);
  }
  return events;
}
