"use client";

import { useEffect, useRef, useState } from "react";
import { LiveTag } from "@/components/ui/Tags";
import type { StoryItem } from "@/domain/types";
import { api } from "@/lib/api";
import type { RxMatch, RxResult } from "@/services/rxnorm";

/** The plain-language name for a match: a brand also names the ingredient it contains. */
export function rxName(match: RxMatch): string {
  return match.tty === "BN" && match.ingredient ? `${match.name} (brand of ${match.ingredient.name})` : match.name;
}

/**
 * Looks each mentioned medication up in RxNorm once (TAC-35). A failed or empty lookup simply shows nothing,
 * so the conversation never waits on the outside service.
 */
export function useRxMatches(texts: string[]): Record<string, RxMatch | null> {
  const [matches, setMatches] = useState<Record<string, RxMatch | null>>({});
  const asked = useRef(new Set<string>());
  const key = texts.map((t) => t.trim()).filter(Boolean).join("\n");
  useEffect(() => {
    for (const text of key ? key.split("\n") : []) {
      if (asked.current.has(text)) continue;
      asked.current.add(text);
      void api<RxResult>(`/api/rxnorm?term=${encodeURIComponent(text)}`).then((r) => {
        setMatches((m) => ({ ...m, [text]: r.ok && r.data.matches[0] ? r.data.matches[0] : null }));
      });
    }
  }, [key]);
  return matches;
}

/** Attaches each medication's match to the notes being saved, so the provider sees the standard name. */
export function withRx(items: StoryItem[], matches: Record<string, RxMatch | null>): StoryItem[] {
  return items.map((i) => {
    const match = i.kind === "medication_mentioned" ? matches[i.text.trim()] : undefined;
    return match ? { ...i, rx: match } : i;
  });
}

export function RxLine({ match, prefix = "Recognized as" }: { match: RxMatch; prefix?: string }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
      <span>
        {prefix} {rxName(match)}
      </span>
      <LiveTag label="Live · RxNorm" />
    </span>
  );
}
