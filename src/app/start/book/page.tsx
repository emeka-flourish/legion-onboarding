"use client";

import { BellRing, CalendarCheck, CreditCard, FlaskConical, Video } from "lucide-react";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { ProviderPortrait } from "@/components/providers/ProviderPortrait";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ErrorText } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { PLAN_LABEL } from "@/data/plans";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import { formatSlotLong } from "@/rules/time";

export default function BookPage() {
  return <StageScreen stages={["book"]}>{(state) => <Book state={state} />}</StageScreen>;
}

const CONSENTS = [
  { key: "terms", label: "I agree to the Terms of Service, Privacy Policy, and HIPAA Notice." },
  { key: "treatment", label: "I agree to the Treatment Consent Policy and Controlled Substance Policy." },
  { key: "recording", label: "I agree to the Recording and AI Transcription Policy." },
] as const;

function Book({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const j = state.journey;
  const c = j.coverage!;
  const [agreed, setAgreed] = useState({ terms: false, treatment: false, recording: false });
  const [error, setError] = useState<string>();
  const allAgreed = agreed.terms && agreed.treatment && agreed.recording;

  const book = async () => {
    setError(undefined);
    const r = await act({ type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" });
    if (!r.ok) setError(r.message);
  };

  return (
    <StepLayout
      title="Review and book your visit"
      progress={<StepProgress n={7} of={BOOK_FAST_STEP_COUNT} />}
      onBack={() => void act({ type: "GO_BACK" })}
      aside={
        <>
          <AsideSection title="After you book" icon={<BellRing aria-hidden className="size-4 text-primary" />}>
            <p>We&apos;ll text you a confirmation now and a reminder the day before your visit.</p>
            <p>
              A short checklist then helps you get ready: verify your ID, let us look for your records, and answer a few questions in
              your own words.
            </p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>Scheduling, payment, and texts. No card is charged.</p>
          </AsideSection>
        </>
      }
    >
      <section aria-label="Your visit" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        {state.derived.provider && (
          <div className="flex items-center gap-3">
            <ProviderPortrait portrait={state.derived.provider.portrait} size={48} />
            <div>
              <p className="font-semibold text-gray-900">{state.derived.provider.name}</p>
              <p className="text-sm text-gray-600">{state.derived.provider.credential}</p>
            </div>
          </div>
        )}
        <ul className="mt-4 space-y-2 text-[15px] text-gray-800">
          {j.selection && (
            <li className="flex gap-2">
              <CalendarCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              {formatSlotLong(j.selection.slotStart, j.timeZone)}
            </li>
          )}
          <li className="flex gap-2">
            <Video aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            First visit by secure video, about 60 minutes
          </li>
          <li className="flex gap-2">
            <CreditCard aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {state.derived.costLine}
              {c.mode === "insured" && c.status === "active" && (
                <span className="block text-sm text-gray-700">
                  In network with {PLAN_LABEL[c.plan]} · verified <SourceTag source={c.source} className="ml-1" />
                </span>
              )}
            </span>
          </li>
        </ul>
        <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-700">
          Free to cancel or reschedule up to 24 hours before your visit.
        </p>
      </section>

      <fieldset className="mt-6">
        <legend className="text-base font-semibold text-gray-900">Agreements</legend>
        <div className="mt-1">
          {CONSENTS.map((item) => (
            <Checkbox key={item.key} checked={agreed[item.key]} onChange={(on) => setAgreed((a) => ({ ...a, [item.key]: on }))}>
              {item.label}
            </Checkbox>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <p className="text-base font-semibold text-gray-900">Payment method</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-3">
          <span className="font-mono text-[15px] text-gray-900">Visa •••• 4242 · 12/34</span>
          <SimulatedTag label="Test card, never charged" />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Button full disabled={!allAgreed} loading={busy} onClick={() => void book()}>
          Book my visit
        </Button>
        {!allAgreed && <p className="text-sm text-gray-600">Check the three agreements to book.</p>}
        <ErrorText>{error}</ErrorText>
      </div>
    </StepLayout>
  );
}
