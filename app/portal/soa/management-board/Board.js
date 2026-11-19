import Link from "next/link";
import { percentage, THEMES } from "./metrics.mjs";
import styles from "./board.module.css";

const boardPath = "/portal/soa/management-board";
const riskPath = "/portal/information-security/risk-management";
const incidentPath = "/portal/information-security/incidents";
const pageSize = 20;

const human = value => value?.replaceAll("_", " ") || "—";
const displayDate = value => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
const displayPercentage = value => value === null ? "N/A" : value + "%";

function Card({ title, value, text, href, tone, attention = false }) {
  const className = [styles.card, styles[tone], attention ? styles.attentionCard : ""].join(" ");
  const content = <><h3>{title}</h3><strong>{value ?? "N/A"}</strong><small>{text}</small>{href && <span>View records →</span>}</>;
  return href ? <Link href={href} className={className}>{content}</Link> : <article className={className}>{content}</article>;
}

function RecordList({ selection, page, link, close }) {
  const { rows, title } = selection;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(pages, page);
  return <section className={styles.panel} id="board-records" aria-labelledby="board-records-title">
    <div className={styles.panelHead}><h2 id="board-records-title">{title}</h2><Link href={close}>Close records</Link></div>
    {rows.length ? <ul className={styles.records}>{rows.slice((current - 1) * pageSize, current * pageSize).map(row => (
      <li key={row.key}><span>{row.href ? <Link href={row.href}>{row.label}</Link> : row.label}</span><small>{row.detail}</small></li>
    ))}</ul> : <p>No records in this scope.</p>}
    {pages > 1 && <nav className={styles.pagination} aria-label="Record pages">
      {current > 1 && <Link href={link(current - 1)}>Previous</Link>}
      <span>Page {current} of {pages} · {rows.length} records</span>
      {current < pages && <Link href={link(current + 1)}>Next</Link>}
    </nav>}
  </section>;
}

