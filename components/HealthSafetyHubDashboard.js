import Link from "next/link";
import HealthSafetyDashboardHeatMap from "./HealthSafetyDashboardHeatMap";
import { healthSafetyPosition } from "../lib/health-safety-dashboard.mjs";
import styles from "./HealthSafetyHubDashboard.module.css";

const root = "/portal/health-safety";
const assessmentPath = root + "/risk-assessment";
const actionsPath = root + "/actions";
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dates = [["today", "Due today"], ["upcoming", "Next 30 days"], ["overdue", "Overdue"]];
const statusLabels = { red: "Red · Intervention required", orange: "Orange · Management attention", green: "Green · No escalation triggered", neutral: "Not rated · Insufficient records" };

const count = (value, noun) => value + " " + (value === 1 ? noun : noun + "s");
const percent = (num, den) => den ? Math.round(num / den * 100) + "%" : "—";
const dateText = value => value ? dateFormat.format(new Date(value)) : "No date";
const detailUrl = (key, page = 1) => root + "?insight=" + encodeURIComponent(key) + (page > 1 ? "&records=" + page : "") + "#insight-records";

function RecordList({ data, page }) {
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.rows.length / 20));
  const current = Math.min(page, pages);
  return <section className={styles.panel} id="insight-records" aria-labelledby="insight-records-title">
    <header className={styles.panelHead}><h2 id="insight-records-title">{data.label}</h2><Link href={root + "#executive-insight"}>Close records</Link></header>
    {data.rows.length ? <ul className={styles.list}>{data.rows.slice((current - 1) * 20, current * 20).map(data.record).map(row => <li key={row.id}>
      <Link href={row.href}>{row.label}</Link><span>{row.detail}</span>
    </li>)}</ul> : <p>No records in this view.</p>}
    {pages > 1 && <nav aria-label="Record pages" className={styles.pages}>
      {current > 1 && <Link href={detailUrl(data.key, current - 1)}>Previous</Link>}
      Page {current} of {pages}
      {current < pages && <Link href={detailUrl(data.key, current + 1)}>Next</Link>}
    </nav>}
  </section>;
}

