// What happens when a patient confirms or corrects the details their ID check read (Emeka's direction, L21).
// Pure and testable. The ID stays the verified source, and anything a person should look at raises a review.
import type { IdentityDetails, IdentityField, IdentityReviewReason } from "@/domain/types";
import { ageOn } from "./age";

/** The choices for correcting the sex marker an ID shows. */
export const SEX_AT_BIRTH = ["Female", "Male", "Intersex"] as const;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const address = (d: IdentityDetails) => [d.addressLine, d.city, d.state, d.zip].map(norm).join("|");

/** The fields the patient changed from what the ID shows. Differences in case or spacing alone don't count. */
export function changedFields(fromId: IdentityDetails, current: IdentityDetails): IdentityField[] {
  const changed: IdentityField[] = [];
  if (norm(current.legalName) !== norm(fromId.legalName)) changed.push("legal_name");
  if (current.dob !== fromId.dob) changed.push("dob");
  if (current.sexAtBirth !== fromId.sexAtBirth) changed.push("sex_at_birth");
  if (address(current) !== address(fromId)) changed.push("address");
  return changed;
}

/**
 * Whether a person should double-check the patient's identity before the visit. It is never an automatic
 * eligibility decision (L10): the visit stays booked either way.
 * - Age comes from the ID's date of birth, the verified one, whatever the patient edits.
 * - A birth date that differs from the one given for coverage, or an ID under 18 after the fit check said 18 or
 *   older, goes to a person.
 * - Changing the legal name or the date of birth from what the ID shows goes to a person.
 * - An address can be updated freely (IDs often carry an old one), but one outside Texas goes to a person, who
 *   confirms where the patient will be for the visit, since clinicians are licensed in Texas.
 */
export function identityReview(
  fromId: IdentityDetails,
  current: IdentityDetails,
  ctx: { fitAdult?: boolean; coverageDob?: string; at: Date },
): { ageVerified: boolean; reasons: IdentityReviewReason[] } {
  const ageVerified = ageOn(fromId.dob, ctx.at) >= 18;
  const changed = changedFields(fromId, current);
  const reasons: IdentityReviewReason[] = [];
  if (!ageVerified && ctx.fitAdult === true) reasons.push("under_18");
  if (ctx.coverageDob && ctx.coverageDob !== fromId.dob) reasons.push("dob_mismatch");
  if (changed.includes("legal_name")) reasons.push("name_changed");
  if (changed.includes("dob")) reasons.push("dob_changed");
  if (current.state !== "TX") reasons.push("outside_texas");
  return { ageVerified, reasons };
}
