/**
 * Age on a date, from a YYYY-MM-DD birth date. The verified birth date from the ID replaces the fit check's
 * self-report; `identityReview` (rules/identity.ts) sends any mismatch to a person instead of deciding eligibility
 * (L10, problem 4).
 */
export function ageOn(dob: string, at: Date): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = at.getUTCFullYear() - y;
  if (at.getUTCMonth() + 1 < m || (at.getUTCMonth() + 1 === m && at.getUTCDate() < d)) age -= 1;
  return age;
}
