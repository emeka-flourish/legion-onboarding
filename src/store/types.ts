import type { Journey, JourneyEvent } from "@/domain/types";

// Everything expires after seven days (TRD 4.2); resume codes after ten minutes.
export const JOURNEY_TTL_SECONDS = 7 * 24 * 3600;
export const CODE_TTL_SECONDS = 10 * 60;
export const MAX_FAILED_CODES = 5;

export interface JourneyStore {
  readonly kind: "memory" | "redis";
  getJourney(id: string): Promise<Journey | null>;
  putJourney(journey: Journey): Promise<void>;
  appendEvents(journeyId: string, events: JourneyEvent[]): Promise<void>;
  listEvents(journeyId: string): Promise<JourneyEvent[]>;
  listJourneyIds(sinceMs: number): Promise<string[]>;
  setPhone(phoneHash: string, journeyId: string): Promise<void>;
  findByPhone(phoneHash: string): Promise<string | null>;
  setCode(phoneHash: string, code: string): Promise<void>;
  takeCode(phoneHash: string): Promise<string | null>;
  /** Counts a wrong code for this number and returns the count within the ten-minute window. */
  recordFailedCode(phoneHash: string): Promise<number>;
  failedCodes(phoneHash: string): Promise<number>;
  clearFailedCodes(phoneHash: string): Promise<void>;
}
