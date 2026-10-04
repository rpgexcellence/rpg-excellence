"use client";
import { useState } from "react";

export default function CompanyAuditorForm({ action, organizations = [], companyPeople = [], standards = [], initialOrganization = "" }) {
  const [organizationId, setOrganizationId] = useState(organizations.some(row => row.id === initialOrganization) ? initialOrganization : organizations[0]?.id || "");
  const [personId, setPersonId] = useState("");
  const people = companyPeople.filter(person => person.organization_id === organizationId);
  const selected = people.find(person => person.id === personId);
  const fullName = person => [person.first_name, person.last_name].filter(Boolean).join(" ");
  return <form className="companyAuditorForm" action={action}>
    {!people.length && <div className="companyAuditorWarning" role="alert"><strong>No active company users available.</strong><p>Add or activate a user under <a href="/portal/admin">Administration</a> → <a href="/portal/company/people?new=1">People, Roles &amp; Access</a>, then refresh this page.</p></div>}
    <div className="avGrid3">
      <label><span>Organisation *</span><select name="organization_id" required value={organizationId} onChange={event => { setOrganizationId(event.target.value); setPersonId(""); }}><option value="" disabled>Select organisation</option>{organizations.map(organization => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
      <label><span>Full name *</span><select name="company_person_id" required disabled={!people.length} value={personId} onChange={event => setPersonId(event.target.value)}><option value="" disabled>{people.length ? "Select a company user" : "Add user under Administration"}</option>{people.map(person => <option key={person.id} value={person.id}>{[fullName(person), person.position, person.email].filter(Boolean).join(" · ")}</option>)}</select><small className="companyAuditorHelp">Person not listed? <a href="/portal/company/people?new=1">Add or activate them under Administration.</a></small></label>
      <label><span>Email *</span><input type="email" value={selected?.email || ""} readOnly placeholder="Filled from the company profile" /></label>
      <label><span>Employee / contractor reference</span><input value={selected?.employee_reference || ""} readOnly placeholder="Filled from the company profile" /></label>
      <label><span>Job title</span><input value={selected?.position || ""} readOnly placeholder="Filled from the company profile" /></label>
      <label><span>Audit training</span><input name="audit_training" placeholder="ISO 19011, lead auditor course, mentoring" /></label>
      <label><span>Sector competence</span><textarea name="sector_competence" /></label>
      <label><span>Technical competence</span><textarea name="technical_competence" /></label>
      <label><span>Audit experience</span><textarea name="audit_experience" /></label>
    </div>
    <fieldset style={{border:0,padding:0,margin:"18px 0"}}><legend><strong>Standards competence scope *</strong></legend><div className="avStandards">{standards.map(standard => <label className="avStandard" key={standard.id}><input type="checkbox" name="standard_ids" value={standard.id} /><span>{standard.display_name}</span></label>)}</div></fieldset>
    <button type="submit" className="avPrimary" disabled={!selected}>Add Auditor as Pending</button>
    <style>{`.companyAuditorWarning{margin:0 0 18px;padding:16px;border:1px solid #efc06b;border-radius:10px;background:#fff8e8;color:#725100}.companyAuditorWarning p{margin:7px 0 0;line-height:1.5}.companyAuditorWarning a,.companyAuditorHelp a{color:#175bc0;font-weight:800;text-decoration:underline}.companyAuditorHelp{display:block;line-height:1.5;color:#61758a;font-size:12px}.companyAuditorForm .avGrid3 input[readonly]{background:#f3f7fb;color:#173b60}.avPrimary:disabled{opacity:.5;cursor:not-allowed}@media(max-width:600px){.companyAuditorWarning{padding:13px;overflow-wrap:anywhere}.companyAuditorHelp{font-size:13px}}`}</style>
  </form>;
}
