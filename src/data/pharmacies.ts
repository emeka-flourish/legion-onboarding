// Invented pharmacies for the demo cities.
export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: "Austin" | "Houston" | "El Paso";
}

export const PHARMACIES: Pharmacy[] = [
  { id: "riverside-austin", name: "Riverside Pharmacy", address: "1912 S Congress Ave, Austin, TX 78704", city: "Austin" },
  { id: "bartoncreek-austin", name: "Barton Creek Drug", address: "3300 Bee Caves Rd, Austin, TX 78746", city: "Austin" },
  { id: "heights-houston", name: "Heights Community Pharmacy", address: "1015 Yale St, Houston, TX 77008", city: "Houston" },
  { id: "bayou-houston", name: "Bayou City Pharmacy", address: "2450 Washington Ave, Houston, TX 77007", city: "Houston" },
  { id: "mesa-elpaso", name: "Mesa Street Pharmacy", address: "4600 N Mesa St, El Paso, TX 79912", city: "El Paso" },
  { id: "franklin-elpaso", name: "Franklin Mountain Pharmacy", address: "800 Montana Ave, El Paso, TX 79902", city: "El Paso" },
];

export const pharmacyById = (id?: string) => PHARMACIES.find((p) => p.id === id);
