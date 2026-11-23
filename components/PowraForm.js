"use client";

import { useDeviceDraftState } from "./DeviceDraftWorkspace";
import { POWRA_CHECKS } from "../lib/powraChecklist";
import { useActionState, useState } from "react";
import { decidePowra, decisionDetails } from "../lib/powra-workflow.mjs";
import layout from "../app/portal/health-safety/powra/powra.module.css";
const checks = POWRA_CHECKS;
const hazardOptions = ["Slips, trips or same-level falls", "Falls from height", "Falling or flying objects", "Chemicals or harmful substances", "Heat, fire or explosion", "Asphyxiation", "Machinery", "Contact with stationary objects", "Collapse or overturning", "Manual handling", "Vehicles or driving", "Dust", "Fumes", "Noise", "Vibration", "Electricity", "Radiation", "Contamination or infection", "Poor lighting", "High or low temperature", "Adverse weather", "Lone working", "Risk from other work", "Risk to others from this work", "Other"];
export default function PowraForm({
action,
assessments = [],
today,
sites = [],
people = [],
numbering = {},
zones = [],
initialZone = null,
prior = null
}) {
const [state, formAction, pending] = useActionState(action, null);
const ready = sites.length > 0 && people.length > 0;
const example = "" + (numbering.powra_reference_prefix || "POWRA") + "" + String(numbering.powra_next_number || 1).padStart(numbering.powra_reference_padding || 0, "0") + "";
const [step, setStep] = useState(0);
const [manualStop, setManualStop] = useDeviceDraftState("powraManualStop", false);
const [otherHazard, setOtherHazard] = useDeviceDraftState("powraOtherHazard", "");
const [siteId, setSiteId] = useDeviceDraftState("powraSelectedSite", initialZone?.site_id || prior?.administration_location_id || "");
const [zoneId, setZoneId] = useDeviceDraftState("powraSelectedZone", initialZone?.id || "");
const [linked, setLinked] = useDeviceDraftState("powraLinkedAssessment", "");
const [verified, setVerified] = useDeviceDraftState("powraVerifiedControls", {});
const [changed, setChanged] = useDeviceDraftState("powraChangedHazards", {});
const [noHazards, setNoHazards] = useDeviceDraftState("powraNoAdditionalHazards", false);
const [answers, setAnswers] = useDeviceDraftState("powraAnswersV2", {});
const [hazards, setHazards] = useDeviceDraftState("powraHazards", []);
const [controls, setControls] = useDeviceDraftState("powraControls", {});
const [risk, setRisk] = useDeviceDraftState("powraRisk", {});
const checkRows = checks.map(question => ({ question, answer: answers[question] || "" }));
const hazardRows = hazards.map(name => ({name: name === "Other" ? otherHazard.trim() : name, control: controls[name] || "", remaining_risk: risk[name] || "", verified: verified[name] === true, changed: changed[name] === true }));
const decision = decidePowra(checkRows, hazardRows, { linked, noHazards, stop: manualStop });
const toggleHazard = item => setHazards(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
const stepNames = ["Task & location", "Check conditions", "Hazards & controls", "Safety decision"];
function move(index) {
  setStep(index);
  requestAnimationFrame(() => document.getElementById("powra-stage-" + index)?.focus());
}
return <form action={formAction} className="pwForm" noValidate onSubmit={e => {if(step !== 3 || decision === "pending")e.preventDefault();}}>
<nav className={layout.tabs + " " + layout.recordTabs} aria-label="POWRA stages">
  {stepNames.map((name,index) => <button key={name} type="button" aria-current={step === index ? "step" : undefined} onClick={() => move(index)}>{name}</button>)}
</nav>
{state?.error && <div className="pwNotice error" role="alert">{state.error}</div>}
<div className="pwNotice"><strong>POWRA reference: allocated automatically on save</strong><span>Current format example: {example}. The final number is assigned when the record is saved.</span><a href="/portal/documents/settings#powra-numbering">Document Management · Numbering settings →</a></div>
<input type="hidden" name="prestart_checks" value={JSON.stringify(checkRows)} />
<input type="hidden" name="hazards" value={JSON.stringify(hazardRows)} />
<input type="hidden" name="manual_stop" value={manualStop ? "yes" : ""} />
<input type="hidden" name="no_hazards" value={noHazards && !hazards.length ? "yes" : ""} />
{prior && <input type="hidden" name="reassessment_of" value={prior.id}/>}
<style>{".pwForm,.pwForm *{box-sizing:border-box}\n.pwForm{display:grid;gap:16px;width:100%;min-width:0}\n.pwNotice{display:grid;gap:8px;min-width:0;padding:16px 20px;border:1px solid #c8d9e7;border-radius:12px;background:#f7fbff;color:#173b59;overflow-wrap:anywhere}\n.pwNotice.error{background:#fff0ec;color:#a33221}\n.pwNotice span,.pwField small{font-size:13px;line-height:1.5}\n.pwNotice a,.pwField a{color:#1762ef}\n.pwCard[hidden]{display:none}.pwCard{min-width:0;padding:22px;border:1px solid #d4e1ea;border-radius:16px;background:#fff}\n.pwTitle{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}\n.pwTitle>div{min-width:0}\n.pwTitle i{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:#215483;color:#fff;font-style:normal;font-weight:950}\n.pwTitle h2{margin:0;font-size:21px}\n.pwTitle p{margin:4px 0 0;color:#657b91;line-height:1.5}\n.pwGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}\n.pwField{display:grid;min-width:0;gap:7px;align-content:start}\n.pwField.full{grid-column:1/-1}\n.pwField>label{display:block;line-height:1.4;font-size:12px;font-weight:900;color:#294964}\n.pwField input:not([type=checkbox]):not([type=radio]),.pwField select,.pwField textarea,.pwControl textarea,.pwControl select{display:block;width:100%;max-width:100%;min-width:0;min-height:44px;margin:0;padding:10px 12px;border:1px solid #c9d7e3;border-radius:9px;background:#fff;color:#102d49;font:inherit;font-size:16px;line-height:1.4}\n.pwField select,.pwControl select{text-overflow:ellipsis}\n.pwField textarea,.pwControl textarea{height:auto;min-height:88px;resize:vertical}\n.pwField input[type=date]{appearance:none;-webkit-appearance:none;width:100%;max-width:100%;min-width:0;min-height:46px;text-align:left}\n.pwField input[type=date]::-webkit-date-and-time-value{text-align:left;min-height:1.4em}\n.pwField small{display:block;overflow-wrap:anywhere}\n.pwMembers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}\n.pwForm .pwMembers label,.pwForm .pwHazard{display:flex;align-items:center;gap:10px;min-width:0;min-height:48px;padding:12px;border:1px solid #c9d7e3;border-radius:9px;color:#294964;font-size:13px;font-weight:750;line-height:1.5;overflow-wrap:anywhere;cursor:pointer}\n.pwForm .pwMembers input,.pwForm .pwHazard input,.pwForm .pwChoice input{appearance:auto;-webkit-appearance:auto;display:inline-block;flex:0 0 20px;width:20px;height:20px;min-width:20px;min-height:20px;max-width:20px;margin:0;padding:0;accent-color:#087f6c}\n.pwCheckRow{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,78px);min-width:0;border-top:1px solid #e1e8ee}\n.pwCheckRow>span{min-width:0;padding:14px 8px;font-size:14px;line-height:1.5;overflow-wrap:anywhere}\n.pwChoice{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:48px;padding:10px 4px;border-left:1px solid #e1e8ee;font-size:12px;font-weight:850;cursor:pointer}\n.pwHazards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}\n.pwControl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,180px);gap:10px;min-width:0;margin-top:12px;padding:14px;border-radius:10px;background:#f3f7fa}\n.pwControl strong{grid-column:1/-1;overflow-wrap:anywhere;font-size:13px}\n.pwForm input:focus-visible,.pwForm select:focus-visible,.pwForm textarea:focus-visible,.pwForm button:focus-visible,.pwForm a:focus-visible{outline:3px solid #70a8ff;outline-offset:3px}\n@media(max-width:760px){\n .pwGrid{grid-template-columns:minmax(0,1fr)}\n .pwField.full{grid-column:auto}\n .pwHazards{grid-template-columns:repeat(2,minmax(0,1fr))}\n .pwCheckRow{grid-template-columns:repeat(3,minmax(0,1fr));padding:12px 0;gap:8px}\n .pwCheckRow>span{grid-column:1/-1;padding:0 0 4px;font-weight:750}\n .pwChoice{border:1px solid #d5e1e9;border-radius:8px;min-height:48px;padding:10px 4px}\n .pwControl{grid-template-columns:minmax(0,1fr)}\n .pwControl strong{grid-column:auto}\n .pwDecision{position:static;display:grid;gap:14px}\n .pwDecision button{width:100%}\n}\n@media(max-width:520px){\n .pwCard{padding:16px}\n .pwHazards,.pwMembers{grid-template-columns:minmax(0,1fr)}\n .pwNotice{padding:14px}\n .pwTitle{gap:10px}\n}\n"}</style>
<section className="pwCard" hidden={step !== 0}><div className="pwTitle"><i>1</i><div><h2 id="powra-stage-0" tabIndex={-1}>Task and location</h2><p>Identify the task, location and people completing the check.</p></div></div><div className="pwGrid">
<div className="pwField full"><label>Task or job *</label><input name="task" aria-label="Task or job" onChange={() => {setAnswers({});setVerified({});}} defaultValue={prior?.task || ""} required minLength={3} maxLength={500} /></div>
<div className="pwField"><label>Site / location *</label><select name="administration_location_id" aria-label="Site / location" value={siteId} onChange={e => {setSiteId(e.target.value);setZoneId("");setAnswers({});setVerified({});}} required disabled={!sites.length}><option value="">Select company site</option>{sites.map(site => <option key={site.id} value={site.id}>{site.label || [site.profile_reference, site.location_name].filter(Boolean).join(" · ")}</option>)}</select><small>{!sites.length && <span role="alert">No company sites available. Add a site before saving. </span>}<a href="/portal/company/sites">Administration · Site Profile →</a></small></div><div className="pwField"><label>Workplace zone</label><select name="zone_id" aria-label="Workplace zone" value={zoneId} onChange={e => {setZoneId(e.target.value);setAnswers({});setVerified({});}}><option value="">No zone selected</option>{zones.filter(zone => zone.site_id === siteId).map(zone => <option value={zone.id} key={zone.id}>{zone.reference} · {zone.name}</option>)}</select></div>
<div className="pwField"><label>Work area / equipment</label><input name="work_area" maxLength={500}/></div>
<div className="pwField"><label>Completed by *</label><select name="completed_by_person_id" aria-label="Completed by" required disabled={!people.length}><option value="">Select active company user</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.position || person.email}</option>)}</select><small>{!people.length && <span role="alert">No active company users. Add or activate a user under Administration before saving. </span>}<a href="/portal/company/people">Administration · People, Roles & Access →</a></small></div><div className="pwField"><label>Date *</label><input name="assessment_date" type="date" defaultValue={today} required /></div>
<div className="pwField full"><label>Team members</label><div className="pwMembers">{people.map(person => <label key={person.id}><input type="checkbox" name="team_member_ids" value={person.id} />{person.name}</label>)}</div><input name="additional_team_members" maxLength={1000} placeholder="Additional people or contractors — enter names manually" /><small>Select company users above and add external participants where needed.</small></div>
<div className="pwField"><label>Linked risk assessment</label><select name="linked_assessment_id" aria-label="Linked risk assessment" value={linked} onChange={e => {setLinked(e.target.value);setAnswers({});setVerified({});}}><option value="">Not linked</option>{assessments.map(item => <option value={item.id} key={item.id}>{item.assessment_reference} - {item.title}</option>)}</select></div>
<div className="pwField"><label>Linked permit reference (optional)</label><input name="linked_permit_reference" aria-label="Linked permit reference" onChange={() => {setAnswers({});setVerified({});}} maxLength={100} /><small>Reference of the separate permit to work, if applicable.</small></div>
<div className="pwField"><label>Workplace inspection reference</label><input name="inspection_reference" maxLength={100}/></div>
</div></section>
<section className="pwCard" hidden={step !== 1}><div className="pwTitle"><i>2</i><div><h2 id="powra-stage-1" tabIndex={-1}>Check conditions</h2><p>Confirm readiness. Any No answer stops work until corrected.</p></div></div><div>{checks.map(item => <div className="pwCheckRow" key={item}><span>{item}</span>{["yes", "no", "na"].map(option => <label className="pwChoice" key={option}><input type="radio" name={"powra-check-" + checks.indexOf(item)} aria-label={item + ": " + option.toUpperCase()} checked={answers[item] === option} onChange={() => setAnswers(current => ({
...current,
[item]: option
}))} />{option.toUpperCase()}</label>)}</div>)}</div></section>
<section className="pwCard" hidden={step !== 2}><div className="pwTitle"><i>3</i><div><h2 id="powra-stage-2" tabIndex={-1}>Hazards and controls</h2><p>Select present hazards and record the precautions required before starting.</p></div></div><div className="pwHazards">{hazardOptions.map(item => <label className="pwHazard" key={item}><input type="checkbox" checked={hazards.includes(item)} onChange={() => {toggleHazard(item);setNoHazards(false);setVerified(current => ({...current,[item]:false}));}} />{item}</label>)}</div>
{!hazards.length && <label className="pwHazard"><input type="checkbox" checked={noHazards} onChange={e => setNoHazards(e.target.checked)}/>No additional hazards identified at the point of work</label>}
{hazards.map(item => <div className="pwControl" key={item}><strong>{item}</strong>{item === "Other" && <label className={layout.field}>Describe the hazard<input maxLength={160} value={otherHazard} onChange={e => {setOtherHazard(e.target.value);setVerified(current => ({...current,Other:false}));}}/></label>}<textarea value={controls[item] || ""} maxLength={1500} onChange={event => {setControls(current => ({...current,[item]:event.target.value}));setVerified(current => ({...current,[item]:false}));}} aria-label={"Control measures for " + item} placeholder="Control measures / precautions" /><select aria-label={"Remaining risk for " + item} value={risk[item] || ""} onChange={event => setRisk(current => ({
...current,
[item]: event.target.value
}))}><option value="">Select remaining risk</option><option value="low">Low remaining risk</option><option value="medium">Medium remaining risk</option><option value="high">High remaining risk</option></select>
<label className="pwHazard"><input type="checkbox" checked={verified[item] === true} onChange={e => setVerified(current => ({...current,[item]:e.target.checked}))}/>Control verified in place</label>
<label className="pwHazard"><input type="checkbox" checked={changed[item] === true} onChange={e => setChanged(current => ({...current,[item]:e.target.checked}))}/>New or significantly changed hazard</label>
</div>)}
</section>
<section className="pwCard" hidden={step !== 3}>
<div className="pwTitle"><i>4</i><div><h2 id="powra-stage-3" tabIndex={-1}>Safety decision</h2></div></div>
<div className={layout.notice + " " + layout[decisionDetails[decision][1]]}>
<strong>{decisionDetails[decision][0]}</strong>
{decision === "pending" && <p>Complete each check and record the remaining risk, or confirm that no additional hazards were identified.</p>}
{decision === "stop_work" && <p>Work is on hold. Record the reason and any escalation before saving.</p>}
{decision === "additional_controls" && <p>Work is on hold until the outstanding controls are verified and the task is reassessed.</p>}
{decision === "supervisor_review" && <p>Work is on hold for further assessment and supervisor review.</p>}
</div>
{prior && <p>Reassessment of {prior.powra_reference}. Record the supervisor and the basis for the reassessment.</p>}
<div className="pwGrid" style={{
marginTop: 14
}}><div className="pwField full"><label>Decision explanation / escalation</label><textarea name="decision_reason" aria-label="Decision explanation or escalation" maxLength={3000} placeholder="Explain failed checks, escalation or why work can proceed." /></div><div className="pwField"><label>Supervisor name, where required</label><select name="supervisor_person_id" aria-label="Supervisor"><option value="">Not selected</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.position || person.email}</option>)}</select></div></div>
</section>
<footer className={layout.dock}>
  <button type="button" className={layout.stopButton} onClick={() => {setManualStop(true);move(3);}} disabled={pending || manualStop}>{manualStop ? "Stop Work selected" : "Stop Work"}</button>
  <div className={layout.actions}>
    {step > 0 && <button className={layout.button} type="button" onClick={() => move(step - 1)}>Back</button>}
    {step < 3 ? <button className={layout.primary} type="button" onClick={() => move(step + 1)}>Continue</button>
      : <button type="submit" className={layout.primary} disabled={pending || !ready || decision === "pending"}>{pending ? "Saving…" : "Record decision"}</button>}
  </div>
</footer>
</form>;
}
