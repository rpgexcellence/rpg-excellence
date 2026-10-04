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
export function readBusinessDetails(formData) {
  const details = {};
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
  return { details };
}
