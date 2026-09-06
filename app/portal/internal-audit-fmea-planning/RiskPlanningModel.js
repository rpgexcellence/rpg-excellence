"use client";

import { useMemo, useState } from "react";

const CONSEQUENCES = [
  ["quality", "Quality / customer", "Product, service, conformity, customer or contractual impact"],
  ["legal", "Legal / regulatory", "Breach, enforcement, licence, accreditation or statutory exposure"],
  ["environment", "Environmental", "Pollution, resource, waste or environmental compliance impact"],
  ["safety", "OH&S", "Injury, ill health, exposure or loss-of-control potential"],
  ["security", "Information security", "Confidentiality, integrity, availability or privacy impact"],
  ["continuity", "Business continuity", "Disruption to critical products, services or recovery capability"],
  ["certification", "Certification integrity", "Competence, impartiality, examination or certification confidence"],
];
const MODIFIERS = [
  ["major", "Major NC or serious incident", 25],
  ["repeat", "Repeated NC or overdue corrective action", 20],
  ["regulatory", "Regulatory / certification priority", 20],
  ["change", "Significant process or system change", 15],
  ["new", "New site, process, technology or supplier", 15],
  ["trend", "Adverse KPI, complaint or customer trend", 10],
  ["performance", "Strong performance over two audit cycles", -10],
  ["assurance", "Independently verified mature controls", -10],
];
const SCALE = [1, 2, 3, 4, 5];

const bandFor = (score) => score >= 100 ? ["Critical", "Audit within 3–6 months", "critical"] : score >= 70 ? ["High", "Audit within 12 months", "high"] : score >= 40 ? ["Medium", "Audit within 18–24 months", "medium"] : ["Lower", "At least once in the three-year cycle", "lower"];

function ScoreSelect({ value, onChange, label, name }) {
  return <label className="rpmField"><span>{label}</span><select name={name} value={value} onChange={(event) => onChange(Number(event.target.value))}>{SCALE.map((score) => <option value={score} key={score}>{score}</option>)}</select></label>;
}

