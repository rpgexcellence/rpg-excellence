"use client";

import { useMemo, useState } from "react";

const band = (risk) => {
  if (risk?.priority_override) return risk.priority_override;
  const value = risk?.planning_score ?? risk?.audit_priority ?? risk?.rpn ?? 0;
  if (risk?.planning_score != null) return value >= 100 ? "critical" : value >= 70 ? "high" : value >= 40 ? "medium" : "low";
  return value >= 300 ? "critical" : value >= 200 ? "high" : value >= 100 ? "medium" : "low";
};
const score = (risk) => risk?.planning_score ?? risk?.audit_priority ?? risk?.rpn ?? 0;
const iso = (date) => date.toISOString().slice(0, 10);

function recommendedDate(risk, cycleStart, cycleEnd) {
  if (!risk) return "";
  const start = new Date(`${cycleStart}T00:00:00Z`);
  const end = new Date(`${cycleEnd}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const baseline = today > start ? today : start;
  const months = band(risk) === "critical" ? 3 : band(risk) === "high" ? 12 : band(risk) === "medium" ? 18 : Math.min(36, risk.required_frequency_months || 36);
  const target = new Date(baseline);
  target.setUTCMonth(target.getUTCMonth() + months);
  return iso(target > end ? end : target);
}

export default function AuditScheduleFields({ risks, cycleStart, cycleEnd, leadAuditor }) {
  const [riskId, setRiskId] = useState("");
  const [title, setTitle] = useState("");
  const [processArea, setProcessArea] = useState("");
  const [priority, setPriority] = useState("medium");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [rationale, setRationale] = useState("");
  const selectedRisk = useMemo(() => risks.find((risk) => risk.id === riskId), [riskId, risks]);

  function chooseRisk(id) {
    setRiskId(id);
    const risk = risks.find((item) => item.id === id);
    if (!risk) return;
    const target = recommendedDate(risk, cycleStart, cycleEnd);
    const riskBand = band(risk);
    setTitle(`${risk.process_area} risk-based internal audit`);
    setProcessArea(risk.process_area || "");
    setPriority(riskBand === "lower" ? "low" : riskBand);
    setPlannedStart(target);
    setPlannedEnd(target);
    setRationale(`Scheduled from ${risk.source_fmea_reference || "the recorded FMEA risk assessment"}; planning score ${score(risk)}, ${riskBand} priority, recommended frequency every ${risk.required_frequency_months || 36} months. Lead auditor to confirm timing, scope, sampling and clause coverage.`);
  }

  return <>
    <div className="iapGrid3">
      <label className="iapField"><span>FMEA risk basis</span><select name="risk_id" value={riskId} onChange={(event) => chooseRisk(event.target.value)}><option value="">Programme judgement / no single risk</option>{risks.map((risk) => <option value={risk.id} key={risk.id}>{risk.source_fmea_reference ? `${risk.source_fmea_reference} · ` : ""}{score(risk)} · {risk.process_area} · {risk.failure_mode}</option>)}</select></label>
      <label className="iapField"><span>Audit title *</span><input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="iapField"><span>Process area *</span><input name="process_area" required value={processArea} onChange={(event) => setProcessArea(event.target.value)} /></label>
      <label className="iapField"><span>Planned start *</span><input name="planned_start" type="date" required min={cycleStart} max={cycleEnd} value={plannedStart} onChange={(event) => { const nextStart = event.target.value; setPlannedStart(nextStart); if (!plannedEnd || plannedEnd < nextStart) setPlannedEnd(nextStart); }} /></label>
      <label className="iapField"><span>Planned end *</span><input name="planned_end" type="date" required min={plannedStart || cycleStart} max={cycleEnd} value={plannedEnd} onChange={(event) => setPlannedEnd(event.target.value)} /></label>
      <label className="iapField"><span>Priority</span><select name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
      <label className="iapField"><span>Scope type</span><select name="scope_type" defaultValue="site_and_process"><option value="site_and_process">Site and process</option><option value="central_function">Central function</option><option value="cross_site">Cross-site process</option><option value="system_wide">System-wide integrated audit</option></select></label>
      <label className="iapField"><span>Method</span><select name="audit_method" defaultValue="onsite"><option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></label>
      <label className="iapField"><span>Estimated audit days</span><input name="estimated_days" type="number" min="0.5" step="0.5" defaultValue="1" /></label>
      <label className="iapField"><span>Lead auditor</span><input name="lead_auditor_name" defaultValue={leadAuditor} /></label>
      <label className="iapField"><span>Audit team</span><input name="audit_team" placeholder="Auditors, technical experts and observers" /></label>
    </div>
    {selectedRisk && <div className="iapNotice"><strong>{selectedRisk.source_fmea_reference || "FMEA risk"}</strong> selected · score {score(selectedRisk)} · {band(selectedRisk)} priority · target date {recommendedDate(selectedRisk, cycleStart, cycleEnd)}. The lead auditor may adjust the date but must retain a clear rationale.</div>}
    <label className="iapField" style={{marginTop:14}}><span>Risk-based scheduling rationale *</span><textarea name="rationale" required value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Explain timing, frequency, priority, sampling and relationship to prior performance or change." /></label>
  </>;
}
