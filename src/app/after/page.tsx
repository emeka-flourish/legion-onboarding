"use client";

import { CalendarCheck, CalendarPlus, FlaskConical, Pill, Stethoscope } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice } from "@/components/ui/Status";
import { SimulatedTag } from "@/components/ui/Tags";
import { pharmacyById } from "@/data/pharmacies";
import { PERSONAS } from "@/data/personas";
import { formatSlot, formatSlotLong } from "@/rules/time";

// Journeys without a demo patient get a plain invented summary (TRD 6.4).
const GENERIC_VISIT = {
  talkedAbout: ["What's been going on, in your own words", "How you've been sleeping and feeling day to day"],
  plan: ["Your provider's notes and next steps", "A follow-up visit in about four weeks to see how it's going"],
};

export default function AfterPage() {
  return <StageScreen stages={["after"]}>{(state) => <After state={state} />}</StageScreen>;
}

function After({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const j = state.journey;
  const viewed = useRef(false);
  const [error, setError] = useState<string>();
  const visit = j.personaId ? PERSONAS[j.personaId].visit : GENERIC_VISIT;
  const pharmacy = pharmacyById(j.after?.prescriptionPharmacyId);

  useEffect(() => {
    if (viewed.current || j.after?.summaryViewed) return;
    viewed.current = true;
    void act({ type: "VIEW_SUMMARY" }, { navigate: false });
  }, [act, j.after?.summaryViewed]);

  const book = async (slotStart: string) => {
    const r = await act({ type: "BOOK_FOLLOW_UP", slotStart }, { navigate: false });
    if (!r.ok) setError(r.message);
  };

  return (
    <StepLayout
      title="After your visit"
      subtitle={`With ${state.derived.provider?.name}`}
      aside={
        <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
          <p>The visit summary, the e-prescription, and scheduling. The summary is written ahead of time for each demo patient.</p>
        </AsideSection>
      }
    >
      <div className="space-y-6">
        <Notice tone="success" title="Your first visit is complete">
          <p>Here&apos;s what you covered and what happens next.</p>
        </Notice>

        <section aria-labelledby="summary-title" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Stethoscope aria-hidden className="size-4 text-primary" />
            <h2 id="summary-title" className="text-base font-semibold text-gray-900">
              Visit summary
            </h2>
            <SimulatedTag label="Reviewed by your clinician (simulated)" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-700">What you talked about</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-gray-900">
            {visit.talkedAbout.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-semibold text-gray-700">Your plan</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-gray-900">
            {visit.plan.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        {pharmacy && (
          <section aria-labelledby="rx-title" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill aria-hidden className="size-4 text-primary" />
              <h2 id="rx-title" className="text-base font-semibold text-gray-900">
                Your prescription was sent
              </h2>
              <SimulatedTag label="E-prescription (simulated)" />
            </div>
            <p className="mt-2 text-[15px] text-gray-900">
              {pharmacy.name}, {pharmacy.address}
            </p>
            <p className="mt-1 text-sm text-gray-700">This is the pharmacy you chose before your visit.</p>
          </section>
        )}

        <section aria-labelledby="follow-title" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <CalendarPlus aria-hidden className="size-4 text-primary" />
            <h2 id="follow-title" className="text-base font-semibold text-gray-900">
              {j.after?.followUpStart ? "Your follow-up is booked" : "Book your follow-up"}
            </h2>
          </div>
          {j.after?.followUpStart ? (
            <p className="mt-2 flex items-center gap-1.5 text-[15px] text-gray-900">
              <CalendarCheck aria-hidden className="size-4 text-green-700" />
              {formatSlotLong(j.after.followUpStart, j.timeZone)}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-gray-700">One tap books it with {state.derived.provider?.name}.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(state.derived.followUpSlots ?? []).map((s) => (
                  <Button key={s} variant="outline" disabled={busy} onClick={() => void book(s)}>
                    {formatSlot(s, j.timeZone)}
                  </Button>
                ))}
              </div>
            </>
          )}
          <ErrorText>{error}</ErrorText>
        </section>
      </div>
    </StepLayout>
  );
}