export default function HealthSafetyHubDashboard({ organisationName, assessments, hazards, actions, enrolments, powras, permits, changes, inspections, selection, recordPage, children }) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const data = healthSafetyPosition({ assessments, hazards, actions, inspections }, today);
  const byId = new Map(assessments.map(row => [row.id, row]));
  const assessmentRecord = row => ({ id: row.id, label: [row.assessment_reference, row.title].filter(Boolean).join(" · "), detail: "Review: " + dateText(row.review_date), href: assessmentPath + "/" + row.id });
  const hazardRecord = row => ({ ...assessmentRecord(byId.get(row.assessment_id)), id: row.id, detail: (row.hazard_description || row.hazard_category || "Hazard") + " · Residual score " + row.residual_score });
  const actionRecord = row => ({ id: row.id, label: [row.action_reference, row.action_required].filter(Boolean).join(" · "), detail: [row.priority, dateText(row.target_date), row.status.replaceAll("_", " ")].filter(Boolean).join(" · "), href: row.action_reference ? actionsPath + "?q=" + encodeURIComponent(row.action_reference) : assessmentPath + "/" + row.assessment_id });
  const inspectionRecord = row => ({ id: row.id, label: row.title, detail: "Planned fieldwork: " + dateText(row.planned_end_at || row.planned_start_at), href: root + "/workplace-inspections/" + row.id });
  const selections = new Map([
    ["assessments", ["Controlled assessments", data.current, assessmentRecord]],
    ["elevated", ["Elevated residual hazards", data.elevated, hazardRecord]],
    ["unacceptable", ["Unacceptable residual hazards", data.unacceptable, hazardRecord]],
    ["overdue-high", ["High-priority control actions overdue", data.overdueHigh, actionRecord]],
    ["overdue-actions", ["Overdue control actions", data.actionDates.overdue, actionRecord]],
    ["other-overdue-actions", ["Other control actions overdue", data.actionDates.overdue.filter(row => !data.overdueHigh.includes(row)), actionRecord]],
    ["overdue-reviews", ["Assessment reviews overdue", data.reviewDates.overdue, assessmentRecord]],
    ["due-reviews", ["Assessment reviews due today", data.reviewDates.today, assessmentRecord]],
    ["upcoming-reviews", ["Assessment reviews due in the next 30 days", data.reviewDates.upcoming, assessmentRecord]],
    ["due-actions", ["Control actions due today", data.actionDates.today, actionRecord]],
    ["upcoming-actions", ["Control actions due in the next 30 days", data.actionDates.upcoming, actionRecord]],
    ["verification", ["Control actions awaiting verification", data.awaiting, actionRecord]],
    ["effective", ["Control actions verified effective", data.verified, actionRecord]],
    ["overdue-inspections", ["Workplace inspections overdue", inspections?.overdue ?? [], inspectionRecord]],
  ]);
  const chosen = selections.get(selection);
  const priority = data.exceptions.filter(row => row.tone === data.status).slice(0, 2);
  const secondary = data.exceptions.filter(row => !priority.includes(row));
  const adjustments = {
    red: "Review the priority exceptions and agree the response.",
    orange: "Confirm the next responsible action and its due date.",
    green: "Continue monitoring controls and assessments.",
    neutral: "Review record coverage before relying on the dashboard rating.",
  };
  const kpis = [
    ["assessments", "Controlled assessments", data.current.length, data.approved.length + " approved or communicated"],
    ["elevated", "Elevated residual hazards", data.elevated.length, data.unacceptable.length + " unacceptable"],
    ["overdue-actions", "Overdue control actions", data.actionDates.overdue.length, data.overdueHigh.length + " high priority"],
    ["overdue-reviews", "Assessment reviews overdue", data.reviewDates.overdue.length, data.reviewDates.today.length + " due today"],
  ];
  const operational = [
    ["POWRA", "/powra", powras, powras.filter(row => ["open", "supervisor_review", "stopped"].includes(row.status)), "⚑", "Point-of-work risk assessments", "Open POWRA"],
    ["Permit to Work", "/permits", permits, permits.filter(row => row.status === "issued" && new Date(row.valid_until) >= now), "▤", "Permits for controlled work", "Open permits"],
    ["Management of Change", "/moc", changes, changes.filter(row => !["closed", "rejected", "cancelled"].includes(row.status)), "↻", "Changes requiring review or follow-up", "Open changes"],
  ];
  const exceptions = rows => rows.map(row => <li key={row.key}><Link className={styles[row.tone]} href={detailUrl(row.key)}>{row.label} <b>{row.count}</b></Link></li>);
  const dueRows = [
    ["Control actions", data.actionDates, ["due-actions", "upcoming-actions", "overdue-actions", "verification"]],
    ["Assessment reviews", data.reviewDates, ["due-reviews", "upcoming-reviews", "overdue-reviews", null]],
  ];

  return <main className={styles.dashboard}>
    <header className={styles.hero}>
      <p>RPG Excellence / Health &amp; Safety</p>
      <h1>Health &amp; Safety Dashboard</h1>
      <div className={styles.heroFoot}>Risk, control delivery and workplace inspection planning
        <nav aria-label="Create records">
          {[[assessmentPath + "/new", "New risk assessment"], [root + "/powra/new", "New POWRA"], [root + "/permits/new", "New permit"], [root + "/moc/new", "New MOC"]].map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </div>
    </header>
    <div className={styles.scope}><strong>{organisationName} · All sites</strong><span>Authorised records · Refresh to update · {dateText(today)} (UTC)</span></div>
    <section className={styles.insight} id="executive-insight" aria-labelledby="hs-insight">
      <header><h2 id="hs-insight">Executive Insight</h2><strong className={styles[data.status]}>{statusLabels[data.status]}</strong></header>
      {priority.length > 0 && <ul className={styles.chips} aria-label="Rating priorities">{exceptions(priority)}</ul>}
      <p><strong>{priority.length ? "Decision required" : "Management action"}</strong> {priority.length ? [...new Set(priority.map(row => row.decision))].join(" ") : adjustments[data.status]}</p>
      {secondary.length > 0 && <ul className={styles.chips} aria-label="Other exceptions">{exceptions(secondary.slice(0, 3))}</ul>}
      {secondary.length > 3 && <details><summary>View {count(secondary.length - 3, "more exception")}</summary><ul className={styles.chips}>{exceptions(secondary.slice(3))}</ul></details>}
      {data.status === "red" && data.missingRecords && <p>Some assessment, residual-risk or inspection records are unavailable for this rating.</p>}
      <details className={styles.rules}><summary>How the rating is decided</summary>
        <p>Red flags an unacceptable residual score or an overdue high-priority control action. Orange flags other overdue work, upcoming deadlines or verification still pending. Green requires available residual data and no flagged exception. If key data is incomplete, the board stays unrated unless an existing issue calls for intervention.</p>
      </details>
    </section>
    <section className={styles.kpis} aria-label="H&amp;S performance">
      {kpis.map(([key, label, value, note]) => <Link className={styles.kpi} href={detailUrl(key)} key={key}><span>{label}</span><strong>{value}</strong><small>{note}</small></Link>)}
    </section>
    <RecordList data={chosen && { key: selection, label: chosen[0], rows: chosen[1], record: chosen[2] }} page={Math.max(1, parseInt(recordPage, 10) || 1)}/>
    <div className={styles.split}>
      <HealthSafetyDashboardHeatMap registerHref={assessmentPath} hazards={data.liveHazards.map(hazard => {
        const assessment = byId.get(hazard.assessment_id);
        return {
          id: hazard.id,
          assessmentId: assessment.id,
          assessmentLabel: [assessment.assessment_reference, assessment.title].filter(Boolean).join(" · "),
          label: hazard.hazard_description || hazard.hazard_category || "Hazard",
          current: [hazard.current_likelihood, hazard.current_severity],
          residual: [hazard.residual_likelihood, hazard.residual_severity],
        };
      })}/>
      <section className={styles.panel} aria-labelledby="control-performance">
        <header className={styles.panelHead}><h2 id="control-performance">Control performance</h2></header>
        <dl className={styles.performance}>
          <div><dt>Assessments approved or communicated</dt><dd>{data.approved.length} / {data.current.length}</dd></div>
          <div><dt>Control actions verified effective</dt><dd><Link href={detailUrl("effective")}>{data.verified.length}</Link></dd></div>
          <div><dt>Dated open actions within target date</dt><dd>{percent(data.open.filter(row => row.target_date && row.target_date.slice(0, 10) >= today).length, data.open.filter(row => row.target_date).length)}</dd></div>
          <div><dt>Hazards rated acceptable or adequate</dt><dd>{percent(data.scored.length - data.elevated.length, data.scored.length)}</dd></div>
          <div><dt>My completed H&amp;S training</dt><dd><Link href={root + "/training"}>{enrolments.filter(row => row.status === "passed").length} / {enrolments.length}</Link></dd></div>
        </dl>
        <p><Link href={actionsPath}>Open Actions &amp; Verification →</Link></p>
      </section>
    </div>
    {children}
    <section className={`${styles.panel} ${styles.summaryPanel}`} aria-labelledby="hs-due">
      <header className={styles.summaryHead}><h2 id="hs-due">Due dates and verification</h2></header>
      <p>Next 30 days excludes today. Overdue actions can also be awaiting verification.</p>
      <div className={styles.matrixScroll} role="region" tabIndex={0} aria-label="Workstream deadlines">
        <table className={styles.queue}>
          <thead><tr><th scope="col">Workstream</th>{dates.map(([key, title]) => <th scope="col" key={key}>{title}</th>)}<th scope="col">Awaiting verification</th></tr></thead>
          <tbody>{dueRows.map(([title, rows, keys]) => <tr key={title}>
            <th scope="row">{title}</th>
            {[...dates.map(([key]) => rows[key].length), keys[3] ? data.awaiting.length : null].map((value, index) => <td key={index}>{value ? <Link aria-label={title + " " + (dates[index]?.[1] ?? "awaiting verification") + ", " + value} href={detailUrl(keys[index])}>{value}</Link> : value ?? "—"}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <section className={`${styles.panel} ${styles.summaryPanel}`} aria-labelledby="hs-priority">
      <header className={styles.summaryHead}><h2 id="hs-priority">Priority assessments</h2><Link href={detailUrl("elevated")}>View elevated hazards →</Link></header>
      {data.elevated.length ? <ul className={styles.list}>{[...new Set([...data.elevated].sort((a, b) => b.residual_score - a.residual_score).map(row => row.assessment_id))].slice(0, 8).map(id => {
        const row = assessmentRecord(byId.get(id));
        return <li key={id}><Link href={row.href}>{row.label}</Link><span>{row.detail}</span></li>;
      })}</ul> : <p className={styles.emptyNotice}>No elevated residual hazards recorded in current assessments.</p>}
    </section>
    <section aria-labelledby="hs-operational">
      <h2 id="hs-operational" className={styles.operationsTitle}>Operational registers</h2>
      <div className={styles.operations}>
        {operational.map(([label, path, rows, active, icon, description, action]) => (
          <Link className={styles.operationCard} href={root + path} key={path}>
            <div className={styles.operationHeading}><h3>{label}</h3><span aria-hidden="true">{icon}</span></div>
            <div><strong>{active.length}</strong><small>Active · {rows.length} total</small></div>
            <p>{description}.</p>
            <div className={styles.operationLink}>{action} <span aria-hidden="true">→</span></div>
          </Link>
        ))}
      </div>
    </section>
    <section className={`${styles.panel} ${styles.summaryPanel}`} aria-labelledby="recent-assessments">
      <header className={styles.summaryHead}><h2 id="recent-assessments">Recent risk assessments</h2><Link href={assessmentPath}>Open risk register →</Link></header>
      {data.current.length ? <ul className={styles.list}>{[...data.current].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 5).map(assessmentRecord).map(row => <li key={row.id}><Link href={row.href}>{row.label}</Link><span>{row.detail}</span></li>)}</ul> : <p className={styles.emptyNotice}>No current assessments in this workspace.</p>}
    </section>
  </main>;
}
