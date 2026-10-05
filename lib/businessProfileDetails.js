export const BUSINESS_DETAIL_FIELDS = [
  { key: "trading_name", label: "Trading name", max: 180 },
  { key: "company_registration_number", label: "Company registration number", max: 80 },
  { key: "registration_authority", label: "Registration authority", max: 160 },
  { key: "vat_number", label: "VAT / tax registration number", max: 80 },
  { key: "address_line_1", label: "Address line 1", max: 180, autocomplete: "address-line1" },
  { key: "address_line_2", label: "Address line 2", max: 180, autocomplete: "address-line2" },
  { key: "city", label: "Town / city", max: 100, autocomplete: "address-level2" },
  { key: "region", label: "County / state / region", max: 100, autocomplete: "address-level1" },
  { key: "postal_code", label: "Postcode / ZIP code", max: 30, autocomplete: "postal-code" },
  { key: "business_email", label: "Business email", max: 254, type: "email", autocomplete: "email" },
  { key: "business_phone", label: "Business telephone", max: 60, type: "tel", autocomplete: "tel" },
  { key: "website", label: "Company website", max: 300, type: "url", autocomplete: "url" }
];
export const VAT_STATUSES = [
  { value: "not_recorded", label: "Not recorded" },
  { value: "registered", label: "VAT / tax registered" },
  { value: "not_registered", label: "Not VAT registered" },
  { value: "exempt", label: "VAT exempt / not applicable" }
];
export const BUSINESS_SITE_FIELDS = [
  { key: "site_name", label: "Site name", max: 180 },
  ...BUSINESS_DETAIL_FIELDS.filter(field => ["address_line_1", "address_line_2", "city", "region", "postal_code"].includes(field.key)),
  { key: "country", label: "Country", max: 100 }
];
export const MAX_ADDITIONAL_BUSINESS_SITES = 49;
export function readBusinessSites(formData) {
  const mode = formData.get("business_site_mode") || "single";
  if (!["single", "multiple"].includes(mode)) return { error: "Select single site or multi-site." };
  const raw = formData.get("business_additional_sites") || "[]";
  if (typeof raw !== "string" || raw.length > 100000) return { error: "The additional site addresses are too large." };
  let entries;
  try { entries = JSON.parse(raw); } catch { return { error: "Additional site addresses could not be read. Refresh and try again." }; }
  if (!Array.isArray(entries) || entries.length > MAX_ADDITIONAL_BUSINESS_SITES) return { error: "You can record up to 50 sites, including Site 1." };
  if (mode === "multiple" && !entries.length) return { error: "Add at least one additional address for a multi-site business." };
  const sites = [];
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return { error: `Site ${index + 2}: enter a valid address.` };
    const site = {};
    for (const field of BUSINESS_SITE_FIELDS) {
      if (entry[field.key] != null && typeof entry[field.key] !== "string") return { error: `Site ${index + 2}: ${field.label} must be text.` };
      const value = (entry[field.key] || "").trim();
      if (value.length > field.max) return { error: `Site ${index + 2}: ${field.label} allows up to ${field.max} characters.` };
      site[field.key] = value;
    }
    if (mode === "multiple" && (!site.address_line_1 || !site.city || !site.country)) return { error: `Site ${index + 2}: enter address line 1, town / city and country.` };
    sites.push(site);
  }
  return { details: { business_site_mode: mode, business_additional_sites: sites } };
}
export function readBusinessDetails(formData) {
  const details = {};
  const prefix = String(formData.get("powra_reference_prefix") || "POWRA").trim();
  const padding = Number(formData.get("powra_reference_padding") || 0);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(prefix)) return {error: "POWRA prefix: use 1–40 letters, numbers, hyphens or underscores."};
  if (!Number.isInteger(padding) || padding < 0 || padding > 8) return {error: "POWRA digit padding must be between 0 and 8."};
  details.powra_reference_prefix = prefix;
  details.powra_reference_padding = padding;
  for (const field of BUSINESS_DETAIL_FIELDS) {
    const value = typeof formData.get(field.key) === "string" ? formData.get(field.key).trim() : "";
    if (value.length > field.max) return { error: `${field.label}: use up to ${field.max} characters.` };
    details[field.key] = value || null;
  }
  const status = formData.get("vat_registration_status") || "not_recorded";
  if (!VAT_STATUSES.some(item => item.value === status)) return { error: "Select a valid VAT registration status." };
  details.vat_registration_status = status;
  if (status === "registered" && !details.vat_number) return { error: "Enter your VAT / tax registration number." };
  if (status !== "registered") details.vat_number = null;
  if (details.business_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.business_email)) return { error: "Enter a valid business email address." };
  if (details.website) {
    try {
      const url = new URL(details.website);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    } catch { return { error: "Enter a website beginning with https:// or http://." }; }
  }
  const sites = readBusinessSites(formData);
  if (sites.error) return sites;
  return { details: { ...details, ...sites.details } };
}
