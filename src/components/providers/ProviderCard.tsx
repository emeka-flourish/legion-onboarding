"use client";

import { Check, FlaskConical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ProviderCard as Card } from "@/rules/matching";
import { cx } from "@/lib/cx";
import { formatClock, formatDay, formatSlot, zoneAbbreviation, zoneName } from "@/rules/time";
import { ProviderPortrait } from "./ProviderPortrait";
import { ProviderProfile } from "./ProviderProfile";

/**
 * One provider, reduced to what a patient decides on (Emeka's direction, L20): who they are, why they fit this
 * patient, and when they can be seen. Two or three times show first, with more on request; everything else is
 * behind "View profile." Every reason keeps its source for screen readers, and in the profile for everyone.
 */
export function ProviderCard({
  card,
  timeZone,
  network,
  best = false,
  selected,
  onSelect,
  onHold,
  busy,
}: {
  card: Card;
  timeZone: string;
  network: string;
  best?: boolean;
  selected?: string;
  onSelect: (slot: string) => void;
  onHold: () => void;
  busy?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const firstName = card.name.split(" ")[0];
  const reasons = card.reasons.slice(0, best ? 4 : 3);
  const times = moreOpen ? [...card.slots, ...card.moreSlots].sort() : card.slots;

  return (
    <article
      aria-labelledby={`${card.id}-name`}
      className={cx("rounded-xl border bg-white p-4 shadow-sm sm:p-5", best ? "border-primary/50 ring-1 ring-primary/20" : "border-gray-200")}
    >
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <ProviderPortrait portrait={card.portrait} size={56} />
          <span
            role="img"
            aria-label="Simulated provider"
            title="Simulated provider"
            className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-200"
          >
            <FlaskConical aria-hidden className="size-3" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`${card.id}-name`} className="text-base font-semibold text-gray-900">
            {card.name}
            <span className="font-normal text-gray-600">, {card.credential}</span>
          </h3>
          <p className="text-sm text-gray-600">{card.role}</p>
        </div>
      </div>

      <div className="mt-3">
        <p aria-hidden className="text-sm font-semibold text-gray-900">
          Why {firstName} fits you
        </p>
        <ul className="mt-1 space-y-1" aria-label={`Why ${card.name} fits`}>
          {reasons.map((r) => (
            <li key={r.code} className="flex gap-2 text-[15px] leading-snug text-gray-900">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
              <span>
                {r.label}
                <span className="sr-only">. Source: {r.source}</span>
              </span>
            </li>
          ))}
          {reasons.length === 0 && <li className="text-[15px] text-gray-900">Fits your care needs and insurance</li>}
        </ul>
      </div>

      <div className="mt-4">
        {/* The zone sits once beside the label, so three times fit across a phone; each button's name still carries it. */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">Next available</p>
          <span className="text-xs text-gray-600">{zoneName(timeZone)}</span>
        </div>
        {times.length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">No openings in the next two weeks.</p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {times.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selected === s}
                onClick={() => onSelect(s)}
                className={cx(
                  "min-h-14 rounded-md border px-2 py-1.5 text-left transition-colors",
                  selected === s ? "border-green-600 bg-green-50" : "border-gray-300 bg-white hover:bg-gray-50",
                )}
              >
                {s === card.soonest && <span className="block text-[11px] font-semibold tracking-wide text-primary-strong uppercase">Soonest</span>}
                <span className="block text-xs text-gray-700">{formatDay(s, timeZone)}</span>
                <span className="block text-sm font-semibold whitespace-nowrap text-gray-900 tabular-nums">
                  {formatClock(s, timeZone)}
                  <span className="sr-only"> {zoneAbbreviation(s, timeZone)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
          {card.moreSlots.length > 0 ? (
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {moreOpen ? "Fewer times" : "See more times"}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={`View profile, ${card.name}`}
            className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View profile
          </button>
        </div>
        {selected && (
          <Button full className="mt-2" loading={busy} onClick={onHold}>
            Hold {formatSlot(selected, timeZone)}
          </Button>
        )}
      </div>

      <ProviderProfile card={card} network={network} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </article>
  );
}
