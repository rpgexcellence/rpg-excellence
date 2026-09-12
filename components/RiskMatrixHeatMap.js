"use client";

import { useMemo, useState } from "react";

const likelihood = [
  { value: 1, label: "Very unlikely", guidance: "Not expected in normal circumstances; strong verified controls make occurrence exceptional." },
  { value: 2, label: "Unlikely", guidance: "Could occur, but exposure is limited and verified controls are dependable." },
  { value: 3, label: "Possible", guidance: "A credible event with meaningful exposure, foreseeable error or variable control reliability." },
  { value: 4, label: "Likely", guidance: "Repeated exposure, known weakness or control failure makes occurrence reasonably foreseeable." },
  { value: 5, label: "Very likely", guidance: "Expected to occur frequently, or exposure is uncontrolled and failure is imminent or recurring." },
];

const severity = [
  { value: 1, label: "Insignificant", guidance: "No injury or negligible effect requiring no treatment and causing minimal disruption." },
  { value: 2, label: "Minor", guidance: "Minor injury or short-term effect requiring basic treatment, with limited disruption." },
  { value: 3, label: "Moderate", guidance: "Lost-time injury, reversible ill health or significant operational/environmental impact." },
  { value: 4, label: "Major", guidance: "Serious injury, permanent impairment, major ill health or substantial operational/environmental harm." },
  { value: 5, label: "Catastrophic", guidance: "Single or multiple fatality, life-changing harm or catastrophic environmental/business impact." },
];

function bandFor(score) {
  if (score <= 4) return { name: "Acceptable", className: "acceptable", action: "Maintain the controls, communicate them and monitor for change. Further improvement may still be reasonably practicable." };
  if (score <= 9) return { name: "Adequate", className: "adequate", action: "Confirm controls are implemented and effective. Plan proportionate improvement and continue monitoring." };
  if (score <= 14) return { name: "Inadequate", className: "inadequate", action: "Do not accept the current position. Assign additional controls, an owner and a timescale; restrict work where necessary." };
  return { name: "Unacceptable", className: "unacceptable", action: "Stop or do not start the work until the risk has been reduced and the controls have been verified." };
}

