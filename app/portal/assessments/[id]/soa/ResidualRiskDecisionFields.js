"use client";

import { useState } from "react";

const LEVELS = [
  ["not_assessed", "Not assessed"],
  ["low", "Low — acceptable and monitor"],
  ["moderate", "Moderate — treat or formally accept"],
  ["high", "High — further treatment required"],
  ["critical", "Critical — immediate escalation"],
];

const TREATMENTS = [
  ["pending", "Pending decision"],
  ["monitor", "Monitor"],
  ["accept", "Accept"],
  ["reduce", "Reduce"],
  ["avoid", "Avoid"],
  ["share", "Share / transfer"],
];

export default function ResidualRiskDecisionFields({ row, fieldKey, canEdit, fieldStyle, labelStyle }) {
  const [riskLevel, setRiskLevel] = useState(row.residual_risk_level ?? "not_assessed");
  const originalTreatment = row.treatment_decision ?? "pending";
  const [treatment, setTreatment] = useState(originalTreatment);
  const elevated = riskLevel === "high" || riskLevel === "critical";
  const accountable = elevated || riskLevel === "moderate";
  const acceptanceRequired = elevated || treatment === "accept";

  const changeRiskLevel = (event) => {
    const next = event.target.value;
    setRiskLevel(next);
    if ((next === "high" || next === "critical") && ["pending", "monitor"].includes(treatment)) {
      setTreatment("");
    }
  };

  return <>
    <label style={labelStyle}>Residual risk level
      <select name={`residual_risk_level_${fieldKey}`} value={riskLevel} onChange={changeRiskLevel} style={fieldStyle} disabled={!canEdit}>
        {LEVELS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
    </label>

    <label style={labelStyle}>Treatment decision
      <select name={`treatment_decision_${fieldKey}`} value={treatment} onChange={(event) => setTreatment(event.target.value)} style={fieldStyle} disabled={!canEdit} required={elevated}>
        {elevated && <option value="" disabled>Select controlled treatment *</option>}
        {TREATMENTS.map(([value, label]) => <option value={value} key={value} disabled={elevated && ["pending", "monitor"].includes(value)}>{label}{elevated && ["pending", "monitor"].includes(value) ? " — unavailable for High/Critical risk" : ""}</option>)}
      </select>
      <small style={{color:elevated ? "#b42318" : "#60758d",fontWeight:elevated ? 800 : 600}}>{elevated ? "Choose Reduce, Avoid, Share / transfer or formally authorised Accept." : "Select the controlled response to the remaining risk."}</small>
    </label>

    <label style={{...labelStyle,gridColumn:"1 / -1"}}>Residual risk rationale
      <textarea name={`residual_risk_rationale_${fieldKey}`} defaultValue={row.residual_risk_rationale ?? row.residual_risk ?? ""} rows={3} style={fieldStyle} disabled={!canEdit} placeholder="Explain the remaining threat, likelihood, impact and why this rating is justified after existing controls."/>
    </label>

    <label style={labelStyle}>Risk owner {accountable ? "*" : ""}
      <input name={`risk_owner_${fieldKey}`} defaultValue={row.risk_owner ?? ""} style={fieldStyle} disabled={!canEdit} required={accountable} placeholder="Person accountable for the residual risk"/>
      {accountable && <small style={{color:"#b42318",fontWeight:800}}>Required for Moderate, High or Critical residual risk.</small>}
    </label>

    <label style={labelStyle}>Action required {elevated ? "*" : ""}
      <textarea name={`action_required_${fieldKey}`} defaultValue={row.action_required ?? ""} rows={2} style={fieldStyle} disabled={!canEdit} required={elevated}/>
      {elevated && <small style={{color:"#b42318",fontWeight:800}}>Record the controlled action required to reduce or govern this exposure.</small>}
    </label>

    <label style={labelStyle}>Risk acceptance authority {acceptanceRequired ? "*" : ""}
      <input name={`risk_acceptance_authority_${fieldKey}`} defaultValue={row.risk_acceptance_authority ?? ""} style={fieldStyle} disabled={!canEdit} required={acceptanceRequired} placeholder="Accountable person authorising the residual risk"/>
    </label>

    <label style={labelStyle}>Risk acceptance date {acceptanceRequired ? "*" : ""}
      <input type="date" name={`risk_accepted_at_${fieldKey}`} defaultValue={row.risk_accepted_at ? String(row.risk_accepted_at).slice(0,10) : ""} style={fieldStyle} disabled={!canEdit} required={acceptanceRequired}/>
    </label>

    <label style={labelStyle}>Risk review date {elevated ? "*" : ""}
      <input type="date" name={`risk_review_due_at_${fieldKey}`} defaultValue={row.risk_review_due_at ? String(row.risk_review_due_at).slice(0,10) : ""} style={fieldStyle} disabled={!canEdit} required={elevated}/>
    </label>

    <label style={labelStyle}>Action target date
      <input type="date" name={`target_date_${fieldKey}`} defaultValue={row.target_date ? String(row.target_date).slice(0,10) : ""} style={fieldStyle} disabled={!canEdit}/>
    </label>

    {elevated && <div className="notice error" style={{gridColumn:"1 / -1",margin:0}} role="status"><strong>{riskLevel === "critical" ? "Critical" : "High"} residual risk controls required.</strong> Complete the treatment decision, named risk owner, controlled action, acceptance authority, acceptance date and review date before saving. The implementation status cannot be Effective.</div>}
  </>;
}
