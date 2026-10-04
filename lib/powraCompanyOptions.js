import { createAdminClient } from "./supabase/admin";
export async function loadPowraCompanyOptions(organizationId) {
  const admin = createAdminClient();
  const results = await Promise.all([
    admin.from("bcp_site_profiles").select("id,location_name,profile_reference,country").eq("organization_id", organizationId).neq("status", "archived").order("location_name"),
    admin.from("organization_people").select("id,first_name,last_name,email,position").eq("organization_id", organizationId).eq("account_status", "active").order("last_name")
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  return { sites: results[0].data || [], people: (results[1].data || []).map(person => ({ ...person, name: [person.first_name,person.last_name].filter(Boolean).join(" ") })) };
}
export function resolvePowraCompanySelection(options, formData) {
  const site = options.sites.find(row => row.id === formData.get("site_profile_id"));
  const person = options.people.find(row => row.id === formData.get("completed_by_person_id"));
  if (!site) throw new Error("Select a current site from your company's Site Profile. Refresh if the site was changed.");
  if (!person) throw new Error("Select an active company user for Completed by. Refresh if their status was changed.");
  const memberIds = [...new Set(formData.getAll("team_member_ids").map(String))];
  const members = memberIds.map(id => options.people.find(row => row.id === id));
  if (members.some(member => !member)) throw new Error("A selected team member is no longer active in your company. Refresh and select again.");
  const supervisorId = String(formData.get("supervisor_person_id") || "");
  const supervisor = options.people.find(row => row.id === supervisorId);
  if (supervisorId && !supervisor) throw new Error("Select an active company supervisor.");
  return { site, person, members, supervisor };
}
