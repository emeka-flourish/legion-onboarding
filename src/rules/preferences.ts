import type { PreferenceChip } from "@/domain/types";

export const MAX_CHIPS = 5;

/**
 * Adds what a new note asked for to the preferences the patient already has, when they edit them
 * (walkthrough feedback, item 3). A new gender preference replaces the old one; the newest chips win the cap.
 */
export function mergeChips(existing: PreferenceChip[], incoming: PreferenceChip[]): PreferenceChip[] {
  const replacesGender = incoming.some((c) => c.kind === "gender");
  const kept = existing.filter(
    (c) => !(replacesGender && c.kind === "gender") && !incoming.some((i) => i.kind === c.kind && i.value === c.value),
  );
  return [...kept, ...incoming].slice(-MAX_CHIPS);
}