export default function RiskPlanningModel({ saveAction, programmes = [] }) {
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id || "");
  const [siteId, setSiteId] = useState("");
  const [consequences, setConsequences] = useState(Object.fromEntries(CONSEQUENCES.map(([key]) => [key, 1])));
  const [likelihood, setLikelihood] = useState(1);
  const [detectability, setDetectability] = useState(1);
  const [modifiers, setModifiers] = useState([]);
  const [override, setOverride] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const consequence = Math.max(...Object.values(consequences));
  const baseScore = consequence * likelihood * detectability;
  const adjustment = modifiers.reduce((sum, key) => sum + (MODIFIERS.find((item) => item[0] === key)?.[2] || 0), 0);
  const finalScore = Math.max(1, baseScore + adjustment);
  const recommendation = useMemo(() => bandFor(finalScore), [finalScore]);
  const selectedProgramme = programmes.find((programme) => programme.id === programmeId);
  const programmeSites = selectedProgramme?.sites || [];
  const programmeStandards = selectedProgramme?.standards || [];

  function toggleModifier(key) {
    setModifiers((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    setConfirmed(false);
  }

  return <form className="rpmModel" action={saveAction}>
    <section className="rpmPanel">
      <div className="rpmHead"><div><small>INTERACTIVE MODEL · STEP 1</small><h2>Define the auditable process</h2><p>Record the decision context before scoring. A score without evidence is not a defensible audit-programme decision.</p></div></div>
      <div className="rpmBody rpmGrid2">
        <label className="rpmField"><span>Controlled 3-year programme *</span><select name="programme_id" required value={programmeId} onChange={(event) => { setProgrammeId(event.target.value); setSiteId(""); setConfirmed(false); }}><option value="" disabled>Select programme</option>{programmes.map((programme) => <option value={programme.id} key={programme.id}>{programme.programme_reference} · {programme.title}</option>)}</select></label>
        <label className="rpmField"><span>Controlled location</span><select name="site_id" value={siteId} onChange={(event) => { setSiteId(event.target.value); setConfirmed(false); }}><option value="">Enterprise / all relevant locations</option>{programmeSites.map((site) => <option value={site.id} key={site.id}>{site.site_code} · {site.site_name}</option>)}</select></label>
        <label className="rpmField"><span>Process / activity *</span><input name="process_area" required placeholder="e.g. Supplier approval and monitoring" /></label>
        <label className="rpmField"><span>Site / central function description</span><input name="site_or_function" placeholder="e.g. Group IT or shared purchasing function" /></label>
        <label className="rpmField"><span>Credible failure mode *</span><textarea name="failure_mode" required placeholder="Describe how the process or control could fail—not merely the observed symptom." /></label>
        <label className="rpmField"><span>Credible effects *</span><textarea name="credible_effects" required placeholder="Describe potential effects on customers, compliance, people, environment, security, continuity or certification integrity." /></label>
        <label className="rpmField rpmWide"><span>Existing preventive and detective controls *</span><textarea name="current_controls" required placeholder="Identify current controls, their owners, monitoring frequency and the evidence that they operate effectively." /></label>
        <label className="rpmField rpmWide"><span>Applicable programme standards *</span><div className="rpmChecks" key={programmeId}>{programmeStandards.length ? programmeStandards.map((standard) => <label key={standard.id}><input type="checkbox" name="standard_codes" value={standard.label || standard.code} /> {standard.label || standard.code}</label>) : <small>Select a programme containing at least one controlled standard.</small>}</div></label>
        <label className="rpmField rpmWide"><span>Evidence considered *</span><textarea name="evidence" required placeholder="Reference KPIs, previous audits, findings, incidents, complaints, legal obligations, changes, risk registers and management concerns." /></label>
      </div>
    </section>

    <section className="rpmPanel">
      <div className="rpmHead"><div><small>INTERACTIVE MODEL · STEP 2</small><h2>Score consequence</h2><p>Score every relevant impact dimension. The model uses the highest credible consequence, avoiding multiplication of overlapping impacts.</p></div><strong className="rpmScore">{consequence}/5</strong></div>
      <div className="rpmBody rpmConsequenceGrid">{CONSEQUENCES.map(([key, title, help]) => <article key={key} className={consequences[key] === consequence ? "rpmFactor selected" : "rpmFactor"}><ScoreSelect name={`consequence_${key}`} label={title} value={consequences[key]} onChange={(value) => { setConsequences((current) => ({...current, [key]: value})); setConfirmed(false); }} /><small>{help}</small></article>)}</div>
      <div className="rpmScale"><b>Consequence definitions:</b><span><strong>1</strong> Negligible</span><span><strong>2</strong> Minor, locally controlled</span><span><strong>3</strong> Moderate, reportable or customer impact</span><span><strong>4</strong> Major operational, legal or certification impact</span><span><strong>5</strong> Severe, systemic, fatal, prosecution or accreditation-threatening</span></div>
    </section>

    <section className="rpmPanel">
      <div className="rpmHead"><div><small>INTERACTIVE MODEL · STEP 3</small><h2>Score likelihood and detectability</h2><p>Use documented evidence and the defined anchors. Higher detectability scores mean the condition is harder to detect.</p></div></div>
      <div className="rpmBody rpmGrid2">
        <div className="rpmFactor"><ScoreSelect name="likelihood" label="Likelihood" value={likelihood} onChange={(value) => { setLikelihood(value); setConfirmed(false); }} /><p><b>1:</b> exceptional · <b>2:</b> unlikely · <b>3:</b> possible · <b>4:</b> likely/recurrent · <b>5:</b> current or expected</p></div>
        <div className="rpmFactor"><ScoreSelect name="detectability" label="Control detectability" value={detectability} onChange={(value) => { setDetectability(value); setConfirmed(false); }} /><p><b>1:</b> real-time independent detection · <b>2:</b> strong routine monitoring · <b>3:</b> periodic monitoring · <b>4:</b> weak/reactive · <b>5:</b> no reliable detection</p></div>
      </div>
      <div className="rpmMatrixWrap"><table className="rpmMatrix"><caption>Base risk matrix: consequence × likelihood, before detectability and modifiers</caption><thead><tr><th>Likelihood ↓ / Consequence →</th>{SCALE.map((score) => <th key={score}>{score}</th>)}</tr></thead><tbody>{[5,4,3,2,1].map((l) => <tr key={l}><th>{l}</th>{SCALE.map((c) => { const score = c*l; return <td key={c} className={score >= 20 ? "mCritical" : score >= 12 ? "mHigh" : score >= 6 ? "mMedium" : "mLower"}>{score}</td>; })}</tr>)}</tbody></table></div>
    </section>

    <section className="rpmPanel">
      <div className="rpmHead"><div><small>INTERACTIVE MODEL · STEP 4</small><h2>Apply evidence-based planning modifiers</h2><p>Modifiers must be supported by current records. Select each factor once; do not use two modifiers for the same underlying evidence.</p></div></div>
      <div className="rpmBody rpmModifierGrid">{MODIFIERS.map(([key, title, value]) => <label className={modifiers.includes(key) ? "rpmModifier active" : "rpmModifier"} key={key}><input type="checkbox" name="modifiers" value={key} checked={modifiers.includes(key)} onChange={() => toggleModifier(key)} /><span><strong>{title}</strong><small>{value > 0 ? `+${value}` : value} points</small></span></label>)}</div>
    </section>

    <section className={`rpmResult ${recommendation[2]}`}>
      <div><small>CALCULATED PLANNING RECOMMENDATION</small><h2>{recommendation[0]} · {finalScore} points</h2><p>{recommendation[1]}</p></div>
      <div className="rpmFormula"><span>Highest consequence <b>{consequence}</b></span><span>Likelihood <b>{likelihood}</b></span><span>Detectability <b>{detectability}</b></span><span>Base <b>{baseScore}</b></span><span>Modifiers <b>{adjustment > 0 ? `+${adjustment}` : adjustment}</b></span></div>
    </section>

    <section className="rpmPanel">
      <div className="rpmHead"><div><small>LEAD-AUDITOR CONTROL · STEP 5</small><h2>Confirm professional judgement</h2><p>The score is decision support, not an automatic audit mandate. Any departure from the recommendation must remain explainable and traceable.</p></div></div>
      <div className="rpmBody rpmGrid2">
        <label className="rpmField"><span>Lead auditor *</span><input name="lead_auditor" required placeholder="Name of administering lead auditor" /></label>
        <label className="rpmField"><span>Decision</span><select name="decision" defaultValue="accept"><option value="accept">Accept calculated recommendation</option><option value="increase">Increase audit priority/frequency</option><option value="decrease">Decrease audit priority/frequency</option></select></label>
        <label className="rpmField rpmWide"><span>Decision and override rationale *</span><textarea name="decision_rationale" required value={override} onChange={(event) => { setOverride(event.target.value); setConfirmed(false); }} placeholder="Explain the evidence, assumptions, uncertainty and why the selected audit timing provides appropriate assurance." /></label>
        <label className="rpmConfirm rpmWide"><input type="checkbox" name="lead_auditor_confirmation" value="confirmed" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I confirm that the scoring is evidence-based, overlapping impacts have not been double-counted, and the audit frequency remains a lead-auditor decision.</span></label>
      </div>
      <div className="rpmActions"><div style={{display:"flex",gap:9}}><button type="submit" className="rpmSave" disabled={!confirmed || !override.trim()}>Save Assessment</button><button type="button" className="rpmGhost" onClick={() => window.print()}>Print / Save PDF</button></div><span className={confirmed && override.trim() ? "rpmReady" : "rpmPending"}>{confirmed && override.trim() ? "Decision ready to record" : "Rationale and confirmation required"}</span></div>
    </section>
  </form>;
}
