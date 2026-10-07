"use client";

import { useState } from "react";

export default function RcaGateReviewerField({ people, discipline, locked = false, approvalLabel = "Approve gate", approvalStyle, saveStyle, reviewStyle }) {
  const [reviewerId, setReviewerId] = useState(() =>
    people.some(person => person.id === discipline.reviewer_person_id) ? discipline.reviewer_person_id : ""
  );
  const approved = discipline.status === "approved";
  const canApprove = people.some(person => person.id === reviewerId);
  const buttonStyle = style => ({ ...style, boxSizing: "border-box", height: 48, minHeight: 48, alignSelf: "end", whiteSpace: "nowrap", fontSize: 14, padding: "12px 18px" });

  return <div className="rcaGateControls" style={{ marginTop: 14 }}>
    <style>{`.rcaGateControls .rcaGateRow{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}.rcaGateControls .rcaGateReviewer{display:grid;gap:8px;min-width:0;flex:1 1 320px;max-width:640px;font-weight:800}.rcaGateControls .rcaGateButtons{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.rcaGateControls small{display:block;margin-top:8px;line-height:1.5;color:#607089}@media(max-width:720px){.rcaGateControls .rcaGateReviewer{flex-basis:100%;max-width:none}.rcaGateControls .rcaGateButtons{width:100%}.rcaGateControls .rcaGateButtons button{flex:1 1 140px}}`}</style>
    <div className="rcaGateRow">
      {approved ? <p style={{ margin: 0, color: "#174b3c" }}>Company reviewer: <strong>{discipline.reviewer_name || "Not recorded on this earlier approval"}</strong>{discipline.reviewer_email ? ` · ${discipline.reviewer_email}` : ""}</p> : <label className="rcaGateReviewer">Company reviewer
        <select name="reviewer_person_id" value={reviewerId} onChange={event => setReviewerId(event.target.value)} disabled={locked || !people.length} style={{ boxSizing: "border-box", width: "100%", minWidth: 0, height: 48, padding: "12px 14px", border: "1px solid #cfdae8", borderRadius: 10, fontSize: 16 }}>
          <option value="">Select company reviewer</option>
          {people.map(row => <option key={row.id} value={row.id}>{row.name}{row.email ? ` · ${row.email}` : ""}</option>)}
        </select>
      </label>}
      <div className="rcaGateButtons">
        <button type="submit" name="intent" value="save" style={buttonStyle(saveStyle || { background: "#155eef", color: "white", border: 0, borderRadius: 10, fontWeight: 800 })} disabled={locked}>Save Progress</button>
        {!locked && <button type="submit" name="intent" value="review" style={buttonStyle(reviewStyle || { background: "#e9eff8", color: "#173a68", border: 0, borderRadius: 10, fontWeight: 800 })}>Ready for Review</button>}
        {!locked && !approved && <button type="submit" name="intent" value="approve" disabled={!canApprove} style={{ ...buttonStyle(approvalStyle || { background: "#067647", color: "white", border: 0, borderRadius: 10, fontWeight: 800 }), opacity: canApprove ? 1 : 0.55, cursor: canApprove ? "pointer" : "not-allowed" }}>{approvalLabel}</button>}
        {approved && <span style={{ color: "#067647", fontWeight: 800 }}>Approved</span>}
      </div>
    </div>
    {!people.length && <small>Add or activate company users under <a href="/portal/company/people">Administration → People, Roles &amp; Access</a>.</small>}
    {!approved && !locked && !canApprove && <small style={{ color: "#8a4600" }}>Select an active company reviewer to enable the green approval button.</small>}
    <small>Save Progress keeps your reviewer selection and draft text. Ready for Review and approval require evidence, analysis and conclusion.</small>
    <small>The selected reviewer is recorded with this gate. Your signed-in account records the approval confirmation.</small>
  </div>;
}
