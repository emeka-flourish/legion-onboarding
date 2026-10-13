import { Redis } from "@upstash/redis";
import { MemoryStore } from "./memory";
import { RedisStore } from "./redis";
import type { JourneyStore } from "./types";

// Redis when its variables exist (either the Upstash or the legacy KV names), otherwise memory locally.
// Kept on globalThis so the memory store survives hot reloads in development.
const globalStore = globalThis as unknown as { __legionStore?: JourneyStore };

export function getStore(): JourneyStore {
  if (globalStore.__legionStore) return globalStore.__legionStore;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  // On Vercel, memory would lose journeys between function instances without saying so, so fail loudly instead.
  if (!(url && token) && process.env.VERCEL) throw new Error("Upstash Redis must be configured on Vercel (KV_REST_API_URL and KV_REST_API_TOKEN)");
  globalStore.__legionStore = url && token ? new RedisStore(new Redis({ url, token })) : new MemoryStore();
  return globalStore.__legionStore;
}

export function setStoreForTests(store: JourneyStore | undefined) {
  globalStore.__legionStore = store;
}
