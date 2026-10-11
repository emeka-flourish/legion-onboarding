"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { AiMeta } from "@/ai/types";
import { useJourney } from "@/components/journey/JourneyProvider";
import { SafetyPanel } from "@/components/safety/SafetyPanel";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { AiTag } from "@/components/ui/Tags";
import type { PreferenceChip } from "@/domain/types";
import { api } from "@/lib/api";

type Reply = { chips: PreferenceChip[]; meta: AiMeta } | { safety: "crisis" };

const EXAMPLES = ["A woman provider", "Speaks Spanish", "Evenings only"];
const MAX = 300;

/**
 * The optional note, shown after the results (decision L14, item 1). AI turns it into chips that re-order
 * the list; chips never remove anyone, and each one can be removed with a tap.
 */
export function PreferenceNote({ chips, onChange }: { chips: PreferenceChip[]; onChange: () => void }) {
  const { act, busy } = useJourney();
  const [note, setNote] = useState("");
  const [meta, setMeta] = useState<AiMeta>();
  const [working, setWorking] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [unmatched, setUnmatched] = useState(false);
  const [error, setError] = useState<string>();

  const apply = async (next: PreferenceChip[], mode: AiMeta["mode"]) => {
    const r = await act({ type: "APPLY_PREFERENCE_CHIPS", chips: next, mode }, { navigate: false });
    if (!r.ok) setError(r.message);
    else onChange();
  };

  const submit = async () => {
    setError(undefined);
    setUnmatched(false);
    setWorking(true);
    const r = await api<Reply>("/api/ai/preference-note", { body: { note } });
    setWorking(false);
    if (!r.ok) return setError(r.message);
    if ("safety" in r.data) return setCrisis(true);
    setMeta(r.data.meta);
    setUnmatched(r.data.chips.length === 0);
    await apply(r.data.chips, r.data.meta.mode);
    setNote("");
  };

  return (
    <section aria-labelledby="note-title" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <h2 id="note-title" className="text-base font-semibold text-gray-900">
        Anything else that matters to you? <span className="font-normal text-gray-600">(optional)</span>
      </h2>
      <p className="mt-1 text-sm text-gray-600">We&apos;ll re-order the list to match. No one is hidden.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setNote((n) => (n ? `${n.replace(/[.\s]+$/, "")}. ${e}` : e).slice(0, MAX))}
            className="min-h-11 rounded-full border border-dashed border-gray-400 px-3.5 text-sm text-gray-800 hover:bg-gray-50"
          >
            + {e}
          </button>
        ))}
      </div>

      <label htmlFor="pref-note" className="sr-only">
        Anything else that matters to you
      </label>
      <textarea
        id="pref-note"
        value={note}
        maxLength={MAX}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        placeholder="For example: someone who understands work stress"
        className="mt-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={!note.trim() || busy} loading={working} onClick={() => void submit()}>
          Update my matches
        </Button>
        <span className="text-xs text-gray-600">{note.length}/{MAX}</span>
      </div>
      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>

      {crisis && (
        <div className="mt-4">
          <SafetyPanel>
            <p>Whenever you&apos;re ready, you can keep choosing a time below.</p>
          </SafetyPanel>
        </div>
      )}

      {unmatched && !chips.length && (
        <p className="mt-3 text-sm text-gray-700" role="status">
          We couldn&apos;t match on that note, so the list stays as it was.
        </p>
      )}

      {chips.length > 0 && (
        <div className="mt-4" role="status">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900">We read your note as:</p>
            <AiTag meta={meta} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={`${c.kind}:${c.value}`}>
                <button
                  type="button"
                  onClick={() => void apply(chips.filter((x) => x !== c), meta?.mode ?? "scripted")}
                  aria-label={`Remove ${c.label}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-violet-50 px-3.5 text-sm font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100"
                >
                  {c.label}
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
