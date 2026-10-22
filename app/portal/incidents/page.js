import Link from "next/link";
import { incidentRows } from "../../../lib/incident-data";
import {
  incidentContext,
  loadIncidentRegister,
  checkResult,
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
  const c = await incidentContext(),
    q = await searchParams;
  const all = await loadIncidentRegister(c);
  const reports = all.filter(
    (r) =>
      (!q?.domain || r.domains.includes(q.domain)) &&
      (!q?.site || r.site_id === q.site) &&
      (!q?.zone || r.zone_id === q.zone) &&
      (!q?.status || r.status === q.status) &&
      (!q?.from || r.occurred_at.slice(0, 10) >= q.from) &&
      (!q?.to || r.occurred_at.slice(0, 10) <= q.to),
  );
  const tasks = await incidentRows(
    c.admin,
    "incident_tasks",
    c.organization.id,
    "id,incident_id,status,due_at",
  );
  const s = incidentStatistics(reports, tasks);
  const sites = [
    ...new Map(
      all.map((r) => [r.site_id, r.location_label.split(" / ")[0]]),
    ).entries(),
  ];
  return (
    <>
      <IncidentHeader
        title="Accident, Incident & Near Misses"
        description="One location-aware report, a coordinated response across QHSE, security and continuity, and independently verified learning."
        admin={c.incidentAdministrator}
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
        Confirmed statistics exclude untriaged, rejected and duplicate
        submissions. Critical / immediate includes unconfirmed reporter alerts
        for urgent review. All figures respect your access scope and selected
        filters.
      </p>
      <div className="incidentGrid">
        <section className="incidentCard">
          <h2>Confirmed events by area</h2>
          <div className="incidentBars">
            {INCIDENT_DOMAINS.map(([k, v]) => (
              <div className="incidentBar" key={k}>
                <span>{v}</span>
                <div className="incidentBarTrack">
                  <i
                    style={{
                      width:
                        Math.max(
                          1,
                          (s.byDomain[k] / Math.max(1, s.confirmed)) * 100,
                        ) + "%",
                    }}
                  />
                </div>
                <b>{s.byDomain[k]}</b>
              </div>
            ))}
          </div>
          <p className="incidentMuted">
            A multi-area event appears in each relevant area. These counts
            overlap.
          </p>
        </section>
        <section className="incidentCard">
          <h2>Six-month occurrence trend</h2>
          <div className="incidentBars">
            {s.months.map((m) => (
              <div className="incidentBar" key={m.key}>
                <span>{m.key}</span>
                <div className="incidentBarTrack">
                  <i
                    style={{
                      width:
                        Math.max(
                          1,
                          (m.count /
                            Math.max(1, ...s.months.map((x) => x.count))) *
                            100,
                        ) + "%",
                    }}
                  />
                </div>
                <b>{m.count}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="incidentCard">
        <h2>Accidents, incidents and prevention</h2>
        <div className="incidentChoices">
          {INCIDENT_TYPES.map(([k, v]) => (
            <span className="incidentBadge" key={k}>
              {v}: {s.byType[k]}
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
                      value={r.criticality || r.reported_criticality}
                    />
                    <br />
                    <small>
                      {r.triaged_at ? "Confirmed" : "Reporter alert"}
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
