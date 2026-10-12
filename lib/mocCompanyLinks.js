import { createAdminClient } from "./supabase/admin";
import { rcaAdministrationLocations } from "./rcaCompanyLinks";

export const mocPersonName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() ||
  person?.email ||
  "Unnamed company user";

export async function loadMocCompanyLinks(organization) {
  const admin = createAdminClient();
  const [{ data: people = [], error: peopleError }, { data: permits = [], error: permitsError }] =
    await Promise.all([
      admin
        .from("organization_people")
        .select("id,first_name,last_name,email,position,department,site")
        .eq("organization_id", organization.id)
        .eq("account_status", "active")
        .order("last_name"),
      admin
        .from("hs_permits")
        .select("id,permit_reference,permit_type,task_description,status,organization_asset_id,administration_location_id")
        .eq("organization_id", organization.id)
        .not("status", "in", '(closed,cancelled)')
        .order("updated_at", { ascending: false }),
    ]);
  if (peopleError || permitsError) throw new Error(peopleError?.message || permitsError?.message);
  return {
    people: people.map((person) => ({ ...person, name: mocPersonName(person) })),
    permits,
    locations: rcaAdministrationLocations(organization),
  };
}

export function requireMocPerson(people, id, label) {
  const person = people.find((row) => row.id === id);
  if (!person) throw new Error(`${label} must be selected from the active Company User list.`);
  return person;
}

export function resolveMocLocation(locations, id) {
  const location = locations.find((row) => row.id === id);
  if (!location) throw new Error("Select a current site from Administration → Business Profile.");
  return location;
}
