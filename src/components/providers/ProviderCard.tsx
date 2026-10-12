"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProviderCard as Card } from "@/rules/matching";
import { cx } from "@/lib/cx";
import { formatDay, formatSlot, formatTime } from "@/rules/time";

/**
 * One provider, answering "why should I choose this provider?" before "what do we know about them?"
 * (walkthrough feedback, items 5 and 6): name and credential, the personal reasons, their focus, the next
 * times, then trust details. Every reason keeps its source, shown once at the foot of the card.
 */
export function ProviderCard({
  card,
  timeZone,
  selected,
  onSelect,
  onHold,
  busy,
}: {
  card: Card;
  timeZone: string;
  selected?: string;
  onSelect: (slot: string) => void;
  onHold: () => void;
  busy?: boolean;
}) {
  const firstName = card.name.split(" ")[0];
  const otherLanguages = card.languages.filter((l) => l !== "English");
  const sources = [...new Set(card.reasons.map((r) => r.source.replace(/ \(simulated\)$/, "")))];
  return (
    <article aria-labelledby={`${card.id}-name`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[15px] font-semibold text-primary-strong">
          {card.initials}
        </span>
        <h3 id={`${card.id}-name`} className="min-w-0 text-base font-semibold text-gray-900">
          {card.name}, <span className="font-normal text-gray-700">{card.credential}</span>
        </h3>
      </div>

      {card.reasons.length > 0 && (
        <div className="mt-3 rounded-md bg-green-50 px-3 py-2.5 ring-1 ring-green-100">
          <p aria-hidden className="text-sm font-semibold text-gray-900">
            Why {firstName} fits you
          </p>
          <ul className="mt-1 space-y-1" aria-label={`Why ${card.name} fits`}>
            {card.reasons.map((r) => (
              <li key={r.code} className="flex gap-2 text-[15px] leading-snug text-gray-900">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
                <span>
                  {r.label}
                  <span className="sr-only">. Source: {r.source}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-sm text-gray-800">
        <span className="font-medium text-gray-900">Focus:</span> {card.focusNote}
      </p>

      <div className="mt-3">
        <p className="text-sm font-medium text-gray-900">Next openings</p>
        {card.slots.length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">No openings in the next two weeks.</p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {card.slots.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selected === s}
                onClick={() => onSelect(s)}
                className={cx(
                  "min-h-14 rounded-md border px-2 py-2 text-left transition-colors",
                  selected === s ? "border-green-600 bg-green-50" : "border-gray-300 bg-white hover:bg-gray-50",
                )}
              >
                <span className="block text-xs text-gray-700">{formatDay(s, timeZone)}</span>
                <span className="block text-sm font-semibold whitespace-nowrap text-gray-900 tabular-nums">{formatTime(s, timeZone)}</span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <Button full className="mt-3" loading={busy} onClick={onHold}>
            Hold {formatSlot(selected, timeZone)}
          </Button>
        )}
      </div>

      <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-700">
        {card.yearsInPractice} years in practice · Licensed by the {card.licenseSource}
        {otherLanguages.length > 0 && ` · Speaks English and ${otherLanguages.join(" and ")}`}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Simulated provider{sources.length > 0 && `. Reasons from ${sources.join(", ")}, all simulated`}
      </p>
    </article>
  );
}
