"use client";
import { useActionState, useState } from "react";
import { BUSINESS_INDUSTRIES, BUSINESS_COUNTRIES, businessCountryValue } from "../../../../lib/businessProfileOptions";
export default function BusinessProfileForm({ action, organization }) {
  const [state, formAction, pending] = useActionState(action, null);
  const storedIndustry = String(organization.industry || "").trim();
  const listedIndustry = BUSINESS_INDUSTRIES.find(item => item.toLowerCase() === storedIndustry.toLowerCase());
  const [industryChoice, setIndustryChoice] = useState(listedIndustry || (storedIndustry ? "other" : ""));
  const [customIndustry, setCustomIndustry] = useState(listedIndustry ? "" : storedIndustry);
  const [values, setValues] = useState({ name: organization.name || "", industry: organization.industry || "", country: businessCountryValue(organization.country), employees: organization.employees ?? "" });
  const [edited, setEdited] = useState(false);
  const field = key => ({ name:key, value:values[key], onChange:event => {setValues(old => ({...old, [key]:event.target.value}));setEdited(true);} });
  return <form action={formAction} onSubmit={() => setEdited(false)} className="bpForm">
    <header><small>INITIAL BUSINESS SETUP</small><h2>Your business details</h2><p>Review and update the information entered when you created your RPG workspace.</p></header>
    {state?.error && <div className="bpMessage error" role="alert">{state.error}</div>}
    {!edited && state?.success && <div className="bpMessage success" role="status">{state.success}</div>}
    <div className="bpFields">
      <label className="wide"><span>Organisation name *</span><input {...field("name")} required maxLength={180} autoComplete="organization" /></label>
      <label><span>Industry</span><input type="hidden" name="industry" value={industryChoice === "other" ? customIndustry.trim() : industryChoice} /><select value={industryChoice} onChange={event => {setIndustryChoice(event.target.value);setEdited(true);}}><option value="">Select industry</option>{BUSINESS_INDUSTRIES.map(industry => <option key={industry} value={industry}>{industry}</option>)}<option value="other">Other — enter manually</option></select>{industryChoice === "other" && <><span>Specify your industry *</span><input aria-label="Other industry" value={customIndustry} onChange={event => {setCustomIndustry(event.target.value);setEdited(true);}} required pattern={".*\\S.*"} maxLength={160} placeholder="Enter your industry" /></>}</label>
      <label><span>Country</span><select {...field("country")} autoComplete="country-name"><option value="">Select country</option>{values.country && !BUSINESS_COUNTRIES.some(country => country.name === values.country) && <option value={values.country}>{values.country} — previously saved</option>}{BUSINESS_COUNTRIES.map(country => <option key={country.code} value={country.name}>{country.name}</option>)}</select></label>
      <label><span>Number of employees</span><input {...field("employees")} type="number" min="1" max="2147483647" step="1" inputMode="numeric" /><small>Approximate workforce size. Leave blank if not recorded.</small></label>
    </div>
    <footer><span>Updates apply to your company workspace.</span><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save business profile"}</button></footer>
  </form>;
}
