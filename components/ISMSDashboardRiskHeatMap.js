"use client";
import { useMemo, useState } from "react";
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
export default function ISMSDashboardRiskHeatMap({ risks = [], appetite = 9 }) {
  const [mode, setMode] = useState("residual"),
    [selected, setSelected] = useState("");
  const cells = useMemo(() => {
    const out = new Map();
    for (const r of risks) {
      const l = Number(r[`${mode}_likelihood`]) || 1,
        i = Number(r[`${mode}_impact`]) || 1,
        k = `${l}-${i}`;
      out.set(k, [...(out.get(k) || []), r]);
    }
    return out;
  }, [risks, mode]);
  const count = selected ? (cells.get(selected) || []).length : risks.length;
  return (
    <section className="dashHeat">
      <style>{css}</style>
      <header>
        <div>
          <small>INTERACTIVE RISK POSITION</small>
          <h2>Risk heat map</h2>
          <p>
            Select a cell to focus the register · {count} risk
            {count === 1 ? "" : "s"} in view · appetite {appetite}/25
          </p>
        </div>
        <div>
          {["inherent", "residual", "target"].map((x) => (
            <button
              type="button"
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
      <div className="matrix">
        {[5, 4, 3, 2, 1].map((i) => (
          <div className="row" key={i}>
            <label>
              <b>{i}</b>
              <span>{impact[i]}</span>
            </label>
            {[1, 2, 3, 4, 5].map((l) => {
              const score = l * i,
                [band, bg, fg] = colour(score),
                key = `${l}-${i}`,
                n = cells.get(key)?.length || 0;
              return (
                <button
                  type="button"
                  key={key}
                  className={selected === key ? "selected" : ""}
                  style={{ background: bg, color: fg }}
                  onClick={() => setSelected(selected === key ? "" : key)}
                >
                  <i>{score}</i>
                  <strong>{n}</strong>
                  <small>{band}</small>
                  {score > appetite && <em>Above appetite</em>}
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
      <a href="/portal/information-security/risk-management">
        Open the controlled risk register →
      </a>
    </section>
  );
}
const css = `.dashHeat{margin:15px 0;padding:24px;border:1px solid #cedce6;border-radius:15px;background:#fff}.dashHeat>header{display:flex;justify-content:space-between;gap:20px}.dashHeat header small{color:#07859a;font-weight:950;letter-spacing:.12em}.dashHeat h2{margin:5px 0}.dashHeat header p{margin:0;color:#62798e}.dashHeat header>div:last-child{display:flex;height:max-content;background:#edf3f7;padding:4px;border-radius:9px}.dashHeat header button{border:0;background:transparent;padding:8px 12px;border-radius:7px;font-weight:850;color:#49637b}.dashHeat header button.active{background:#fff;color:#07364a;box-shadow:0 1px 5px #14365020}.matrix{max-width:790px;margin:18px auto}.row,.matrix footer{display:grid;grid-template-columns:76px repeat(5,1fr);gap:4px;margin-bottom:4px}.row>label{display:grid;align-content:center;text-align:right;padding-right:8px}.row>label span{font-size:10px;color:#62798e}.row>button{height:66px;border:0;border-radius:7px;display:grid;place-items:center;position:relative;cursor:pointer}.row>button.selected{outline:4px solid #07364a;outline-offset:1px}.row i{position:absolute;left:7px;top:5px;font-style:normal;font-size:10px}.row strong{font-size:23px}.row em{position:absolute;right:5px;top:5px;font-size:8px;font-style:normal}.matrix footer{text-align:center}.matrix footer small{display:block;font-size:9px;font-weight:400}.matrix h3{text-align:center;font-size:11px}.dashHeat>a{display:block;text-align:right;color:#07859a;font-weight:850;text-decoration:none}@media(max-width:700px){.dashHeat{padding:15px}.dashHeat>header{display:block}.matrix{overflow:auto}.row,.matrix footer{min-width:620px}}`;
