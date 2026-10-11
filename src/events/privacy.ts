import { EVENT_PROPS, type EventName, type EventProps } from "./catalog";

// Events carry codes and timings only, never clinical answers or free text (Gate 1 guardrail, TRD 4.7).
const CODE = /^[a-z0-9_.:-]{1,40}$/;

export class EventPrivacyError extends Error {}

export function validateEventProps(name: string, props: EventProps): void {
  if (!(name in EVENT_PROPS)) throw new EventPrivacyError(`Unknown event: ${name}`);
  const allowed = EVENT_PROPS[name as EventName] as readonly string[];
  for (const [key, value] of Object.entries(props)) {
    if (!allowed.includes(key)) throw new EventPrivacyError(`${name}: property "${key}" is not allowlisted`);
    if (typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new EventPrivacyError(`${name}.${key}: number must be finite`);
      continue;
    }
    if (typeof value !== "string" || !CODE.test(value)) {
      throw new EventPrivacyError(`${name}.${key}: only short lowercase codes are allowed`);
    }
  }
}
