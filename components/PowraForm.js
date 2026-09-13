"use client";

import { useMemo, useState } from "react";

const checks = [
  "Correct documentation is available", "Required PPE is available", "Correct tools are available",
  "Power tools and leads are inspected and in date", "Ladders are inspected", "Lifting equipment is inspected and in date",
  "Required isolations are in place", "Required permit is available and active", "Emergency arrangements are understood",
];
const hazardOptions = [
  "Slips, trips or same-level falls", "Falls from height", "Falling or flying objects", "Chemicals or harmful substances",
  "Heat, fire or explosion", "Asphyxiation", "Machinery", "Contact with stationary objects", "Collapse or overturning",
  "Manual handling", "Vehicles or driving", "Dust", "Fumes", "Noise", "Vibration", "Electricity", "Radiation",
  "Contamination or infection", "Poor lighting", "High or low temperature", "Adverse weather", "Lone working",
  "Risk from other work", "Risk to others from this work", "Other",
];

export default function PowraForm({ action, assessments = [], today }) {
  const [answers,setAnswers]=useState(Object.fromEntries(checks.map(item=>[item,"yes"])));
  const [hazards,setHazards]=useState([]);
  const [controls,setControls]=useState({});
  const [risk,setRisk]=useState({});
  const decision=useMemo(()=>{
    if(Object.values(answers).includes("no") || hazards.some(item=>risk[item]==="high")) return "stop_work";
    if(hazards.some(item=>risk[item]==="medium")) return "supervisor_review";
    return "safe_to_start";
  },[answers,hazards,risk]);
  const toggleHazard=(item)=>setHazards(current=>current.includes(item)?current.filter(value=>value!==item):[...current,item]);
  const decisionText=decision==="safe_to_start"?"Safe to start":decision==="supervisor_review"?"Supervisor approval required":"Stop work";

  return <form action={action} className="pwForm">
    <input type="hidden" name="prestart_checks" value={JSON.stringify(checks.map(question=>({question,answer:answers[question]})))}/>
    <input type="hidden" name="hazards" value={JSON.stringify(hazards.map(name=>({name,control:controls[name]||"",remaining_risk:risk[name]||"low"})))}/>
    <input type="hidden" name="decision" value={decision}/>
    <style>{`
      .pwForm{display:grid;gap:16px}.pwCard{padding:22px;border:1px solid #d4e1ea;border-radius:16px;background:#fff}.pwTitle{display:flex;gap:12px;align-items:center;margin-bottom:16px}.pwTitle i{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#087f6c;color:#fff;font-style:normal;font-weight:950}.pwTitle h2{margin:0;font-size:21px}.pwTitle p{margin:4px 0 0;color:#657b91}.pwGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.pwField{display:grid;gap:6px}.pwField.full{grid-column:1/-1}.pwField label{font-size:12px;font-weight:900;color:#294964}.pwField input,.pwField select,.pwField textarea{width:100%;padding:12px;border:1px solid #c9d7e3;border-radius:9px;background:#fff;font:inherit}.pwCheckRow{display:grid;grid-template-columns:minmax(0,1fr) 86px 86px 86px;border-top:1px solid #e1e8ee}.pwCheckRow:first-child{border-top:0}.pwCheckRow>span{padding:12px 5px}.pwChoice{display:grid;place-items:center;padding:8px;border-left:1px solid #e1e8ee;font-size:11px;font-weight:850}.pwChoice input{accent-color:#087f6c}.pwHazards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pwHazard{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid #d5e1e9;border-radius:9px;font-size:11px;font-weight:800}.pwHazard input{accent-color:#087f6c}.pwControl{display:grid;grid-template-columns:1fr 150px;gap:10px;margin-top:9px;padding:11px;border-radius:10px;background:#f3f7fa}.pwControl strong{grid-column:1/-1;font-size:12px}.pwControl textarea,.pwControl select{padding:10px;border:1px solid #c9d7e3;border-radius:8px;background:#fff;font:inherit}.pwDecision{position:sticky;bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:17px 20px;border-radius:14px;background:#082a54;color:#fff;box-shadow:0 16px 40px #082a5440}.pwDecision strong,.pwDecision span{display:block}.pwDecision span{margin-top:4px;color:#c7d8e8;font-size:12px}.pwDecision.stop{background:#8f2722}.pwDecision.review{background:#80550b}.pwDecision button{padding:13px 18px;border:0;border-radius:9px;background:#0aae79;color:#fff;font-weight:950;cursor:pointer}@media(max-width:760px){.pwGrid{grid-template-columns:1fr}.pwField.full{grid-column:auto}.pwHazards{grid-template-columns:1fr 1fr}.pwCheckRow{grid-template-columns:minmax(0,1fr) 58px 58px 58px}.pwControl{grid-template-columns:1fr}.pwControl strong{grid-column:auto}.pwDecision{position:static;display:grid}}
    `}</style>
    <section className="pwCard"><div className="pwTitle"><i>1</i><div><h2>Stop</h2><p>Identify the task, location and people completing the check.</p></div></div><div className="pwGrid">
      <div className="pwField full"><label>Task or job *</label><input name="task" required minLength={3}/></div>
      <div className="pwField"><label>Site / location *</label><input name="site_location" required/></div><div className="pwField"><label>Work area / equipment</label><input name="work_area"/></div>
      <div className="pwField"><label>Completed by *</label><input name="completed_by" required/></div><div className="pwField"><label>Date *</label><input name="assessment_date" type="date" defaultValue={today} required/></div>
      <div className="pwField full"><label>Team members</label><input name="team_members" placeholder="Names of people covered by this POWRA"/></div>
      <div className="pwField"><label>Linked risk assessment</label><select name="linked_assessment_id"><option value="">Not linked</option>{assessments.map(item=><option value={item.id} key={item.id}>{item.assessment_reference} - {item.title}</option>)}</select></div>
      <div className="pwField"><label>Permit reference</label><input name="linked_permit_reference"/></div>
    </div></section>
    <section className="pwCard"><div className="pwTitle"><i>2</i><div><h2>Think</h2><p>Confirm readiness. Any No answer stops work until corrected.</p></div></div><div>{checks.map(item=><div className="pwCheckRow" key={item}><span>{item}</span>{["yes","no","na"].map(option=><label className="pwChoice" key={option}><input type="radio" checked={answers[item]===option} onChange={()=>setAnswers(current=>({...current,[item]:option}))}/>{option.toUpperCase()}</label>)}</div>)}</div></section>
    <section className="pwCard"><div className="pwTitle"><i>3</i><div><h2>Act</h2><p>Select present hazards and record the precautions required before starting.</p></div></div><div className="pwHazards">{hazardOptions.map(item=><label className="pwHazard" key={item}><input type="checkbox" checked={hazards.includes(item)} onChange={()=>toggleHazard(item)}/>{item}</label>)}</div>
      {hazards.map(item=><div className="pwControl" key={item}><strong>{item}</strong><textarea value={controls[item]||""} onChange={event=>setControls(current=>({...current,[item]:event.target.value}))} placeholder="Control measures / precautions"/><select value={risk[item]||"low"} onChange={event=>setRisk(current=>({...current,[item]:event.target.value}))}><option value="low">Low remaining risk</option><option value="medium">Medium remaining risk</option><option value="high">High remaining risk</option></select></div>)}
      <div className="pwGrid" style={{marginTop:14}}><div className="pwField full"><label>Decision explanation / escalation</label><textarea name="decision_reason" placeholder="Explain failed checks, escalation or why work can proceed."/></div><div className="pwField"><label>Supervisor name, where required</label><input name="supervisor_name"/></div></div>
    </section>
    <section className="pwCard"><div className="pwTitle"><i>4</i><div><h2>Review</h2><p>Complete this section when the task finishes.</p></div></div><div className="pwGrid"><div className="pwField"><label>Did conditions change?</label><select name="conditions_changed"><option value="no">No</option><option value="yes">Yes</option></select></div><div className="pwField"><label>Were new hazards identified?</label><select name="new_hazards"><option value="no">No</option><option value="yes">Yes</option></select></div><div className="pwField"><label>Were the controls effective?</label><select name="controls_effective"><option value="yes">Yes</option><option value="no">No</option></select></div><div className="pwField"><label>Incident or near miss?</label><select name="incident"><option value="no">No</option><option value="yes">Yes</option></select></div><div className="pwField full"><label>End-of-job review comments</label><textarea name="review_comments"/></div></div></section>
    <footer className={`pwDecision ${decision==="stop_work"?"stop":decision==="supervisor_review"?"review":""}`}><div><strong>{decisionText}</strong><span>{decision==="safe_to_start"?"Checks support proceeding with the recorded controls.":decision==="supervisor_review"?"Obtain supervisor confirmation before work starts.":"Do not start work. Correct the failed check or complete a fuller assessment."}</span></div><button type="submit">Save POWRA</button></footer>
  </form>;
}
