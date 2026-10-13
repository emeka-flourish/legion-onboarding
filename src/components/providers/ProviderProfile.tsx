"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { SimulatedTag } from "@/components/ui/Tags";
import type { ProviderCard } from "@/rules/matching";
import { ProviderPortrait } from "./ProviderPortrait";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-gray-900">{children}</dd>
    </div>
  );
}

const capitalFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const andList = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/**
 * "View profile": the details behind a card, in a temporary card over the page (Emeka's direction, L20), so the
 * list itself stays about who, why, and when. Closes with the button, Escape, or a tap outside.
 */
export function ProviderProfile({ card, network, open, onClose }: { card: ProviderCard; network: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${card.id}-profile`}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-0 text-left shadow-xl backdrop:bg-gray-900/50"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <ProviderPortrait portrait={card.portrait} size={72} />
          <div className="min-w-0 flex-1 pt-1">
            <h2 id={`${card.id}-profile`} className="text-lg font-semibold text-gray-900">
              {card.name}, <span className="font-normal text-gray-600">{card.credential}</span>
            </h2>
            <p className="text-sm text-gray-600">{card.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <dl className="mt-3 divide-y divide-gray-100">
          <Row label="Focus">{card.focusNote}</Row>
          {card.careFor.length > 0 && <Row label="Experience with">{capitalFirst(andList(card.careFor))}</Row>}
          <Row label="Languages">{andList(card.languages)}</Row>
          <Row label="Credentials">
            {card.yearsInPractice} years in practice. Licensed by the {card.licenseSource}. {network}.
          </Row>
          {card.reasons.length > 0 && (
            <Row label="Why we matched you">
              <ul className="mt-1 space-y-1.5">
                {card.reasons.map((r) => (
                  <li key={r.code} className="flex gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
                    <span>
                      {r.label}
                      <span className="block text-xs text-gray-600">{r.source}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </dl>

        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <SimulatedTag label="Simulated provider" />
          The profile, portrait, openings, and network status are invented for this demo.
        </p>
      </div>
    </dialog>
  );
}
