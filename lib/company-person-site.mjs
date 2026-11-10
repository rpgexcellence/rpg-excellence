export const LEGACY_PERSON_SITE = "__legacy__";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function personSiteLabel(site) { return [site.site_reference,site.site_name].filter(Boolean).join(" · "); }
export async function resolveCompanyPersonSite(admin,organizationId,formData,person = null) {
  // Older clients cannot erase a current site assignment during a profile edit.
  if (!formData.has("site_id")) {
    if (person) return {};
    return {site_id: null, site: null};
  }
  const selected = String(formData.get("site_id") || "");
  if (selected === LEGACY_PERSON_SITE) {
    if (!person || person.site_id || !person.site) throw new Error("Select a company location.");
    return {};
  }
  if (!selected) return {site_id: null,site: null};
  if (!UUID.test(selected)) throw new Error("Select a valid company location.");
  const {data: site,error} = await admin.from("organization_sites").select("id,site_reference,site_name,status").eq("id",selected).eq("organization_id",organizationId).maybeSingle();
  if (error) throw new Error("Company locations could not be checked. Please try again.");
  if (!site || (site.status !== "active" && person?.site_id !== site.id)) throw new Error("Select an active location from your company.");
  return {site_id: site.id,site: personSiteLabel(site)};
}
