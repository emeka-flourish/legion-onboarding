// Simulated identity verification (Persona). Returns the fields an ID scan provides.
import { PERSONAS } from "@/data/personas";
import type { Journey } from "@/domain/types";

export const IDENTITY_SOURCE = "ID check · Persona (simulated)";

export function verifyIdentity(j: Pick<Journey, "personaId" | "person">) {
  if (j.personaId) return { ...PERSONAS[j.personaId].identity, source: IDENTITY_SOURCE };
  const first = j.person?.firstName ?? "Alex";
  return {
    legalName: `${first} Sample`,
    dob: "1990-01-01",
    sexAtBirth: "Not shown",
    addressLine: "100 Congress Ave",
    city: "Austin",
    zip: "78701",
    source: IDENTITY_SOURCE,
  };
}
