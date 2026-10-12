// Date-of-birth typing (TRD 8.1, stage 7). A problem is always an input problem in plain words, next to the field.
// It never reads as an age, eligibility, or coverage decision (L10, problem 4).

/** Formats digits as they're typed: "0314" becomes "03/14". */
export function maskUsDate(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export type DateCheck = { iso: string; error?: undefined } | { iso?: undefined; error?: string };

/** Checks MM/DD/YYYY. An unfinished date is not an error yet; `final` reports it as one on submit. */
export function checkUsDate(input: string, today: Date, final = false): DateCheck {
  const d = input.replace(/\D/g, "");
  const example = "Please enter a real date, like 03/14/1997.";
  if (d.length < 8) {
    if (d.length >= 2 && (Number(d.slice(0, 2)) < 1 || Number(d.slice(0, 2)) > 12)) return { error: "The month should be 01 to 12." };
    if (d.length >= 4 && (Number(d.slice(2, 4)) < 1 || Number(d.slice(2, 4)) > 31)) return { error: "The day should be 01 to 31." };
    return final ? { error: d.length ? example : "Please enter your date of birth." } : {};
  }
  const [m, day, y] = [Number(d.slice(0, 2)), Number(d.slice(2, 4)), Number(d.slice(4, 8))];
  const date = new Date(Date.UTC(y, m - 1, day));
  if (m < 1 || m > 12 || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== day || y < 1900) return { error: example };
  if (date.getTime() > today.getTime()) return { error: "That date is in the future. Please check it." };
  return { iso: `${d.slice(4, 8)}-${d.slice(0, 2)}-${d.slice(2, 4)}` };
}

/** "1997-03-14" as "03/14/1997", for prefilling a field. */
export function isoToUs(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-02-07" as "Feb 7, 2026", for dates in retrieved records. Calendar dates, so no time zone applies. */
export function isoToShort(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
