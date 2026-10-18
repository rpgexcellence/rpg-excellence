"use client";

import { useActionState } from "react";

export default function WorkplaceInspectionFindingsPanel({
  inspectionId,
  responses = [],
  findings = [],
  actions = [],
  people = [],
  createFindingAction,
  createActionAction,
  submitAction,
  readOnly = false,
}) {
  const [findingState, findingFormAction, findingPending] = useActionState(createFindingAction, null);
  const [actionState, actionFormAction, actionPending] = useActionState(createActionAction, null);
  const [submitState, submitFormAction, submitPending] = useActionState(submitAction, null);
  const actionByFinding = new Map(actions.map((item) => [item.finding_id, item]));
  const findingResponseIds = new Set(findings.map((item) => item.response_id).filter(Boolean));
  const pendingFindingResponses = responses.filter((item) => item.finding_required && !findingResponseIds.has(item.id));
  const unassignedFindings = findings.filter((item) => !actionByFinding.has(item.id) && !["positive_practice", "opportunity_for_improvement"].includes(item.finding_type));

  return <div className="wpiFindingWorkspace">
    {!readOnly ? <section className="wpiPanel"><div className="wpiSectionHead"><div><small>FINDINGS</small><h2>Record an inspection finding</h2><p>Describe the objective evidence and assess actual or potential consequence and likelihood.</p></div><span>{pendingFindingResponses.length} required</span></div>
      {findingState?.error ? <Message tone="error" title="Finding was not saved" text={findingState.error} /> : null}
      {findingState?.success ? <Message tone="success" title="Finding saved" text={findingState.success} /> : null}
      <form action={findingFormAction} className="wpiProgrammeForm"><input type="hidden" name="inspection_id" value={inspectionId} />
        <div className="wpiFormGrid">
          <label className="wpiField"><span>Linked checklist response</span><select name="response_id" defaultValue={pendingFindingResponses[0]?.id || ""}><option value="">General inspection finding</option>{responses.map((item) => <option key={item.id} value={item.id}>{item.question_code} · {item.question_text}</option>)}</select></label>
          <label className="wpiField"><span>Finding type *</span><select name="finding_type" required defaultValue="unsafe_condition"><option value="immediate_danger">Immediate danger</option><option value="unsafe_condition">Unsafe condition</option><option value="unsafe_act">Unsafe act</option><option value="nonconformity">Nonconformity</option><option value="environmental">Environmental finding</option><option value="positive_practice">Positive practice</option><option value="opportunity_for_improvement">Opportunity for improvement</option></select></label>
          <label className="wpiField"><span>Finding title *</span><input name="title" required maxLength="180" /></label>
          <label className="wpiField"><span>Priority *</span><select name="priority" required defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical / immediate</option></select></label>
          <label className="wpiField"><span>Severity (1–5) *</span><select name="severity" required defaultValue="3">{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}</select><small>1 negligible; 3 serious; 5 fatality or major loss.</small></label>
          <label className="wpiField"><span>Likelihood (1–5) *</span><select name="likelihood" required defaultValue="3">{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}</select><small>1 very unlikely; 3 possible; 5 very likely.</small></label>
        </div>
        <label className="wpiField"><span>Description and objective evidence *</span><textarea name="description" rows="4" required maxLength="3000" placeholder="State what was observed, where, and the requirement or expected control that was not met." /></label>
        <label className="wpiField"><span>Immediate action taken</span><textarea name="immediate_action_taken" rows="3" maxLength="3000" placeholder="Record containment, isolation, correction or escalation completed during the inspection." /></label>
        <label className="wpiFindingToggle"><input type="checkbox" name="stop_work_applied" value="true" /><span>Work was stopped or the area/equipment was isolated</span></label>
        <button className="wpiButton primary" type="submit" disabled={findingPending}>{findingPending ? "Saving…" : "Add finding"}</button>
      </form>
    </section> : null}

    <section className="wpiPanel"><div className="wpiSectionHead"><div><small>ACTION CONTROL</small><h2>Findings and assigned actions</h2><p>Action owners and independent verifiers must be selected from active Company Users.</p></div><span>{findings.length} findings</span></div>
      {findings.length ? <div className="wpiList">{findings.map((finding) => { const assigned = actionByFinding.get(finding.id); return <article className="wpiFinding" key={finding.id}><header><div><strong>{finding.title}</strong><small>{finding.finding_reference} · {finding.finding_type.replaceAll("_", " ")}</small></div><span className={"wpiTag " + (finding.priority === "critical" ? "red" : finding.priority === "high" ? "amber" : "green")}>{finding.priority} · {finding.risk_score}</span></header><p>{finding.description}</p>{finding.immediate_action_taken ? <p><strong>Immediate action:</strong> {finding.immediate_action_taken}</p> : null}{assigned ? <div className="wpiGuidance"><strong>{assigned.action_reference} · {assigned.status.replaceAll("_", " ")}</strong><p>{assigned.action_text}</p><small>Owner: {personName(people, assigned.responsible_person_id)} · Verifier: {personName(people, assigned.verifier_person_id)} · Due: {assigned.target_date}</small></div> : <div className="wpiMessage error"><strong>No controlled action assigned</strong><span>Allocate an owner, verifier and due date below.</span></div>}</article>;})}</div> : <div className="wpiEmpty">No findings have been recorded.</div>}
    </section>

    {!readOnly && findings.length ? <section className="wpiPanel"><div className="wpiSectionHead"><div><small>OWNERSHIP</small><h2>Assign finding action</h2><p>The suggested due date is calculated from priority if no date is entered.</p></div><span>{unassignedFindings.length} unassigned</span></div>
      {actionState?.error ? <Message tone="error" title="Action was not saved" text={actionState.error} /> : null}
      {actionState?.success ? <Message tone="success" title="Action assigned" text={actionState.success} /> : null}
      <form action={actionFormAction} className="wpiProgrammeForm"><input type="hidden" name="inspection_id" value={inspectionId} />
        <label className="wpiField"><span>Finding *</span><select name="finding_id" required defaultValue={unassignedFindings[0]?.id || ""}><option value="">Select finding</option>{findings.filter((item) => !actionByFinding.has(item.id)).map((finding) => <option key={finding.id} value={finding.id}>{finding.finding_reference} · {finding.title}</option>)}</select></label>
        <label className="wpiField"><span>Required action *</span><textarea name="action_text" rows="4" required maxLength="3000" placeholder="Describe the measurable action, expected output and completion evidence." /></label>
        <div className="wpiFormGrid three">
          <label className="wpiField"><span>Priority *</span><select name="priority" required defaultValue="medium"><option value="low">Low · suggested 2 months</option><option value="medium">Medium · suggested 1 month</option><option value="high">High · suggested 1 week</option><option value="critical">Critical · suggested 1 day</option></select></label>
          <label className="wpiField"><span>Responsible Company User *</span><select name="responsible_person_id" required defaultValue=""><option value="">Select action owner</option>{people.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
          <label className="wpiField"><span>Independent verifier *</span><select name="verifier_person_id" required defaultValue=""><option value="">Select verifier</option>{people.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
        </div>
        <label className="wpiField"><span>Target date</span><input name="target_date" type="date" /><small>Optional. If blank, the controlled priority timescale is applied.</small></label>
        <button className="wpiButton primary" type="submit" disabled={actionPending}>{actionPending ? "Assigning…" : "Assign action"}</button>
      </form>
    </section> : null}

    {!readOnly ? <section className="wpiPanel"><div className="wpiSectionHead"><div><small>INDEPENDENT REVIEW</small><h2>Submit completed fieldwork</h2><p>Submission is blocked until every question is assessed and every required finding is recorded.</p></div><span>Controlled gate</span></div>
      {submitState?.error ? <Message tone="error" title="Inspection was not submitted" text={submitState.error} /> : null}
      {submitState?.success ? <Message tone="success" title="Inspection submitted" text={submitState.success} /> : null}
      <form action={submitFormAction}><input type="hidden" name="inspection_id" value={inspectionId} /><button className="wpiButton primary" type="submit" disabled={submitPending}>{submitPending ? "Checking…" : "Submit for independent review"}</button></form>
    </section> : null}
  </div>;
}

function personName(people, id) {
  return people.find((person) => person.id === id)?.label || "Company User unavailable";
}

function Message({ tone, title, text }) {
  return <div className={"wpiMessage " + tone}><strong>{title}</strong><span>{text}</span></div>;
}
