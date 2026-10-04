"use client";
import { useActionState, useState } from "react";
export default function BusinessProfileForm({ action, organization }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [values, setValues] = useState({ name: organization.name || "", industry: organization.industry || "", country: organization.country || "", employees: organization.employees ?? "" });
  const [edited, setEdited] = useState(false);
  const field = key => ({ name:key, value:values[key], onChange:event => {setValues(old => ({...old, [key]:event.target.value}));setEdited(true);} });
  return <form action={formAction} onSubmit={() => setEdited(false)} className="bpForm">
    <header><small>INITIAL BUSINESS SETUP</small><h2>Your business details</h2><p>Review and update the information entered when you created your RPG workspace.</p></header>
    {state?.error && <div className="bpMessage error" role="alert">{state.error}</div>}
    {!edited && state?.success && <div className="bpMessage success" role="status">{state.success}</div>}
    <div className="bpFields">
      <label className="wide"><span>Organisation name *</span><input {...field("name")} required maxLength={180} autoComplete="organization" /></label>
      <label><span>Industry</span><input {...field("industry")} maxLength={160} placeholder="e.g. Engineering" /></label>
      <label><span>Country</span><input {...field("country")} maxLength={100} autoComplete="country-name" placeholder="e.g. United Kingdom" /></label>
      <label><span>Number of employees</span><input {...field("employees")} type="number" min="1" max="2147483647" step="1" inputMode="numeric" /><small>Approximate workforce size. Leave blank if not recorded.</small></label>
    </div>
    <footer><span>Updates apply to your company workspace.</span><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save business profile"}</button></footer>
  </form>;
}
