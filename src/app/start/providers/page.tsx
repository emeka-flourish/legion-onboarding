"use client";

import { Check, Clock, FlaskConical, ListFilter } from "lucide-react";
import { cx } from "@/lib/cx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { PreferenceNote } from "@/components/providers/PreferenceNote";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ErrorText, LoadingBlock, Notice } from "@/components/ui/Status";
import { PLAN_LABEL } from "@/data/plans";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import type { TimeWindow } from "@/domain/types";
import { api } from "@/lib/api";
import type { MatchResult } from "@/rules/matching";
import { formatTime, WINDOW_LABEL, zoneName } from "@/rules/time";

const WINDOWS: TimeWindow[] = ["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"];
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function ProvidersPage() {
  return <StageScreen stages={["providers"]}>{(state) => <Providers state={state} />}</StageScreen>;
}

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

  // The controls stay where they are; the results below re-rank, and a short status says so (feedback item 4).
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
      // Someone else booked it a moment ago (exception 6): offer the next times instead of an error.
      setSelected(undefined);
      setTaken({ providerId, alternatives: r.alternatives });
      await load();
    }
  };

  const selfPay = j.coverage?.mode === "self_pay";
  const network = selfPay ? "see self-pay patients" : `are in network with ${PLAN_LABEL[j.plan ?? "other"]}`;
  const top = match?.top ?? [];
  const rest = match ? match.all.filter((c) => !top.some((t) => t.id === c.id)) : [];

  const renderCard = (card: MatchResult["top"][number]) => (
    <div key={card.id} className="space-y-3">
      {taken?.providerId === card.id && (
        <Notice tone="warning" title="That time was just booked by someone else" live>
          <p>Here are the next openings with {card.name}:</p>
          <div className="flex flex-wrap gap-2">
            {taken.alternatives.map((s) => (
              <Button key={s} variant="outline" disabled={busy} onClick={() => void hold(card.id, s)}>
                {formatTime(s, j.timeZone)}
              </Button>
            ))}
          </div>
        </Notice>
      )}
      <ProviderCard
        card={card}
        timeZone={j.timeZone}
        selected={selected?.providerId === card.id ? selected.slot : undefined}
        onSelect={(slot) => setSelected({ providerId: card.id, slot })}
        onHold={() => selected && void hold(selected.providerId, selected.slot)}
        busy={busy}
      />
    </div>
  );

  return (
    <StepLayout
      title="Providers who fit what you told us"
      progress={<StepProgress n={4} of={BOOK_FAST_STEP_COUNT} />}
      onBack={() => void act({ type: "GO_BACK" })}
      aside={
        <>
          <AsideSection title="How we chose these" icon={<ListFilter aria-hidden className="size-4 text-primary" />}>
            <p>
              We only show providers who are licensed in Texas, {network}, offer the care you asked for, and are accepting new
              patients.
            </p>
            <p>
              We rank them by openings in your chosen times over the next two weeks, then by focus on what you told us, then by
              anything you add in your own words.
            </p>
          </AsideSection>
          <AsideSection title="Times" icon={<Clock aria-hidden className="size-4 text-primary" />}>
            <p>Every time is shown in your time zone, {zoneName(j.timeZone)}.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>Provider profiles, openings, and network status are invented for this demo.</p>
          </AsideSection>
        </>
      }
    >
      {/* 1 and 2: every matching control, together and above the results it changes. */}
      <section aria-label="Your matching preferences" className="space-y-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <fieldset>
          <legend className="text-[15px] font-semibold text-gray-900">When works for you?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WINDOWS.map((w) => {
              const on = j.preferences.windows.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => void setWindows(on ? j.preferences.windows.filter((x) => x !== w) : [...j.preferences.windows, w])}
                  className={cx(
                    "flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-2 text-center text-sm leading-tight font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    on ? "border-primary bg-primary text-white" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
                  )}
                >
                  {on && <Check aria-hidden className="size-4 shrink-0" />}
                  {capital(WINDOW_LABEL[w])}
                </button>
              );
            })}
          </div>
        </fieldset>
        <PreferenceNote chips={j.preferences.chips} onChange={(message) => void reload(message)} />
      </section>

      {/* 3: how the list is ranked, in one glance. */}
      {match && match.totalEligible > 0 && (
        <div className="mt-4 space-y-2 px-1 text-sm text-gray-700">
          <p className="flex gap-2">
            <ListFilter aria-hidden className="mt-0.5 size-4 shrink-0 text-gray-600" />
            <span>Ranked by openings in your times, then by focus on what you told us, then by your preferences. No one is hidden.</span>
          </p>
          {match.sharedReasons.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6">
              <span className="font-medium text-gray-900">{top.length === 3 ? "All three" : "All of them"}:</span>
              {match.sharedReasons.map((r) => (
                <span key={r.code} className="inline-flex items-center gap-1">
                  <Check aria-hidden className="size-3.5 text-green-700" />
                  {r.label}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/* 4: the results, re-ranked in place when a control changes. */}
      <section aria-labelledby="results-title" className="mt-6 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="results-title" className="text-lg font-semibold text-gray-900">
            {top.length > 1 ? `Your ${top.length === 3 ? "three" : top.length} best fits` : "Your best fit"}
          </h2>
          <p role="status" aria-live="polite" className="text-sm text-green-800">
            {updated}
          </p>
        </div>

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

        {match?.noOpenings && (
          <Notice tone="warning" title="No openings in your chosen times over the next two weeks">
            <p>Here are the nearest times instead. We can also text you if an earlier time opens up.</p>
            <Checkbox checked={alertOn} onChange={(on) => void setEarlierAlert(on)}>
              Text me if an earlier time opens up
            </Checkbox>
          </Notice>
        )}

        {top.map(renderCard)}
        <ErrorText>{error}</ErrorText>

        {rest.length > 0 && (
          <div className="space-y-5">
            {!showAll ? (
              <Button variant="outline" full onClick={() => setShowAll(true)}>
                See all {match!.totalEligible} providers
              </Button>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-900">More providers who fit</h2>
                {rest.map(renderCard)}
              </>
            )}
          </div>
        )}
      </section>
    </StepLayout>
  );
}
