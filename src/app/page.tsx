"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJourney } from "@/components/journey/JourneyProvider";
import { StepLayout } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/Status";
import { STAGE_LABEL, STAGE_ROUTE } from "@/domain/stages";

const TRUST = ["Providers licensed in Texas", "Insurance or self-pay", "Secure video visits from home"];

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
          {/* After the first visit, home is the ongoing-care dashboard. */}
          <Button onClick={() => router.push(stage === "after" ? "/home" : STAGE_ROUTE[stage])}>Continue</Button>
          <Button variant="outline" onClick={() => void forget()}>
            Start over
          </Button>
        </div>
      </StepLayout>
    );
  }

  // A consumer entry point first (walkthrough feedback, item 1): what Legion does, what happens next, why trust it,
  // and how little it asks. Everything about the demo itself sits behind one small disclosure.
  return (
    <StepLayout
      title="See a Texas psychiatric provider by video"
      subtitle="Answer a few quick questions, see providers who fit, and hold a time. No account needed until you choose an appointment."
    >
      <div className="space-y-8">
        <div className="space-y-4">
          <Button full loading={busy} onClick={() => void start()} className="sm:w-auto sm:px-10">
            Get started
          </Button>
          <p className="text-[15px] text-gray-700">
            Already started?{" "}
            <Link href="/resume" className="font-medium text-primary underline underline-offset-4">
              Continue with your phone
            </Link>
          </p>
        </div>

        <ul aria-label="What to expect" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {TRUST.map((t) => (
            <li key={t} className="flex items-center gap-2 text-[15px] text-gray-800">
              <Check aria-hidden className="size-4 shrink-0 text-green-700" />
              {t}
            </li>
          ))}
        </ul>

        <figure className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <blockquote className="text-base leading-relaxed text-gray-900">
            &ldquo;I got matched quickly and felt like my provider already understood what I needed.&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-sm text-gray-600">Example patient quote, invented for this demo</figcaption>
        </figure>

        <details className="group rounded-lg border border-gray-200 bg-white/70 text-[15px] text-gray-700">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
            How this demo works
            <ChevronDown aria-hidden className="size-4 text-gray-600 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-gray-100 px-4 pt-3 pb-4">
            <p>
              Everything here is invented: the patients, providers, openings, insurance checks, records, texts, and the visit. None of it
              reaches a real service.
            </p>
            <p>
              Two things can be live: the AI that reads what you type, and the RxNorm drug vocabulary. When the AI is live, what you type
              is sent to it, so please use invented details.
            </p>
            <p>Analytics record that a step happened and how long it took, never your answers.</p>
            <p>
              <strong className="font-medium text-gray-900">Demo controls</strong> (top right) start the journey as a demo patient,
              fill in the current step, switch on the edge cases, and open the journey view for Legion&apos;s team.
            </p>
          </div>
        </details>
      </div>
    </StepLayout>
  );
}
