"use client";

import { useDeviceDraftState } from "./DeviceDraftWorkspace";
import { POWRA_CHECKS } from "../lib/powraChecklist";
import { useActionState, useMemo } from "react";
const checks = POWRA_CHECKS;
const hazardOptions = ["Slips, trips or same-level falls", "Falls from height", "Falling or flying objects", "Chemicals or harmful substances", "Heat, fire or explosion", "Asphyxiation", "Machinery", "Contact with stationary objects", "Collapse or overturning", "Manual handling", "Vehicles or driving", "Dust", "Fumes", "Noise", "Vibration", "Electricity", "Radiation", "Contamination or infection", "Poor lighting", "High or low temperature", "Adverse weather", "Lone working", "Risk from other work", "Risk to others from this work", "Other"];
export default function PowraForm({
action,
assessments = [],
today,
sites = [],
people = [],
numbering = {}
}) {
const [state, formAction, pending] = useActionState(action, null);
const ready = sites.length > 0 && people.length > 0;
const example = "" + (numbering.powra_reference_prefix || "POWRA") + "" + String(numbering.powra_next_number || 1).padStart(numbering.powra_reference_padding || 0, "0") + "";
const [answers, setAnswers] = useDeviceDraftState("powraAnswers", Object.fromEntries(checks.map(item => [item, "yes"])));
const [hazards, setHazards] = useDeviceDraftState("powraHazards", []);
const [controls, setControls] = useDeviceDraftState("powraControls", {});
const [risk, setRisk] = useDeviceDraftState("powraRisk", {});
const decision = useMemo(() => {
if (Object.values(answers).includes("no") || hazards.some(item => risk[item] === "high")) return "stop_work";
if (hazards.some(item => risk[item] === "medium")) return "supervisor_review";
return "safe_to_start";
}, [answers, hazards, risk]);
const toggleHazard = item => setHazards(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
const decisionText = decision === "safe_to_start" ? "Safe to start" : decision === "supervisor_review" ? "Supervisor approval required" : "Stop work";
return <form action={formAction} className="pwForm">
{state?.error && <div className="pwNotice error" role="alert">{state.error}</div>}
<div className="pwNotice"><strong>POWRA reference: allocated automatically on save</strong><span>Current format example: {example}. The final number is assigned when the record is saved.</span><a href="/portal/company/business-profile#powra-numbering">Administration · Numbering settings →</a></div>
<input type="hidden" name="prestart_checks" value={JSON.stringify(checks.map(question => ({
question,
answer: answers[question]
})))} />
<input type="hidden" name="hazards" value={JSON.stringify(hazards.map(name => ({
name,
control: controls[name] || "",
remaining_risk: risk[name] || "low"
})))} />
<input type="hidden" name="decision" value={decision} />
<style>{".pwForm,.pwForm *{box-sizing:border-box}\n.pwForm{display:grid;gap:16px;width:100%;min-width:0}\n.pwNotice{display:grid;gap:8px;min-width:0;padding:16px 20px;border:1px solid #c8d9e7;border-radius:12px;background:#f7fbff;color:#173b59;overflow-wrap:anywhere}\n.pwNotice.error{background:#fff0ec;color:#a33221}\n.pwNotice span,.pwField small{font-size:13px;line-height:1.5}\n.pwNotice a,.pwField a{color:#1762ef}\n.pwCard{min-width:0;padding:22px;border:1px solid #d4e1ea;border-radius:16px;background:#fff}\n.pwTitle{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}\n.pwTitle>div{min-width:0}\n.pwTitle i{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:#087f6c;color:#fff;font-style:normal;font-weight:950}\n.pwTitle h2{margin:0;font-size:21px}\n.pwTitle p{margin:4px 0 0;color:#657b91;line-height:1.5}\n.pwGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}\n.pwField{display:grid;min-width:0;gap:7px;align-content:start}\n.pwField.full{grid-column:1/-1}\n.pwField>label{display:block;line-height:1.4;font-size:12px;font-weight:900;color:#294964}\n.pwField input:not([type=checkbox]):not([type=radio]),.pwField select,.pwField textarea,.pwControl textarea,.pwControl select{display:block;width:100%;max-width:100%;min-width:0;min-height:44px;margin:0;padding:10px 12px;border:1px solid #c9d7e3;border-radius:9px;background:#fff;color:#102d49;font:inherit;font-size:16px;line-height:1.4}\n.pwField select,.pwControl select{text-overflow:ellipsis}\n.pwField textarea,.pwControl textarea{height:auto;min-height:88px;resize:vertical}\n.pwField input[type=date]{appearance:none;-webkit-appearance:none;width:100%;max-width:100%;min-width:0;min-height:46px;text-align:left}\n.pwField input[type=date]::-webkit-date-and-time-value{text-align:left;min-height:1.4em}\n.pwField small{display:block;overflow-wrap:anywhere}\n.pwMembers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}\n.pwForm .pwMembers label,.pwForm .pwHazard{display:flex;align-items:center;gap:10px;min-width:0;min-height:48px;padding:12px;border:1px solid #c9d7e3;border-radius:9px;color:#294964;font-size:13px;font-weight:750;line-height:1.5;overflow-wrap:anywhere;cursor:pointer}\n.pwForm .pwMembers input,.pwForm .pwHazard input,.pwForm .pwChoice input{appearance:auto;-webkit-appearance:auto;display:inline-block;flex:0 0 20px;width:20px;height:20px;min-width:20px;min-height:20px;max-width:20px;margin:0;padding:0;accent-color:#087f6c}\n.pwCheckRow{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,78px);min-width:0;border-top:1px solid #e1e8ee}\n.pwCheckRow>span{min-width:0;padding:14px 8px;font-size:14px;line-height:1.5;overflow-wrap:anywhere}\n.pwChoice{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:48px;padding:10px 4px;border-left:1px solid #e1e8ee;font-size:12px;font-weight:850;cursor:pointer}\n.pwHazards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}\n.pwControl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,180px);gap:10px;min-width:0;margin-top:12px;padding:14px;border-radius:10px;background:#f3f7fa}\n.pwControl strong{grid-column:1/-1;overflow-wrap:anywhere;font-size:13px}\n.pwDecision{position:sticky;bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;min-width:0;padding:18px 20px;border-radius:14px;background:#082a54;color:#fff;box-shadow:0 16px 40px #082a5440}\n.pwDecision>div{min-width:0}\n.pwDecision strong,.pwDecision span{display:block;overflow-wrap:anywhere}\n.pwDecision span{margin-top:5px;color:#d5e3f0;font-size:13px;line-height:1.5}\n.pwDecision.stop{background:#8f2722}\n.pwDecision.review{background:#80550b}\n.pwDecision button{flex-shrink:0;min-height:48px;padding:13px 18px;border:0;border-radius:9px;background:#0aae79;color:#fff;font:inherit;font-weight:900;cursor:pointer}\n.pwDecision button:disabled{opacity:.55;cursor:not-allowed}\n.pwForm input:focus-visible,.pwForm select:focus-visible,.pwForm textarea:focus-visible,.pwForm button:focus-visible,.pwForm a:focus-visible{outline:3px solid #70a8ff;outline-offset:3px}\n@media(max-width:760px){\n .pwGrid{grid-template-columns:minmax(0,1fr)}\n .pwField.full{grid-column:auto}\n .pwHazards{grid-template-columns:repeat(2,minmax(0,1fr))}\n .pwCheckRow{grid-template-columns:repeat(3,minmax(0,1fr));padding:12px 0;gap:8px}\n .pwCheckRow>span{grid-column:1/-1;padding:0 0 4px;font-weight:750}\n .pwChoice{border:1px solid #d5e1e9;border-radius:8px;min-height:48px;padding:10px 4px}\n .pwControl{grid-template-columns:minmax(0,1fr)}\n .pwControl strong{grid-column:auto}\n .pwDecision{position:static;display:grid;gap:14px}\n .pwDecision button{width:100%}\n}\n@media(max-width:520px){\n .pwCard{padding:16px}\n .pwHazards,.pwMembers{grid-template-columns:minmax(0,1fr)}\n .pwNotice{padding:14px}\n .pwTitle{gap:10px}\n}\n"}</style>
<section className="pwCard"><div className="pwTitle"><i>1</i><div><h2>Stop</h2><p>Identify the task, location and people completing the check.</p></div></div><div className="pwGrid">
<div className="pwField full"><label>Task or job *</label><input name="task" required minLength={3} maxLength={500} /></div>
<div className="pwField"><label>Site / location *</label><select name="administration_location_id" aria-label="Site / location" required disabled={!sites.length}><option value="">Select company site</option>{sites.map(site => <option key={site.id} value={site.id}>{site.label || [site.profile_reference, site.location_name].filter(Boolean).join(" · ")}</option>)}</select><small>{!sites.length && <span role="alert">No company sites available. Add a site before saving. </span>}<a href="/portal/company/sites">Administration · Site Profile →</a></small></div><div className="pwField"><label>Work area / equipment</label><input name="work_area" /></div>
<div className="pwField"><label>Completed by *</label><select name="completed_by_person_id" aria-label="Completed by" required disabled={!people.length}><option value="">Select active company user</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.position || person.email}</option>)}</select><small>{!people.length && <span role="alert">No active company users. Add or activate a user under Administration before saving. </span>}<a href="/portal/company/people">Administration · People, Roles & Access →</a></small></div><div className="pwField"><label>Date *</label><input name="assessment_date" type="date" defaultValue={today} required /></div>
<div className="pwField full"><label>Team members</label><div className="pwMembers">{people.map(person => <label key={person.id}><input type="checkbox" name="team_member_ids" value={person.id} />{person.name}</label>)}</div><input name="additional_team_members" maxLength={1000} placeholder="Additional people or contractors — enter names manually" /><small>Select company users above and add external participants where needed.</small></div>
<div className="pwField"><label>Linked risk assessment</label><select name="linked_assessment_id"><option value="">Not linked</option>{assessments.map(item => <option value={item.id} key={item.id}>{item.assessment_reference} - {item.title}</option>)}</select></div>
<div className="pwField"><label>Linked permit reference (optional)</label><input name="linked_permit_reference" maxLength={100} /><small>Reference of the separate permit to work, if applicable.</small></div>
</div></section>
<section className="pwCard"><div className="pwTitle"><i>2</i><div><h2>Think</h2><p>Confirm readiness. Any No answer stops work until corrected.</p></div></div><div>{checks.map(item => <div className="pwCheckRow" key={item}><span>{item}</span>{["yes", "no", "na"].map(option => <label className="pwChoice" key={option}><input type="radio" name={"powra-check-" + checks.indexOf(item)} aria-label={item + ": " + option.toUpperCase()} checked={answers[item] === option} onChange={() => setAnswers(current => ({
...current,
[item]: option
}))} />{option.toUpperCase()}</label>)}</div>)}</div></section>
<section className="pwCard"><div className="pwTitle"><i>3</i><div><h2>Act</h2><p>Select present hazards and record the precautions required before starting.</p></div></div><div className="pwHazards">{hazardOptions.map(item => <label className="pwHazard" key={item}><input type="checkbox" checked={hazards.includes(item)} onChange={() => toggleHazard(item)} />{item}</label>)}</div>
{hazards.map(item => <div className="pwControl" key={item}><strong>{item}</strong><textarea value={controls[item] || ""} onChange={event => setControls(current => ({
...current,
[item]: event.target.value
}))} aria-label={"Control measures for " + item} placeholder="Control measures / precautions" /><select aria-label={"Remaining risk for " + item} value={risk[item] || "low"} onChange={event => setRisk(current => ({
...current,
[item]: event.target.value
}))}><option value="low">Low remaining risk</option><option value="medium">Medium remaining risk</option><option value="high">High remaining risk</option></select></div>)}
<div className="pwGrid" style={{
marginTop: 14
}}><div className="pwField full"><label>Decision explanation / escalation</label><textarea name="decision_reason" placeholder="Explain failed checks, escalation or why work can proceed." /></div><div className="pwField"><label>Supervisor name, where required</label><select name="supervisor_person_id" aria-label="Supervisor"><option value="">Not selected</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.position || person.email}</option>)}</select></div></div>
</section>
<section className="pwCard"><div className="pwTitle"><i>4</i><div><h2>Review</h2><p>Complete this section when the task finishes.</p></div></div><div className="pwGrid"><div className="pwField"><label>Did conditions change?</label><select name="conditions_changed"><option value="no">No</option><option value="yes">Yes</option></select></div><div className="pwField"><label>Were new hazards identified?</label><select name="new_hazards"><option value="no">No</option><option value="yes">Yes</option></select></div><div className="pwField"><label>Were the controls effective?</label><select name="controls_effective"><option value="yes">Yes</option><option value="no">No</option></select></div><div className="pwField"><label>Incident or near miss?</label><select name="incident"><option value="no">No</option><option value="yes">Yes</option></select></div><div className="pwField full"><label>End-of-job review comments</label><textarea name="review_comments" /></div></div></section>
<footer className={"pwDecision " + (decision === "stop_work" ? "stop" : decision === "supervisor_review" ? "review" : "") + ""}><div><strong>{decisionText}</strong><span>{decision === "safe_to_start" ? "Checks support proceeding with the recorded controls." : decision === "supervisor_review" ? "Obtain supervisor confirmation before work starts." : "Do not start work. Correct the failed check or complete a fuller assessment."}</span></div><button type="submit" disabled={pending || !ready}>{pending ? "Saving…" : "Save POWRA"}</button></footer>

  </form>;
}
