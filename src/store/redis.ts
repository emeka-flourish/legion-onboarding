import { Redis } from "@upstash/redis";
import type { Journey, JourneyEvent } from "@/domain/types";
import { CODE_TTL_SECONDS, JOURNEY_TTL_SECONDS, type JourneyStore } from "./types";

const parse = <T>(value: unknown): T => (typeof value === "string" ? (JSON.parse(value) as T) : (value as T));

/** Upstash Redis store for the hosted demo (Vercel Marketplace). Every key carries a TTL. */
export class RedisStore implements JourneyStore {
  readonly kind = "redis" as const;

  constructor(private redis: Redis) {}

  async getJourney(id: string) {
    const value = await this.redis.get(`journey:${id}`);
    return value ? parse<Journey>(value) : null;
  }

  async putJourney(journey: Journey) {
    await this.redis.set(`journey:${journey.id}`, JSON.stringify(journey), { ex: JOURNEY_TTL_SECONDS });
    await this.redis.zadd("journeys:index", { nx: true }, { score: new Date(journey.createdAt).getTime(), member: journey.id });
  }

  async appendEvents(journeyId: string, events: JourneyEvent[]) {
    if (events.length === 0) return;
    const key = `events:${journeyId}`;
    await this.redis.rpush(key, ...events.map((e) => JSON.stringify(e)));
    await this.redis.expire(key, JOURNEY_TTL_SECONDS);
  }

  async listEvents(journeyId: string) {
    const values = await this.redis.lrange(`events:${journeyId}`, 0, -1);
    return values.map((v) => parse<JourneyEvent>(v));
  }

  async listJourneyIds(sinceMs: number) {
    await this.redis.zremrangebyscore("journeys:index", 0, sinceMs - 1);
    return (await this.redis.zrange("journeys:index", sinceMs, "+inf", { byScore: true })) as string[];
  }

  async setPhone(phoneHash: string, journeyId: string) {
    await this.redis.set(`phone:${phoneHash}`, journeyId, { ex: JOURNEY_TTL_SECONDS });
  }

  async findByPhone(phoneHash: string) {
    const value = await this.redis.get(`phone:${phoneHash}`);
    return value ? String(value) : null;
  }

  async setCode(phoneHash: string, code: string) {
    await this.redis.set(`code:${phoneHash}`, code, { ex: CODE_TTL_SECONDS });
  }

  async recordFailedCode(phoneHash: string) {
    const key = `failures:${phoneHash}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, CODE_TTL_SECONDS);
    return count;
  }

  async failedCodes(phoneHash: string) {
    return Number((await this.redis.get(`failures:${phoneHash}`)) ?? 0);
  }

  async clearFailedCodes(phoneHash: string) {
    await this.redis.del(`failures:${phoneHash}`);
  }

  async takeCode(phoneHash: string) {
    const value = await this.redis.getdel(`code:${phoneHash}`);
    return value === null || value === undefined ? null : String(value).padStart(6, "0");
  }
}
