// Simulated identity verification (Persona). Returns the fields an ID scan provides.
import { PERSONAS } from "@/data/personas";
import type { Journey } from "@/domain/types";

export const IDENTITY_SOURCE = "ID check · Persona (simulated)";

export function verifyIdentity(j: Pick<Journey, "personaId" | "person">) {
  if (j.personaId) return { ...PERSONAS[j.personaId].identity, source: IDENTITY_SOURCE };
  // The name the patient gave when holding the time; the invented ID confirms it.
  const first = j.person?.firstName ?? "Alex";
  const last = j.person?.lastName ?? "Sample";
  return {
    legalName: `${first} ${last}`,
    dob: "1990-01-01",
    sexAtBirth: "Not shown",
    addressLine: "100 Congress Ave",
    city: "Austin",
    zip: "78701",
    source: IDENTITY_SOURCE,
  };
}
