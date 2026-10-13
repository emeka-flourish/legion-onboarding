import { describe, expect, it, vi } from "vitest";
import { PERSONAS } from "@/data/personas";
import { driveToHome, driveToProviders, Harness } from "./driver";
import { rxnormLookup } from "@/server/aiService";
import { act } from "@/server/journeyService";

describe("arrive ready", () => {
  it("lets a patient decline the records search and tell us their medications instead (principle 6)", async () => {
    const { d, h } = await driveToHome("jordan");
    await d.do({ type: "ID_VERIFY" });
    let s = await d.do({ type: "RECORDS_SKIP" });
    expect(s.journey.readiness.tasks.records).toBe("skipped");
    expect(s.derived.pendingJobs).toEqual([]);
    s = await d.do({ type: "CONFIRM_FOUND", recordIds: [], medicationIds: [], otherMedications: PERSONAS.jordan.otherMedications });
    expect(s.journey.readiness.tasks.confirm_found).toBe("done");
    expect(s.journey.readiness.otherMedications).toEqual(PERSONAS.jordan.otherMedications);
    const names = (await h.store.listEvents(s.journey.id)).map((e) => e.name);
    expect(names).toContain("records_declined");
    expect(names).not.toContain("records_requested");
    // Once declined, the search can still be allowed later.
    s = await d.do({ type: "RECORDS_CONSENT" });
    expect(s.derived.pendingJobs).toEqual(expect.arrayContaining(["records", "med_history"]));
  });

  it("won't skip a search that has already started", async () => {
    const { d, h } = await driveToHome("maya");
    await d.do({ type: "ID_VERIFY" });
    await d.do({ type: "RECORDS_CONSENT" });
    const r = await act(h.ctx(), d.cookie, { type: "RECORDS_SKIP" });
    expect(r.status).toBe(409);
  });

  it("follows coverage through after booking: an inactive plan can switch to self-pay from home", async () => {
    const h = new Harness();
    const { d } = await driveToProviders("sam", h);
    const sam = PERSONAS.sam;
    await d.do({ type: "DEMO_SET", slowInsurer: true });
    const m = await d.providers();
    let s = await d.do({ type: "SELECT_SLOT", providerId: m.top[0].id, slotStart: m.top[0].slots[0] });
    const hold = await d.do({ type: "HOLD_START", firstName: sam.firstName, lastName: sam.lastName, phone: s.journey.demoPhone! });
    await d.do({ type: "HOLD_VERIFY", code: hold.demoCode! });
    await d.do({ type: "COVERAGE_SUBMIT", method: "member_id", memberId: sam.coverage.memberId, dob: sam.coverage.dob });
    h.advance(1_000); // past the 15-second mark once delays are scaled for tests
    s = await d.do({ type: "COVERAGE_CONFIRM_LATER" });
    s = await d.do({ type: "BOOK", email: "patient@example.com", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" });
    expect(s.journey.stage).toBe("home");
    expect(s.journey.coverage?.confirmLater).toBe(true);

    // Active coverage can't be swapped out from home.
    expect((await act(h.ctx(), d.cookie, { type: "COVERAGE_USE_SELF_PAY" })).status).toBe(409);

    h.advance(10_000); // the slow insurer answers: inactive
    s = await d.state();
    expect(s.journey.coverage?.status).toBe("inactive");
    s = await d.do({ type: "COVERAGE_USE_SELF_PAY" });
    expect(s.journey.coverage).toMatchObject({ mode: "self_pay", confirmLater: false });
    expect(s.journey.stage).toBe("home");
    expect(s.journey.booking).toBeDefined();
  });
});

describe("RxNorm lookup route (TAC-35)", () => {
  const fixtures: Record<string, unknown> = {
    "/approximateTerm.json?term=hydroxyzine&maxEntries=8": { approximateGroup: { candidate: [{ rxcui: "5553", rank: "1" }] } },
    "/rxcui/5553/properties.json": { properties: { rxcui: "5553", name: "hydroxyzine", tty: "IN" } },
  };
  const fake = vi.fn(async (url: string | URL | Request) => {
    const path = String(url).replace("https://rxnav.test/REST", "");
    return new Response(JSON.stringify(fixtures[path] ?? {}), { status: path in fixtures ? 200 : 404 });
  });
  const deps = { fetch: fake as unknown as typeof fetch, baseUrl: "https://rxnav.test/REST", timeoutMs: 1_000 };

  it("needs a journey on the home checklist and a sensible name", async () => {
    const { d, h } = await driveToProviders("maya");
    expect((await rxnormLookup(h.ctx(), undefined, { term: "hydroxyzine" }, deps)).status).toBe(404);
    expect((await rxnormLookup(h.ctx(), d.cookie, { term: "hydroxyzine" }, deps)).status).toBe(409);
    const home = await driveToHome("maya");
    expect((await rxnormLookup(home.h.ctx(), home.d.cookie, { term: "x" }, deps)).status).toBe(400);
  });

  it("matches live through the injected service, never sends a crisis phrase, and survives an outage", async () => {
    const { d, h } = await driveToHome("maya");
    const hit = await rxnormLookup(h.ctx(), d.cookie, { term: "Hydroxyzine" }, deps);
    expect(hit.body).toEqual({ matches: [{ rxcui: "5553", name: "hydroxyzine", tty: "IN" }], meta: { mode: "live", source: "RxNorm" } });

    fake.mockClear();
    const crisis = await rxnormLookup(h.ctx(), d.cookie, { term: "pills to end my life" }, deps);
    expect(crisis.body).toMatchObject({ matches: [] });
    expect(fake).not.toHaveBeenCalled();

    // The test setup points RXNORM_URL at an unreachable address: the route still answers, with an empty list.
    const outage = await rxnormLookup(h.ctx(), d.cookie, { term: "sertraline" });
    expect(outage).toMatchObject({ status: 200, body: { matches: [], meta: { mode: "unavailable", source: "RxNorm" } } });
  });
});
