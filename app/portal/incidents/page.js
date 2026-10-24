import Link from "next/link";
import {incidentAnalytics, incidentExplorerRows, incidentCurrentClassification, categoryLabel, outcomeLabel, BODY_PARTS} from "../../../lib/incident-reporting.mjs";
import {IncidentBarChart, SeverityChart, IncidentTrend, IncidentExplorer, IncidentExecutiveReport} from "../../../components/IncidentCharts";
import { incidentRows } from "../../../lib/incident-data";
import {
  incidentContext,
  loadIncidentRegister,
} from "../../../lib/incidents";
import {
  incidentStatistics,
  INCIDENT_DOMAINS,
  INCIDENT_TYPES,
} from "../../../lib/incident-policy.mjs";
import {
  IncidentHeader,
  IncidentBadge,
  dateTime,
  pretty,
} from "../../../components/IncidentUI";
export default async function IncidentsPage({ searchParams }) {
  const c = await incidentContext();
  const requested = await searchParams;
  // Only scalar search parameters cross the client boundary or enter filters.
  const q = Object.fromEntries(
    Object.entries(requested || {}).filter(([, value]) => typeof value === "string"),
  );
  const all = await loadIncidentRegister(c);
  const reports = all.filter(
    (r) =>
      (!q?.domain || r.domains.includes(q.domain)) &&
      (!q?.site || r.site_id === q.site) &&
      (!q?.zone || r.zone_id === q.zone) &&
      (!q?.status || r.status === q.status) &&
      (!q?.type || r.report_type===q.type) &&
      (!q?.severity || incidentCurrentClassification(r).severity===q.severity) &&
      (!q?.category || (r.intake_details?.categories||[]).some(item=>item.domain+":"+item.category===q.category)) &&
      (!q?.outcome || incidentCurrentClassification(r).outcomes.includes(q.outcome)) &&
      (!q?.body || incidentCurrentClassification(r).bodyParts.includes(q.body)) &&
      (!q?.from || (r.occurred_at || "").slice(0, 10) >= q.from) &&
      (!q?.to || (r.occurred_at || "").slice(0, 10) <= q.to),
  );
  const tasks = await incidentRows(
    c.admin,
    "incident_tasks",
    c.organization.id,
    "id,incident_id,status,due_at",
  );
  const s = incidentStatistics(reports, tasks);
  const analytics=incidentAnalytics(reports);
  const sites = [
    ...new Map(
      all.filter((r) => r.site_id).map((r) => [
        r.site_id,
        (r.location_label || "Site not labelled").split(" / ")[0],
      ]),
    ).entries(),
  ];
  // loadIncidentRegister has already applied organisation and case permissions.
  // Share only the graph projection; contacts, evidence and investigation text
  // remain server-side. Report filters receive location facets, not raw cases.
  const explorerRows = incidentExplorerRows(reports);
  const reportSites = sites.map(([id, label]) => ({ id, label }));
  const reportZones = [...new Map(incidentExplorerRows(all).map((row) => [
    row.zoneKey,
    { id: row.zoneKey, siteId: row.siteId, label: row.zoneLabel },
  ])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const canExecutiveReport = ["consultant", "platform_admin"].includes(
    c.incidentEntitlement?.plan,
  );
  return (
    <>
      <IncidentHeader
        title="Accident, Incident & Near Misses"
        description="One location-aware report, a coordinated response across QHSE, security and continuity, and independently verified learning."
        admin={c.incidentAdministrator}
      />
      <IncidentExecutiveReport
        canGenerate={canExecutiveReport}
        sites={reportSites}
        zones={reportZones}
      />
      <section className="incidentCard">
        <form className="incidentForm" method="get">
          <div className="incidentGrid">
            <label>
              Reporting area
              <select name="domain" defaultValue={q?.domain || ""}>
                <option value="">All areas</option>
                {INCIDENT_DOMAINS.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Site
              <select name="site" defaultValue={q?.site || ""}>
                <option value="">All authorised sites</option>
                {sites.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From (occurrence date)
              <input name="from" type="date" defaultValue={q?.from || ""} />
            </label>
            <label>
              To (occurrence date)
              <input name="to" type="date" defaultValue={q?.to || ""} />
            </label>
            <label>
              Status
              <select name="status" defaultValue={q?.status || ""}>
                <option value="">All</option>
                {[
                  "reported",
                  "triaged",
                  "investigating",
                  "actions_open",
                  "awaiting_verification",
                  "closed",
                  "rejected",
                  "duplicate",
                ].map((k) => (
                  <option key={k} value={k}>
                    {pretty(k)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="incidentChoices">
            {["type","severity","category","outcome","body"].filter(key=>q?.[key]).map(key=><label key={key}>{pretty(key)}: {pretty(q[key])}<input type="hidden" name={key} value={q[key]} /></label>)}
            <Link href="/portal/incidents">Clear filters</Link>
          </div>
          {q?.zone && <input type="hidden" name="zone" value={q.zone} />}
          <button>Apply filters</button>
        </form>
      </section>
      <div className="incidentStats">
        {[
          ["Received", s.received],
          ["Awaiting triage", s.untriaged],
          ["Confirmed cases", s.confirmed],
          ["Open confirmed", s.open],
          ["Critical / immediate", s.criticalOpen],
          ["Overdue actions", s.overdueTasks],
        ].map(([label, value]) => (
          <article className="incidentStat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <p className="incidentMuted">
        Received includes every submission. Confirmed case indicators require
        triage. Graphs include {analytics.included} current reports: {analytics.assessed} triaged
        and {analytics.provisional} awaiting triage. Reporter selections remain provisional
        until the relevant fields are assessed; saved assessed values replace them.
        Rejected and duplicate submissions are excluded from graphs. Critical /
        immediate alerts remain visible for urgent review. All figures respect
        your access scope and selected filters.
      </p>
      <div className="incidentInsightStrip">
        <article><strong>{analytics.stopWork}</strong><span>Stop-work interventions reported</span></article>
        <article><strong>{analytics.awaitingDirector}</strong><span>Critical cases awaiting Director approval</span></article>
        <article><strong>{analytics.consequencesPending}</strong><span>Triaged cases awaiting consequence assessment</span></article>
      </div>
      <div className="incidentGrid">
        <SeverityChart rows={analytics.severity} query={q} />
        <IncidentTrend months={analytics.months} />
        <IncidentBarChart title="Current events by area" description="Reported and assessed cases. One report may affect several areas; counts overlap. Select a label to filter." rows={INCIDENT_DOMAINS.map(([key,label])=>({key,label,count:analytics.byDomain[key]}))} filter="domain" query={q} />
        <IncidentBarChart title="Accidents, incidents & near misses" description="Includes new reports immediately, using the current saved event type. Assessor amendments update the counts. Rejected and duplicate reports are excluded." rows={INCIDENT_TYPES.map(([key,label])=>({key,label,count:analytics.byType[key]}))} filter="type" query={q} />
        <IncidentBarChart title="What happened / consequences" description="Reporter consequences appear immediately. Assessed consequences replace them when saved; an explicitly empty assessment removes the earlier observations. Counts can overlap." rows={analytics.outcomes} filter="outcome" query={q} />
        <IncidentExplorer rows={explorerRows} />
        <IncidentBarChart title="Reported event categories" description="Reporter-selected categories across current reports. These are observations, not confirmed causes. Multiple areas may overlap." rows={analytics.categories} filter="category" query={q} />
      </div>
      <section className="incidentCard">
        <h2>Accidents, incidents and prevention</h2>
        <div className="incidentChoices">
          {INCIDENT_TYPES.map(([k, v]) => (
            <span className="incidentBadge" key={k}>
              {v}: {analytics.byType[k]}
            </span>
          ))}
        </div>
        <p className="incidentMuted">
          High-potential near misses:{" "}
          {
            reports.filter(
              (r) =>
                r.triaged_at &&
                r.report_type === "near_miss" &&
                r.potential_severity >= 4 &&
                !["rejected", "duplicate"].includes(r.status),
            ).length
          }
          . Confirmed lost working days:{" "}
          {reports
            .filter(
              (r) =>
                r.triaged_at && !["rejected", "duplicate"].includes(r.status),
            )
            .reduce((sum, r) => sum + Number(r.lost_time_days || 0), 0)}
          . Business interruption:{" "}
          {reports
            .filter(
              (r) =>
                r.triaged_at && !["rejected", "duplicate"].includes(r.status),
            )
            .reduce(
              (sum, r) => sum + Number(r.disruption_minutes || 0),
              0,
            )}{" "}
          minutes. Frequency rates are not shown because validated hours worked
          and exposure denominators are not recorded here.
        </p>
      </section>
      <section className="incidentCard" id="register">
        <h2>Report register · {reports.length}</h2>
        <div className="incidentTableWrap">
          <table>
            <thead>
              <tr>
                <th>Reference / event</th>
                <th>Area & location</th>
                <th>Occurrence</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={"/portal/incidents/" + r.id}>
                      <strong>{r.reference}</strong>
                      <br />
                      {r.title}
                    </Link>
                    <p className="incidentRegisterContext">{(r.intake_details?.categories||[]).map(categoryLabel).join(" · ")}</p>
                    <small>{(r.investigation_details?.reviewed_outcomes||r.intake_details?.outcomes||[]).map(outcomeLabel).join(" · ")||"Consequences not recorded"}{Array.isArray(r.investigation_details?.reviewed_outcomes)?" · assessed":" · reporter observation"}</small>
                    {r.domains.includes("health_safety")&&<p className="incidentRegisterContext">{(r.investigation_details?.reviewed_body_parts||r.intake_details?.body_parts||[]).map(key=>BODY_PARTS.find(([k])=>k===key)?.[1]||key).join(" · ")}</p>}
                  </td>
                  <td>
                    {r.domains.map(pretty).join(" · ")}
                    <br />
                    <small>{r.location_label}</small>
                  </td>
                  <td>
                    {dateTime(r.occurred_at)}
                    <br />
                    <small>{pretty(r.report_type)}</small>
                  </td>
                  <td>
                    <IncidentBadge
                      value={r.immediate_danger ? "critical" : incidentCurrentClassification(r).severity}
                    />
                    <br />
                    <small>
                      {incidentCurrentClassification(r).severitySource === "assessed" ? "Assessed severity" : "Reporter alert"}
                    </small>
                  </td>
                  <td>
                    <IncidentBadge value={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!reports.length && <p>No reports match these filters.</p>}
      </section>
    </>
  );
}
