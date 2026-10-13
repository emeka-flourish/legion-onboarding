import { describe, expect, it } from "vitest";
import { newJourney } from "@/domain/reducer";
import { EVENT_PROPS } from "@/events/catalog";
import { buildEvents } from "@/events/emit";
import { EventPrivacyError, validateEventProps } from "@/events/privacy";
import { generateCode, normalizePhone, phoneHash, signJourneyId, verifyJourneyCookie } from "@/server/session";
import { getStore, setStoreForTests } from "@/store";
import { MemoryStore } from "@/store/memory";
import { NOW } from "../helpers";

describe("event privacy (TAC-28)", () => {
  it("accepts allowlisted codes, counts, and booleans", () => {
    expect(() => validateEventProps("coverage_verified", { result: "active", cost_shown: true, source: "sohar_sim" })).not.toThrow();
    expect(() => validateEventProps("visit_ready", { hours_before_visit: 30, typed_inputs: 9, taps: 40 })).not.toThrow();
  });
  it.each([
    ["free text", "eligibility_evaluated", { reason: "I live in Oklahoma" }],
    ["uppercase text", "eligibility_evaluated", { reason: "Not_Texas" }],
    ["a long string", "eligibility_evaluated", { reason: "x".repeat(41) }],
    ["an unknown key", "eligibility_evaluated", { condition: "anxiety" }],
    ["an unknown event", "patient_said", {}],
    ["a non-finite number", "visit_ready", { hours_before_visit: Infinity }],
  ])("rejects %s", (_label, name, props) => {
    expect(() => validateEventProps(name as string, props as never)).toThrow(EventPrivacyError);
  });
  it("catalogs every event with an allowlist", () => {
    for (const keys of Object.values(EVENT_PROPS)) expect(Array.isArray(keys)).toBe(true);
  });
});

describe("buildEvents (TRD 7.3)", () => {
  it("stamps version, journey, session, person, and source; rejects and counts invalid events (TAC-41)", () => {
    const j = newJourney("jrn_x", NOW, { timeZone: "America/Chicago" });
    j.person = { personId: "per_1", firstName: "A", phoneHash: "h", createdAt: NOW.toISOString() };
    const { events, rejected } = buildEvents(
      j,
      [
        { name: "slot_selected", props: { rank: 1 } },
        { name: "reservation_created", props: { hold_minutes: 10 } },
        { name: "eligibility_evaluated", props: { reason: "free text here" } },
      ],
      NOW,
    );
    expect(rejected).toBe(1);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ v: 1, journeyId: "jrn_x", personId: "per_1", session: 1, source: "patient_action" });
    expect(events[1].source).toBe("system_of_record");
    expect(events[1].ts > events[0].ts).toBe(true);
  });
});

describe("memory store", () => {
  it("expires journeys after seven days and codes after ten minutes", async () => {
    let t = NOW.getTime();
    const store = new MemoryStore(() => t);
    const j = newJourney("jrn_s", NOW, { timeZone: "America/Chicago" });
    await store.putJourney(j);
    await store.setCode("h", "123456");
    expect(await store.getJourney("jrn_s")).not.toBeNull();
    t += 11 * 60_000;
    expect(await store.takeCode("h")).toBeNull();
    t += 7 * 24 * 3600_000;
    expect(await store.getJourney("jrn_s")).toBeNull();
  });
  it("gives a code once, links phones to journeys, and lists recent journeys", async () => {
    const store = new MemoryStore(() => NOW.getTime());
    await store.setCode("h", "654321");
    expect(await store.takeCode("h")).toBe("654321");
    expect(await store.takeCode("h")).toBeNull();
    await store.putJourney(newJourney("jrn_a", NOW, { timeZone: "America/Chicago" }));
    await store.setPhone("h", "jrn_a");
    expect(await store.findByPhone("h")).toBe("jrn_a");
    expect(await store.listJourneyIds(NOW.getTime() - 1)).toEqual(["jrn_a"]);
  });
  it("counts wrong codes within a ten-minute window", async () => {
    let t = NOW.getTime();
    const store = new MemoryStore(() => t);
    for (let i = 1; i <= 5; i++) expect(await store.recordFailedCode("h")).toBe(i);
    expect(await store.failedCodes("h")).toBe(5);
    t += 11 * 60_000;
    expect(await store.failedCodes("h")).toBe(0);
  });

  it("keeps named counters until they expire from their first use", async () => {
    let t = NOW.getTime();
    const store = new MemoryStore(() => t);
    expect(await store.readCounter("c")).toBe(0);
    expect(await store.addToCounter("c", 2, 60)).toBe(2);
    t += 30_000;
    expect(await store.addToCounter("c", 3, 60)).toBe(5);
    t += 31_000; // 61 seconds after the first use
    expect(await store.readCounter("c")).toBe(0);
    expect(await store.addToCounter("c", 1, 60)).toBe(1);
  });
});

describe("sessions", () => {
  it("signs and verifies the journey cookie, rejecting tampering", () => {
    const signed = signJourneyId("jrn_abc");
    expect(verifyJourneyCookie(signed)).toBe("jrn_abc");
    expect(verifyJourneyCookie(signed.replace("jrn_abc", "jrn_abd"))).toBeNull();
    expect(verifyJourneyCookie("jrn_abc")).toBeNull();
    expect(verifyJourneyCookie(undefined)).toBeNull();
  });
  it("normalizes US numbers and never exposes them in the hash", () => {
    expect(normalizePhone("(512) 555-0142")).toBe("+15125550142");
    expect(normalizePhone("1-512-555-0142")).toBe("+15125550142");
    expect(normalizePhone("555-0142")).toBeNull();
    const h = phoneHash("+15125550142");
    expect(h).toBe(phoneHash("+15125550142"));
    expect(h).not.toContain("5125550142");
  });
  it("makes six-digit codes", () => {
    expect(generateCode()).toMatch(/^\d{6}$/);
  });
});

describe("store selection", () => {
  const keys = ["VERCEL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"] as const;
  const withEnv = async (env: Partial<Record<(typeof keys)[number], string>>, fn: () => void | Promise<void>) => {
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    Object.assign(process.env, env);
    setStoreForTests(undefined);
    try {
      await fn();
    } finally {
      for (const k of keys) if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
      setStoreForTests(undefined);
    }
  };

  it("uses memory locally, and refuses to run on Vercel without Redis rather than lose journeys", async () => {
    await withEnv({}, () => expect(getStore().kind).toBe("memory"));
    await withEnv({ VERCEL: "1" }, () => expect(() => getStore()).toThrow(/Upstash Redis must be configured/));
    await withEnv({ VERCEL: "1", KV_REST_API_URL: "https://example.upstash.io", KV_REST_API_TOKEN: "t" }, () => expect(getStore().kind).toBe("redis"));
  });
});
