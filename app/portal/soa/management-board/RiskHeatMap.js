"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { soaControlHref } from "../../../../lib/soa-workflow.mjs";
import { THEMES } from "./metrics.mjs";
import styles from "./board.module.css";

const modes = [["inherent", "Inherent"], ["residual", "Residual"], ["target", "Target"]];
const likelihoodLabels = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const impactLabels = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];

function band(score) {
  if (score >= 20) return ["Critical", "#aa3026", "#fff"];
  if (score >= 10) return ["High", "#e46638", "#25160d"];
  if (score >= 5) return ["Moderate", "#eeb83c", "#2f270f"];
  return ["Low", "#2e9168", "#fff"];
}

export default function RiskHeatMap({ risks }) {
  const [mode, setMode] = useState("residual");
  const [selected, setSelected] = useState(null);
  const label = modes.find(([key]) => key === mode)[1];
  const { cells, mapped } = useMemo(() => {
    const cells = new Map();
    const mapped = [];
    for (const control of risks) {
      const position = control.positions[mode];
      if (!position) continue;
      const { likelihood, impact } = position;
      const key = likelihood + "-" + impact;
      const row = { ...control, ...position };
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(row);
      mapped.push(row);
    }
    return { cells, mapped };
  }, [risks, mode]);
  const visible = selected ? cells.get(selected) ?? [] : mapped;
  const missing = risks.length - mapped.length;
  return <section className={styles.panel} aria-labelledby="soa-control-risk-title">
    <div className={styles.panelHead}>
      <h2 id="soa-control-risk-title">SoA control risk heat map</h2>
      <div className={styles.scoreModes} role="group" aria-label="SoA risk scoring basis">
        {modes.map(([key, name]) => <button type="button" key={key} aria-pressed={mode === key}
          onClick={() => { setMode(key); setSelected(null); }}>{name}</button>)}
      </div>
    </div>
    <p>Select a cell to see Annex A controls at that risk position.</p>
    <div className={styles.controlMatrixScroll} role="region" aria-label={label + " likelihood and impact matrix"} tabIndex={0}>
      <div className={styles.controlMatrix}>
        {[5, 4, 3, 2, 1].map(impact => <div className={styles.matrixRow} key={impact}>
          <span className={styles.impactLabel}><b>{impact}</b><small>{impactLabels[impact - 1]}</small></span>
          {[1, 2, 3, 4, 5].map(likelihood => {
            const key = likelihood + "-" + impact;
            const score = likelihood * impact;
            const [name, background, color] = band(score);
            const count = cells.get(key)?.length ?? 0;
            return <button type="button" key={key} style={{ background, color }} aria-pressed={selected === key}
              aria-label={likelihoodLabels[likelihood - 1] + " likelihood, " + impactLabels[impact - 1] + " impact, score " + score + ", " + count + " controls"}
              onClick={() => setSelected(selected === key ? null : key)}><i>{score}</i><strong>{count}</strong><small>{name}</small></button>;
          })}
        </div>)}
        <div className={styles.matrixRow}><span/>{likelihoodLabels.map((name, index) =>
          <span className={styles.likelihoodLabel} key={name}><b>{index + 1}</b><small>{name}</small></span>)}</div>
        <p className={styles.matrixAxis}>Likelihood →</p>
      </div>
    </div>
    <div className={styles.panelHead}>
      <p aria-live="polite"><strong>{visible.length} of {mapped.length} mapped controls shown</strong>
        {missing > 0 && " · " + missing + " without a recorded " + label.toLowerCase() + " position"}</p>
      <button className={styles.boardButton} type="button" onClick={() => setSelected(null)} disabled={!selected}>Show all mapped controls</button>
    </div>
    {visible.length ? <div className={styles.queueScroll} role="region" aria-label="Mapped Annex A controls" tabIndex={0}><table className={styles.mappedControls}>
      <thead><tr><th scope="col">Annex A control</th><th scope="col">Theme</th><th scope="col">{label} score</th><th scope="col">Band</th></tr></thead>
      <tbody>{visible.map(row => <tr key={row.assessmentId + ":" + row.controlId}>
        <th scope="row"><Link href={soaControlHref(row.assessmentId, row.controlId)}>A.{row.controlId} · {row.title}</Link></th>
        <td>{THEMES[row.theme] ?? "Unclassified"}</td>
        <td>{row.likelihood} × {row.impact} = {row.score}</td><td>{band(row.score)[0]}</td>
      </tr>)}</tbody>
    </table></div> : <p>{!mapped.length && !selected ? "No " + label.toLowerCase() + " positions are recorded for this scope." : "No mapped controls in the selected cell."}</p>}
  </section>;
}
