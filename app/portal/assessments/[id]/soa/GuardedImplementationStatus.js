"use client";

import { useEffect, useRef, useState } from "react";

const OPTIONS = [
  ["not_assessed", "Not assessed"],
  ["not_implemented", "Not implemented"],
  ["planned", "Planned"],
  ["partially_implemented", "Partially implemented"],
  ["implemented", "Implemented"],
  ["effective", "Effective"],
];

export default function GuardedImplementationStatus({ name, riskLevelName, defaultValue = "not_assessed", disabled = false, style }) {
  const selectRef = useRef(null);
  const [implementationStatus, setImplementationStatus] = useState(defaultValue);
  const [riskLevel, setRiskLevel] = useState("not_assessed");
  const elevated = riskLevel === "high" || riskLevel === "critical";

  useEffect(() => {
    const form = selectRef.current?.closest("form");
    const riskSelect = form?.elements?.namedItem(riskLevelName);
    if (!riskSelect) return undefined;

    const syncRisk = () => setRiskLevel(riskSelect.value || "not_assessed");
    const fieldKey = riskLevelName.replace(/^residual_risk_level_/, "");
    const syncCalculatedRisk = (event) => {
      if (event.detail?.fieldKey === fieldKey) {
        setRiskLevel(event.detail.riskLevel || "not_assessed");
      }
    };
    syncRisk();
    riskSelect.addEventListener("change", syncRisk);
    form.addEventListener("soa-risk-change", syncCalculatedRisk);
    return () => {
      riskSelect.removeEventListener("change", syncRisk);
      form.removeEventListener("soa-risk-change", syncCalculatedRisk);
    };
  }, [riskLevelName]);

  useEffect(() => {
    if (elevated && implementationStatus === "effective") {
      setImplementationStatus("implemented");
    }
  }, [elevated, implementationStatus]);

  return <>
    <select
      ref={selectRef}
      name={name}
      value={implementationStatus}
      onChange={(event) => setImplementationStatus(event.target.value)}
      style={style}
      disabled={disabled}
      aria-describedby={`${name}_risk_guard`}
    >
      {OPTIONS.map(([value, label]) => <option value={value} key={value} disabled={value === "effective" && elevated}>{label}{value === "effective" && elevated ? " — unavailable for High/Critical risk" : ""}</option>)}
    </select>
    <small id={`${name}_risk_guard`} style={{ color: elevated ? "#b42318" : "#60758d", fontWeight: elevated ? 800 : 600, lineHeight: 1.4 }}>
      {elevated
        ? `${riskLevel === "critical" ? "Critical" : "High"} residual risk requires further controlled treatment; this control cannot be concluded Effective.`
        : "Effective is available only when residual risk is below High and effectiveness is supported by objective evidence."}
    </small>
  </>;
}
