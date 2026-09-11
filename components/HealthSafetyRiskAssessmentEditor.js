"use client";

import { useMemo, useState } from "react";

const categories = ["Physical", "Mechanical", "Chemical", "Environmental", "Biological", "Human", "Electrical", "Fire / Explosion", "Radiation", "Work at Height", "Manual Handling", "Noise / Vibration", "Temperature", "Confined Space", "Ergonomic / DSE", "Psychosocial", "Other"];
const hierarchy = ["Eliminate", "Substitute", "Engineering controls", "Administrative controls", "PPE"];
const decisions = [["reduce", "Reduce — further controls required"], ["avoid", "Avoid — do not undertake the exposure"], ["share_transfer", "Share / transfer with controlled oversight"], ["accept", "Accept with formal authority"], ["stop_work", "Stop work / immediate escalation"]];

function riskBand(score) {
  if (!score) return { label: "Not scored", tone: "none" };
  if (score >= 15) return { label: "Unacceptable", tone: "red" };
  if (score >= 10) return { label: "Inadequate", tone: "orange" };
  if (score >= 5) return { label: "Adequate", tone: "amber" };
  return { label: "Acceptable", tone: "green" };
}

function ScoreCard({ title, severity, likelihood }) {
  const score = Number(severity) * Number(likelihood);
  const band = riskBand(score);
  return <div className={"hreScore " + band.tone}><span>{title}</span><strong>{score || "—"}</strong><small>{band.label}</small></div>;
}

