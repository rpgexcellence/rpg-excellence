import Link from "next/link";
import { soaControlHref } from "../../../../lib/soa-workflow.mjs";
import { percentage, THEMES } from "./metrics.mjs";
import styles from "./board.module.css";
import ExecutiveInsight, { DeliveryQueue } from "./ExecutiveInsight";

const boardPath = "/portal/soa/management-board";
const riskPath = "/portal/information-security/risk-management";
const incidentPath = "/portal/information-security/incidents";
const pageSize = 20;

const human = value => value?.replaceAll("_", " ") || "—";
const displayDate = value => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
const displayPercentage = value => value === null ? "N/A" : value + "%";

function Card({ title, value, text, href, tone, attention = false, action = "View records" }) {
  const className = [styles.card, styles[tone], attention ? styles.attentionCard : ""].join(" ");
  const content = <><h3>{title}</h3>{value !== false && <strong>{value ?? "N/A"}</strong>}<small>{text}</small>{href && <span>{action} →</span>}</>;
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

export default function Board({ scopes, organization, values, accessOrganizationId, today, security, review, overviewReview, controls, soa, portfolioHeatMap, children }) {
  const { org, assessment, theme, year, quarter, detail, page } = values;
  const { activeRisks, above, unresolved, overdue, undated, cohorts, activeIncidents, serious, overdueRecovery, incidentVerification, pending, expiring, expired } = security;
  const currentRiskWorkspace = Boolean(organization && organization.id === accessOrganizationId && activeRisks);
  const riskLink = id => currentRiskWorkspace ? riskPath + "?risk=" + encodeURIComponent(id) : null;
  const soaLink = (id, control) => control ? soaControlHref(id, control) : "/portal/assessments/" + id + "/soa";
  const riskEntry = row => ({ key: row.id, label: row.risk_reference, detail: row.appetite === undefined ? "Approved threshold unavailable" : "Residual " + row.residual_score + " · appetite " + row.appetite, href: riskLink(row.id) });
  const treatmentEntry = row => ({ key: row.id, label: row.risk.risk_reference, detail: "Treatment · " + human(row.status) + " · " + displayDate(row.target_date), href: riskLink(row.risk_id) });
  const incidentEntry = row => ({ key: row.id, label: row.incident_reference, detail: human(row.severity) + " · " + human(row.status) + (row.target_recovery_date ? " · " + displayDate(row.target_recovery_date) : ""), href: organization.id === accessOrganizationId ? incidentPath + "/" + row.id : null });
  const controlEntry = row => ({ key: row.assessment_id + ":" + row.control_id, label: "A." + row.control_id, detail: human(row.implementation_status), href: soaLink(row.assessment_id, row.control_id) });
  const acceptanceEntry = row => ({ key: row.id, label: row.risk.risk_reference, detail: "Acceptance · " + human(row.decision) + " · " + displayDate(row.expires_at), href: riskLink(row.risk_id) });
  const actionEntry = row => ({ ...controlEntry(row), detail: "Control action · " + human(row.action_status) + " · " + displayDate(row.target_date) });
  const riskReviewEntry = row => ({ ...riskEntry(row), detail: "Risk review · " + displayDate(row.review_due_date) });
  const soaReviewEntry = row => ({ key: row.id, label: "SoA v" + row.version, detail: human(row.status) + " · " + displayDate(row.review_due_at), href: soaLink(row.assessment_id) });
  const [treatmentDates] = overviewReview.work;
  const future = item => [...(item.today ?? []), ...(item.upcoming ?? [])];
  const upcoming = [
    ...future(treatmentDates).map(row => ({ ...treatmentEntry(row), key: "treatment:" + row.id, date: row.target_date, detail: "Risk treatment" })),
    ...(activeRisks ?? []).map(row => ({ ...riskEntry(row), key: "risk:" + row.id, date: row.review_due_date, detail: "Risk review" })),
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
  registerSelection("soa-review-queue", "SoA registers awaiting review", review.reviewQueue, soaReviewEntry);
  registerSelection("soa-drafts", "SoA registers in draft", review.draftRegisters, soaReviewEntry);
  registerSelection("soa-undecided", "SoA applicability decisions outstanding", review.undecided, controlEntry);
  const rowTypes = { treatments: treatmentEntry, actions: actionEntry, riskReviews: riskReviewEntry, soaReviews: soaReviewEntry, recovery: incidentEntry };
  for (const item of review.work) {
    for (const [bucket, title] of Object.entries({ today: "due today", upcoming: "due in the next 30 days", overdue: "overdue", verification: "awaiting verification", undated: "without a date" })) {
      registerSelection(item.key + "-" + bucket, item.label + " " + title, item[bucket], rowTypes[item.key]);
    }
  }
  for (const group of cohorts ?? []) registerSelection("q" + group.number, "Q" + group.number + " treatment cohort", group.rows, treatmentEntry);
  for (const group of controls?.groups ?? []) registerSelection(group.key, group.label + " applicable controls", group.rows, controlEntry);

  registerSelection("soa-critical", "Critical residual controls", soa.critical, controlEntry);
  registerSelection("soa-unmapped", "Controls without a residual score", soa.unmapped, controlEntry);
  registerSelection("soa-unowned", "Elevated controls without an owner", soa.unowned, controlEntry);
  registerSelection("soa-open-findings", "Open SoA findings", soa.findings, row => ({
    key: row.id, label: human(row.finding_type), detail: human(row.status),
    href: "/portal/assessments/" + row.assessment_id + "/findings",
  }));
  const soaKeys = new Set(["effectiveness", ...Object.keys(THEMES), "unclassified"]);
  const isSoaKey = key => key.startsWith("soa-") || key.startsWith("actions-") ||
    key.startsWith("soaReviews-") || soaKeys.has(key);
  const soaView = values.view === "soa" || (values.view !== "overview" && isSoaKey(detail));
  const view = soaView ? "soa" : "overview";
  const soaWork = review.work.filter(item => item.key === "actions" || item.key === "soaReviews");
  const actions = soaWork[0];

  const query = new URLSearchParams({ org, assessment, theme, year, quarter });
  function viewUrl(target) {
    const params = new URLSearchParams(query);
    params.set("view", target);
    return boardPath + "?" + params;
  }
  function detailUrl(key, number = 1) {
    const params = new URLSearchParams(query);
    params.set("view", key ? isSoaKey(key) ? "soa" : "overview" : view);
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
  const soaAttention = [
    ["soa-critical", "Critical residual controls", soa.critical, "Recorded residual score of 20 or above", "danger"],
    ["actions-overdue", "Overdue SoA control actions", actions.overdue, "Open control actions past their due date", "danger", true],
    ["actions-verification", "SoA actions awaiting verification", actions.verification, "Open actions awaiting an effectiveness decision", "teal", true],
    ["soa-undecided", "Applicability decisions pending", review.undecided, "Controls awaiting an applicability decision", "amber"],
    ["soa-drafts", "Draft SoA statements", review.draftRegisters, "Statements still in draft", "amber"],
    ["soa-open-findings", "Open SoA findings", soa.findings, theme === "all" ? "Open findings excluding conformity" : "Finding totals are available with All themes selected", "amber"],
    ["soa-unmapped", "Controls without a residual score", soa.unmapped, "Controls missing a mapped residual position", "amber"],
    ["soa-unowned", "Elevated controls without an owner", soa.unowned, "Recorded residual score of 10 or above", "amber"],
  ];
  const soaInsightCopy = {
    red: ["Red · Intervention required", "Review Critical residual scores and confirm accountable owners, treatment decisions and recovery dates for overdue actions."],
    orange: ["Amber · Review required", "Complete outstanding applicability decisions and agree what each draft needs before review."],
    green: ["Green · No escalation triggered", "Continue routine review and verification."],
    neutral: ["Not rated · Insufficient visibility", "Confirm the available records before relying on the overall position."],
  };
  const [soaRating, soaAction] = soaInsightCopy[soa.status];
  const soaSignals = [
    ["soa-critical", soa.critical?.length && soa.critical.length + " critical residual controls"],
    ["actions-overdue", actions.overdue?.length && "Overdue SoA control actions"],
    ["soa-undecided", review.undecided?.length && review.undecided.length + " applicability decisions pending"],
    ["soa-drafts", review.draftRegisters?.length && review.draftRegisters.length + " draft SoA statements"],
  ];
  const selectedRecords = selections[detail] && isSoaKey(detail) === soaView &&
    <RecordList selection={selections[detail]} page={page} link={number => detailUrl(detail, number)} close={detailUrl()}/>;
  const years = Array.from(new Set([today.slice(0, 4), year, ...values.treatmentYears])).sort().reverse();

  return <>
    <header className={styles.hero}>
      <div><span>ISMS management oversight</span><h1>Information Security Management Board</h1><p>Review residual exposure, treatment delivery, control effectiveness and security incidents.</p></div>
      <nav aria-label="Information Security workspaces"><Link href="/portal/information-security">ISMS Hub</Link><Link href="/portal/soa">SoA register</Link><Link href={riskPath}>Risk register</Link><Link href={incidentPath}>Incident register</Link><Link href="/portal/tasks">My Tasks &amp; Approvals</Link><Link href={boardPath + "/executive-report"}>Executive Report / PDF</Link></nav>
    </header>
    <nav className={styles.views} aria-label="Management Board views">
      <Link href={viewUrl("overview")} aria-current={soaView ? undefined : "page"}>ISMS overview</Link>
      <Link href={viewUrl("soa")} aria-current={soaView ? "page" : undefined}>SoA oversight</Link>
    </nav>
    <form className={styles.filters} action={boardPath}>
      <input type="hidden" name="view" value={view}/>
      <label>Organisation<select name="org" defaultValue={org}>{scopes.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}{!scopes.length && <option value="">No organisation</option>}</select></label>
      <label hidden={!soaView}>Statement of Applicability<select name="assessment" defaultValue={assessment}><option value="all">All authorised SoA records</option>{values.soaOptions.map(row => <option value={row.assessment_id} key={row.assessment_id}>{row.label}</option>)}</select></label>
      <label hidden={!soaView}>Annex A theme<select name="theme" defaultValue={theme}><option value="all">All themes</option>{Object.entries(THEMES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label hidden={soaView}>Treatment due year<select name="year" defaultValue={year}>{years.map(value => <option key={value}>{value}</option>)}</select></label>
      <label hidden={soaView}>Treatment due quarter<select name="quarter" defaultValue={quarter}><option value="all">All quarters</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>Q{n}</option>)}</select></label>
      <button type="submit">Apply filters</button>
    </form>
    <p className={styles.scope}>As at {displayDate(today)} (Europe/London). {soaView ? "The SoA and theme filters scope Annex A control records. Statement and finding counts are reported at statement level." : "The risk heat map shows the selected organisation’s risks. Due period applies to treatment cohorts and verification."}</p>
    {!soaView ? <>
    <ExecutiveInsight review={overviewReview} detailUrl={detailUrl}/>
    <section className={styles.cards} aria-label="Management KPIs">
      {headlineCards.map(({ key, ...card }) => <Card key={key} {...card} href={selections[key] && detailUrl(key)}/>)}
    </section>
    {selectedRecords}
    <DeliveryQueue work={overviewReview.work.filter(item => item.key !== "actions" && item.key !== "soaReviews")} detailUrl={detailUrl}/>
    <div className={styles.oversight}>
      <div className={styles.portfolioMap} id="risk-position">{portfolioHeatMap}</div>
      <div className={styles.treatmentPanels}>
        <section className={styles.panel}>
          <h2>Treatment delivery by due quarter</h2><p>Compare due treatments with those currently verified. Cancelled treatments are excluded.</p>
          {cohorts ? <ul className={styles.chart}>{cohorts.map(group => <li key={group.number}>
            <div><Link href={detailUrl("q" + group.number)}>Q{group.number} {year}</Link><span>{group.verified.length} verified / {group.rows.length} due</span></div>
            <div className={styles.track} aria-hidden="true"><div className={styles.cohort} style={{width: percentage(group.rows.length, maxDue) + "%"}}><i style={{width: (percentage(group.verified.length, group.rows.length) ?? 0) + "%"}}/></div></div>
          </li>)}</ul> : <p>{unavailable}.</p>}
        </section>
        <section className={styles.panel}>
          <h2>Treatment verification</h2>
          <div className={styles.donut} style={{"--portion": (verification ?? 0) + "%"}}><strong>{displayPercentage(verification)}</strong></div>
          <p>{cohortRows ? verified + " of " + cohortRows.length + " dated, non-cancelled treatments verified" : unavailable}.</p>
          {cohortRows && <Link href={detailUrl("verification")}>View verified treatments</Link>}
        </section>
      </div>
    </div>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Next deadlines and reviews</h2><Link href="/portal/tasks">My Tasks &amp; Approvals</Link></div>
        {upcoming.length ? <ul className={styles.records}>{upcoming.slice(0, 6).map(row => <li key={row.key}><span>{row.href ? <Link href={row.href}>{row.label}</Link> : row.label}<small>{row.detail}</small></span><time dateTime={row.date}>{displayDate(row.date)}</time></li>)}</ul> : <p>{activeRisks || controls || activeIncidents ? "No upcoming dates in the available records." : unavailable + "."}</p>}
      </section>
    <section className={styles.attention} aria-labelledby="management-attention"><h2 id="management-attention">Management attention</h2><div className={styles.attentionGrid}>{attentionCards.map(([key, title, rows, text, tone]) => <Card key={key} title={title} value={rows?.length} text={rows ? text : unavailable} tone={tone} href={selections[key] && detailUrl(key)} attention/>)}</div></section>
    </> : <>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>SoA oversight</h2><Link href="/portal/soa">Open SoA Register →</Link></div>
        <p>{assessment === "all" ? "All authorised SoA records" : "Selected SoA"} · {THEMES[theme] ?? "All themes"}</p>
      </section>
      <section className={styles.insight} aria-labelledby="soa-executive-insight">
        <header className={styles.insightHead}>
          <h2 id="soa-executive-insight">Executive Insight</h2>
          <strong className={styles.signal + " " + styles[soa.status]}>{soaRating}</strong>
        </header>
        <ul className={styles.priorityList} aria-label="SoA rating indicators">
          {soaSignals.filter(([, label]) => label).map(([key, label]) => <li key={key}>
            <Link href={key === "actions-overdue" ? "#queue-actions-overdue" : detailUrl(key)}>{label}</Link>
          </li>)}
        </ul>
        <p className={styles.insightDecision}><strong>Management action</strong> {soaAction}</p>
        <details className={styles.ratingRules}><summary>How the rating is decided</summary>
          <p>Red flags Critical residual control scores or overdue actions. Amber flags outstanding applicability decisions, draft statements or other elevated residual scores. Green requires records in scope and no triggered rule. The rating uses recorded residual scores for the selected scope.</p>
        </details>
      </section>
      {selectedRecords}
      <DeliveryQueue work={soaWork} detailUrl={detailUrl} soa/>
      <div className={styles.oversight}>
        <div className={styles.portfolioMap}>{children}</div>
        <div className={styles.treatmentPanels}>
      <section className={styles.panel} id="control-position">
        <h2>Annex A control position</h2><p>Applicable control records by theme. Counts reflect the selected SoA filters.</p>
        {controls ? <ul className={styles.chart}>{controls.groups.filter(group => (theme === "all" || group.key === theme) && (group.key !== "unclassified" || group.rows.length)).map(group => <li key={group.key}>
          <div><Link href={detailUrl(group.key)}>{group.label}</Link><span>{group.effective} effective · {group.implemented} implemented · {group.other} other</span></div>
          <div className={styles.track} aria-hidden="true">{group.rows.length > 0 && <>
            <i className={styles.effective} style={{flex: group.effective}}/><i className={styles.implemented} style={{flex: group.implemented}}/><i className={styles.other} style={{flex: group.other}}/>
          </>}</div>
        </li>)}</ul> : <p>{unavailable}.</p>}
      </section>
          <section className={styles.panel}>
            <h2>SoA portfolio measures</h2>
            <dl className={styles.portfolio}>{soa.measures.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "N/A"}</dd></div>)}</dl>
          </section>
        </div>
      </div>
      <section className={styles.attention} aria-labelledby="soa-management-attention">
        <h2 id="soa-management-attention">Management attention</h2>
        <div className={styles.attentionGrid}>{soaAttention.map(([key, title, rows, description, tone, shortcut]) =>
          <Card key={key} title={title} text={rows || key === "soa-open-findings" && theme !== "all" ? description : unavailable}
            value={shortcut ? false : rows?.length} tone={rows?.length ? tone : "blue"}
            href={shortcut ? "#queue-" + key : selections[key] && detailUrl(key)}
            action={shortcut ? "View due dates" : "View records"} attention/>)}
        </div>
      </section>
    </>}
  </>;
}
