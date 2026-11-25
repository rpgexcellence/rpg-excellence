"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

const riskRegister = "/portal/information-security/risk-management";
const impact = ["", "Insignificant", "Minor", "Moderate", "Major", "Severe"],
  likelihood = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const colour = (s) =>
  s >= 20
    ? ["Critical", "#8e1420", "#fff"]
    : s >= 15
      ? ["Very high", "#c4382b", "#fff"]
      : s >= 10
        ? ["High", "#e66a28", "#fff"]
        : s >= 5
          ? ["Moderate", "#f0bd32", "#302300"]
          : ["Low", "#2e9b68", "#fff"];
export default function ISMSDashboardRiskHeatMap({ risks = [], appetite = null, canOpenRisks = false }) {
  const [mode, setMode] = useState("residual"),
    [selected, setSelected] = useState("");
  const cells = useMemo(() => {
    const out = new Map();
    for (const r of risks) {
      const l = Number(r[`${mode}_likelihood`]),
        i = Number(r[`${mode}_impact`]);
      if (![l, i].every(value => Number.isInteger(value) && value >= 1 && value <= 5)) continue;
      const k = `${l}-${i}`;
      out.set(k, [...(out.get(k) || []), r]);
    }
    return out;
  }, [risks, mode]);
  const matches = selected ? cells.get(selected) ?? [] : [];
  const count = selected ? matches.length : Array.from(cells.values()).reduce((sum, items) => sum + items.length, 0);
  const hasAppetite = appetite !== null && Number.isFinite(Number(appetite));
  return (
    <section className="dashHeat">
      <style>{css}</style>
      <header>
        <div>
          <small>INTERACTIVE RISK POSITION</small>
          <h2>Risk heat map</h2>
          <p>
            Select a cell to see its risks · {count} risk
            {count === 1 ? "" : "s"} in view · {hasAppetite ? "appetite " + appetite + "/25" : "approved appetite unavailable"}
          </p>
        </div>
        <div>
          {["inherent", "residual", "target"].map((x) => (
            <button
              type="button"
              aria-pressed={mode === x}
              className={mode === x ? "active" : ""}
              onClick={() => {
                setMode(x);
                setSelected("");
              }}
              key={x}
            >
              {x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </div>
      </header>
      <div className="matrix" role="region" aria-label="Likelihood and impact matrix" tabIndex={0}>
        {[5, 4, 3, 2, 1].map((i) => (
          <div className="row" key={i}>
            <div className="impact">
              <b>{i}</b>
              <span>{impact[i]}</span>
            </div>
            {[1, 2, 3, 4, 5].map((l) => {
              const score = l * i,
                [band, bg, fg] = colour(score),
                key = `${l}-${i}`,
                n = cells.get(key)?.length || 0;
              return (
                <button
                  type="button"
                  key={key}
                  aria-pressed={selected === key}
                  aria-label={likelihood[l] + " likelihood, " + impact[i] + " impact, score " + score + ", " + band + ", " + n + " risks"}
                  className={selected === key ? "selected" : ""}
                  style={{ background: bg, color: fg }}
                  onClick={() => setSelected(selected === key ? "" : key)}
                >
                  <i>{score}</i>
                  <strong>{n}</strong>
                  <small>{band}</small>
                  {hasAppetite && score > appetite && <em>Above appetite</em>}
                </button>
              );
            })}
          </div>
        ))}
        <footer>
          <span />
          {[1, 2, 3, 4, 5].map((x) => (
            <b key={x}>
              {x}
              <small>{likelihood[x]}</small>
            </b>
          ))}
        </footer>
        <h3>LIKELIHOOD →</h3>
      </div>
      {selected && <div className="cellRisks" aria-live="polite">
        {matches.length ? <ul>{matches.map(risk => <li key={risk.id}>
          {canOpenRisks
            ? <Link href={riskRegister + "?risk=" + encodeURIComponent(risk.id)}>{risk.risk_reference} · {risk.title}</Link>
            : <span>{risk.risk_reference} · {risk.title}</span>}
        </li>)}</ul> : <p>No risks in this cell.</p>}
      </div>}
      {canOpenRisks && <Link href={riskRegister}>Open the controlled risk register →</Link>}
    </section>
  );
}
const css = `
  .dashHeat{min-width:0;padding:18px;border:1px solid #cedce6;border-radius:8px;background:#fff}
  .dashHeat>header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px}
  .dashHeat header small{color:#087d87;font-size:.75rem;font-weight:850;letter-spacing:.1em}
  .dashHeat h2{margin:4px 0}
  .dashHeat header p{margin:0;color:#47637c}
  .dashHeat header>div:last-child{display:flex;flex-wrap:wrap;background:#edf3f7;padding:3px;border-radius:6px}
  .dashHeat header button{cursor:pointer;border:0;background:transparent;padding:7px 8px;border-radius:5px;font-weight:700;color:#385671}
  .dashHeat header button.active{background:#fff;color:#07364a;box-shadow:0 1px 5px #14365025}
  .dashHeat .matrix{max-width:790px;margin:13px auto 7px;overflow:auto;padding:2px}
  .dashHeat .row,.dashHeat .matrix footer{display:grid;grid-template-columns:70px repeat(5,minmax(0,1fr));gap:4px;margin-bottom:4px;min-width:460px}
  .dashHeat .impact{display:grid;align-content:center;text-align:right;padding-right:5px}
  .dashHeat .impact span{font-size:10px;color:#47637c}
  .dashHeat .row>button{height:61px;border:0;border-radius:5px;display:grid;place-content:center;justify-items:center;position:relative;cursor:pointer}
  .dashHeat .row>button.selected{outline:3px solid #07364a;outline-offset:-3px}
  .dashHeat .row i{position:absolute;left:4px;top:3px;font-style:normal;font-size:9px}
  .dashHeat .row strong{font:700 20px/1.08 Georgia,serif}
  .dashHeat .row small{font-size:10px}
  .dashHeat .row em{position:absolute;right:3px;top:3px;font-size:7px;font-style:normal}
  .dashHeat .matrix footer{text-align:center}
  .dashHeat .matrix footer small{display:block;font-size:9px;font-weight:400}
  .dashHeat .matrix h3{text-align:center;font-size:11px;margin:4px 0}
  .dashHeat>a{display:block;text-align:right;color:#087181;font-weight:800}
  .dashHeat .cellRisks{margin:8px 0;padding:8px;background:#f0f6fa;border-radius:5px}
  .dashHeat .cellRisks :is(p,ul){margin:0}
  .dashHeat .cellRisks ul{padding-inline-start:19px}
`;
