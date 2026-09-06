"use client";

import { useMemo, useState } from "react";

function classification(score) {
  if (score >= 300) return { label: "Critical", color: "#b42318", background: "#fff0ee", frequency: 12, guidance: "Audit at least annually" };
  if (score >= 200) return { label: "High", color: "#b54708", background: "#fff7e8", frequency: 18, guidance: "Audit within 12–18 months" };
  if (score >= 100) return { label: "Medium", color: "#175cd3", background: "#eef4ff", frequency: 36, guidance: "Audit at least once during the cycle" };
  return { label: "Lower", color: "#067647", background: "#e8f8ef", frequency: 36, guidance: "Sample according to Lead Auditor judgement" };
}

export default function FmeaScoreFields() {
  const [regulatory, setRegulatory] = useState(3);
  const [impact, setImpact] = useState(3);
  const [customer, setCustomer] = useState(3);
  const [detectability, setDetectability] = useState(3);
  const [frequencyOverride, setFrequencyOverride] = useState("");
  const priority = useMemo(() => regulatory * impact * customer * detectability, [regulatory, impact, customer, detectability]);
  const result = classification(priority);
  const selectedFrequency = frequencyOverride || String(result.frequency);
  const score = (label, name, value, setter, help) => (
    <label className="iapField"><span>{label} · 1–5</span><select name={name} value={value} onChange={(event) => setter(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>{item}</option>)}</select><small>{help}</small></label>
  );
  return <>
    <div className="iapGrid2">
      {score("Regulatory exposure", "regulatory_exposure", regulatory, setRegulatory, "5 = highest statutory, regulatory, accreditation or certification exposure")}
      {score("Impact if process fails", "process_failure_impact", impact, setImpact, "5 = highest impact on system, operations or objectives")}
      {score("Probability of customer impact", "customer_impact_probability", customer, setCustomer, "5 = highest probability of affecting customers or interested parties")}
      {score("Detectability of process failure", "failure_detectability", detectability, setDetectability, "5 = failure is very difficult or impossible to detect")}
    </div>
    <input type="hidden" name="severity" value={impact} />
    <input type="hidden" name="occurrence" value={customer} />
    <input type="hidden" name="detection" value={detectability} />
    <div className="iapRpn" style={{ color: result.color, background: result.background }}><span>Audit Priority = Regulatory × Impact × Customer × Detectability</span><strong>{priority}</strong><b>{result.label} · {result.guidance}</b></div>
    <label className="iapField" style={{ marginTop: 14 }}><span>Planned audit frequency</span><select name="required_frequency_months" value={selectedFrequency} onChange={(event) => setFrequencyOverride(event.target.value)}><option value="3">Quarterly</option><option value="6">Every 6 months</option><option value="12">Annual</option><option value="18">Every 18 months</option><option value="24">Every 24 months</option><option value="36">Once during the three-year cycle</option></select><small>System recommendation: {result.guidance}. Any different selection requires Lead Auditor rationale.</small></label>
  </>;
}
