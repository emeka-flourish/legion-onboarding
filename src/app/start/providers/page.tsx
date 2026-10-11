"use client";

import { Check, Clock, FlaskConical, ListFilter } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { PreferenceNote } from "@/components/providers/PreferenceNote";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Button } from "@/components/ui/Button";
import { Checkbox, Chip } from "@/components/ui/Choice";
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

  const setWindows = async (windows: TimeWindow[]) => {
    setSelected(undefined);
    const r = await act({ type: "SET_TIME_WINDOWS", windows }, { navigate: false });
    if (r.ok) await load();
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
      subtitle="Ranked by openings in the times that work for you."
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
              anything you add in the note.
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
      <section aria-labelledby="when-title">
        <h2 id="when-title" className="text-base font-semibold text-gray-900">
          When works for you?
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {WINDOWS.map((w) => {
            const on = j.preferences.windows.includes(w);
            return (
              <Chip
                key={w}
                selected={on}
                disabled={busy}
                onClick={() => void setWindows(on ? j.preferences.windows.filter((x) => x !== w) : [...j.preferences.windows, w])}
              >
                {capital(WINDOW_LABEL[w])}
              </Chip>
            );
          })}
        </div>
      </section>

      <div className="mt-6 space-y-5">
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

        {match && match.sharedReasons.length > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-[15px] font-semibold text-gray-900">Why these {top.length === 3 ? "three" : top.length}</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {match.sharedReasons.map((r) => (
                <li key={r.code} className="flex items-start gap-1.5 text-sm text-gray-800">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {top.map(renderCard)}
        <ErrorText>{error}</ErrorText>

        {match && <PreferenceNote chips={j.preferences.chips} onChange={() => void load()} />}

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
      </div>
    </StepLayout>
  );
}
