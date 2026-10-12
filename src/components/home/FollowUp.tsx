"use client";

import { CalendarCheck, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { visitFor } from "@/data/personas";
import { formatSlot, formatSlotLong } from "@/rules/time";

/** Booking the follow-up in one tap, and changing its time later from the ongoing-care home. */
export function FollowUp({ state, bookedTitle = "Your follow-up is booked" }: { state: JourneyState; bookedTitle?: string }) {
  const { act, busy } = useJourney();
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string>();
  const j = state.journey;
  const booked = j.after?.followUpStart;
  const name = state.derived.provider?.name ?? "your provider";
  const slots = (state.derived.followUpSlots ?? []).filter((s) => s !== booked);

  const book = async (slotStart: string) => {
    setError(undefined);
    const r = await act({ type: "BOOK_FOLLOW_UP", slotStart }, { navigate: false });
    if (!r.ok) setError(r.message);
    else setChanging(false);
  };

  const times = (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {slots.map((s) => (
        <Button key={s} variant="outline" disabled={busy} onClick={() => void book(s)}>
          {formatSlot(s, j.timeZone)}
        </Button>
      ))}
    </div>
  );

  return (
    <section aria-labelledby="follow-title" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        {booked ? <CalendarCheck aria-hidden className="size-4 text-green-700" /> : <CalendarPlus aria-hidden className="size-4 text-primary" />}
        <h2 id="follow-title" className="text-base font-semibold text-gray-900">
          {booked ? bookedTitle : "Book your follow-up"}
        </h2>
      </div>
      {booked ? (
        <>
          <p className="mt-2 text-lg font-semibold text-gray-900">{formatSlotLong(booked, j.timeZone)}</p>
          <p className="text-[15px] text-gray-700">Follow-up with {name} by video, about 30 minutes.</p>
          {changing ? (
            <>
              <p className="mt-3 text-sm font-medium text-gray-900">Pick another time</p>
              {times}
              <Button variant="quiet" className="mt-2" onClick={() => setChanging(false)}>
                Keep the current time
              </Button>
            </>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="outline" disabled={slots.length === 0} onClick={() => setChanging(true)}>
                Change time
              </Button>
              <span className="text-sm text-gray-600">Free to change or cancel up to 24 hours before.</span>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-[15px] text-gray-700">
            {name} recommends a follow-up in about {visitFor(j.personaId).followUpWeeks} weeks. One tap books it.
          </p>
          {times}
        </>
      )}
      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>
    </section>
  );
}
