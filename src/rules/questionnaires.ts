// Scoring for GAD-7 and PHQ-9 with the published severity cutoffs. Scores go to the clinician, never into events.

export type Band = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

const sum = (answers: (number | null)[], count: number) =>
  answers.slice(0, count).reduce<number>((total, v) => total + (v ?? 0), 0);

export function scorePhq9(answers: (number | null)[]): { total: number; band: Band } {
  const total = sum(answers, 9);
  const band: Band =
    total >= 20 ? "severe" : total >= 15 ? "moderately_severe" : total >= 10 ? "moderate" : total >= 5 ? "mild" : "minimal";
  return { total, band };
}

export function scoreGad7(answers: (number | null)[]): { total: number; band: Band } {
  const total = sum(answers, 7);
  const band: Band = total >= 15 ? "severe" : total >= 10 ? "moderate" : total >= 5 ? "mild" : "minimal";
  return { total, band };
}

/** PHQ-9 item 9 (thoughts of being better off dead or of self-harm): any answer above "Not at all". */
export function phq9Item9Positive(answers: (number | null)[]): boolean {
  return (answers[8] ?? 0) > 0;
}

export const GAD7_LENGTH = 8; // 7 items + difficulty
export const PHQ9_LENGTH = 10; // 9 items + difficulty

export function checkInComplete(gad7: (number | null)[], phq9: (number | null)[]): boolean {
  const filled = (a: (number | null)[], n: number) => a.length >= n && a.slice(0, n).every((v) => v !== null);
  return filled(gad7, GAD7_LENGTH) && filled(phq9, PHQ9_LENGTH);
}
