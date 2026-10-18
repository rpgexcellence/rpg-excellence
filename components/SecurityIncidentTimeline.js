const LABELS = {
  task_created: "Incident created",
  status_changed: "Status changed",
  assignment_changed: "Role assignment changed",
  due_date_changed: "Recovery target changed",
  verification_effective: "Recovery verified effective",
  verification_not_effective: "Recovery not effective",
  closure_approved: "Closure approved",
  incident_closed: "Incident closed",
  task_updated: "Incident record updated",
};

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(value))
  : "Time not recorded";

const label = (value) => String(value || "")
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

function eventDetail(event) {
  const before = event.previous_values || {};
  const after = event.current_values || {};

  if (event.event_type === "status_changed" || event.event_type === "incident_closed") {
    return `${label(before.status || "Not set")} → ${label(after.status || "Not set")}`;
  }
  if (event.event_type === "verification_effective") {
    return after.verification_summary || "Independent verification recorded as effective.";
  }
  if (event.event_type === "verification_not_effective") {
    return after.verification_summary || "Verification returned the incident for further action.";
  }
  if (event.event_type === "closure_approved") {
    return after.closure_approval_comment || "Controlled closure approval recorded.";
  }
  if (event.event_type === "due_date_changed") {
    return `${before.target_recovery_date || "Not set"} → ${after.target_recovery_date || "Not set"}`;
  }
  if (event.event_type === "assignment_changed") {
    return "One or more controlled incident roles were reassigned.";
  }
  if (event.event_type === "task_created") {
    return `Initial status: ${label(after.status || "reported")}`;
  }
  return "Controlled incident record updated.";
}

export default function SecurityIncidentTimeline({ events = [] }) {
  return <section className="sit"><style>{styles}</style><header><div><small>CONTROLLED AUDIT TRAIL</small><h2>Incident timeline</h2><p>Chronological history of assignments, status decisions, verification and closure.</p></div><span>{events.length} event{events.length === 1 ? "" : "s"}</span></header>
    {events.length ? <ol>{events.map((event, index) => <li key={event.id} className={event.event_type}><div className="sitMarker">{events.length-index}</div><article><div><strong>{LABELS[event.event_type] || label(event.event_type)}</strong><time>{formatDateTime(event.created_at)}</time></div><p>{eventDetail(event)}</p><small>Recorded by {event.actor_name || "System-controlled process"}</small></article></li>)}</ol> : <div className="sitEmpty"><strong>No timeline events are available</strong><span>New controlled changes will be recorded automatically.</span></div>}
  </section>;
}

const styles=`.sit{margin-bottom:16px;padding:20px;border:1px solid #cbdce6;border-radius:14px;background:#fff}.sit>header{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:15px}.sit>header small{color:#087f91;font-weight:950;letter-spacing:.11em}.sit>header h2{margin:5px 0;font-size:23px}.sit>header p{margin:0;color:#667e92}.sit>header>span{padding:6px 9px;border-radius:999px;background:#e8f0ff;color:#164fc6;font-size:12px;font-weight:900;white-space:nowrap}.sit ol{display:grid;gap:0;margin:0;padding:0;list-style:none}.sit li{position:relative;display:grid;grid-template-columns:34px 1fr;gap:11px;padding-bottom:12px}.sit li:not(:last-child):before{content:"";position:absolute;left:16px;top:30px;bottom:0;width:2px;background:#d8e4ec}.sitMarker{z-index:1;display:grid;place-items:center;width:34px;height:34px;border:2px solid #9db6c8;border-radius:50%;background:#fff;color:#46647a;font-size:11px;font-weight:950}.sit li.verification_effective .sitMarker,.sit li.closure_approved .sitMarker,.sit li.incident_closed .sitMarker{border-color:#20a67d;background:#e7f7f1;color:#087052}.sit li.verification_not_effective .sitMarker{border-color:#d4665d;background:#fff0ee;color:#9f1f17}.sit article{padding:11px 13px;border:1px solid #d9e4eb;border-radius:9px;background:#f8fafc}.sit article>div{display:flex;justify-content:space-between;gap:12px}.sit article strong{color:#0b2947}.sit article time{color:#637b8f;font-size:11px;white-space:nowrap}.sit article p{margin:6px 0;color:#405f76;line-height:1.4;white-space:pre-wrap}.sit article small{color:#718697}.sitEmpty{display:grid;gap:4px;padding:16px;border:1px dashed #c4d6e2;border-radius:9px;color:#637b8f}@media(max-width:650px){.sit{padding:16px}.sit>header{display:grid}.sit>header>span{justify-self:start}.sit article>div{display:grid;gap:4px}.sit article time{white-space:normal}}`;
