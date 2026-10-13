"use client";

import { ClipboardList, FlaskConical, ListChecks, MessageCircleWarning, Stethoscope } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { FollowUp } from "@/components/home/FollowUp";
import { PrescriptionCard } from "@/components/home/Prescription";
import { LinkButton } from "@/components/ui/Button";
import { SimulatedTag } from "@/components/ui/Tags";
import { visitFor } from "@/data/personas";
import { formatSlotLong } from "@/rules/time";

export default function AfterPage() {
  return <StageScreen stages={["after"]}>{(state) => <After state={state} />}</StageScreen>;
}

function Section({ id, title, icon, children, tag }: { id: string; title: string; icon: ReactNode; children: ReactNode; tag?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {icon}
        <h2 id={id} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {tag}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const bullets = (items: string[]) => (
  <ul className="list-disc space-y-1 pl-5 text-[15px] text-gray-900">
    {items.map((t) => (
      <li key={t}>{t}</li>
    ))}
  </ul>
);

/**
 * The handoff from the first visit into ongoing care (walkthrough feedback, post-visit items 10 to 12): what
 * happened, the plan, the prescription and where it went, what to do next, the follow-up, and the way home.
 */
function After({ state }: { state: JourneyState }) {
  const { act } = useJourney();
  const j = state.journey;
  const viewed = useRef(false);
  const visit = visitFor(j.personaId);
  const p = state.derived.provider;

  useEffect(() => {
    if (viewed.current || j.after?.summaryViewed) return;
    viewed.current = true;
    void act({ type: "VIEW_SUMMARY" }, { navigate: false });
  }, [act, j.after?.summaryViewed]);

  return (
    <StepLayout
      title="Your first visit is complete"
      subtitle={`Initial evaluation with ${p?.name ?? "your provider"}${j.booking ? `, ${formatSlotLong(j.booking.start, j.booking.timeZone)}` : ""}`}
      aside={
        <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
          <p>The visit summary, the e-prescription, and scheduling. The summary is written ahead of time for each demo patient.</p>
        </AsideSection>
      }
    >
      <div className="space-y-5">
        <Section
          id="talked-title"
          title="What you talked about"
          icon={<Stethoscope aria-hidden className="size-4 text-primary" />}
          tag={<SimulatedTag label="Reviewed by your clinician (simulated)" />}
        >
          {bullets(visit.talkedAbout)}
        </Section>

        <Section id="plan-title" title="Your care plan" icon={<ClipboardList aria-hidden className="size-4 text-primary" />}>
          {bullets(visit.plan)}
          {visit.continuing.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold text-gray-700">Medications you already take</h3>
              <ul className="mt-1 space-y-1 text-[15px] text-gray-900">
                {visit.continuing.map((m) => (
                  <li key={m.name}>
                    <span className="font-medium">{m.name}</span> <span className="text-gray-700">· {m.note}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!visit.prescription && <p className="mt-3 text-sm text-gray-700">No new prescription today.</p>}
        </Section>

        <PrescriptionCard state={state} />

        <Section id="next-title" title="What happens next" icon={<ListChecks aria-hidden className="size-4 text-primary" />}>
          {bullets(visit.nextSteps)}
          <div className="mt-4 rounded-md bg-amber-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-950">
              <MessageCircleWarning aria-hidden className="size-4" />
              When to contact your care team
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-gray-900">
              {visit.watchFor.map((t) => (
                <li key={t}>
                  {t.split(/(988|911)/).map((part, i) =>
                    part === "988" || part === "911" ? (
                      <a key={i} href={`tel:${part}`} className="font-semibold text-primary underline underline-offset-4">
                        {part}
                      </a>
                    ) : (
                      part
                    ),
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <FollowUp state={state} />

        <LinkButton href="/home" full>
          Return to home
        </LinkButton>
      </div>
    </StepLayout>
  );
}
