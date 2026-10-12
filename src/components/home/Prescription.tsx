"use client";

import { CheckCircle2, ChevronDown, Pill, ShieldCheck } from "lucide-react";
import type { JourneyState } from "@/components/journey/JourneyProvider";
import { SimulatedTag } from "@/components/ui/Tags";
import { pharmacyById } from "@/data/pharmacies";
import { visitFor } from "@/data/personas";

const CHANGE_LABEL = { new: "New prescription", renewed: "Renewed prescription", changed: "Changed dose" } as const;

/**
 * The prescription written at the first visit: what it is, where it went, and whether it went through
 * (walkthrough feedback, post-visit item 11). The e-prescription and its status are simulated.
 */
export function PrescriptionCard({ state }: { state: JourneyState }) {
  const j = state.journey;
  const rx = visitFor(j.personaId).prescription;
  if (!rx) return null;
  const pharmacy = pharmacyById(j.after?.prescriptionPharmacyId);
  const p = state.derived.provider;
  return (
    <section aria-labelledby="rx-title" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill aria-hidden className="size-4 text-primary" />
        <h2 id="rx-title" className="text-base font-semibold text-gray-900">
          Your prescription
        </h2>
        <SimulatedTag label="E-prescription (simulated)" />
      </div>
      <p className="mt-3 text-lg font-semibold text-gray-900">
        {rx.name} {rx.strength.replace(/ (tablet|capsule)$/, "")}
      </p>
      <p className="text-sm font-medium text-primary-strong">{CHANGE_LABEL[rx.change]}</p>
      <p className="mt-1 text-[15px] text-gray-800">{rx.directions}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-gray-600">Sent to</dt>
          <dd className="text-[15px] text-gray-900">
            {pharmacy ? (
              <>
                <span className="font-medium">{pharmacy.name}</span>
                <span className="block text-sm text-gray-700">{pharmacy.address}</span>
              </>
            ) : (
              "No pharmacy chosen yet. Your care team will call you to pick one."
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Status</dt>
          <dd className="flex items-center gap-1.5 text-[15px] font-medium text-gray-900">
            {pharmacy ? (
              <>
                <CheckCircle2 aria-hidden className="size-4 text-green-700" />
                Sent to pharmacy
              </>
            ) : (
              "Waiting for a pharmacy"
            )}
          </dd>
        </div>
      </dl>

      {rx.controlled && rx.note && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {rx.note}
        </p>
      )}

      <details className="group mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
          View prescription details
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-1 divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
          {[
            ["Medication", `${rx.name}, ${rx.strength}`],
            ["Directions", rx.directions],
            ["Quantity", rx.quantity],
            ["Refills", rx.refills === 0 ? "None" : String(rx.refills)],
            ["Prescribed by", p ? `${p.name}, ${p.credential}` : "Your provider"],
            ["Sent", "Right after your visit"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:gap-4">
              <dt className="w-28 shrink-0 text-gray-600">{k}</dt>
              <dd className="text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
