export function ageOn(dob: string, at: Date): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = at.getUTCFullYear() - y;
  if (at.getUTCMonth() + 1 < m || (at.getUTCMonth() + 1 === m && at.getUTCDate() < d)) age -= 1;
  return age;
}

/**
 * The verified date of birth from the ID replaces the fit check's self-report.
 * A mismatch goes to a person for review; it never becomes an automatic eligibility decision (L10, problem 4).
 */
export function ageCheck(identityDob: string, fitAdult: boolean | undefined, coverageDob: string | undefined, now: Date) {
  const adult = ageOn(identityDob, now) >= 18;
  const dobMismatch = Boolean(coverageDob && coverageDob !== identityDob);
  return { ageVerified: adult, reviewFlag: (!adult && fitAdult === true) || dobMismatch };
}
