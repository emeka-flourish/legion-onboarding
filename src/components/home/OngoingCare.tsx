"use client";

import { CheckCircle2, ClipboardList, FlaskConical, Inbox, Pill, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import type { JourneyState } from "@/components/journey/JourneyProvider";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { LinkButton } from "@/components/ui/Button";
import { pharmacyById } from "@/data/pharmacies";
import { visitFor } from "@/data/personas";
import { formatSlotLong } from "@/rules/time";
import { FollowUp } from "./FollowUp";

function Card({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 id={id} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * Home after the first visit (walkthrough feedback, post-visit item 13): no more prep. It leads with the next
 * appointment, then the care plan, the recent visit, and anything that needs the patient. Simulated content.
 */
export function OngoingCare({ state }: { state: JourneyState }) {
  const j = state.journey;
  const visit = visitFor(j.personaId);
  const p = state.derived.provider;
  const pharmacy = pharmacyById(j.after?.prescriptionPharmacyId);
  const rx = visit.prescription;
  const openFlag = j.readiness.safetyFlags.some((f) => !f.reviewedAt);

  const tasks: { text: string; href?: string }[] = [];
  if (!j.after?.followUpStart) tasks.push({ text: "Book your follow-up visit", href: "#follow-title" });
  if (rx && pharmacy) tasks.push({ text: `Pick up your prescription at ${pharmacy.name} when they text you` });
  if (openFlag) tasks.push({ text: "Someone from our care team will call you today to check in" });

  return (
    <StepLayout
      title={`Your care with ${p?.name ?? "your provider"}`}
      subtitle="Your first visit is done. Here's what's next."
      aside={
        <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
          <p>The care plan, prescription, messages, and scheduling are written ahead of time for each demo patient.</p>
        </AsideSection>
      }
    >
      <div className="space-y-5">
        <FollowUp state={state} bookedTitle="Next appointment" />

        <Card id="plan-title" title="Your care plan" icon={<ClipboardList aria-hidden className="size-4 text-primary" />}>
          <h3 className="text-sm font-semibold text-gray-700">Medications</h3>
          {!rx && visit.continuing.length === 0 ? (
            <p className="mt-1 text-[15px] text-gray-800">No medications for now.</p>
          ) : (
            <ul className="mt-1 space-y-1.5 text-[15px] text-gray-900">
              {rx && (
                <li className="flex gap-2">
                  <Pill aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">
                      {rx.name} {rx.strength}
                    </span>{" "}
                    <span className="text-gray-700">
                      · {rx.change === "new" ? "New" : rx.change === "renewed" ? "Renewed" : "Changed"}. {rx.directions}.
                    </span>
                  </span>
                </li>
              )}
              {visit.continuing.map((m) => (
                <li key={m.name} className="flex gap-2">
                  <Pill aria-hidden className="mt-0.5 size-4 shrink-0 text-gray-500" />
                  <span>
                    <span className="font-medium">{m.name}</span> <span className="text-gray-700">· {m.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 text-sm font-semibold text-gray-700">Next steps</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-gray-900">
            {visit.plan.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>

        <Card id="recent-title" title="Recent visit" icon={<Stethoscope aria-hidden className="size-4 text-primary" />}>
          <p className="text-[15px] text-gray-900">
            Initial evaluation with {p?.name}
            {j.booking && <span className="block text-sm text-gray-700">{formatSlotLong(j.booking.start, j.booking.timeZone)}</span>}
          </p>
          <LinkButton href="/after" variant="outline" className="mt-3">
            View visit summary
          </LinkButton>
        </Card>

        <Card id="tasks-title" title="Messages and tasks" icon={<Inbox aria-hidden className="size-4 text-primary" />}>
          {tasks.length === 0 ? (
            <p className="flex items-center gap-2 text-[15px] text-gray-800">
              <CheckCircle2 aria-hidden className="size-4 text-green-700" />
              Nothing needs your attention right now.
            </p>
          ) : (
            <ul className="space-y-2 text-[15px] text-gray-900">
              {tasks.map((t) => (
                <li key={t.text} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {t.href ? (
                    <a href={t.href} className="font-medium text-primary underline underline-offset-4">
                      {t.text}
                    </a>
                  ) : (
                    <span>{t.text}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </StepLayout>
  );
}
