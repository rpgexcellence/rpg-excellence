"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TREATMENTS = [["pending","Pending decision"],["monitor","Monitor"],["accept","Accept"],["reduce","Reduce"],["avoid","Avoid"],["share","Share / transfer"]];
const LIKELIHOOD = [[1,"Rare"],[2,"Unlikely"],[3,"Possible"],[4,"Likely"],[5,"Almost certain"]];
const IMPACT = [[1,"Insignificant"],[2,"Minor"],[3,"Moderate"],[4,"Major"],[5,"Severe"]];
const band = (score) => score >= 17 ? "critical" : score >= 10 ? "high" : score >= 5 ? "moderate" : score ? "low" : "not_assessed";
const bandLabel = (value) => ({not_assessed:"Not assessed",low:"Low",moderate:"Moderate",high:"High",critical:"Critical"})[value];
const bandColour = (value) => ({not_assessed:"#60758d",low:"#087a52",moderate:"#9a6700",high:"#c2410c",critical:"#b42318"})[value];

export default function ResidualRiskDecisionFields({ row, fieldKey, canEdit, fieldStyle, labelStyle }) {
  const rootRef = useRef(null);
  const [applicability, setApplicability] = useState(row.applicability ?? "pending");
  const [likelihood, setLikelihood] = useState(row.residual_likelihood ? String(row.residual_likelihood) : "");
  const [impact, setImpact] = useState(row.residual_impact ? String(row.residual_impact) : "");
  const [treatment, setTreatment] = useState(row.treatment_decision ?? "pending");
  const score = likelihood && impact ? Number(likelihood) * Number(impact) : 0;
  const riskLevel = useMemo(() => band(score), [score]);
  const elevated = riskLevel === "high" || riskLevel === "critical";
  const accountable = elevated || riskLevel === "moderate";
  const acceptanceRequired = elevated || treatment === "accept";
  const mappingRequired = applicability === "applicable";

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    const applicabilitySelect = form?.elements?.namedItem(`applicability_${fieldKey}`);
    if (!applicabilitySelect) return undefined;
    const sync = () => setApplicability(applicabilitySelect.value || "pending");
    sync();
    applicabilitySelect.addEventListener("change", sync);
    return () => applicabilitySelect.removeEventListener("change", sync);
  }, [fieldKey]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    form?.dispatchEvent(new CustomEvent("soa-risk-change", { detail: { fieldKey, riskLevel, score } }));
    if (elevated && ["pending", "monitor"].includes(treatment)) setTreatment("");
  }, [elevated, fieldKey, riskLevel, score, treatment]);

  return <>
    <div ref={rootRef} style={{gridColumn:"1 / -1",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,padding:14,border:"1px solid #cbd8e8",borderRadius:10,background:"#f8fbfe"}}>
      <label style={labelStyle}>Likelihood {mappingRequired ? "*" : ""}<select name={`residual_likelihood_${fieldKey}`} value={likelihood} onChange={(event) => setLikelihood(event.target.value)} style={fieldStyle} disabled={!canEdit} required={mappingRequired}><option value="">Select 1–5</option>{LIKELIHOOD.map(([value,label]) => <option value={value} key={value}>{value} — {label}</option>)}</select></label>
      <label style={labelStyle}>Impact {mappingRequired ? "*" : ""}<select name={`residual_impact_${fieldKey}`} value={impact} onChange={(event) => setImpact(event.target.value)} style={fieldStyle} disabled={!canEdit} required={mappingRequired}><option value="">Select 1–5</option>{IMPACT.map(([value,label]) => <option value={value} key={value}>{value} — {label}</option>)}</select></label>
      <label style={labelStyle}>Residual-risk score<input value={score || "Not calculated"} readOnly style={{...fieldStyle,fontWeight:900,color:bandColour(riskLevel)}}/></label>
      <label style={labelStyle}>Calculated risk band<input value={bandLabel(riskLevel)} readOnly style={{...fieldStyle,fontWeight:900,color:bandColour(riskLevel)}}/></label>
      <input type="hidden" name={`residual_risk_score_${fieldKey}`} value={score || ""}/><input type="hidden" name={`residual_risk_level_${fieldKey}`} value={riskLevel}/>
      <div style={{gridColumn:"1 / -1",fontSize:12,color:mappingRequired && !score ? "#b42318" : "#60758d",fontWeight:mappingRequired && !score ? 800 : 600}}>Risk score = Likelihood × Impact. Applicable controls require both values before saving.</div>
    </div>
    <label style={labelStyle}>Treatment decision<select name={`treatment_decision_${fieldKey}`} value={treatment} onChange={(event) => setTreatment(event.target.value)} style={fieldStyle} disabled={!canEdit} required={elevated}>{elevated && <option value="" disabled>Select controlled treatment *</option>}{TREATMENTS.map(([value,label]) => <option value={value} key={value} disabled={elevated && ["pending","monitor"].includes(value)}>{label}{elevated && ["pending","monitor"].includes(value) ? " — unavailable for High/Critical risk" : ""}</option>)}</select><small style={{color:elevated ? "#b42318" : "#60758d",fontWeight:elevated ? 800 : 600}}>{elevated ? "Choose Reduce, Avoid, Share / transfer or formally authorised Accept." : "Select the controlled response to the calculated residual risk."}</small></label>
    <label style={{...labelStyle,gridColumn:"1 / -1"}}>Residual risk rationale<textarea name={`residual_risk_rationale_${fieldKey}`} defaultValue={row.residual_risk_rationale ?? row.residual_risk ?? ""} rows={3} style={fieldStyle} disabled={!canEdit} placeholder="Explain the remaining threat, likelihood, impact and why this rating is justified after existing controls."/></label>
    <label style={labelStyle}>Risk owner {accountable ? "*" : ""}<input name={`risk_owner_${fieldKey}`} defaultValue={row.risk_owner ?? ""} style={fieldStyle} disabled={!canEdit} required={accountable} placeholder="Person accountable for the residual risk"/>{accountable && <small style={{color:"#b42318",fontWeight:800}}>Required for Moderate, High or Critical residual risk.</small>}</label>
    <label style={labelStyle}>Action required {elevated ? "*" : ""}<textarea name={`action_required_${fieldKey}`} defaultValue={row.action_required ?? ""} rows={2} style={fieldStyle} disabled={!canEdit} required={elevated}/>{elevated && <small style={{color:"#b42318",fontWeight:800}}>Record the controlled action required to reduce or govern this exposure.</small>}</label>
    <label style={labelStyle}>Risk acceptance authority {acceptanceRequired ? "*" : ""}<input name={`risk_acceptance_authority_${fieldKey}`} defaultValue={row.risk_acceptance_authority ?? ""} style={fieldStyle} disabled={!canEdit} required={acceptanceRequired} placeholder="Accountable person authorising the residual risk"/></label>
    <label style={labelStyle}>Risk acceptance date {acceptanceRequired ? "*" : ""}<input type="date" name={`risk_accepted_at_${fieldKey}`} defaultValue={row.risk_accepted_at ? String(row.risk_accepted_at).slice(0,10) : ""} style={fieldStyle} disabled={!canEdit} required={acceptanceRequired}/></label>
    <label style={labelStyle}>Risk review date {elevated ? "*" : ""}<input type="date" name={`risk_review_due_at_${fieldKey}`} defaultValue={row.risk_review_due_at ? String(row.risk_review_due_at).slice(0,10) : ""} style={fieldStyle} disabled={!canEdit} required={elevated}/></label>
    <label style={labelStyle}>Action target date<input type="date" name={`target_date_${fieldKey}`} defaultValue={row.target_date ? String(row.target_date).slice(0,10) : ""} style={fieldStyle} disabled={!canEdit}/></label>
    {elevated && <div className="notice error" style={{gridColumn:"1 / -1",margin:0}} role="status"><strong>{bandLabel(riskLevel)} residual risk controls required.</strong> Complete the treatment decision, named risk owner, controlled action, acceptance authority, acceptance date and review date before saving. The implementation status cannot be Effective.</div>}
  </>;
}
