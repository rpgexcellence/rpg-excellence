import Link from "next/link";
import {
  incidentExplorerRows,
  incidentCurrentClassification,
  incidentDashboardPerformance,
  categoryLabel,
  outcomeLabel,
  BODY_PARTS,
} from "../../../lib/incident-reporting.mjs";
import { IncidentIntelligenceDashboard } from "../../../components/IncidentCharts";
import { incidentRows } from "../../../lib/incident-data";
import { incidentContext, loadIncidentRegister } from "../../../lib/incidents";
import { INCIDENT_TYPES, INCIDENT_STATUSES, INCIDENT_DOMAINS } from "../../../lib/incident-policy.mjs";
import { IncidentBadge, dateTime, pretty } from "../../../components/IncidentUI";

export const dynamic = "force-dynamic";

const FILTERS = new Set([
  "from", "to", "site", "zone", "domain", "status", "type", "severity",
  "category", "outcome", "body", "view",
]);
function validDay(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
function Navigation({ administrator, query }) {
  const params = new URLSearchParams(query);
  params.set("view", "register");
  return <nav className="incidentNav" aria-label="Incident navigation">
    <Link href="/portal/incidents">Dashboard</Link>
    <Link href={"/portal/incidents?" + params}>Report register</Link>
    <Link href="/portal/incidents/new">New report</Link>
    {administrator && <Link href="/portal/incidents/admin">Incident administration</Link>}
  </nav>;
}

export default async function IncidentsPage({ searchParams }) {
  // Retain the existing account, subscription, organisation and case checks.
  const context = await incidentContext();
  const requested = await searchParams;
  const query = Object.fromEntries(Object.entries(requested || {}).filter(
    ([key, value]) => FILTERS.has(key) && typeof value === "string" && value.length <= 250,
  ));
  const registerView = query.view === "register";
  const dateError = !validDay(query.from) || !validDay(query.to) ||
    (query.from && query.to && query.from > query.to);
  if (dateError) return <>
    <Navigation administrator={context.incidentAdministrator} query={{}} />
    <section className="incidentCard" role="alert"><h1>Check the reporting period</h1><p>Use valid dates with the start date on or before the end date.</p><Link href="/portal/incidents">Clear filters</Link></section>
  </>;

  // This loader restricts every record to the current user's authorised cases.
  // Never query the underlying incident table directly for dashboard history.
  const all = await loadIncidentRegister(context);
  const history = incidentExplorerRows(all);
  const normalizedZone = query.zone && !query.zone.startsWith("zone:") && !query.zone.startsWith("site:")
    ? "zone:" + query.zone : query.zone;
  if (normalizedZone) query.zone = normalizedZone;
  const projectionById = new Map(history.map(row => [row.id, row]));
  const reports = all.filter(report => {
    const row = projectionById.get(report.id);
    const classification = incidentCurrentClassification(report);
    const day = row.occurredAt ? String(row.occurredAt).slice(0, 10) : "";
    return (!query.domain || row.domains.includes(query.domain)) &&
      (!query.site || row.siteId === query.site) &&
      (!query.zone || row.zoneKey === query.zone) &&
      (!query.status || row.status === query.status) &&
      (!query.type || row.type === query.type) &&
      (!query.severity || classification.severity === query.severity) &&
      (!query.category || (report.intake_details?.categories || []).some(item => item.domain + ":" + item.category === query.category)) &&
      (!query.outcome || classification.outcomes.includes(query.outcome)) &&
      (!query.body || classification.bodyParts.includes(query.body)) &&
      (!query.from || Boolean(day && day >= query.from)) &&
      (!query.to || Boolean(day && day <= query.to));
  });
  const rows = reports.map(report => projectionById.get(report.id));
  const snapshot = new Date().toISOString();
  const performance = incidentDashboardPerformance(rows, history, {
    sites: query.site ? [query.site] : [],
    zones: query.zone ? [query.zone] : [],
  }, snapshot);

  const activeIds = new Set(rows.filter(row => !["rejected", "duplicate"].includes(row.status)).map(row => row.id));
  const tasks = !registerView && activeIds.size ? await incidentRows(
    context.admin, "incident_tasks", context.organization.id,
    "id,incident_id,status,due_at",
  ) : [];
  // Task rows remain server-side; counts and case IDs are scoped to this view.
  const overdue = tasks.filter(task => activeIds.has(task.incident_id) &&
    !["verified", "cancelled"].includes(task.status) && task.due_at &&
    Number.isFinite(Date.parse(task.due_at)) && Date.parse(task.due_at) < Date.parse(snapshot));
  const metrics = {
    overdueActions: overdue.length,
    overdueReportIds: [...new Set(overdue.map(task => task.incident_id))],
  };
  const sites = [...new Map(history.filter(row => row.siteId).map(row => [
    row.siteId, { id: row.siteId, label: (row.location || "Site not labelled").split(" / ")[0] },
  ])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const zones = [...new Map(history.map(row => [
    row.zoneKey, { id: row.zoneKey, siteId: row.siteId, label: row.zoneLabel },
  ])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const canGenerate = ["consultant", "platform_admin"].includes(context.incidentEntitlement?.plan);
  const actualStatuses = [...new Set([...INCIDENT_STATUSES, ...history.map(row => row.status)])];

  return <>
    <Navigation administrator={context.incidentAdministrator} query={query} />
    {registerView ? <header className="incidentHead" id="register"><span className="incidentEyebrow">RPG EXCELLENCE · RESPONSE & LEARNING</span><h1>Report register</h1><p>Review, filter and open authorised accident, incident and near-miss reports.</p></header> : <IncidentIntelligenceDashboard
      key={JSON.stringify(query)} rows={rows} performance={performance}
      metrics={metrics} query={query} sites={sites} zones={zones}
      canGenerate={canGenerate} administrator={context.incidentAdministrator}
      snapshot={snapshot}
    />}
    <details className="incidentCard" open={Boolean(registerView || query.status || query.type || query.severity || query.category || query.outcome || query.body)}>
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>{registerView ? "Register filters" : "Additional report filters"}</summary>
      <form className="incidentForm" method="get" action="/portal/incidents" style={{ marginTop: 16 }}>
        {Object.entries(query).filter(([key]) => !["status", "type", "severity", "category", "outcome", "body", ...(registerView ? ["from", "to", "site", "zone", "domain"] : [])].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <div className="incidentGrid">
          {registerView && <>
            <label>Occurrence from (UTC)<input type="date" name="from" defaultValue={query.from || ""} /></label>
            <label>To (UTC)<input type="date" name="to" defaultValue={query.to || ""} /></label>
            <label>Site<select name="site" defaultValue={query.site || ""}><option value="">All authorised sites</option>{sites.map(site => <option key={site.id} value={site.id}>{site.label}</option>)}</select></label>
            <label>Zone<select name="zone" defaultValue={query.zone || ""}><option value="">All zones</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.label}</option>)}</select></label>
            <label>Reporting area<select name="domain" defaultValue={query.domain || ""}><option value="">All reporting areas</option>{INCIDENT_DOMAINS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </>}
          <label>Status<select name="status" defaultValue={query.status || ""}><option value="">All statuses</option>{actualStatuses.map(status => <option key={status} value={status}>{pretty(status)}</option>)}</select></label>
          <label>Event type<select name="type" defaultValue={query.type || ""}><option value="">All event types</option>{INCIDENT_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Current severity<select name="severity" defaultValue={query.severity || ""}><option value="">All severities</option>{["critical", "high", "medium", "low", "unknown"].map(key => <option key={key} value={key}>{pretty(key)}</option>)}</select></label>
          <label>Consequence<select name="outcome" defaultValue={query.outcome || ""}><option value="">All consequences</option>{[...new Set([...history.flatMap(row => row.outcomes), ...(query.outcome ? [query.outcome] : [])])].sort().map(key => <option key={key} value={key}>{outcomeLabel(key)}</option>)}</select></label>
          <label>Body part<select name="body" defaultValue={query.body || ""}><option value="">All body parts</option>{BODY_PARTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Reporter category<select name="category" defaultValue={query.category || ""}><option value="">All categories</option>{[...new Map(all.flatMap(report => (report.intake_details?.categories || []).map(item => [item.domain + ":" + item.category, categoryLabel(item)]))).entries()].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <div className="incidentActions"><button className="incidentButton" type="submit">{registerView ? "Apply register filters" : "Apply additional filters"}</button><Link href={registerView ? "/portal/incidents?view=register" : "/portal/incidents"}>Clear all filters</Link></div>
      </form>
    </details>
    {registerView && <section className="incidentCard" id="incident-register-records">
      <h2>Report register · {rows.length}</h2>
      <p className="incidentMuted">Current classifications replace initial observations when assessed. Rejected and duplicate submissions remain visible here for traceability.</p>
      <div className="incidentTableWrap"><table><thead><tr><th>Reference / event</th><th>Area & location</th><th>Occurrence</th><th>Priority</th><th>Status</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}>
          <td><Link href={"/portal/incidents/" + encodeURIComponent(row.id)}><strong>{row.reference}</strong><br />{row.title}</Link><p className="incidentRegisterContext">{row.outcomes.map(outcomeLabel).join(" · ") || "Consequences not recorded / none selected"}</p><small>{row.outcomeSource === "assessed" ? "Assessed consequences" : "Reporter observations / not reviewed"}</small>{row.domains.includes("health_safety") && <p className="incidentRegisterContext">{row.bodyParts.map(key => BODY_PARTS.find(([value]) => value === key)?.[1] || key).join(" · ")}</p>}</td>
          <td>{row.domains.map(pretty).join(" · ")}<br /><small>{row.location}</small></td>
          <td>{dateTime(row.occurredAt)}<br /><small>{pretty(row.type)}</small></td>
          <td><IncidentBadge value={row.immediateDanger ? "critical" : row.severity} /><br /><small>{row.immediateDanger ? "Immediate danger reported" : row.severitySource === "assessed" ? "Assessed severity" : "Reporter alert / not reviewed"}</small></td>
          <td><IncidentBadge value={row.status} /></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={5}>No reports match this selection.</td></tr>}
      </tbody></table></div>
    </section>}
  </>;
}
