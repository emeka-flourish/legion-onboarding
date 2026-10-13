"use client";

import { Check, CheckCircle2, ChevronDown, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { PreferenceNote } from "@/components/providers/PreferenceNote";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ErrorText, LoadingBlock, Notice } from "@/components/ui/Status";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import type { TimeWindow } from "@/domain/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { MatchResult } from "@/rules/matching";
import { formatSlot, WINDOW_LABEL, zoneName } from "@/rules/time";

const WINDOWS: TimeWindow[] = ["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"];
// Short labels for the compact time bar; each button's accessible name stays the full label.
const SHORT: Record<TimeWindow, string> = {
  weekday_morning: "Mornings",
  weekday_afternoon: "Afternoons",
  weekday_evening: "Evenings",
  weekend: "Weekends",
};
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function ProvidersPage() {
  return <StageScreen stages={["providers"]}>{(state) => <Providers state={state} />}</StageScreen>;
}

/**
 * Choosing a provider, cut to what a patient decides on (Emeka's direction, L20): who, why they fit, and when.
 * Compact controls on top, one line of reassurance with "How matching works" behind it, a recommended best match,
 * then the other strong matches. Details live behind each card's "View profile."
 */
function Providers({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const j = state.journey;
  const [match, setMatch] = useState<MatchResult>();
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<{ providerId: string; slot: string }>();
  const [taken, setTaken] = useState<{ providerId: string; alternatives: string[] }>();
  const [showAll, setShowAll] = useState(false);
  const [alertOn, setAlertOn] = useState(j.preferences.earlierOpeningAlert);
  const [error, setError] = useState<string>();
  const [updated, setUpdated] = useState<string>();
  const loaded = useRef(false);

  const load = useCallback(async () => {
    setLoadError(undefined);
    const r = await api<MatchResult>("/api/providers", { body: {} });
    if (r.ok) setMatch(r.data);
    else setLoadError(r.message);
  }, []);

  useEffect(() => {
    if (loaded.current) return; // once per visit, so the presentation is recorded once
    loaded.current = true;
    void load();
  }, [load]);

  // The controls stay where they are; the results below re-rank, and a short status says so.
  const reload = async (message: string) => {
    setSelected(undefined);
    await load();
    setUpdated(message);
  };

  const setWindows = async (windows: TimeWindow[]) => {
    const r = await act({ type: "SET_TIME_WINDOWS", windows }, { navigate: false });
    if (r.ok) await reload("Updated for the times you chose");
  };

  // Ticks at once, and rolls back only if saving fails.
  const setEarlierAlert = async (on: boolean) => {
    setAlertOn(on);
    const r = await act({ type: "SET_EARLIER_ALERT", on }, { navigate: false });
    if (!r.ok) {
      setAlertOn(!on);
      setError(r.message);
    }
  };

  const hold = async (providerId: string, slot: string) => {
    setError(undefined);
    setTaken(undefined);
    const r = await act({ type: "SELECT_SLOT", providerId, slotStart: slot });
    if (!r.ok) return setError(r.message);
    if (r.alternatives) {
      // Someone else booked it a moment ago (exception 6): offer the next times instead of an error. The list keeps
      // its order, so the provider the patient chose doesn't move away; only the taken time disappears.
      setSelected(undefined);
      setTaken({ providerId, alternatives: r.alternatives });
      const drop = (c: MatchResult["all"][number]) =>
        c.id === providerId ? { ...c, slots: c.slots.filter((x) => x !== slot), moreSlots: c.moreSlots.filter((x) => x !== slot) } : c;
      setMatch((m) => m && { ...m, top: m.top.map(drop), all: m.all.map(drop) });
    }
  };

  const top = match?.top ?? [];
  const rest = match ? match.all.filter((c) => !top.some((t) => t.id === c.id)) : [];
  const network = match?.criteria.find((c) => c.code === "network")?.label ?? "";

  const renderCard = (card: MatchResult["top"][number], best = false) => (
    <div key={card.id} className="space-y-3">
      {taken?.providerId === card.id && (
        <Notice tone="warning" title="That time was just booked by someone else" live>
          <p>Here are the next openings with {card.name}:</p>
          <div className="flex flex-wrap gap-2">
            {taken.alternatives.map((s) => (
              <Button key={s} variant="outline" disabled={busy} onClick={() => void hold(card.id, s)}>
                {formatSlot(s, j.timeZone)}
              </Button>
            ))}
          </div>
        </Notice>
      )}
      <ProviderCard
        card={card}
        timeZone={j.timeZone}
        network={network}
        best={best}
        selected={selected?.providerId === card.id ? selected.slot : undefined}
        onSelect={(slot) => setSelected({ providerId: card.id, slot })}
        onHold={() => selected && void hold(selected.providerId, selected.slot)}
        busy={busy}
      />
    </div>
  );

  // Self-pay patients never see insurance wording (TAC-06).
  const payment = network === "Sees self-pay patients" ? "self-pay" : "insurance";
  const plural = (n: number) => `${n} provider${n === 1 ? "" : "s"}`;
  const reassurance = !match
    ? ""
    : match.noOpenings
      ? `${plural(match.totalEligible)} matched your care needs and ${payment}`
      : `${plural(match.matched)} matched your care needs, ${payment}, and availability`;

  return (
    <StepLayout
      title="Providers who fit what you told us"
      progress={<StepProgress n={4} of={BOOK_FAST_STEP_COUNT} />}
      onBack={() => void act({ type: "GO_BACK" })}
    >
      {/* Compact matching controls, above the results they change. */}
      <section aria-label="Your matching preferences" className="space-y-3 rounded-xl bg-white/80 p-3 ring-1 ring-gray-200 sm:p-4">
        <fieldset>
          <div className="flex items-baseline justify-between gap-2">
            <legend className="text-sm font-medium text-gray-900">When works for you?</legend>
            <span className="text-xs text-gray-600">{zoneName(j.timeZone)}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-lg bg-gray-100 p-1">
            {WINDOWS.map((w) => {
              const on = j.preferences.windows.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  aria-label={capital(WINDOW_LABEL[w])}
                  disabled={busy}
                  onClick={() => void setWindows(on ? j.preferences.windows.filter((x) => x !== w) : [...j.preferences.windows, w])}
                  className={cx(
                    "min-h-10 rounded-md px-1 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    on ? "bg-white text-primary-strong shadow-sm ring-1 ring-primary/40" : "text-gray-700 hover:bg-white/60",
                  )}
                >
                  {SHORT[w]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <PreferenceNote chips={j.preferences.chips} onChange={(message) => void reload(message)} />
      </section>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-green-800">
        {updated}
      </p>

      {loadError && (
        <Notice tone="error" title="We couldn't load providers">
          <p>{loadError}</p>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </Notice>
      )}
      {!match && !loadError && <LoadingBlock label="Finding providers" />}

      {match && match.totalEligible === 0 && (
        <Notice tone="warning" title="No providers fit every need right now">
          <p>Try changing the kind of help or how you&apos;ll pay. Our team can also help you find care elsewhere.</p>
        </Notice>
      )}

      {match && match.totalEligible > 0 && (
        <>
          {/* One line of reassurance; the method waits behind "How matching works." */}
          <details className="group mt-1">
            <summary className="flex cursor-pointer list-none gap-2 py-1 text-[15px] text-gray-800 [&::-webkit-details-marker]:hidden">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
              <span>
                <span>{reassurance}.</span>{" "}
                <span className="inline-flex items-center gap-0.5 text-sm font-medium whitespace-nowrap text-primary">
                  How matching works
                  <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                </span>
              </span>
            </summary>
            <div className="mt-2 space-y-2 rounded-lg bg-white p-4 text-sm text-gray-700 ring-1 ring-gray-200">
              <p className="font-medium text-gray-900">Every provider here is:</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {match.criteria.map((c) => (
                  <li key={c.code} className="flex items-start gap-1.5">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
                    <span>
                      {c.label}
                      <span className="block text-xs text-gray-600">{c.source}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                We recommend the provider who best fits the conditions you chose and anything you asked for in your own words, among
                those with openings in the times you picked. No one is hidden: &ldquo;See all&rdquo; lists every provider who fits.
              </p>
              <p>Times are in {zoneName(j.timeZone)}. Providers, openings, and network status are invented for this demo.</p>
            </div>
          </details>

          {match.noOpenings && (
            <Notice tone="warning" title="No openings in your chosen times over the next two weeks" className="mt-4">
              <p>Here are the nearest times instead. We can also text you if an earlier time opens up.</p>
              <Checkbox checked={alertOn} onChange={(on) => void setEarlierAlert(on)}>
                Text me if an earlier time opens up
              </Checkbox>
            </Notice>
          )}

          {top[0] && (
            <section aria-labelledby="best-title" className="mt-5">
              <h2
                id="best-title"
                className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
              >
                <Star aria-hidden className="size-3.5 fill-current" />
                Best match
              </h2>
              {renderCard(top[0], true)}
            </section>
          )}

          {top.length > 1 && (
            <section aria-labelledby="others-title" className="mt-7 space-y-4">
              <h2 id="others-title" className="text-base font-semibold text-gray-900">
                Other strong matches
              </h2>
              {top.slice(1).map((c) => renderCard(c))}
            </section>
          )}
          <div className="mt-2">
            <ErrorText>{error}</ErrorText>
          </div>

          {rest.length > 0 && (
            <div className="mt-5 space-y-4">
              {!showAll ? (
                <Button variant="outline" full onClick={() => setShowAll(true)}>
                  See all {match.totalEligible} providers
                </Button>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-gray-900">More providers who fit</h2>
                  {rest.map((c) => renderCard(c))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </StepLayout>
  );
}
