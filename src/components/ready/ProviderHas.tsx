"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { AiMeta } from "@/ai/types";
import type { JourneyState } from "@/components/journey/JourneyProvider";
import { AiTag, LiveTag, SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { mentionsControlled } from "@/rules/controlled";
import { scoreGad7, scorePhq9, type Band } from "@/rules/questionnaires";
import { rxName } from "./RxMatch";

const BAND: Record<Band, string> = {
  minimal: "minimal",
  mild: "mild",
  moderate: "moderate",
  moderately_severe: "moderately severe",
  severe: "severe",
};
const FLAG: Record<string, string> = {
  phq9_item9: "PHQ-9 question 9 answered above “Not at all”",
  crisis_language: "Crisis language in a typed answer",
};
const TASK: Record<string, string> = {
  identity: "ID check",
  story: "the guided conversation",
  check_in: "the check-in questions",
  confirm_found: "confirming medications",
  pharmacy: "choosing a pharmacy",
  essentials: "health basics",
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5 border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <div className="space-y-1.5 text-[15px] text-gray-900">{children}</div>
    </section>
  );
}

/** What readiness produced, as the provider sees it before the visit (TRD 8.1, TAC-51). */
export function ProviderHas({ state }: { state: JourneyState }) {
  const j = state.journey;
  const r = j.readiness;
  const records = (r.foundRecords ?? []).filter((x) => r.confirmedRecordIds?.includes(x.id));
  const meds = (r.foundMedications ?? []).filter((m) => r.confirmedMedicationIds?.includes(m.id));
  const checkInDone = r.tasks.check_in === "done";
  const gad = scoreGad7(r.gad7);
  const phq = scorePhq9(r.phq9);
  const controlled =
    r.essentials?.controlledNow === "yes" ||
    meds.some((m) => m.controlled) ||
    (r.otherMedications ?? []).some(mentionsControlled) ||
    (j.conditions.includes("adhd") && j.careType === "existing_dx_medication");
  const remaining = state.derived.readiness.remaining;
  const mentioned = (r.story ?? []).filter((i) => i.kind === "medication_mentioned");

  return (
    <section aria-labelledby="provider-has" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <h2 id="provider-has" className="text-lg font-semibold text-gray-900">
        What your provider has
      </h2>
      <p className="mt-1 text-sm text-gray-700">Everything you confirmed, ready before you meet.</p>
      <div className="mt-4 space-y-4">
        <Block title="Summary in your words">
          {r.clinicianSummary ? (
            <>
              <p className="leading-relaxed">{r.clinicianSummary.text}</p>
              <AiTag meta={{ mode: r.clinicianSummary.mode, provider: r.clinicianSummary.provider as AiMeta["provider"] }} />
            </>
          ) : (
            <p className="text-gray-700">Not done yet. Your provider will ask about it.</p>
          )}
        </Block>

        <Block title="Check-in scores">
          {checkInDone ? (
            <ul className="space-y-1">
              <li>
                GAD-7 (anxiety): {gad.total}, {BAND[gad.band]}
              </li>
              <li>
                PHQ-9 (depression): {phq.total}, {BAND[phq.band]}
              </li>
            </ul>
          ) : (
            <p className="text-gray-700">Not done yet.</p>
          )}
        </Block>

        <Block title="Safety">
          {r.safetyFlags.length === 0 ? (
            <p className="flex items-center gap-1.5">
              <CheckCircle2 aria-hidden className="size-4 text-green-700" />
              No safety flags
            </p>
          ) : (
            r.safetyFlags.map((f) => (
              <p key={f.id} className="flex items-start gap-1.5">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <span>
                  {FLAG[f.type] ?? f.type}
                  <span className="block text-sm text-gray-700">
                    {f.reviewedAt ? "Reviewed by the care team" : "Waiting for same-day review by the care team"}
                  </span>
                </span>
              </p>
            ))
          )}
        </Block>

        <Block title="Medications">
          {meds.length === 0 && !(r.otherMedications ?? []).length && !mentioned.length ? (
            <p className="text-gray-700">None reported.</p>
          ) : (
            <ul className="space-y-1.5">
              {meds.map((m) => (
                <li key={m.id}>
                  {m.name}
                  {m.dose ? `, ${m.dose}` : ""}
                  <SourceTag source={m.source} className="w-full" />
                </li>
              ))}
              {(r.otherMedications ?? []).map((o) => (
                <li key={o}>
                  {o}
                  <SourceTag source="Reported by the patient" className="w-full" />
                </li>
              ))}
              {mentioned.map((i) => (
                <li key={`said:${i.text}`}>
                  {i.text}
                  <SourceTag source="Mentioned in the conversation" className="w-full" />
                  {i.rx && (
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
                      RxNorm: {rxName(i.rx)} · RxCUI {i.rx.rxcui}
                      <LiveTag label="Live · RxNorm" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {controlled && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                Prescription monitoring check: pending, done by your provider <SimulatedTag className="ml-1" />
              </span>
            </p>
          )}
        </Block>

        <Block title="Records">
          {records.length === 0 ? (
            <p className="text-gray-700">None confirmed.</p>
          ) : (
            <ul className="space-y-1.5">
              {records.map((x) => (
                <li key={x.id}>
                  {x.label}
                  {x.detail ? `: ${x.detail}` : ""}
                  <SourceTag source={x.source} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </Block>

        {remaining.length > 0 && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Not done yet: {remaining.map((t) => TASK[t] ?? t).join(", ")}. Your provider will cover these with you.
          </p>
        )}
      </div>
    </section>
  );
}