export default function Board({ scopes, organization, values, accessOrganizationId, today, security, controls, registers, legacy, children }) {
  const { org, assessment, theme, year, quarter, detail, page } = values;
  const { activeRisks, above, unresolved, overdue, undated, cohorts, activeIncidents, serious, overdueRecovery, incidentVerification, pending, expiring, expired } = security;
  const currentRiskWorkspace = Boolean(organization && organization.id === accessOrganizationId && activeRisks);
  const riskLink = id => currentRiskWorkspace ? riskPath + "?risk=" + encodeURIComponent(id) : null;
  const soaLink = (id, control) => "/portal/assessments/" + id + "/soa" + (control ? "?q=" + encodeURIComponent(control) : "");
  const riskEntry = row => ({ key: row.id, label: row.risk_reference, detail: row.appetite === undefined ? "Approved threshold unavailable" : "Residual " + row.residual_score + " · appetite " + row.appetite, href: riskLink(row.id) });
  const treatmentEntry = row => ({ key: row.id, label: row.risk.risk_reference, detail: "Treatment · " + human(row.status) + " · " + displayDate(row.target_date), href: riskLink(row.risk_id) });
  const incidentEntry = row => ({ key: row.id, label: row.incident_reference, detail: human(row.severity) + " · " + human(row.status) + (row.target_recovery_date ? " · " + displayDate(row.target_recovery_date) : ""), href: organization.id === accessOrganizationId ? incidentPath + "/" + row.id : null });
  const controlEntry = row => ({ key: row.assessment_id + ":" + row.control_id, label: "A." + row.control_id, detail: human(row.implementation_status), href: soaLink(row.assessment_id, row.control_id) });
  const acceptanceEntry = row => ({ key: row.id, label: row.risk.risk_reference, detail: "Acceptance · " + human(row.decision) + " · " + displayDate(row.expires_at), href: riskLink(row.risk_id) });
  const upcoming = [
    ...(activeRisks ?? []).map(row => ({ ...riskEntry(row), key: "risk:" + row.id, date: row.review_due_date, detail: "Risk review" })),
    ...registers.map(row => ({ key: "soa:" + row.id, label: "SoA v" + row.version, date: row.review_due_at?.slice(0, 10), detail: "SoA review", href: soaLink(row.assessment_id) })),
    ...(activeIncidents ?? []).map(row => ({ ...incidentEntry(row), key: "incident:" + row.id, date: row.target_recovery_date, detail: "Incident recovery target" })),
    ...(expiring ?? []).map(row => ({ ...acceptanceEntry(row), key: "acceptance:" + row.id, date: row.expires_at, detail: "Acceptance expiry" })),
  ].filter(row => row.date && row.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const cohortRows = cohorts?.flatMap(group => group.rows);
  const verified = cohorts?.reduce((sum, row) => sum + row.verified.length, 0);
  const verification = percentage(verified, cohortRows?.length);
  const maxDue = Math.max(1, ...(cohorts ?? []).map(group => group.rows.length));

  const selections = Object.create(null);
  function registerSelection(key, title, rows, toEntry) {
    if (rows) selections[key] = { title, rows: detail === key ? rows.map(toEntry) : [] };
  }

  registerSelection("risks", "Active risks above appetite", above, riskEntry);
  registerSelection("thresholds", "Risks with an unresolved appetite", unresolved, riskEntry);
  registerSelection("overdue", "Overdue risk treatments", overdue, treatmentEntry);
  registerSelection("undated", "Open treatments without a due date", undated, treatmentEntry);
  registerSelection("effectiveness", "Applicable controls recorded effective", controls?.effective, controlEntry);
  registerSelection("incidents", "Active security incidents", activeIncidents, incidentEntry);
  registerSelection("serious", "Active High or Critical incidents", serious, incidentEntry);
  registerSelection("recovery", "Incidents past their recovery target", overdueRecovery, incidentEntry);
  registerSelection("incident-verification", "Incidents awaiting verification", incidentVerification, incidentEntry);
  registerSelection("pending", "Risk acceptances awaiting decision", pending, acceptanceEntry);
  registerSelection("expiring", "Risk acceptances expiring within 30 days", expiring, acceptanceEntry);
  registerSelection("expired", "Expired risk acceptances", expired, acceptanceEntry);
  registerSelection("verification", "Verified treatments in the selected due period", cohorts?.flatMap(group => group.verified), treatmentEntry);
  for (const group of cohorts ?? []) registerSelection("q" + group.number, "Q" + group.number + " treatment cohort", group.rows, treatmentEntry);
  for (const group of controls?.groups ?? []) registerSelection(group.key, group.label + " applicable controls", group.rows, controlEntry);

  const query = new URLSearchParams({ org, assessment, theme, year, quarter });
  function detailUrl(key, number = 1) {
    const params = new URLSearchParams(query);
    if (key) params.set("detail", key);
    if (number > 1) params.set("page", String(number));
    return boardPath + "?" + params + (key ? "#board-records" : "");
  }

  const unavailable = "Source unavailable for this scope";
  const headlineCards = [
    { key: "risks", title: "Active risks above appetite", tone: "danger", value: above?.length, text: activeRisks ? activeRisks.length + " active risks · " + (unresolved ? unresolved.length + " without an approved threshold" : "threshold source unavailable") : unavailable },
    { key: "overdue", title: "Overdue risk treatments", tone: "amber", value: overdue?.length, text: overdue ? "Due date passed · verification outstanding" : unavailable },
    { key: "effectiveness", title: "Applicable controls recorded effective", tone: "teal", value: displayPercentage(percentage(controls?.effective.length, controls?.applicable.length)), text: controls ? controls.effective.length + " of " + controls.applicable.length + " applicable controls" : unavailable },
    { key: "incidents", title: "Active security incidents", tone: "blue", value: activeIncidents?.length, text: serious ? serious.length + " High or Critical" : unavailable },
  ];
  const attentionCards = [
    ["pending", "Acceptances awaiting decision", pending, "Review the outstanding decision", "amber"],
    ["expiring", "Acceptances expiring in 30 days", expiring, "Review before expiry", "amber"],
    ["expired", "Expired risk acceptances", expired, "Review lapsed decisions", "danger"],
    ["serious", "High or Critical incidents", serious, "Active incidents requiring oversight", "danger"],
    ["recovery", "Overdue incident recovery", overdueRecovery, "Recovery target passed", "danger"],
    ["incident-verification", "Incidents awaiting verification", incidentVerification, "Verify recovery and closure evidence", "teal"],
    ["thresholds", "Unresolved risk appetite", unresolved, "Check the linked approved methodology", "blue"],
    ["undated", "Undated open treatments", undated, "Set a target date", "blue"],
  ];
  const years = Array.from(new Set([today.slice(0, 4), year, ...values.treatmentYears])).sort().reverse();

  return <>
    <header className={styles.hero}>
      <div><span>ISMS management oversight</span><h1>Information Security Management Board</h1><p>Review residual exposure, treatment delivery, control effectiveness and security incidents.</p></div>
      <nav aria-label="Information Security workspaces"><Link href="/portal/information-security">ISMS Hub</Link><Link href="/portal/soa">SoA register</Link><Link href={riskPath}>Risk register</Link><Link href={incidentPath}>Incident register</Link><Link href={boardPath + "/executive-report"}>Executive Report / PDF</Link></nav>
    </header>
    <form className={styles.filters} action={boardPath}>
      <label>Organisation<select name="org" defaultValue={org}>{scopes.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}{!scopes.length && <option value="">No organisation</option>}</select></label>
      <label>Statement of Applicability<select name="assessment" defaultValue={assessment}><option value="all">All authorised SoA records</option>{values.soaOptions.map(row => <option value={row.assessment_id} key={row.assessment_id}>{row.label}</option>)}</select></label>
      <label>Annex A theme<select name="theme" defaultValue={theme}><option value="all">All themes</option>{Object.entries(THEMES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label>Treatment due year<select name="year" defaultValue={year}>{years.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Treatment due quarter<select name="quarter" defaultValue={quarter}><option value="all">All quarters</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>Q{n}</option>)}</select></label>
      <button type="submit">Apply filters</button>
    </form>
    <p className={styles.scope}>As at {displayDate(today)} (Europe/London). SoA and theme filters apply to control records and the existing SoA heat map. Due period applies to treatment cohorts and verification. The heat map retains its existing authorised SoA scope.</p>
    <section className={styles.cards} aria-label="Management KPIs">
      {headlineCards.map(({ key, ...card }) => <Card key={key} {...card} href={selections[key] && detailUrl(key)}/>)}
    </section>
    {selections[detail] && <RecordList selection={selections[detail]} page={page} link={number => detailUrl(detail, number)} close={detailUrl()}/>}
    <div className={styles.grid}>
      <section className={styles.panel}>
        <h2>Treatment delivery by due quarter</h2><p>Compare due treatments with those currently verified. Cancelled treatments are excluded.</p>
        {cohorts ? <ul className={styles.chart}>{cohorts.map(group => <li key={group.number}>
          <div><Link href={detailUrl("q" + group.number)}>Q{group.number} {year}</Link><span>{group.verified.length} verified / {group.rows.length} due</span></div>
          <div className={styles.track} aria-hidden="true"><div className={styles.cohort} style={{width: percentage(group.rows.length, maxDue) + "%"}}><i style={{width: (percentage(group.verified.length, group.rows.length) ?? 0) + "%"}}/></div></div>
        </li>)}</ul> : <p>{unavailable}.</p>}
      </section>
      <section className={styles.panel}>
        <h2>Annex A control position</h2><p>Applicable control records by theme. Counts reflect the selected SoA filters.</p>
        {controls ? <ul className={styles.chart}>{controls.groups.filter(group => group.key !== "unclassified" || group.rows.length).map(group => <li key={group.key}>
          <div><Link href={detailUrl(group.key)}>{group.label}</Link><span>{group.effective} effective · {group.implemented} implemented · {group.other} other</span></div>
          <div className={styles.track} aria-hidden="true">{group.rows.length > 0 && <>
            <i className={styles.effective} style={{flex: group.effective}}/><i className={styles.implemented} style={{flex: group.implemented}}/><i className={styles.other} style={{flex: group.other}}/>
          </>}</div>
        </li>)}</ul> : <p>{unavailable}.</p>}
      </section>
      <section className={styles.panel}>
        <h2>Treatment verification</h2>
        <div className={styles.donut} style={{"--portion": (verification ?? 0) + "%"}}><strong>{displayPercentage(verification)}</strong></div>
        <p>{cohortRows ? verified + " of " + cohortRows.length + " dated, non-cancelled treatments verified" : unavailable}.</p>
        {cohortRows && <Link href={detailUrl("verification")}>View verified treatments</Link>}
      </section>
      <section className={styles.panel}>
        <h2>Upcoming reviews and recovery targets</h2>
        {upcoming.length ? <ul className={styles.records}>{upcoming.slice(0, 6).map(row => <li key={row.key}><span>{row.href ? <Link href={row.href}>{row.label}</Link> : row.label}<small>{row.detail}</small></span><time dateTime={row.date}>{displayDate(row.date)}</time></li>)}</ul> : <p>{activeRisks || controls || activeIncidents ? "No upcoming dates in the available records." : unavailable + "."}</p>}
      </section>
    </div>
    <section className={styles.attention} aria-labelledby="management-attention"><h2 id="management-attention">Management attention</h2><div className={styles.attentionGrid}>{attentionCards.map(([key, title, rows, text, tone]) => <Card key={key} title={title} value={rows?.length} text={rows ? text : unavailable} tone={tone} href={selections[key] && detailUrl(key)} attention/>)}</div></section>
    <details className={styles.panel}><summary>SoA portfolio measures</summary><dl className={styles.portfolio}>{legacy.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "N/A"}</dd></div>)}</dl></details>
    {children}
  </>;
}
