"use client";

import { Settings2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { PROVIDER_LABEL } from "@/config/ai.config";
import { PERSONAS, PERSONA_IDS } from "@/data/personas";
import type { PersonaId } from "@/domain/types";
import { cx } from "@/lib/cx";
import { fillStep } from "./demoFill";

/** On every page (TRD 8.2, rule 1). */
export function DemoBanner() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <p className="text-[13px] leading-snug">
            <strong className="font-semibold">Demo with invented patients.</strong> Please don&apos;t enter real health information.
          </p>
          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-[13px] font-medium text-amber-950 hover:bg-amber-100"
          >
            <Settings2 aria-hidden className="size-4" />
            Demo controls
          </button>
        </div>
      </div>
      {open && (
        <DemoControls
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}

function DemoControls({ onClose }: { onClose: () => void }) {
  const { state, start, act, forget, busy } = useJourney();
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const j = state?.journey;
  const openFlag = j?.readiness.safetyFlags.find((f) => !f.reviewedAt);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<unknown>, close = true) => {
    setMessage(null);
    await fn();
    if (close) onClose();
  };

  const startAs = (personaId?: PersonaId) => run(() => start(personaId));
  const fill = () =>
    run(async () => {
      if (!state) return;
      const problem = await fillStep(state, act);
      if (problem) setMessage(problem);
    }, false);

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-controls-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="demo-controls-title" className="text-lg font-semibold text-gray-900">
            Demo controls
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close demo controls" className="flex size-11 items-center justify-center rounded-md hover:bg-gray-100">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5 text-[15px]">
          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">Start as a demo patient</h3>
            <p className="text-sm text-gray-600">Starts a new journey. Every detail is invented.</p>
            <div className="space-y-2">
              {PERSONA_IDS.map((id) => {
                const p = PERSONAS[id];
                const current = j?.personaId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => startAs(id)}
                    className={cx(
                      "w-full rounded-lg border-2 px-3 py-2 text-left hover:bg-gray-50",
                      current ? "border-primary bg-blue-50" : "border-gray-200",
                    )}
                  >
                    <span className="block font-semibold text-gray-900">
                      {p.firstName} {p.lastName}, {p.age} · {p.city}
                      {current && <span className="ml-2 text-xs font-medium text-primary">current</span>}
                    </span>
                    <span className="block text-sm text-gray-600">{p.oneLiner}</span>
                  </button>
                );
              })}
              <button
                type="button"
                disabled={busy}
                onClick={() => startAs(undefined)}
                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="block font-semibold text-gray-900">No demo patient</span>
                <span className="block text-sm text-gray-600">Use your own invented answers</span>
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">This step</h3>
            <Button variant="outline" full disabled={!state || busy} onClick={fill}>
              Fill this step
            </Button>
            <ErrorText>{message}</ErrorText>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">Scenarios</h3>
            <Toggle
              label="Make the insurer slow"
              detail="The plan takes a minute to answer, so “book now, confirm later” appears."
              on={Boolean(j?.demo.slowInsurer)}
              disabled={!j || busy}
              onChange={(on) => run(() => act({ type: "DEMO_SET", slowInsurer: on }, { navigate: false }), false)}
            />
            <Toggle
              label="Make the chosen time get taken"
              detail="The next time picked is booked by someone else a moment earlier."
              on={Boolean(j?.demo.takeChosenSlot)}
              disabled={!j || busy}
              onChange={(on) => run(() => act({ type: "DEMO_SET", takeChosenSlot: on }, { navigate: false }), false)}
            />
            <Button
              variant="outline"
              full
              disabled={!openFlag || busy}
              onClick={() => run(() => act({ type: "DEMO_REVIEW_FLAG", flagId: openFlag!.id }, { navigate: false }), false)}
            >
              Mark safety flag reviewed
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">Return visit</h3>
            <Button
              variant="outline"
              full
              disabled={!j?.person || busy}
              onClick={() => run(async () => {
                await forget();
                router.push("/resume");
              })}
            >
              Simulate a return visit
            </Button>
            <p className="text-sm text-gray-600">Forgets this device, as if the patient came back on another phone.</p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">More</h3>
            <div className="flex flex-col items-start gap-1">
              <Link href="/journey" onClick={onClose} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                Open the journey view
              </Link>
              <button
                type="button"
                onClick={() => run(async () => {
                  await forget();
                  router.push("/");
                })}
                className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
              >
                Reset the demo
              </button>
            </div>
          </section>

          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700" data-testid="ai-status">
            {aiLine(state?.ai)}
          </p>
        </div>
      </div>
    </div>
  );
}

function aiLine(ai: NonNullable<ReturnType<typeof useJourney>["state"]>["ai"]): string {
  if (!ai) return "AI: status appears once a journey starts";
  if (ai.mode === "live" && ai.provider) {
    return `AI: ${PROVIDER_LABEL[ai.provider]} ${ai.model ?? ""} · live (${ai.liveCallsLeft} calls left on this journey)`;
  }
  const why = ai.reason === "no_keys" ? "no keys set" : ai.reason === "journey_cap" ? "this journey's live calls are used up" : "set to scripted";
  return `AI: scripted (${why})`;
}

function Toggle({
  label,
  detail,
  on,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-60"
    >
      <span>
        <span className="block font-medium text-gray-900">{label}</span>
        <span className="block text-sm text-gray-600">{detail}</span>
      </span>
      <span aria-hidden className={cx("mt-1 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors", on ? "bg-primary" : "bg-gray-300")}>
        <span className={cx("size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-4")} />
      </span>
    </button>
  );
}
