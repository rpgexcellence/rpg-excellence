import Link from "next/link";
export const pretty = (value) =>
  String(value || "Not recorded").replaceAll("_", " ");
export const personName = (p) =>
  p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : "Not assigned";
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
    : "Not recorded";
export function IncidentHeader({ title, description, admin = false }) {
  return (
    <>
      <header className="incidentHead">
        <span className="incidentEyebrow">
          RPG EXCELLENCE · RESPONSE & LEARNING
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <nav className="incidentNav" aria-label="Incident navigation">
        <Link href="/portal/incidents">Dashboard</Link>
        <Link href="/portal/incidents?view=register">Report register</Link>
        <Link href="/portal/incidents/new">New report</Link>
        {admin && (
          <Link href="/portal/incidents/admin">Incident administration</Link>
        )}
      </nav>
    </>
  );
}
export function IncidentBadge({ value }) {
  return <span className={"incidentBadge " + value}>{pretty(value)}</span>;
}
export function PersonSelect({
  people,
  name,
  label,
  value,
  required = true,
  multiple = false,
}) {
  return (
    <label>
      {label}
      <select
        name={name}
        required={required}
        multiple={multiple}
        defaultValue={value || (multiple ? [] : "")}
        size={multiple ? 4 : undefined}
      >
        {!multiple && <option value="">Select an active person</option>}
        {people.map((p) => (
          <option value={p.id} key={p.id}>
            {personName(p)}
            {!p.user_id ? " · account not linked" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
export function CaseHidden({ report, command }) {
  return (
    <>
      <input type="hidden" name="id" value={report.id} />
      <input type="hidden" name="version" value={report.version} />
      <input type="hidden" name="command" value={command} />
    </>
  );
}
