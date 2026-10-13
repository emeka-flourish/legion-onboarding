import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./env";

export const JOURNEY_COOKIE = "lh_journey";
export const COOKIE_MAX_AGE = 7 * 24 * 3600;

const mac = (value: string) => createHmac("sha256", sessionSecret()).update(value).digest("base64url");

/** Cookie value: journey ID plus an HMAC, so it can't be forged or guessed. */
export function signJourneyId(id: string): string {
  return `${id}.${mac(`journey:${id}`).slice(0, 32)}`;
}

export function verifyJourneyCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const expected = Buffer.from(mac(`journey:${id}`).slice(0, 32));
  const given = Buffer.from(value.slice(dot + 1));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

/** US numbers only; returns E.164 (+1XXXXXXXXXX) or null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** A keyed hash of the phone number. The number itself is never stored (TRD 4.2). */
export function phoneHash(e164: string): string {
  return mac(`phone:${e164}`).slice(0, 40);
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