export default function HealthSafetyRiskAssessmentEditor({ assessmentId, hazards = [], addHazardAction }) {
  const [severity, setSeverity] = useState("");
  const [likelihood, setLikelihood] = useState("");
  const [residualSeverity, setResidualSeverity] = useState("");
  const [residualLikelihood, setResidualLikelihood] = useState("");
  const [decision, setDecision] = useState("reduce");
  const [open, setOpen] = useState(hazards.length === 0);
  const currentScore = Number(severity) * Number(likelihood);
  const residualScore = Number(residualSeverity) * Number(residualLikelihood);
  const selectedHierarchy = useMemo(() => new Set(), []);
  const elevated = residualScore >= 10;

  return <section className="hreWrap"><style>{`
    .hreWrap{display:grid;gap:15px}.hreList{display:grid;gap:10px}.hreHazard{display:grid;grid-template-columns:1.35fr .55fr .55fr auto;gap:14px;align-items:center;padding:17px;border:1px solid #dce6ed;border-radius:12px;background:#fff}.hreHazard strong,.hreHazard small{display:block}.hreHazard small{color:#74899c;margin-top:4px}.hreBand{justify-self:start;padding:7px 9px;border-radius:999px;font-size:11px;font-weight:900}.hreBand.red{background:#ffe8e6;color:#bd2c25}.hreBand.orange{background:#fff0e6;color:#ba4d13}.hreBand.amber{background:#fff5d8;color:#805d00}.hreBand.green{background:#e3f7ed;color:#087149}.hreHazard>a{color:#087f6c;font-weight:900;text-decoration:none}.hreEmpty{padding:24px;border-radius:12px;background:#f2f7fa;color:#637a91}.hreAdd{padding:0;border:1px solid #d5e2ea;border-radius:16px;background:#fff;overflow:hidden}.hreAddHead{width:100%;padding:20px 23px;border:0;background:#fff;color:#102f4b;display:flex;justify-content:space-between;gap:20px;align-items:center;text-align:left;cursor:pointer}.hreAddHead strong{font-size:19px}.hreAddHead span{color:#087f6c;font-weight:900}.hreForm{padding:4px 23px 24px;border-top:1px solid #e2eaf0}.hreStep{padding:22px 0;border-bottom:1px solid #e5ecf1}.hreStep:last-of-type{border-bottom:0}.hreStepHead{margin-bottom:16px}.hreStepHead span{color:#1762ef;font-size:11px;font-weight:900;letter-spacing:.09em}.hreStepHead h3{margin:5px 0}.hreStepHead p{margin:0;color:#6b8095}.hreGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.hreField{display:grid;gap:7px}.hreField.full{grid-column:1/-1}.hreField label,.hreLegend{font-size:12px;font-weight:900;color:#294a66}.hreField input,.hreField select,.hreField textarea{width:100%;padding:12px;border:1px solid #cbd8e5;border-radius:9px;background:#fff;color:#102e49;font:inherit}.hreField textarea{min-height:88px;resize:vertical}.hreScoreGrid{display:grid;grid-template-columns:1fr 1fr 180px;gap:13px;align-items:end}.hreScore{min-height:75px;padding:11px 15px;border-radius:10px;background:#edf2f6;display:grid;grid-template-columns:1fr auto;align-items:center}.hreScore span{font-size:11px;font-weight:900}.hreScore strong{font-size:29px}.hreScore small{grid-column:1/-1;font-weight:850}.hreScore.red{background:#bd2d27;color:#fff}.hreScore.orange{background:#e66732;color:#fff}.hreScore.amber{background:#f2ba38;color:#302200}.hreScore.green{background:#2ca46f;color:#fff}.hreChecks{display:flex;gap:8px;flex-wrap:wrap}.hreCheck{display:flex;gap:8px;align-items:center;padding:10px 12px;border:1px solid #d2deea;border-radius:9px;font-size:12px;font-weight:750}.hreCheck input{accent-color:#087f6c}.hreWarning{margin-top:13px;padding:13px;border-left:5px solid #c8342c;border-radius:8px;background:#fff0ef;color:#8c2722;font-size:12px;font-weight:850}.hreAction{padding:18px;border:1px solid #f0c660;border-radius:12px;background:#fff9e8}.hreSubmit{display:flex;justify-content:flex-end;margin-top:20px}.hreSubmit button{padding:13px 19px;border:0;border-radius:9px;background:#087f6c;color:#fff;font-weight:900;cursor:pointer}@media(max-width:760px){.hreHazard{grid-template-columns:1fr auto}.hreHazard>:nth-child(2),.hreHazard>:nth-child(3){display:none}.hreGrid,.hreScoreGrid{grid-template-columns:1fr}.hreField.full{grid-column:auto}}
  `}</style>
    {hazards.length ? <div className="hreList">{hazards.map((hazard) => { const score = hazard.residual_score ?? hazard.current_score; const band = riskBand(score); return <article className="hreHazard" key={hazard.id}><div><strong>{hazard.hazard_category}: {hazard.hazard_description}</strong><small>{hazard.people_exposed || "People exposed not recorded"}</small></div><div><strong>{hazard.current_score || "—"}</strong><small>Initial risk</small></div><div><strong>{hazard.residual_score || "—"}</strong><small>Residual risk</small></div><span className={"hreBand " + band.tone}>{band.label}</span></article>; })}</div> : <div className="hreEmpty">No hazards have been recorded. Add the first significant hazard below.</div>}
    <section className="hreAdd">
      <button className="hreAddHead" type="button" onClick={() => setOpen(!open)} aria-expanded={open}><strong>Add a significant hazard</strong><span>{open ? "Close ×" : "Open editor +"}</span></button>
      {open && <form className="hreForm" action={addHazardAction}>
        <input type="hidden" name="assessment_id" value={assessmentId}/>
        <section className="hreStep"><div className="hreStepHead"><span>STEP 2 · IDENTIFY</span><h3>Hazard, exposure and credible harm</h3><p>Describe the source of harm and the people who could be affected.</p></div><div className="hreGrid">
          <div className="hreField"><label htmlFor="hazard_category">Hazard category *</label><select id="hazard_category" name="hazard_category" required>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="hreField"><label htmlFor="hazard_type">Specific hazard type</label><input id="hazard_type" name="hazard_type" placeholder="For example: rotating machinery"/></div>
          <div className="hreField full"><label htmlFor="hazard_description">Hazard description *</label><textarea id="hazard_description" name="hazard_description" required minLength={3} placeholder="Describe the hazardous condition, activity or source of energy."/></div>
          <div className="hreField"><label htmlFor="people_exposed">Who is exposed? *</label><input id="people_exposed" name="people_exposed" required/></div>
          <div className="hreField"><label htmlFor="harm_description">How could harm occur? *</label><input id="harm_description" name="harm_description" required/></div>
        </div></section>
        <section className="hreStep"><div className="hreStepHead"><span>STEP 3 · EVALUATE</span><h3>Current controls and initial risk</h3><p>Score the risk with existing controls operating as they do today.</p></div><div className="hreGrid"><div className="hreField full"><label htmlFor="existing_controls">Existing controls *</label><textarea id="existing_controls" name="existing_controls" required placeholder="Record controls that are present, implemented and verifiable."/></div></div><div className="hreScoreGrid">
          <div className="hreField"><label htmlFor="current_likelihood">Likelihood *</label><select id="current_likelihood" name="current_likelihood" value={likelihood} onChange={(event) => setLikelihood(event.target.value)} required><option value="">Select 1–5</option>{[1,2,3,4,5].map((number) => <option value={number} key={number}>{number}</option>)}</select></div>
          <div className="hreField"><label htmlFor="current_severity">Severity *</label><select id="current_severity" name="current_severity" value={severity} onChange={(event) => setSeverity(event.target.value)} required><option value="">Select 1–5</option>{[1,2,3,4,5].map((number) => <option value={number} key={number}>{number}</option>)}</select></div>
          <ScoreCard title="Initial risk" severity={severity} likelihood={likelihood}/>
        </div></section>
        <section className="hreStep"><div className="hreStepHead"><span>STEP 4 · CONTROL</span><h3>Additional controls and residual risk</h3><p>Work down the hierarchy and score the expected risk after controls are implemented.</p></div><fieldset style={{border:0,padding:0,margin:"0 0 15px"}}><legend className="hreLegend">Control hierarchy applied *</legend><div className="hreChecks">{hierarchy.map((item) => <label className="hreCheck" key={item}><input type="checkbox" name="control_hierarchy" value={item} onChange={(event) => event.target.checked ? selectedHierarchy.add(item) : selectedHierarchy.delete(item)}/>{item}</label>)}</div></fieldset><div className="hreGrid"><div className="hreField full"><label htmlFor="additional_controls">Additional controls required</label><textarea id="additional_controls" name="additional_controls" placeholder="Define specific measures needed to eliminate or reduce the risk."/></div></div><div className="hreScoreGrid">
          <div className="hreField"><label htmlFor="residual_likelihood">Residual likelihood *</label><select id="residual_likelihood" name="residual_likelihood" value={residualLikelihood} onChange={(event) => setResidualLikelihood(event.target.value)} required><option value="">Select 1–5</option>{[1,2,3,4,5].map((number) => <option value={number} key={number}>{number}</option>)}</select></div>
          <div className="hreField"><label htmlFor="residual_severity">Residual severity *</label><select id="residual_severity" name="residual_severity" value={residualSeverity} onChange={(event) => setResidualSeverity(event.target.value)} required><option value="">Select 1–5</option>{[1,2,3,4,5].map((number) => <option value={number} key={number}>{number}</option>)}</select></div>
          <ScoreCard title="Residual risk" severity={residualSeverity} likelihood={residualLikelihood}/>
        </div>{residualScore > currentScore && currentScore > 0 && <div className="hreWarning">Residual risk cannot normally exceed initial risk. Revisit the scores or explain the changed exposure.</div>}</section>
        <section className="hreStep"><div className="hreStepHead"><span>STEP 5 · DECIDE</span><h3>Risk decision and accountable action</h3><p>Elevated residual risk requires a controlled decision, ownership and escalation.</p></div><div className="hreGrid">
          <div className="hreField"><label htmlFor="risk_decision">Risk decision *</label><select id="risk_decision" name="risk_decision" value={decision} onChange={(event) => setDecision(event.target.value)} required>{decisions.map(([value,title]) => <option value={value} key={value}>{title}</option>)}</select></div>
          <div className="hreField"><label htmlFor="acceptance_authority">Acceptance / escalation authority</label><input id="acceptance_authority" name="acceptance_authority" required={decision === "accept" || elevated}/></div>
          <div className="hreField full"><label htmlFor="acceptance_rationale">Decision rationale</label><textarea id="acceptance_rationale" name="acceptance_rationale" required={decision === "accept"} placeholder="Explain the evidence, constraints and authority supporting this decision."/></div>
        </div>{(elevated || decision === "reduce") && <div className="hreAction"><div className="hreGrid">
          <div className="hreField full"><label htmlFor="action_required">Controlled action required *</label><textarea id="action_required" name="action_required" required={elevated} placeholder="State the measurable action required to reduce or govern the exposure."/></div>
          <div className="hreField"><label htmlFor="responsible_name">Responsible person *</label><input id="responsible_name" name="responsible_name" required={elevated}/></div>
          <div className="hreField"><label htmlFor="responsible_email">Responsible email</label><input id="responsible_email" name="responsible_email" type="email"/></div>
          <div className="hreField"><label htmlFor="target_date">Target date *</label><input id="target_date" name="target_date" type="date" required={elevated}/></div>
          <div className="hreField"><label htmlFor="priority">Priority</label><select id="priority" name="priority" defaultValue={elevated ? "high" : "medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                 </div></div>}</section>
        <div className="hreSubmit"><button type="submit">Save hazard and risk decision →</button></div>
      </form>}
    </section>
  </section>;
}
