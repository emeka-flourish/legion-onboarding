import type { Journey, JourneyEvent } from "@/domain/types";
import { CODE_TTL_SECONDS, JOURNEY_TTL_SECONDS, type JourneyStore } from "./types";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** In-memory store for local development and tests. Same contract and expiry rules as the Redis store. */
export class MemoryStore implements JourneyStore {
  readonly kind = "memory" as const;
  private journeys = new Map<string, Entry<Journey>>();
  private events = new Map<string, Entry<JourneyEvent[]>>();
  private index = new Map<string, number>();
  private phones = new Map<string, Entry<string>>();
  private codes = new Map<string, Entry<string>>();
  private failures = new Map<string, Entry<number>>();
  private counters = new Map<string, Entry<number>>();

  constructor(private clock: () => number = Date.now) {}

  private live<T>(map: Map<string, Entry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock()) {
      map.delete(key);
      return null;
    }
    return entry.value;
  }

  private expiry(seconds: number) {
    return this.clock() + seconds * 1000;
  }

  async getJourney(id: string) {
    const j = this.live(this.journeys, id);
    return j ? structuredClone(j) : null;
  }

  async putJourney(journey: Journey) {
    if (!this.index.has(journey.id)) this.index.set(journey.id, new Date(journey.createdAt).getTime());
    this.journeys.set(journey.id, { value: structuredClone(journey), expiresAt: this.expiry(JOURNEY_TTL_SECONDS) });
  }

  async appendEvents(journeyId: string, events: JourneyEvent[]) {
    if (events.length === 0) return;
    const existing = this.live(this.events, journeyId) ?? [];
    this.events.set(journeyId, { value: [...existing, ...events], expiresAt: this.expiry(JOURNEY_TTL_SECONDS) });
  }

  async listEvents(journeyId: string) {
    return structuredClone(this.live(this.events, journeyId) ?? []);
  }

  async listJourneyIds(sinceMs: number) {
    return [...this.index.entries()].filter(([id, t]) => t >= sinceMs && this.live(this.journeys, id)).map(([id]) => id);
  }

  async setPhone(phoneHash: string, journeyId: string) {
    this.phones.set(phoneHash, { value: journeyId, expiresAt: this.expiry(JOURNEY_TTL_SECONDS) });
  }

  async findByPhone(phoneHash: string) {
    return this.live(this.phones, phoneHash);
  }

  async setCode(phoneHash: string, code: string) {
    this.codes.set(phoneHash, { value: code, expiresAt: this.expiry(CODE_TTL_SECONDS) });
  }

  async takeCode(phoneHash: string) {
    const code = this.live(this.codes, phoneHash);
    this.codes.delete(phoneHash);
    return code;
  }

  async recordFailedCode(phoneHash: string) {
    const count = (this.live(this.failures, phoneHash) ?? 0) + 1;
    const existing = this.failures.get(phoneHash);
    this.failures.set(phoneHash, { value: count, expiresAt: existing && count > 1 ? existing.expiresAt : this.expiry(CODE_TTL_SECONDS) });
    return count;
  }

  async failedCodes(phoneHash: string) {
    return this.live(this.failures, phoneHash) ?? 0;
  }

  async clearFailedCodes(phoneHash: string) {
    this.failures.delete(phoneHash);
  }

  async addToCounter(name: string, by: number, ttlSeconds: number) {
    const current = this.live(this.counters, name);
    const expiresAt = current === null ? this.expiry(ttlSeconds) : this.counters.get(name)!.expiresAt;
    this.counters.set(name, { value: (current ?? 0) + by, expiresAt });
    return (current ?? 0) + by;
  }

  async readCounter(name: string) {
    return this.live(this.counters, name) ?? 0;
  }
}
