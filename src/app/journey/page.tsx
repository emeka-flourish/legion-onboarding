"use client";

import { AlertTriangle, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorText, LoadingBlock } from "@/components/ui/Status";
import type { Stage } from "@/domain/types";
import { eventLabel } from "@/events/labels";
import type { Funnel, Rate, Value } from "@/events/metrics";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { Cohort, JourneyView } from "@/server/viewService";

const STAGE: Record<Stage, string> = {
  fit: "Fit check",
  needs: "Needs",
  help: "Kind of help",
  pay: "Payment",
  providers: "Choosing a provider",
  hold: "Holding a time",
  coverage: "Coverage",
  book: "Booking",
  home: "Getting ready",
  visit: "In the visit",
  after: "After the visit",
  crisis: "Crisis resources",
  not_a_fit: "Not a fit",
};
const FLAG: Record<string, string> = { phq9_item9: "PHQ-9 item 9", crisis_language: "Crisis language" };

const pct = (r: number | null) => (r === null ? "No one yet" : `${Math.round(r * 100)}%`);
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

export default function JourneyViewPage() {
  const [view, setView] = useState<JourneyView>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    const r = await api<JourneyView>("/api/journey-view");
    if (r.ok) {
      setView(r.data);
      setError(undefined);
    } else setError(r.message);
  }, []);
  useEffect(() => {
    // Loading the view when the page opens is this effect's job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <main id="main" className="flex-1 bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Journey view</h1>
            <p className="mt-1 max-w-3xl text-[15px] text-gray-700">
              For Legion&apos;s team: every patient followed as one person, from the first page through the first visit and the step
              after it. Events carry codes and timings only, never answers. Demo data only.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw aria-hidden className="size-4" />
            Refresh
          </Button>
        </header>
        <ErrorText>{error}</ErrorText>
        {!view && !error && <LoadingBlock label="Loading the journey view" />}
        {view && (
          <>
            <ThisJourney view={view} />
            <FunnelPanel view={view} />
            <TodayPanel view={view} />
            <QualityPanel view={view} />
            <InProgress view={view} onChange={load} />
          </>
        )}
      </div>
    </main>
  );
}

function Panel({ n, title, subtitle, children }: { n: number; title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`panel-${n}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 id={`panel-${n}`} className="text-lg font-semibold text-gray-900">
        <span className="text-gray-600">{n}.</span> {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-gray-700">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SourceBadge({ source }: { source: string }) {
  const record = source === "system_of_record";
  return (
    <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", record ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700")}>
      {record ? "System of record" : "Patient action"}
    </span>
  );
}

function ThisJourney({ view }: { view: JourneyView }) {
  const t = view.thisJourney;
  return (
    <Panel n={1} title="This journey" subtitle="This device's journey, event by event, as Legion's analytics would receive it.">
      {!t ? (
        <p className="text-[15px] text-gray-700">No journey on this device yet. Start one, then come back.</p>
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            {[
              ["Journey ID", t.journeyId],
              ["Person ID", t.personId ?? "Not linked yet"],
              ["Stage", STAGE[t.stage]],
              ["Sessions", String(t.sessions)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md bg-gray-50 px-3 py-2">
                <dt className="text-gray-600">{k}</dt>
                <dd className="font-mono text-[13px] break-all text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
          <ol className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200" aria-label="Events in order">
            {t.events.map((e) => (
              <li key={e.id}>
                {e.id === t.linkedAt && (
                  <p className="flex items-center gap-2 bg-blue-50 px-3 py-2 text-sm font-medium text-primary-strong">
                    <Link2 aria-hidden className="size-4" />
                    Linked to person {e.personId} here. Earlier events stay on the journey ID; later ones carry both.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="w-24 shrink-0 font-mono text-[13px] text-gray-600 tabular-nums">{time(e.ts)}</span>
                  <span className="font-medium text-gray-900">{eventLabel(e.name)}</span>
                  <code className="text-[12px] text-gray-600">{e.name}</code>
                  <SourceBadge source={e.source} />
                  {e.session > 1 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Session {e.session}</span>}
                  {Object.keys(e.props).length > 0 && (
                    <span className="font-mono text-[12px] text-gray-700">
                      {Object.entries(e.props)
                        .map(([k, v]) => `${k}=${String(v)}`)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-800">
            <span className="font-medium">Next expected:</span>
            {t.nextExpected.length ? (
              t.nextExpected.map((n) => (
                <code key={n} className="rounded bg-gray-100 px-1.5 py-0.5 text-[12px]">
                  {n}
                </code>
              ))
            ) : (
              <span>nothing; this journey is complete</span>
            )}
          </div>
          {t.missing.length > 0 && <p className="mt-2 text-sm text-amber-900">Missing from this stage&apos;s chain: {t.missing.join(", ")}</p>}
        </>
      )}
    </Panel>
  );
}

function RateRow({ r, big }: { r: Rate; big?: boolean }) {
  return (
    <div className={cx("space-y-1", big && "rounded-md bg-blue-50 p-3")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cx("text-gray-900", big ? "text-[15px] font-semibold" : "text-sm")}>{r.label}</span>
        <span className={cx("shrink-0 tabular-nums text-gray-900", big ? "text-2xl font-semibold" : "text-sm font-medium")}>{pct(r.rate)}</span>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.rate ?? 0) * 100}%` }} />
      </div>
      <p className="text-xs text-gray-600">
        {r.numerator} of {r.denominator} {r.unit ?? "people"}
      </p>
    </div>
  );
}

