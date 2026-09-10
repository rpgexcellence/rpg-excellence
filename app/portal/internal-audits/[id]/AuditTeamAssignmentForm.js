"use client";

import { useMemo, useState } from "react";
import { addAuditTeamMember } from "./actions";

const ROLE_LABELS = {
  lead_auditor: "Lead auditor",
  auditor: "Auditor",
  technical_expert: "Technical expert",
  observer: "Observer",
  trainee: "Trainee auditor",
  independent_reviewer: "Independent reviewer",
};

export default function AuditTeamAssignmentForm({ auditId, auditors = [], standards = [] }) {
  const [auditorId, setAuditorId] = useState("");
  const [assignedStandards, setAssignedStandards] = useState([]);
  const [clientError, setClientError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const auditor = useMemo(
    () => auditors.find((item) => item.id === auditorId) ?? null,
    [auditorId, auditors]
  );

  const authorisations = useMemo(() => {
    const map = new Map();
    for (const item of auditor?.standard_authorisations ?? []) {
      const current = item.authorisation_status === "authorised" && (!item.authorised_until || item.authorised_until >= today);
      map.set(item.standard_id, { current, expires: item.authorised_until || null, status: item.authorisation_status });
    }
    return map;
  }, [auditor, today]);

  const chooseAuditor = (event) => {
    setAuditorId(event.target.value);
    setAssignedStandards([]);
    setClientError("");
  };

  const toggleStandard = (standardId) => {
    setAssignedStandards((current) => current.includes(standardId)
      ? current.filter((item) => item !== standardId)
      : [...current, standardId]);
    setClientError("");
  };

  const validate = (event) => {
    if (!auditorId) {
      event.preventDefault();
      setClientError("Select a currently verified auditor before assigning standards.");
      return;
    }
    if (!assignedStandards.length) {
      event.preventDefault();
      setClientError("Select at least one standard within this auditor's authorised competence scope.");
    }
  };

  return <form action={addAuditTeamMember} onSubmit={validate}>
    <input type="hidden" name="audit_id" value={auditId}/>
    <div className="grid3">
      <label className="field"><span>Verified auditor *</span>
        <select name="auditor_register_id" required value={auditorId} onChange={chooseAuditor}>
          <option value="">Select verified auditor</option>
          {auditors.map((item) => <option key={item.id} value={item.id}>{item.full_name} · valid to {item.verified_until}</option>)}
        </select>
        <small>{auditors.length} current verified auditor{auditors.length === 1 ? "" : "s"}. Standards will be enabled only where current authorisation exists.</small>
      </label>
      <label className="field"><span>Audit role *</span>
        <select name="audit_role" defaultValue="auditor">{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
      <label className="field"><span>Assigned audit scope</span><textarea name="assigned_scope" required placeholder="Processes, clauses, sites or activities assigned to this auditor"/></label>
    </div>

    <fieldset className="section">
      <legend><strong>Standards assigned to this auditor *</strong></legend>
      {!auditor && <div className="notice"><strong>Select an auditor first.</strong> The system will compare the audit standards with that person's verified competence scope.</div>}
      <div className="grid2">
        {standards.map((standard) => {
          const authorisation = authorisations.get(standard.standard_id);
          const permitted = Boolean(auditor && authorisation?.current);
          const expired = authorisation?.expires && authorisation.expires < today;
          const reason = !auditor
            ? "Select an auditor"
            : !authorisation
              ? "Not included in verified competence scope"
              : expired
                ? `Authorisation expired ${authorisation.expires}`
                : authorisation.status !== "authorised"
                  ? `Status: ${String(authorisation.status || "not authorised").replaceAll("_", " ")}`
                  : `Authorised${authorisation.expires ? ` until ${authorisation.expires}` : ""}`;

          return <label className={`check${permitted ? "" : " disabled"}`} key={standard.standard_id} style={!permitted ? {opacity:.58,cursor:"not-allowed"} : undefined}>
            <input
              type="checkbox"
              name="assigned_standard_ids"
              value={standard.standard_id}
              checked={assignedStandards.includes(standard.standard_id)}
              disabled={!permitted}
              onChange={() => toggleStandard(standard.standard_id)}
            />
            <span><strong>{standard.display_name || standard.standard_code || "Selected audit standard"}</strong><br/><small>{reason}</small></span>
          </label>;
        })}
      </div>
    </fieldset>

    <div className="grid3">
      <label className="field"><span>Standards competence rationale</span><textarea name="standards_competence" placeholder="Optional audit-specific rationale; controlled authorisation is checked by the system."/></label>
      <label className="field"><span>Sector competence</span><textarea name="sector_competence"/></label>
      <label className="field"><span>Technical competence</span><textarea name="technical_competence"/></label>
      <label className="check"><input type="checkbox" checked readOnly/><span>Current register verification confirmed by the system</span></label>
      <label className="check"><input type="checkbox" name="independence_confirmed" required/><span>Independence and impartiality confirmed for this audit</span></label>
      <label className="check"><input type="checkbox" name="confidentiality_confirmed" required/><span>Confidentiality obligations confirmed</span></label>
    </div>

    {clientError && <div className="notice error" role="alert"><strong>Assignment cannot be submitted.</strong> {clientError}</div>}
    {auditor && !standards.some((standard) => authorisations.get(standard.standard_id)?.current) && <div className="notice error" role="status"><strong>No compatible standard authorisation.</strong> Update this auditor's controlled verification record or select another verified auditor.</div>}
    {auditors.length ? <div className="actionBar"><button className="button primary" disabled={!auditorId || !assignedStandards.length}>Assign Verified Auditor</button></div> : null}
  </form>;
}
