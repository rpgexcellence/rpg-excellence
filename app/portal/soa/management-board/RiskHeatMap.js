"use client";

import { useMemo, useState } from "react";

const likelihoodLabels = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const impactLabels = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];

function band(score) {
  if (score >= 17) return { label: "Critical", colour: "#b42318", text: "#fff" };
  if (score >= 10) return { label: "High", colour: "#e35d2f", text: "#fff" };
  if (score >= 5) return { label: "Moderate", colour: "#f0b429", text: "#322100" };
  return { label: "Low", colour: "#35a56f", text: "#fff" };
}

export default function RiskHeatMap({ risks }) {
  const [selected, setSelected] = useState(null);
  const cells = useMemo(() => {
    const map = new Map();
    for (const risk of risks) {
      const key = `${risk.likelihood}-${risk.impact}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(risk);
    }
    return map;
  }, [risks]);
  const selectedRisks = selected ? cells.get(selected) ?? [] : risks;

  return <section className="riskBoardPanel">
    <div className="riskBoardHead"><div><span>RESIDUAL-RISK MATRIX</span><h2>Interactive SoA risk heat map</h2><p>Select a cell to inspect the controls allocated to that risk position.</p></div><button type="button" onClick={() => setSelected(null)} disabled={!selected}>Show all mapped risks</button></div>
    <div className="heatMapLayout">
      <div className="heatMapAxis impactAxis"><strong>Impact</strong></div>
      <div className="heatMap">
        {[5,4,3,2,1].map((impact) => <div className="heatRow" key={impact}>
          <div className="impactLabel"><strong>{impact}</strong><small>{impactLabels[impact - 1]}</small></div>
          {[1,2,3,4,5].map((likelihood) => {
            const key = `${likelihood}-${impact}`;
            const score = likelihood * impact;
            const style = band(score);
            const count = cells.get(key)?.length ?? 0;
            const active = selected === key;
            return <button type="button" key={key} className={active ? "heatCell active" : "heatCell"} style={{ background: style.colour, color: style.text }} onClick={() => setSelected(active ? null : key)} aria-label={`${likelihoodLabels[likelihood - 1]}, ${impactLabels[impact - 1]}, ${style.label}, ${count} controls`}><b>{score}</b><strong>{count}</strong><small>{style.label}</small></button>;
          })}
        </div>)}
        <div className="likelihoodLabels"><span /><span>1<small>Rare</small></span><span>2<small>Unlikely</small></span><span>3<small>Possible</small></span><span>4<small>Likely</small></span><span>5<small>Almost certain</small></span></div>
        <div className="likelihoodAxis">Likelihood →</div>
      </div>
    </div>
    <div className="riskSelection"><h3>{selected ? `${selectedRisks.length} control${selectedRisks.length === 1 ? "" : "s"} in selected cell` : `${risks.length} mapped residual risks`}</h3>{selectedRisks.length ? <div className="riskRows">{selectedRisks.map((risk) => <a href={`/portal/assessments/${risk.assessmentId}/soa?q=${encodeURIComponent(risk.controlId)}`} key={`${risk.assessmentId}-${risk.controlId}`}><div><strong>A.{risk.controlId} · {risk.title}</strong><small>{risk.organisation} · {risk.theme}</small></div><span>{risk.likelihood} × {risk.impact} = {risk.score}</span><b>{band(risk.score).label}</b></a>)}</div> : <p>No residual risks are allocated to this cell.</p>}</div>
  </section>;
}
