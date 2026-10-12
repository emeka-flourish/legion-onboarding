"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";

const SHOW_MS = 2_400;
const FADE_MS = 400;
const FRESH_MS = 2 * 60_000;
const seenKey = (id: string) => `legion:booked-moment:${id}`;

function shouldShow(appointmentId: string, confirmedAt: string): boolean {
  if (Date.now() - new Date(confirmedAt).getTime() > FRESH_MS) return false; // only on arriving from booking
  try {
    return sessionStorage.getItem(seenKey(appointmentId)) === null;
  } catch {
    return true;
  }
}

/**
 * A short, calm confirmation between booking and visit prep (walkthrough feedback, post-booking item 1):
 * a check draws in, "You're booked", and then the prep home. No confetti or emoji (TAC-47). It shows once per
 * booking, can be dismissed with a tap or Escape, and the motion is dropped for people who ask for less.
 */
export function BookedMoment({ appointmentId, confirmedAt, detail }: { appointmentId: string; confirmedAt: string; detail: string }) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">(() => (shouldShow(appointmentId, confirmedAt) ? "in" : "gone"));

  useEffect(() => {
    if (phase === "gone") return;
    try {
      sessionStorage.setItem(seenKey(appointmentId), "1");
    } catch {
      // Private browsing: the moment may show again on reload, which is harmless.
    }
    const t = setTimeout(() => setPhase(phase === "in" ? "out" : "gone"), phase === "in" ? SHOW_MS : FADE_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhase("gone");
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, appointmentId]);

  if (phase === "gone") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setPhase("gone")}
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center bg-white/95 px-6 backdrop-blur-sm transition-opacity duration-400",
        phase === "out" ? "opacity-0" : "opacity-100",
      )}
    >
      <div className="max-w-sm text-center">
        <svg viewBox="0 0 52 52" aria-hidden className="mx-auto size-20 animate-pop-in motion-reduce:animate-none">
          <circle cx="26" cy="26" r="25" className="fill-green-600" />
          <path
            d="M15 27l7 7 15-15"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            className="animate-draw-check motion-reduce:animate-none"
          />
        </svg>
        <div className="animate-rise-in motion-reduce:animate-none">
          <p className="mt-5 text-2xl font-semibold text-gray-900">You&apos;re booked</p>
          <p className="mt-1 text-[15px] text-balance text-gray-700">{detail}</p>
          <p className="mt-5 text-sm font-medium text-primary-strong">Next: getting ready for your visit</p>
        </div>
      </div>
    </div>
  );
}
