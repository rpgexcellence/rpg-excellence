"use client";

import { useActionState, useState, startTransition } from "react";

export default function RcaTeamMemberForm({ action, caseId, people, team, locked = false }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [personId, setPersonId] = useState("");
  const selected = people.find(person => person.id === personId);
  const alreadyAdded = person => team.some(member => member.organization_person_id === person.id ||
    (!member.organization_person_id && person.email && String(member.email || "").trim().toLowerCase() === person.email.trim().toLowerCase()));
  const available = people.filter(person => !alreadyAdded(person));
  const emailValid = selected && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(selected.email || "").trim());
  const disabled = locked || pending;

  return <form className="rcaTeamForm" style={{ marginTop: 16 }} onSubmit={event => {
    event.preventDefault();
    if (disabled || !selected || alreadyAdded(selected) || !emailValid) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }}>
    <style>{`.rcaTeamForm .rcaTeamGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.rcaTeamForm label{display:grid;gap:8px;min-width:0;font-size:14px;font-weight:800}.rcaTeamForm input,.rcaTeamForm select{box-sizing:border-box;width:100%;min-width:0;min-height:48px;padding:12px 14px;border:1px solid #cfdae8;border-radius:10px;font-size:16px;background:#fff;color:#102640}.rcaTeamForm input[readonly]{background:#f4f7fb}.rcaTeamForm .rcaTeamNotice{padding:12px 14px;border-radius:10px;background:#eef4ff;line-height:1.5;overflow-wrap:anywhere;margin-bottom:14px}.rcaTeamForm .rcaTeamError{background:#fff1ed;color:#a33221}@media(max-width:720px){.rcaTeamForm .rcaTeamGrid{grid-template-columns:minmax(0,1fr)}}`}</style>
    <input type="hidden" name="case_id" value={caseId}/>
    <p style={{ color: "#607089", lineHeight: 1.5 }}>Select a company user. Their name, role and email come from Administration; enter their responsibility for this 8D investigation below.</p>
    {state?.error && <div className="rcaTeamNotice rcaTeamError" role="alert">{state.error}</div>}
    {!people.length && <div className="rcaTeamNotice" role="status">No active company users are available. Add or activate a user under <a href="/portal/company/people">Administration → People, Roles &amp; Access</a>, then refresh this page.</div>}
    {!!people.length && !available.length && <div className="rcaTeamNotice" role="status">All active company users are already in this team.</div>}
    {selected && !emailValid && <div className="rcaTeamNotice rcaTeamError" role="status">Add a valid email for this user under <a href="/portal/company/people">Administration → People, Roles &amp; Access</a>, then refresh this page.</div>}
    <div className="rcaTeamGrid">
      <label>Company user *<select name="organization_person_id" required value={personId} disabled={disabled || !available.length} onChange={event => setPersonId(event.target.value)}>
        <option value="">Select company user</option>
        {people.map(person => <option key={person.id} value={person.id} disabled={alreadyAdded(person)}>{person.name}{person.email ? ` · ${person.email}` : ""}{alreadyAdded(person) ? " · Already added" : ""}</option>)}
      </select></label>
      <label>Company role<input readOnly value={selected?.position || ""} placeholder={selected ? "Not recorded in Administration" : "Filled from company user"}/></label>
      <label>Email address<input readOnly value={selected?.email || ""} placeholder="Filled from company user"/></label>
      <label>8D responsibility<input name="responsibility" disabled={disabled} placeholder="For example: technical investigation or process verification"/></label>
    </div>
    <button type="submit" disabled={disabled || !selected || alreadyAdded(selected) || !emailValid} style={{ marginTop: 14, minHeight: 48, padding: "12px 18px", border: 0, borderRadius: 10, background: "#3155ef", color: "#fff", fontWeight: 800, opacity: disabled || !selected || alreadyAdded(selected) || !emailValid ? 0.55 : 1 }}>{pending ? "Adding…" : "Add Team Member"}</button>
  </form>;
}
