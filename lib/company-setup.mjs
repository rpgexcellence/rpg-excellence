const ADDRESS_KEYS = ["address_line_1", "address_line_2", "city", "region", "postal_code", "country"];
export const COMPANY_SETUP = "/portal/company/setup";
export const locationSetupPath = (query = {}) => {
  const params = new URLSearchParams({ section: "locations" });
  for (const key of ["edit", "source"]) if (typeof query[key] === "string" && query[key].length <= 100) params.set(key, query[key]);
  return COMPANY_SETUP + "?" + params;
};
export function addressText(value = {}) { return ADDRESS_KEYS.map(key => value[key]).filter(Boolean).join(", "); }
export function sameAddress(a, b) {
  const normal = value => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  // A country alone is not a site address and must not collapse unrelated locations.
  return Boolean(a?.address_line_1 && b?.address_line_1) && ADDRESS_KEYS.every(key => normal(a[key]) === normal(b[key]));
}
export function legacyLocationCandidates(organization, sites) {
  const rows = Array.isArray(organization.business_additional_sites) ? organization.business_additional_sites : [];
  return rows.flatMap((row, index) => row && typeof row === "object" && (row.address_line_1 || row.city) ? [{
    source: "legacy:" + index, name: row.site_name || "Previously saved address " + (index + 1), address: addressText(row),
    existing: sites.find(site => site.status !== "archived" && sameAddress(row, site)) || null,
  }] : []);
}
export function locationDraft(organization, source, sites) {
  if (typeof source !== "string") return null;
  let address;
  if (source === "registered") address = organization;
  else if (/^legacy:[0-9]{1,3}$/.test(source)) address = organization.business_additional_sites?.[Number(source.slice(7))];
  if (!address || typeof address !== "object" || !(address.address_line_1 || address.city || address.postal_code)) return null;
  if (sites.some(site => site.status !== "archived" && sameAddress(address, site))) return null;
  return { _source: source, ...Object.fromEntries(ADDRESS_KEYS.map(key => [key, typeof address[key] === "string" ? address[key] : ""])),
    site_name: address.site_name || organization.trading_name || organization.name || "",
    site_type: "operational_site", status: "active", is_primary: !sites.some(site => site.status === "active" && site.is_primary),
  };
}
