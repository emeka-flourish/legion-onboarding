// Simulated scheduling (Legion's calendar). Slots are generated deterministically per journey and provider.
import { providerById, type Provider } from "@/data/providers";
import type { TimeWindow } from "@/domain/types";
import { hashString, mulberry32 } from "@/lib/random";
import { addLocalDays, PROVIDER_TIME_ZONE, zonedTimeToUtc } from "@/rules/time";

export const HORIZON_DAYS = 14;
export const SCHEDULING_SOURCE = "Legion scheduling (simulated)";

export function generateSlots(provider: Provider, seed: string, now: Date, fromDay = 1, toDay = HORIZON_DAYS): string[] {
  const rng = mulberry32(hashString(`${seed}:${provider.id}`));
  const slots: string[] = [];
  for (let d = fromDay; d <= toDay; d++) {
    const day = addLocalDays(now, d, PROVIDER_TIME_ZONE);
    const weekend = day.weekday === 0 || day.weekday === 6;
    for (const [window, hours] of Object.entries(provider.availability) as [TimeWindow, number[]][]) {
      if ((window === "weekend") !== weekend) continue;
      for (const h of hours) {
        if (rng() < 0.3) continue; // already booked by someone else
        const hour = Math.floor(h);
        const minute = Math.round((h - hour) * 60);
        slots.push(zonedTimeToUtc(day.year, day.month, day.day, hour, minute, PROVIDER_TIME_ZONE).toISOString());
      }
    }
  }
  return slots.sort();
}

export function slotsFor(providerId: string, journeyId: string, now: Date): string[] {
  const provider = providerById(providerId);
  return provider ? generateSlots(provider, journeyId, now) : [];
}

/** Follow-up times about four weeks after the first visit. */
export function followUpSlots(providerId: string, journeyId: string, visitStart: Date): string[] {
  const provider = providerById(providerId);
  if (!provider) return [];
  return generateSlots(provider, `${journeyId}:follow-up`, visitStart, 26, 34).slice(0, 4);
}
