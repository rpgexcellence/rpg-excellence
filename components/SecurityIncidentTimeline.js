import styles from "../app/portal/documents/documents.module.css";

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
  return <section className={styles.recordPanel}>
    <h2>Record History</h2>
    <p>Recorded assignments, status changes, verification and closure decisions.</p>
    {events.length ? <ol className={styles.recordHistory}>{events.map(event => <li key={event.id}>
      <strong>{LABELS[event.event_type] || label(event.event_type)}</strong>
      <time dateTime={event.created_at}>{formatDateTime(event.created_at)}</time>
      <p className={styles.recordProse}>{eventDetail(event)}</p>
      <small>Recorded by {event.actor_name || "System-controlled process"}</small>
    </li>)}</ol> : <p>No timeline events are available.</p>}
  </section>;
}
