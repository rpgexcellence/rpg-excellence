"use client";
import { BUSINESS_DETAIL_FIELDS, VAT_STATUSES, BUSINESS_SITE_FIELDS, MAX_ADDITIONAL_BUSINESS_SITES } from "../../../../lib/businessProfileDetails";
import { useActionState, useState, startTransition } from "react";
import { BUSINESS_INDUSTRIES, BUSINESS_COUNTRIES, businessCountryValue, businessIndustrySelection, businessIndustryValue } from "../../../../lib/businessProfileOptions";
export default function BusinessProfileForm({ action, organization, workforceCount = null }) {
  const [state, formAction, pending] = useActionState(action, null);
  const initialIndustry = businessIndustrySelection(organization.industry);
  const [industries, setIndustries] = useState(initialIndustry.selected);
  const [otherSelected, setOtherSelected] = useState(Boolean(initialIndustry.custom));
  const [customIndustry, setCustomIndustry] = useState(initialIndustry.custom);
  const [values, setValues] = useState({ name: organization.name || "", industry: organization.industry || "", country: businessCountryValue(organization.country), ...Object.fromEntries(BUSINESS_DETAIL_FIELDS.map(item => [item.key, organization[item.key] || ""])), powra_reference_prefix: organization.powra_reference_prefix || "POWRA", powra_reference_padding: organization.powra_reference_padding || 0, vat_registration_status: organization.vat_registration_status || (organization.vat_number ? "registered" : "not_recorded") });
  const [siteMode, setSiteMode] = useState(organization.business_site_mode === "multiple" ? "multiple" : "single");
  const [sites, setSites] = useState(() => Array.isArray(organization.business_additional_sites) ? organization.business_additional_sites.map((site, index) => ({...site, uiId: `saved-${index}`})) : []);
  const emptySite = () => ({...Object.fromEntries(BUSINESS_SITE_FIELDS.map(field => [field.key, ""])), uiId: crypto.randomUUID()});
  const [edited, setEdited] = useState(false);
  const changeSiteMode = mode => {
    setSiteMode(mode);
    if (mode === "multiple" && !sites.length) setSites([emptySite()]);
    setEdited(true);
  };
  const updateSite = (id, key, value) => {setSites(old => old.map(site => site.uiId === id ? {...site, [key]: value} : site));setEdited(true);};
  const countryOptions = value => <><option value="">Select country</option>{value && !BUSINESS_COUNTRIES.some(country => country.name === value) && <option value={value}>{value} — previously saved</option>}{BUSINESS_COUNTRIES.map(country => <option key={country.code} value={country.name}>{country.name}</option>)}</>;
  const field = key => ({ name:key, value:values[key], onChange:event => {setValues(old => ({...old, [key]:event.target.value}));setEdited(true);} });
  const detailInput = (key, required = false) => {
    const item = BUSINESS_DETAIL_FIELDS.find(field => field.key === key);
    return <label key={key}><span>{item.label}{required ? " *" : ""}</span><input {...field(key)} type={item.type || "text"} maxLength={item.max} autoComplete={item.autocomplete} required={required} placeholder={key === "website" ? "https://www.example.com" : undefined} /></label>;
  };
  return <form onSubmit={event => {event.preventDefault(); if (pending) return; const data = new FormData(event.currentTarget); setEdited(false); startTransition(() => formAction(data));}} className="bpForm">
    <header><small>COMPANY MASTER RECORD</small><h2>Your business details</h2><p>Maintain your business identity, sectors, registration, address and contact details.</p></header>
    {state?.error && <div className="bpMessage error" role="alert">{state.error}</div>}
    {!edited && state?.success && <div className="bpMessage success" role="status">{state.success}</div>}
    <div className="bpFields">
      <label className="wide"><span>Legal organisation name *</span><input {...field("name")} required maxLength={180} autoComplete="organization" /></label>
      <div className="bpSectionTitle wide"><h3>Company registration &amp; tax</h3><p>Complete the details that apply to your business. Sole traders can leave the company registration number blank.</p></div>
      {detailInput("trading_name")}{detailInput("company_registration_number")}{detailInput("registration_authority")}
      <label><span>VAT registration status</span><select {...field("vat_registration_status")}>{VAT_STATUSES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      {values.vat_registration_status === "registered" && detailInput("vat_number", true)}
      <fieldset className="bpIndustries wide"><legend>Industries / sectors</legend><p>Select every sector that applies to your business.</p>
        <input type="hidden" name="industry" value={businessIndustryValue(industries, otherSelected ? customIndustry : "")} />
        <div className="bpSectorGrid">{[...BUSINESS_INDUSTRIES, "Other"].map((industry, index) => {
          const other = industry === "Other", checked = other ? otherSelected : industries.includes(industry);
          return <label key={industry} className={`bpSectorCard tone${index % 6}${checked ? " selected" : ""}`}>
            <input type="checkbox" checked={checked} onChange={event => { const checked = event.target.checked; if(other) setOtherSelected(checked); else setIndustries(old => checked ? [...old, industry] : old.filter(item => item !== industry)); setEdited(true); }} />
            <span className="bpSectorIcon"><SectorIcon index={index} /></span><span className="bpSectorName">{industry}</span><span className="bpSectorCheck" aria-hidden="true">{checked ? "✓" : "+"}</span>
          </label>;
        })}</div>
        <p className="bpSectorSummary" role="status">{industries.length + (otherSelected ? 1 : 0)} sectors selected{industries.length ? ` · ${industries.join(" · ")}` : ""}{otherSelected && customIndustry.trim() ? ` · ${customIndustry.trim()}` : ""}</p>
        {otherSelected && <label className="bpOtherIndustry"><span>Other sector(s) *</span><input aria-label="Other industries" value={customIndustry} onChange={event => {setCustomIndustry(event.target.value);setEdited(true);}} required pattern={".*\\S.*"} maxLength={160} placeholder="Enter your additional sector(s)" /></label>}
      </fieldset>
      <fieldset className="bpSiteChoice wide"><legend>Business sites</legend><p>Choose whether your business operates from one site or multiple sites.</p><div className="bpSiteChoices">{[{value:"single", label:"Single site", description:"One business address"}, {value:"multiple", label:"Multi-site", description:"Add additional site addresses"}].map(option => <label key={option.value} className={`bpSiteOption${siteMode === option.value ? " selected" : ""}`}><input type="radio" name="business_site_mode" value={option.value} checked={siteMode === option.value} onChange={() => changeSiteMode(option.value)} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</div>{siteMode === "single" && sites.length > 0 && <p>Additional addresses are retained. Select Multi-site to display them again.</p>}</fieldset>
      <input type="hidden" name="business_additional_sites" value={JSON.stringify(sites.map(({uiId, ...site}) => site))} />
      <div className="bpSectionTitle wide"><h3><span className="bpSiteBadge">Site 1</span> Registered business address</h3><p>Use your legal registered address or principal business address.</p></div>
      {detailInput("address_line_1")}{detailInput("address_line_2")}{detailInput("city")}{detailInput("region")}{detailInput("postal_code")}
      <label><span>Country</span><select {...field("country")} autoComplete="country-name">{countryOptions(values.country)}</select></label>
      {siteMode === "multiple" && <section className="bpAdditionalSites wide" aria-label="Additional business addresses">
        <p className="bpSiteHelp">Each address is saved with your business profile. Manage site assessments in <a href="/portal/business-continuity/site-profile">BCP Site Profile</a>.</p>
        {sites.map((site, index) => <fieldset className="bpSiteAddress" key={site.uiId}><legend><span className="bpSiteBadge">Site {index + 2}</span> Additional address</legend><div className="bpSiteAddressFields">{BUSINESS_SITE_FIELDS.map(item => {
          const required = ["address_line_1", "city", "country"].includes(item.key);
          const props = {value:site[item.key] || "", onChange:event => updateSite(site.uiId, item.key, event.target.value), required, "aria-label":`Site ${index + 2}: ${item.label}`};
          return <label key={item.key} className={item.key === "site_name" ? "wide" : undefined}><span>{item.label}{required ? " *" : ""}</span>{item.key === "country" ? <select {...props}>{countryOptions(site.country)}</select> : <input {...props} maxLength={item.max} autoComplete={item.autocomplete ? `section-site${index + 2} ${item.autocomplete}` : "off"} />}</label>;
        })}</div><button type="button" className="bpRemoveSite" onClick={() => {setSites(old => old.filter(item => item.uiId !== site.uiId));setEdited(true);}} disabled={pending || sites.length === 1} aria-label={`Remove Site ${index + 2}`}>Remove Site {index + 2}</button></fieldset>)}
        <button type="button" className="bpAddSite" disabled={pending || sites.length >= MAX_ADDITIONAL_BUSINESS_SITES} onClick={() => {setSites(old => [...old, emptySite()]);setEdited(true);}}>＋ Add address</button><small className="bpSiteHelp" role="status">{sites.length + 1} sites including the registered address{sites.length >= MAX_ADDITIONAL_BUSINESS_SITES ? " · Maximum 50 sites reached" : ""}</small>
      </section>}
      <div className="bpSectionTitle wide"><h3>Business contact details</h3><p>Company contact information for your organisation profile.</p></div>
      {detailInput("business_email")}{detailInput("business_phone")}{detailInput("website")}
      <label><span>Workforce — automatic count</span><input value={workforceCount === null ? "Unavailable" : workforceCount} readOnly aria-describedby="bpWorkforceHelp" /><small id="bpWorkforceHelp">Counts all people in your company register, including invited, suspended and directory records. Updates when this page opens. Manage people under <a href="/portal/company/people">People, Roles &amp; Access</a>.</small></label>
      <div className="bpSectionTitle wide" id="powra-numbering"><h3>POWRA numbering</h3><p>References are assigned automatically on save. Set your company prefix and optional digit padding. Existing references remain unchanged.</p></div>
      <label><span>Reference prefix</span><input {...field("powra_reference_prefix")} required maxLength={40} pattern={"[A-Za-z0-9_\\-]+"} /><small>Default: POWRA. Example custom prefix: SITE-POWRA-</small></label>
      <label><span>Minimum digits</span><select {...field("powra_reference_padding")}>{[0,1,2,3,4,5,6,7,8].map(value => <option key={value} value={value}>{value === 0 ? "No leading zeros" : `${value} digits`}</option>)}</select><small>Next format example: {`${values.powra_reference_prefix}${String(organization.powra_next_number || 1).padStart(Number(values.powra_reference_padding) || 0,"0")}`}. The number is confirmed on save.</small></label>
    </div>
    <footer><span>Updates apply to your company workspace.</span><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save business profile"}</button></footer>
  </form>;
}

// Local vector icons remain crisp at every screen size, without external assets.
const sectorPaths = [
  "M3 13l7-2V4l2-2 2 2v7l7 2v3l-7-1v4l3 2H7l3-2v-4l-7 1z",
  "M8 16c0-6 4-12 10-13 1 6-2 11-8 14M8 10l-4 1-1 5 5-1m5 2-1 4 5-1 1-5M5 19l-2 2m11-12h.01",
  "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6",
  "M3 7c3-4 6 4 9 0s6 4 9 0M3 17c3-4 6 4 9 0s6 4 9 0M12 10v4m-3-1 3 3 3-3",
  "M4 11l2-6h12l2 6M3 11h18v7H3zM6 18v3m12-3v3M6 14h2m8 0h2",
  "M14 3l1 4 4-1 2 4-3 3 1 4-4 1-3 3-3-3-4-1 1-4-3-3 2-4 4 1 1-4zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  "M3 21V9l6 4V9l6 4V3h4v18zM6 17h2m3 0h2m3 0h2",
  "M12 3s7 8 7 12a7 7 0 0 1-14 0c0-4 7-12 7-12zM8 15c0 2 1 3 3 3",
  "M13 2L5 13h6l-1 9 9-12h-6z",
  "M3 15l9 6 9-6-3-4H6zM8 11V6h8v5m-4-5V2M3 21c3-3 6 3 9 0s6 3 9 0",
  "M3 21h18M6 21V3h12v18M6 6h12M9 9h1m4 0h1m-6 4h1m4 0h1m-4 4h2v4",
  "M3 6h11v11H3zM14 10h4l3 4v3h-7M7 17a2 2 0 1 0 0 4a2 2 0 1 0 0-4m10 0a2 2 0 1 0 0 4a2 2 0 1 0 0-4",
  "M4 20L16 4m-9 0 13 16M4 4c6-3 12 0 16 4M7 17l3 2",
  "M9 3h6m-5 0v7L4 20h16l-6-10V3M7 15h10",
  "M5 11h14v7H5zM9 11V7h10V4H9M3 21h18M8 14v1m8-1v1",
  "M12 21V9M12 14C4 15 3 9 3 5c6 0 9 3 9 9M12 10c0-5 4-7 9-7 0 5-3 8-9 7",
  "M4 4h16v16H4zM12 8v8M8 12h8",
  "M3 4h18v13H3zM8 21h8m-4-4v4M8 8l-2 2 2 2m8-4 2 2-2 2",
  "M12 21V8M7 21h10M8 12l4-4 4 4M5 5a10 10 0 0 0 0 11M19 5a10 10 0 0 1 0 11",
  "M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14M15 15l6 6M7 10l2 2 4-4",
  "M12 2l3 2h4v4l3 4-3 4v4h-4l-3 2-3-2H5v-4l-3-4 3-4V4h4zM8 12l3 3 5-6",
  "M2 8l10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7m4-2v9",
  "M3 7h18v13H3zM8 7V3h8v4m-13 6h18m-9-2v4",
  "M2 9l10-6 10 6M3 21h18M5 9v9m5-9v9m5-9v9m5-9v9",
  "M5 7h14l2 14H3zM8 7V5a4 4 0 0 1 8 0v2",
  "M3 20V5m0 10h18v5m-17-9h6v4m2-6h6l3 6",
  "M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm13 0v6m-3-3h6"
];
function SectorIcon({index}) { return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sectorPaths[index]} /></svg>; }
