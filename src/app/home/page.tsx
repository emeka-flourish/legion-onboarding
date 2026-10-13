"use client";

import { FlaskConical, Stethoscope } from "lucide-react";
import type { JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { BookedMoment } from "@/components/home/BookedMoment";
import { OngoingCare } from "@/components/home/OngoingCare";
import { PrepModule } from "@/components/home/Prep";
import { CoverageFollowThrough, Texts, TrustPulse, VisitCard } from "@/components/home/Visit";
import { formatSlotLong } from "@/rules/time";

// Home changes with where the patient is (walkthrough feedback): booked but not ready leads with getting ready,
// ready leads with joining the visit, and after the first visit it becomes the ongoing-care dashboard. During
// the visit itself, the stage guard keeps the patient on the visit screen.
export default function HomePage() {
  return (
    <StageScreen stages={["home", "after"]}>
      {(state) => (state.journey.stage === "after" ? <OngoingCare state={state} /> : <PrepHome state={state} />)}
    </StageScreen>
  );
}

function PrepHome({ state }: { state: JourneyState }) {
  const j = state.journey;
  const b = j.booking!;
  const ready = state.derived.readiness.requiredDone;
  const name = j.person?.firstName;
  return (
    <StepLayout
      title={ready ? `You're ready for your visit${name ? `, ${name}` : ""}` : `You're booked${name ? `, ${name}` : ""}`}
      subtitle={
        ready
          ? "Your provider has everything they need. Join from here when it's time."
          : "Next, let's get you ready. We already have some of what your provider needs, and we can find more."
      }
      aside={
        <>
          <AsideSection title="Why we ask before the visit" icon={<Stethoscope aria-hidden className="size-4 text-primary" />}>
            <p>Your provider reads all of this before you meet, so your visit starts with what matters to you, not with forms.</p>
            <p>The visit stays booked no matter what. If something isn&apos;t done, your provider covers it with you.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>The ID check, records search, pharmacy history, texts, and the visit itself.</p>
          </AsideSection>
        </>
      }
    >
      <BookedMoment
        appointmentId={b.appointmentId}
        confirmedAt={b.confirmedAt}
        detail={`${state.derived.provider?.name ?? "Your provider"}, ${formatSlotLong(b.start, b.timeZone)}`}
      />
      <div className="space-y-5">
        <CoverageFollowThrough state={state} />
        {ready ? (
          <>
            <VisitCard state={state} prominent />
            <PrepModule state={state} folded />
          </>
        ) : (
          <>
            <PrepModule state={state} />
            <VisitCard state={state} prominent={false} />
          </>
        )}
        <TrustPulse state={state} />
        <Texts state={state} />
      </div>
    </StepLayout>
  );
}