function FunnelColumn({ title, note, cohort }: { title: string; note: ReactNode; cohort: Cohort }) {
  const f: Funnel = cohort.funnel;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-700">{note}</p>
      </div>
      <RateRow r={f.headline} big />
      <div className="space-y-3">
        {f.stages.map((s) => (
          <RateRow key={s.id} r={s} />
        ))}
      </div>
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <p className="text-sm font-semibold text-gray-900">Guardrails</p>
        {f.guardrails.map((g) =>
          "rate" in g ? (
            <RateRow key={g.id} r={g} />
          ) : (
            <div key={g.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-gray-900">
                {g.label}
                {(g as Value).note && <span className="block text-xs text-gray-600">{(g as Value).note}</span>}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-gray-900">
                {(g as Value).value === null ? "No one yet" : `${(g as Value).value} ${(g as Value).unit}`}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 border-t border-gray-100 pt-3 text-sm">
        <span className="text-gray-900">
          Trust in the provider choice (median, 1 to 5)
          <span className="block text-xs text-gray-600">
            {f.trust.answered} answered · {f.trust.shareHigh === null ? "no answers yet" : `${Math.round(f.trust.shareHigh * 100)}% chose 4 or 5`}
          </span>
        </span>
        <span className="shrink-0 font-medium tabular-nums text-gray-900">{f.trust.median ?? "No one yet"}</span>
      </div>
    </div>
  );
}

function FunnelPanel({ view }: { view: JourneyView }) {
  return (
    <Panel n={2} title="Funnel, counted per person" subtitle="The headline metric first, then the six stage metrics, the four guardrails, and trust.">
      <div className="grid gap-8 lg:grid-cols-2">
        <FunnelColumn title="Live demo journeys" note={`${view.live.people} people in the last seven days`} cohort={view.live} />
        <FunnelColumn title="Invented cohort" note={view.synthetic.note} cohort={view.synthetic} />
      </div>
    </Panel>
  );
}

function Bars({ rows, unit }: { rows: { label: string; count: number; note?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-gray-900">
              {r.label}
              {r.note && <span className="text-xs text-gray-600"> ({r.note})</span>}
            </span>
            <span className="shrink-0 tabular-nums text-gray-900">
              {r.count.toLocaleString("en-US")} {unit}
            </span>
          </div>
          <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-gray-500" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function TodayPanel({ view }: { view: JourneyView }) {
  return (
    <Panel n={3} title="Today versus the rebuild" subtitle="Today's measurement stops at reaching the payment page and counts browser sessions. The rebuild counts people through the first visit.">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Today, per session</h3>
          <p className="mb-3 text-sm text-gray-700">{view.today.source}</p>
          <Bars rows={view.today.rows.map((r) => ({ label: r.label, count: r.sessions, note: r.note }))} unit="sessions" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">The rebuild, per person</h3>
          <p className="mb-3 text-sm text-gray-700">The invented cohort, carried through the first visit and the follow-up. Live demo counts are in parentheses.</p>
          <Bars
            rows={view.synthetic.stages.map((s, i) => ({ label: s.label, count: s.people, note: `${view.live.stages[i]?.people ?? 0} live` }))}
            unit="people"
          />
        </div>
      </div>
    </Panel>
  );
}

function QualityPanel({ view }: { view: JourneyView }) {
  const q = view.quality;
  const issues = [...q.outOfOrder.map((i) => ({ ...i, kind: "Out of order" })), ...q.duplicates.map((i) => ({ ...i, kind: "Duplicate" })), ...q.linkageGaps.map((i) => ({ ...i, kind: "Linkage gap" }))];
  const tiles: [string, string, boolean][] = [
    ["Validation failures", String(q.validationFailures), q.validationFailures === 0],
    ["Out-of-order events", String(q.outOfOrder.length), q.outOfOrder.length === 0],
    ["Duplicate system-of-record events", String(q.duplicates.length), q.duplicates.length === 0],
    ["Linkage gaps", String(q.linkageGaps.length), q.linkageGaps.length === 0],
    ["Complete event chains", `${q.completeChains} of ${q.journeys}`, q.completeChains === q.journeys],
  ];
  return (
    <Panel n={4} title="Data quality" subtitle={`${q.events.toLocaleString("en-US")} events across ${q.journeys} live demo journeys.`}>
      <ul className="grid gap-3 sm:grid-cols-5">
        {tiles.map(([label, value, good]) => (
          <li key={label} className={cx("rounded-md px-3 py-2", good ? "bg-green-50" : "bg-amber-50")}>
            <p className="text-xs text-gray-700">{label}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-gray-900 tabular-nums">
              {good ? <CheckCircle2 aria-hidden className="size-4 text-green-700" /> : <AlertTriangle aria-hidden className="size-4 text-amber-700" />}
              {value}
            </p>
          </li>
        ))}
      </ul>
      {issues.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-gray-800">
          {issues.slice(0, 20).map((i, n) => (
            <li key={n}>
              {i.kind}: <code className="text-[12px]">{i.event}</code> {i.detail} (journey {i.journeyId.slice(-6)})
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function InProgress({ view, onChange }: { view: JourneyView; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const review = async (journeyId: string, flagId: string) => {
    setBusy(flagId);
    const r = await api("/api/journey-view/review", { body: { journeyId, flagId } });
    setBusy(undefined);
    if (!r.ok) setError(r.message);
    await onChange();
  };
  return (
    <Panel n={5} title="People in progress" subtitle="Where everyone is right now, so a care team could help, and where safety flags wait for a person.">
      {view.inProgress.length === 0 ? (
        <p className="text-[15px] text-gray-700">No journeys in progress.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-700">
              <tr>
                <th className="py-2 pr-3 font-medium">Journey</th>
                <th className="py-2 pr-3 font-medium">Stage</th>
                <th className="py-2 pr-3 font-medium">Ready</th>
                <th className="py-2 pr-3 font-medium">Open safety flags</th>
                <th className="py-2 font-medium">Next expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {view.inProgress.map((r) => (
                <tr key={r.journeyId} className="align-top">
                  <td className="py-2 pr-3 font-mono text-[13px] text-gray-900">{r.shortId}</td>
                  <td className="py-2 pr-3 text-gray-900">{STAGE[r.stage]}</td>
                  <td className="py-2 pr-3 tabular-nums text-gray-900">
                    {r.readiness.done} of {r.readiness.total}
                  </td>
                  <td className="py-2 pr-3">
                    {r.openFlags.length === 0 ? (
                      <span className="text-gray-600">None</span>
                    ) : (
                      r.openFlags.map((f) => (
                        <div key={f.id} className="flex flex-wrap items-center gap-2">
                          <span className="text-amber-900">
                            {FLAG[f.type] ?? f.type}, raised {time(f.raisedAt)}
                          </span>
                          <Button variant="outline" className="min-h-9 px-3 text-sm" loading={busy === f.id} onClick={() => void review(r.journeyId, f.id)}>
                            Mark reviewed
                          </Button>
                        </div>
                      ))
                    )}
                  </td>
                  <td className="py-2">
                    {r.nextExpected.map((n) => (
                      <code key={n} className="mr-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[12px] text-gray-800">
                        {n}
                      </code>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
    </Panel>
  );
}
