"use client";

import { useState } from "react";

export default function RcaGateReviewerField({ people, discipline, locked = false, approvalLabel = "Confirm approval", approvalStyle }) {
  const [reviewerId, setReviewerId] = useState(() =>
    people.some(person => person.id === discipline.reviewer_person_id) ? discipline.reviewer_person_id : ""
  );
  const approved = discipline.status === "approved";
  const canApprove = people.some(person => person.id === reviewerId);

  return <div style={{ flexBasis: "100%", order: -1, display: "grid", gap: 8, maxWidth: 640 }}>
    {approved ? <p style={{ margin: 0, color: "#174b3c" }}>Company reviewer: <strong>{discipline.reviewer_name || "Not recorded on this earlier approval"}</strong>{discipline.reviewer_email ? ` · ${discipline.reviewer_email}` : ""}</p> : <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>Company reviewer
      <select name="reviewer_person_id" value={reviewerId} onChange={event => setReviewerId(event.target.value)} disabled={locked || !people.length} style={{ width: "100%", minWidth: 0, minHeight: 48, padding: "12px 14px", border: "1px solid #cfdae8", borderRadius: 10, fontSize: 16 }}>
        <option value="">Select company user before confirming approval</option>
        {people.map(row => <option key={row.id} value={row.id}>{row.name}{row.email ? ` · ${row.email}` : ""}</option>)}
      </select>
    </label>}
    {!people.length && <small>Add or activate company users under <a href="/portal/company/people">Administration → People, Roles &amp; Access</a>.</small>}
    {!approved && !locked && !canApprove && <small style={{ color: "#8a4600", lineHeight: 1.5 }}>Select an active company reviewer to enable approval. You can still save progress or mark this gate ready for review.</small>}
    <small style={{ color: "#607089", lineHeight: 1.5 }}>The selected reviewer is recorded with this gate. Your signed-in account records the approval confirmation.</small>
    {!locked && !approved && <button type="submit" name="intent" value="approve" disabled={!canApprove} style={{ ...approvalStyle, justifySelf: "start", opacity: canApprove ? 1 : 0.55, cursor: canApprove ? "pointer" : "not-allowed" }}>{approvalLabel}</button>}
  </div>;
}