export default function RiskMatrixHeatMap() {
  const [selectedLikelihood, setSelectedLikelihood] = useState(3);
  const [selectedSeverity, setSelectedSeverity] = useState(4);
  const score = selectedLikelihood * selectedSeverity;
  const band = bandFor(score);
  const selectedLikelihoodData = likelihood[selectedLikelihood - 1];
  const selectedSeverityData = severity[selectedSeverity - 1];
  const rows = useMemo(() => [...severity].reverse(), []);

  return <section className="rmhTool" aria-labelledby="rmh-title">
    <style>{`
      .rmhTool{margin:22px 0;padding:22px;border:1px solid #cbdbe8;border-radius:14px;background:#f8fbfd;color:#092748}.rmhHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.rmhHead small{color:#245cff;font-weight:900;letter-spacing:.1em}.rmhHead h2{margin:6px 0;font-size:25px}.rmhHead p{margin:0;color:#58718a;line-height:1.5}.rmhFormula{white-space:nowrap;padding:10px 13px;border-radius:10px;background:#082a54;color:#fff;font-weight:900}.rmhControls{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.rmhControls label{display:grid;gap:6px;font-weight:850}.rmhControls select{width:100%;padding:11px;border:1px solid #adc1d2;border-radius:8px;background:#fff;color:#092748;font:inherit}.rmhMatrixWrap{overflow-x:auto;padding-bottom:5px}.rmhMatrix{min-width:590px;display:grid;grid-template-columns:128px repeat(5,1fr);gap:5px}.rmhCorner,.rmhColumn,.rmhRow{display:grid;place-items:center;min-height:48px;padding:6px;text-align:center;font-size:11px;font-weight:850;color:#3d5871}.rmhCorner{align-content:center;background:#eaf1f6;border-radius:8px}.rmhCorner span{color:#245cff}.rmhColumn{background:#edf3f8;border-radius:8px}.rmhRow{justify-items:start;text-align:left;background:#edf3f8;border-radius:8px}.rmhCell{position:relative;min-height:64px;border:3px solid transparent;border-radius:9px;color:#092748;cursor:pointer;font:inherit;font-weight:950;transition:transform .12s,border-color .12s}.rmhCell:hover{transform:translateY(-2px);border-color:#092748}.rmhCell.selected{border-color:#092748;box-shadow:0 0 0 3px #fff inset}.rmhCell small{display:block;margin-top:2px;font-size:9px;font-weight:800}.rmhCell.acceptable,.rmhSwatch.acceptable{background:#84dfbd}.rmhCell.adequate,.rmhSwatch.adequate{background:#f3dc68}.rmhCell.inadequate,.rmhSwatch.inadequate{background:#f3ac58}.rmhCell.unacceptable,.rmhSwatch.unacceptable{background:#ec7777}.rmhAxis{margin:8px 0 0 133px;text-align:center;color:#4e6880;font-size:11px;font-weight:850}.rmhResult{margin-top:18px;padding:18px;border-left:7px solid #092748;border-radius:10px;background:#fff}.rmhResultTop{display:flex;justify-content:space-between;gap:12px;align-items:center}.rmhScore{display:flex;gap:9px;align-items:center}.rmhScore b{font-size:30px}.rmhBadge{padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900}.rmhResult h3{margin:12px 0 4px;font-size:15px}.rmhResult p{margin:0;color:#526c83;line-height:1.5}.rmhEvidence{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:12px}.rmhEvidence div{padding:12px;border-radius:9px;background:#eef4f8}.rmhEvidence strong{display:block;margin-bottom:4px}.rmhEvidence span{color:#526c83;font-size:12px;line-height:1.45}.rmhLegend{display:flex;flex-wrap:wrap;gap:10px;margin-top:15px}.rmhLegend span{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:800}.rmhSwatch{width:16px;height:16px;border-radius:4px}.rmhNote{margin-top:14px!important;padding:11px;border-left:4px solid #e3a31f;background:#fff7df;color:#6b511c!important;font-size:12px}@media(max-width:680px){.rmhHead{display:block}.rmhFormula{display:inline-block;margin-top:12px}.rmhControls,.rmhEvidence{grid-template-columns:1fr}.rmhTool{padding:15px}}
    `}</style>
    <header className="rmhHead"><div><small>INTERACTIVE RPG RISK MATRIX</small><h2 id="rmh-title">Explore likelihood × severity</h2><p>Select values or click a coloured cell to examine the rating and required response.</p></div><div className="rmhFormula">L {selectedLikelihood} × S {selectedSeverity} = {score}</div></header>
    <div className="rmhControls">
      <label>Likelihood<select value={selectedLikelihood} onChange={(event) => setSelectedLikelihood(Number(event.target.value))}>{likelihood.map((item) => <option value={item.value} key={item.value}>{item.value} — {item.label}</option>)}</select></label>
      <label>Severity<select value={selectedSeverity} onChange={(event) => setSelectedSeverity(Number(event.target.value))}>{severity.map((item) => <option value={item.value} key={item.value}>{item.value} — {item.label}</option>)}</select></label>
    </div>
    <div className="rmhMatrixWrap"><div className="rmhMatrix">
      <div className="rmhCorner"><span>SEVERITY</span> ↓<br/>LIKELIHOOD →</div>
      {likelihood.map((item) => <div className="rmhColumn" key={item.value}>L{item.value}<br/>{item.label}</div>)}
      {rows.map((severityItem) => <div key={`row-${severityItem.value}`} style={{ display: "contents" }}><div className="rmhRow">S{severityItem.value} — {severityItem.label}</div>{likelihood.map((likelihoodItem) => { const cellScore = likelihoodItem.value * severityItem.value; const cellBand = bandFor(cellScore); const selected = selectedLikelihood === likelihoodItem.value && selectedSeverity === severityItem.value; return <button type="button" title={`${cellScore} — ${cellBand.name}`} aria-label={`Likelihood ${likelihoodItem.value}, severity ${severityItem.value}, score ${cellScore}, ${cellBand.name}`} aria-pressed={selected} className={`rmhCell ${cellBand.className} ${selected ? "selected" : ""}`} onClick={() => { setSelectedLikelihood(likelihoodItem.value); setSelectedSeverity(severityItem.value); }} key={`${severityItem.value}-${likelihoodItem.value}`}>{cellScore}<small>{cellBand.name}</small></button>; })}</div>)}
    </div><p className="rmhAxis">Increasing likelihood →</p></div>
    <div className="rmhResult">
      <div className="rmhResultTop"><div className="rmhScore"><b>{score}</b><span className={`rmhBadge rmhSwatch ${band.className}`}>{band.name}</span></div><strong>L{selectedLikelihood} × S{selectedSeverity}</strong></div>
      <h3>Required response</h3><p>{band.action}</p>
      <div className="rmhEvidence"><div><strong>Why likelihood {selectedLikelihood}?</strong><span>{selectedLikelihoodData.guidance}</span></div><div><strong>Why severity {selectedSeverity}?</strong><span>{selectedSeverityData.guidance}</span></div></div>
      <p className="rmhNote"><strong>Important:</strong> Select values from evidence and credible exposure—not to obtain a preferred colour. Residual risk may be reduced only after further controls are implemented and verified.</p>
    </div>
    <div className="rmhLegend"><span><i className="rmhSwatch acceptable"/>1–4 Acceptable</span><span><i className="rmhSwatch adequate"/>5–9 Adequate</span><span><i className="rmhSwatch inadequate"/>10–14 Inadequate</span><span><i className="rmhSwatch unacceptable"/>15–25 Unacceptable</span></div>
  </section>;
}
