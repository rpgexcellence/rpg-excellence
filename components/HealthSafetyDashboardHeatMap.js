"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { residualBand, riskMatrixPosition } from "../lib/health-safety-dashboard.mjs";
import styles from "./HealthSafetyHubDashboard.module.css";

const likelihoods = ["Very unlikely", "Unlikely", "Possible", "Likely", "Very likely"];
const severities = ["No injury", "First aid", "LTI under 7d", "LTI 7+d", "Fatality"];
const levels = [1, 2, 3, 4, 5];
const severityOrder = [5, 4, 3, 2, 1];
const modes = [["current", "Initial"], ["residual", "Residual"]];
const bands = {
  acceptable: "Acceptable",
  adequate: "Adequate",
  inadequate: "Inadequate",
  unacceptable: "Unacceptable",
};

export default function HealthSafetyDashboardHeatMap({ hazards, registerHref, registerAnchor, selection, onSelection, initialMode = "residual", initialCell = "", className = "" }) {
  const [mode, setMode] = useState(initialMode);
  const [localSelected, setSelected] = useState(initialCell);
  const selected = selection ?? localSelected;
  const changeSelection = key => {
    setSelected(key);
    onSelection?.(key ? { key, mode } : null);
  };
  const { cells, total } = useMemo(() => {
    const cells = new Map();
    let total = 0;
    for (const hazard of hazards) {
      const [likelihood, severity] = hazard[mode];
      const position = riskMatrixPosition(likelihood, severity);
      if (!position) continue;
      const key = position.cell;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(hazard);
      total++;
    }
    return { cells, total };
  }, [hazards, mode]);
  const matching = cells.get(selected) ?? [];
  const viewCount = selected ? matching.length : total;
  const [selectedLikelihood, selectedSeverity] = selected.split("-");

  return <section className={`${styles.panel} ${styles.heatPanel} ${className}`} aria-labelledby="hs-heat-map">
    <header className={styles.heatHeader}>
      <div>
        <h2 id="hs-heat-map">Risk heat map</h2>
        <p>Select a cell to see its hazards · <span role="status">{viewCount} {viewCount === 1 ? "hazard" : "hazards"} in view</span></p>
        <p>Large numbers count hazards. The corner number is the risk score.</p>
      </div>
      <div className={styles.heatModes} role="group" aria-label="Risk stage">
        {modes.map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => {
          if (mode === value) return;
          setMode(value);
          changeSelection("");
        }}>{label}</button>)}
      </div>
    </header>
    <div className={styles.heatScroll} role="region" tabIndex={0} aria-label="Likelihood and severity matrix">
      <div className={styles.heatGrid}>
        {severityOrder.map(severity => <div className={styles.heatRow} key={severity}>
          <div className={styles.heatSeverity}><b>{severity}</b><small>{severities[severity - 1]}</small></div>
          {levels.map(likelihood => {
            const score = likelihood * severity;
            const band = residualBand(score);
            const key = likelihood + "-" + severity;
            const size = cells.get(key)?.length ?? 0;
            return <button type="button" className={`${styles.heatCell} ${styles[band]}`} key={key}
              aria-label={`Likelihood ${likelihood}, severity ${severity}, score ${score}, ${bands[band]}, ${size} ${size === 1 ? "hazard" : "hazards"}`}
              aria-pressed={selected === key} onClick={() => changeSelection(selected === key ? "" : key)}>
              <span>{score}</span><strong>{size}</strong><small>{bands[band]}</small>
            </button>;
          })}
        </div>)}
        <div className={`${styles.heatRow} ${styles.heatLikelihood}`}><span />
          {levels.map(likelihood => <div key={likelihood}><b>{likelihood}</b><small>{likelihoods[likelihood - 1]}</small></div>)}
        </div>
        <div className={styles.heatAxis}>Likelihood →</div>
      </div>
    </div>
    {selected && <div className={styles.heatResults}>
      <h3>Likelihood {selectedLikelihood} × severity {selectedSeverity}</h3>
      {matching.length ? <ul className={styles.list}>{matching.map(hazard => <li key={hazard.id}>
        <Link href={hazard.href ?? registerHref + "/" + encodeURIComponent(hazard.assessmentId)}>{hazard.assessmentLabel || "Open assessment"}</Link>
        <span>{hazard.label}</span>
      </li>)}</ul> : <p>No recorded hazards in this cell.</p>}
    </div>}
    {registerAnchor ? <a className={styles.heatRegister} href={registerAnchor}>{selected ? "See matching assessments ↓" : "View assessment register ↓"}</a>
      : <Link className={styles.heatRegister} href={registerHref}>Open risk register →</Link>}
  </section>;
}
