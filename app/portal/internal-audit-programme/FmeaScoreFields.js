"use client";

import { useMemo, useState } from "react";

function band(rpn) {
  if (rpn >= 300) return ["Critical", "#b42318", "#fff0ee"];
  if (rpn >= 160) return ["High", "#b54708", "#fff7e8"];
  if (rpn >= 80) return ["Medium", "#175cd3", "#eef4ff"];
  return ["Low", "#067647", "#e8f8ef"];
}

export default function FmeaScoreFields() {
  const [severity, setSeverity] = useState(5);
  const [occurrence, setOccurrence] = useState(5);
  const [detection, setDetection] = useState(5);
  const rpn = useMemo(() => severity * occurrence * detection, [severity, occurrence, detection]);
  const [label, color, background] = band(rpn);
  const score = (name, value, setter, help) => (
    <label className="iapField"><span>{name} · 1–10</span><select name={name.toLowerCase()} value={value} onChange={(event) => setter(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{item}</option>)}</select><small>{help}</small></label>
  );
  return <><div className="iapGrid3">{score("Severity", severity, setSeverity, "Impact if the audit risk occurs")}{score("Occurrence", occurrence, setOccurrence, "Likelihood or frequency of the condition")}{score("Detection", detection, setDetection, "10 means least likely to detect before impact")}</div><div className="iapRpn" style={{ color, background }}><span>Calculated risk priority number</span><strong>{rpn}</strong><b>{label} audit priority</b></div></>;
}
