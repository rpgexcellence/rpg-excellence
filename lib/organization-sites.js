import { createAdminClient } from "./supabase/admin";

export const organizationSiteLabel = (site) => {
  const address = [
    site.address_line_1,
    site.address_line_2,
    site.city,
    site.region,
    site.postal_code,
    site.country,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    site.site_reference,
    site.site_name,
    address,
  ]
    .filter(Boolean)
    .join(" · ");
};

export async function loadOrganizationSites(
  organizationId,
  { includeInactive = false } = {},
) {
  const admin = createAdminClient();

  let query = admin
    .from("organization_sites")
    .select("*")
    .eq("organization_id", organizationId)
    .neq("status", "archived");

  if (!includeInactive) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query
    .order("is_primary", { ascending: false })
    .order("site_name");

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((site) => ({
    ...site,
    label: organizationSiteLabel(site),

    // Compatibility fields used by existing controlled modules.
    location_name: site.site_name,
    profile_reference: site.site_reference,
  }));
}

export function resolveOrganizationSite(sites, id) {
  const site = sites.find(
    (item) => item.id === String(id || ""),
  );

  if (!site) {
    throw new Error(
      "Select a current site from Administration → Site Profile.",
    );
  }

  return site;
}
