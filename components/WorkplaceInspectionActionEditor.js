"use client";

import { useActionState } from "react";

function PersonOptions({ people, currentId }) {
  const current = people.find((person) => person.id === currentId);
  return <>
    <option value="">Select Company User</option>
    {currentId && (!current || current.account_status !== "active") ?
      <option value={currentId} disabled>{current?.label || "Current appointment"} — select an active user</option> : null}
    {people.filter((person) => person.account_status === "active").map((person) =>
      <option key={person.id} value={person.id}>{person.label}</option>)}
  </>;
}

function EditForm({ inspectionId, item, people, action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return <details className="wpiWorkflowCard" style={{ background: "#fff" }}>
    <summary style={{ cursor: "pointer", fontWeight: 700, color: "#173c62", lineHeight: 1.6 }}>
      Edit action · {item.action_reference}
    </summary>
    <p style={{ lineHeight: 1.6, color: "#536b83" }}>{item.action_text}</p>
    <form action={formAction} className="wpiProgrammeForm">
      <input type="hidden" name="inspection_id" value={inspectionId} />
      <input type="hidden" name="action_id" value={item.id} />
      <input type="hidden" name="expected_updated_at" value={item.updated_at} />
      <label className="wpiField"><span>Required action *</span>
        <textarea name="action_text" rows={4} required maxLength={3000} defaultValue={item.action_text} />
      </label>
      <div className="wpiFormGrid">
        <label className="wpiField"><span>Priority *</span>
          <select name="priority" required defaultValue={item.priority}>
            <option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="critical">Critical / immediate</option>
          </select>
        </label>
        <label className="wpiField"><span>Target date *</span>
          <input name="target_date" type="date" required defaultValue={item.target_date} />
        </label>
        <label className="wpiField"><span>Responsible Company User *</span>
          <select name="responsible_person_id" required defaultValue={item.responsible_person_id}>
            <PersonOptions people={people} currentId={item.responsible_person_id} />
          </select>
        </label>
        <label className="wpiField"><span>Independent verifier *</span>
          <select name="verifier_person_id" required defaultValue={item.verifier_person_id}>
            <PersonOptions people={people} currentId={item.verifier_person_id} />
          </select>
        </label>
      </div>
      <small style={{ color: "#536b83", lineHeight: 1.6 }}>The verifier must be a different Company User from the action owner. Changing priority keeps the target date shown above; adjust it if required.</small>
      {state?.error ? <div role="alert" className="wpiMessage error"><strong>Action was not updated</strong><span>{state.error}</span></div> : null}
      {state?.success ? <div role="status" className="wpiMessage success"><strong>Action updated</strong><span>{state.success}</span></div> : null}
      <button className="wpiButton primary" type="submit" disabled={pending}>{pending ? "Saving changes…" : "Save action changes"}</button>
    </form>
  </details>;
}

export default function WorkplaceInspectionActionEditor({ inspection, actions = [], people = [], action, canEdit = false }) {
  if (!canEdit || ["completed", "cancelled"].includes(inspection.status)) return null;
  const editable = actions.filter((item) => ["open", "accepted", "in_progress"].includes(item.status));
  if (!editable.length) return null;
  return <section className="wpiPanel" style={{ marginBottom: 20 }}>
    <div className="wpiSectionHead"><div><small>ACTION DETAILS</small><h2>Edit open actions</h2><p>Update the action, appointments and target date. Actions awaiting verification or already closed are locked.</p></div><span>{editable.length} editable</span></div>
    <div className="wpiWorkflowList">{editable.map((item) =>
      <EditForm key={item.id} inspectionId={inspection.id} item={item} people={people} action={action} />)}
    </div>
  </section>;
}
