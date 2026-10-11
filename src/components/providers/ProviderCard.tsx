"use client";

import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SimulatedTag } from "@/components/ui/Tags";
import type { ProviderCard as Card } from "@/rules/matching";
import { cx } from "@/lib/cx";
import { formatDay, formatSlot, formatTime } from "@/rules/time";

/** One provider: who they are, why they fit (each reason with its source), and their next openings. */
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
  const otherLanguages = card.languages.filter((l) => l !== "English");
  return (
    <article aria-labelledby={`${card.id}-name`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-semibold text-primary-strong">
          {card.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={`${card.id}-name`} className="text-base font-semibold text-gray-900">
              {card.name}
            </h3>
            <SimulatedTag label="Simulated provider" />
          </div>
          <p className="text-sm text-gray-600">{card.credential}</p>
          <p className="mt-1 text-sm text-gray-700">{card.focusNote}</p>
          {otherLanguages.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
              <Languages aria-hidden className="size-4" />
              Speaks English and {otherLanguages.join(" and ")}
            </p>
          )}
        </div>
      </div>

      {card.reasons.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label={`Why ${card.name} fits`}>
          {card.reasons.map((r) => (
            <li key={r.code} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
              <span className="text-[15px] text-gray-900">
                {r.label}
                <span className="block text-xs text-gray-600">{r.source}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-900">Next openings</p>
        {card.slots.length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">No openings in the next two weeks.</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {card.slots.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selected === s}
                onClick={() => onSelect(s)}
                className={cx(
                  "min-h-14 rounded-md border px-3 py-2 text-left transition-colors",
                  selected === s ? "border-green-600 bg-green-50" : "border-gray-300 bg-white hover:bg-gray-50",
                )}
              >
                <span className="block text-xs text-gray-700">{formatDay(s, timeZone)}</span>
                <span className="block text-sm font-semibold text-gray-900 tabular-nums">{formatTime(s, timeZone)}</span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <Button full className="mt-4" loading={busy} onClick={onHold}>
            Hold {formatSlot(selected, timeZone)}
          </Button>
        )}
      </div>
    </article>
  );
}
