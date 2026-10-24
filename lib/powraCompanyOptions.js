import { createAdminClient } from "./supabase/admin";
import { loadOrganizationSites } from "./organization-sites";

const text = (value) => String(value || "").trim();

// Compatibility for the existing page while the update is uploaded file by file.
// The updated page and save action use loadPowraAdministrationOptions below.
export async function loadPowraCompanyOptions(
  organizationId,
  { siteSource = "bcp" } = {},
) {
  if (!organizationId) {
    throw new Error("A company record is required before starting a POWRA.");
  }
  if (!["administration", "bcp"].includes(siteSource)) {
    throw new Error("The POWRA site source is not supported.");
  }

  const admin = createAdminClient();
  const [sitesResult, peopleResult] = await Promise.all([
    siteSource === "administration"
      ? loadOrganizationSites(organizationId).then((data) => ({ data }))
      : admin
          .from("bcp_site_profiles")
          .select("id,location_name,profile_reference,country")
          .eq("organization_id", organizationId)
          .neq("status", "archived")
          .order("location_name"),
    admin
      .from("organization_people")
      .select("id,first_name,last_name,email,position")
      .eq("organization_id", organizationId)
      .eq("account_status", "active")
      .order("last_name"),
  ]);

  for (const result of [sitesResult, peopleResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    siteSource,
    sites: sitesResult.data || [],
    people: (peopleResult.data || []).map((person) => ({
      ...person,
      name:
        [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
        person.email ||
        "Unnamed company user",
    })),
  };
}

// Administration is the authoritative location source for the updated POWRA.
// The existing loader excludes inactive and archived company sites.
export async function loadPowraAdministrationOptions(organizationId) {
  return loadPowraCompanyOptions(organizationId, {
    siteSource: "administration",
  });
}

export function resolvePowraCompanySelection(options, formData) {
  const administration = options.siteSource === "administration";
  const field = administration ? "administration_location_id" : "site_profile_id";
  const selectedId = text(formData.get(field));
  const site = options.sites.find((row) => row.id === selectedId);
  const person = options.people.find(
    (row) => row.id === text(formData.get("completed_by_person_id")),
  );

  // Never treat a legacy BCP ID as an Administration site ID.
  if (!site) {
    throw new Error(
      administration
        ? "Select a current site from Administration → Site Profile. Refresh the form if the site was changed."
        : "Select a current company site. Refresh the form if the site was changed.",
    );
  }
  if (!person) {
    throw new Error(
      "Select an active company user for Completed by. Refresh if their status was changed.",
    );
  }

  const memberIds = [...new Set(formData.getAll("team_member_ids").map(text))];
  const members = memberIds.map((id) =>
    options.people.find((row) => row.id === id),
  );
  if (members.some((member) => !member)) {
    throw new Error(
      "A selected team member is no longer active in your company. Refresh and select again.",
    );
  }

  const supervisorId = text(formData.get("supervisor_person_id"));
  const supervisor = options.people.find((row) => row.id === supervisorId);
  if (supervisorId && !supervisor) {
    throw new Error("Select an active company supervisor.");
  }

  return { site, person, members, supervisor };
}
