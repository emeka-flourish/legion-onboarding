"use client";

import { ClipboardList, FlaskConical, ShieldCheck, Smartphone, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJourney } from "@/components/journey/JourneyProvider";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/Status";
import { STAGE_LABEL, STAGE_ROUTE } from "@/domain/stages";

export default function Welcome() {
  const { state, ready, start, forget, busy } = useJourney();
  const router = useRouter();

  if (!ready) {
    return (
      <StepLayout title="Legion Health">
        <LoadingBlock />
      </StepLayout>
    );
  }

  if (state) {
    // Welcome back: names only the step, never a health detail (TRD 8.1).
    const stage = state.journey.stage;
    return (
      <StepLayout title="Welcome back" subtitle={`Continue where you left off: ${STAGE_LABEL[stage]}.`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => router.push(STAGE_ROUTE[stage])}>Continue</Button>
          <Button variant="outline" onClick={() => void forget()}>
            Start over
          </Button>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      title="See a Texas psychiatric provider by video"
      subtitle="Answer a few quick questions, see the providers who fit you best, and hold a time. You won't need an account until you've picked a time."
      aside={<WelcomeAside />}
    >
      <div className="space-y-4">
        <Button full loading={busy} onClick={() => void start()} className="sm:w-auto sm:px-8">
          Get started
        </Button>
        <p className="text-[15px] text-gray-700">
          Already started?{" "}
          <Link href="/resume" className="font-medium text-primary underline underline-offset-4">
            Continue with your phone
          </Link>
        </p>
      </div>
    </StepLayout>
  );
}

function WelcomeAside() {
  return (
    <>
      <AsideSection title="What happens next" icon={<ClipboardList aria-hidden className="size-4 text-primary" />}>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>A quick fit check: six yes-or-no questions.</li>
          <li>A few taps about what you need and how you&apos;ll pay. You&apos;ll see your typical cost right away.</li>
          <li>Three providers who fit, with the reasons why and times in your time zone.</li>
          <li>Hold a time with your first name and mobile number.</li>
        </ol>
      </AsideSection>
      <AsideSection title="After you book" icon={<Stethoscope aria-hidden className="size-4 text-primary" />}>
        <p>
          A short checklist gets you ready. With your permission we look for your records, so you confirm instead of typing,
          and a few questions in your own words replace the long intake forms.
        </p>
      </AsideSection>
      <AsideSection title="Come back any time" icon={<Smartphone aria-hidden className="size-4 text-primary" />}>
        <p>Once you hold a time, you can pick up where you left off from any device with your mobile number.</p>
      </AsideSection>
      <AsideSection title="Your information" icon={<ShieldCheck aria-hidden className="size-4 text-primary" />}>
        <p>Our analytics record that a step happened and how long it took, never your answers.</p>
      </AsideSection>
      <AsideSection title="What's simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
        <p>Providers, openings, insurance checks, records, texts, and the visit itself. None of them reach a real service.</p>
        <p>
          When a live AI model is switched on, what you type in the optional note and the guided conversation is sent to it, so
          please use invented details.
        </p>
      </AsideSection>
    </>
  );
}
