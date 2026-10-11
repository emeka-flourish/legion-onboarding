"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AiStatus } from "@/ai/router";
import type { Action } from "@/domain/actions";
import type { ClientState } from "@/domain/client";
import { previousStage, STAGE_ROUTE } from "@/domain/stages";
import type { PersonaId, Stage } from "@/domain/types";
import { api } from "@/lib/api";
import type { ActBody } from "@/server/journeyService";

// One place that holds the journey on the client. Screens read it and send actions; the server decides
// every transition. While a simulated service is working, it polls every 1.5 seconds (TRD 8.1).

export type JourneyState = ClientState & { ai?: AiStatus };

export interface ActOutcome {
  ok: boolean;
  status: number;
  message?: string;
  demoCode?: string;
  alternatives?: string[];
}

interface JourneyContext {
  state: JourneyState | null;
  ready: boolean;
  busy: boolean;
  start(personaId?: PersonaId): Promise<boolean>;
  act(action: Action, opts?: { navigate?: boolean }): Promise<ActOutcome>;
  refresh(): Promise<void>;
  forget(): Promise<void>;
  adopt(state: ClientState): void;
  /** Internal to the stage guard: where a push is heading, and whether the browser's back button was used. */
  nav: { pendingRoute(): string | null; settle(): void; takePop(): boolean };
}

const Ctx = createContext<JourneyContext | null>(null);
const POLL_MS = 1_500;

export function JourneyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<JourneyState | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<string | null>(null);
  const popped = useRef(false);
  const aiRef = useRef<AiStatus | undefined>(undefined);

  const refresh = useCallback(async () => {
    const r = await api<JourneyState>("/api/journey");
    if (r.ok) {
      aiRef.current = r.data.ai;
      setState(r.data);
    } else if (r.status === 404) {
      setState(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    // Loading the journey once on mount is the point of this provider.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const pendingJobs = state?.derived.pendingJobs.length ?? 0;
  useEffect(() => {
    if (!pendingJobs) return;
    const t = setTimeout(() => void refresh(), POLL_MS);
    return () => clearTimeout(t);
  }, [pendingJobs, state, refresh]);

  const goTo = useCallback(
    (stage: Stage) => {
      const route = STAGE_ROUTE[stage];
      pending.current = route;
      router.push(route);
    },
    [router],
  );

  const adopt = useCallback((next: ClientState) => setState({ ...next, ai: aiRef.current }), []);

  const act = useCallback(
    async (action: Action, opts: { navigate?: boolean } = {}): Promise<ActOutcome> => {
      setBusy(true);
      const before = state?.journey.stage;
      const r = await api<ActBody>("/api/journey/action", { body: action });
      setBusy(false);
      if (!r.ok) {
        if (r.status === 404) setState(null);
        return { ok: false, status: r.status, message: r.message };
      }
      const { demoCode, alternatives, ...next } = r.data;
      adopt(next);
      if (opts.navigate !== false && next.journey.stage !== before) goTo(next.journey.stage);
      return { ok: true, status: r.status, demoCode, alternatives };
    },
    [state, adopt, goTo],
  );

  const start = useCallback(
    async (personaId?: PersonaId) => {
      setBusy(true);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = await api<ClientState>("/api/journey", { body: { personaId, timeZone } });
      setBusy(false);
      if (!r.ok) return false;
      adopt(r.data);
      goTo(r.data.journey.stage);
      void refresh(); // picks up the AI status line for the demo controls
      return true;
    },
    [adopt, goTo, refresh],
  );

  const forget = useCallback(async () => {
    await api("/api/journey", { method: "DELETE" });
    setState(null);
  }, []);

  const nav = useMemo(
    () => ({
      pendingRoute: () => pending.current,
      settle: () => {
        pending.current = null;
        popped.current = false;
      },
      takePop: () => {
        const was = popped.current;
        popped.current = false;
        return was;
      },
    }),
    [],
  );

  const value = useMemo<JourneyContext>(
    () => ({ state, ready, busy, start, act, refresh, forget, adopt, nav }),
    [state, ready, busy, start, act, refresh, forget, adopt, nav],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJourney(): JourneyContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useJourney must be used inside JourneyProvider");
  return ctx;
}

/**
 * Keeps each screen in step with the server. A screen for another stage redirects to the journey's stage.
 * The browser's back button steps back one stage before booking, the same as the in-page "Back" link.
 */
export function useStageGuard(pageStages: Stage[]): "loading" | "ok" | "redirecting" {
  const { state, ready, act, nav } = useJourney();
  const router = useRouter();
  const pathname = usePathname();
  const current = state?.journey.stage;
  const matches = current !== undefined && pageStages.includes(current);

  useEffect(() => {
    if (!ready) return;
    if (!state) {
      router.replace("/");
      return;
    }
    if (matches) {
      nav.settle();
      return;
    }
    const heading = nav.pendingRoute();
    if (heading && heading !== pathname) return; // a navigation is already on its way
    if (nav.takePop() && !state.journey.booking && previousStage(state.journey) === pageStages[0]) {
      void act({ type: "GO_BACK" }, { navigate: false });
      return;
    }
    router.replace(STAGE_ROUTE[state.journey.stage]);
  }, [ready, state, matches, pathname, pageStages, act, nav, router]);

  if (!ready) return "loading";
  return matches ? "ok" : "redirecting";
}
