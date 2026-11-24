import Link from "next/link";
import QRCode from "qrcode";
import { Acceptance, ISMSRecordHeatMap } from "../../../../components/ISMSRiskAssuranceCentre";
import { DocumentRecordPanel, DocumentRecordTabButton, DocumentRecordTabs, RecordIcon } from "../../../../components/DocumentRecordTabs";
import { acceptanceState, BASES, rating, riskBand, treatmentOpen } from "../../../../lib/isms-risk-assurance.mjs";
import { soaControlHref } from "../../../../lib/soa-workflow.mjs";
import s from "../../documents/documents.module.css";
import shared from "../../health-safety/risk-assessment/[id]/risk-record.module.css";
import scoreStyles from "../../../../components/HealthSafetyRiskScore.module.css";
import styles from "./isms-risk-record.module.css";

const ROOT = "/portal/information-security/risk-management";
const TABS = [
  ["overview", "Overview"], ["details", "Assessment Details"], ["scope", "Risks & Controls"],
  ["approval", "Review & Approval"], ["documents", "Documents & Applicability"],
  ["distribution", "Distribution"], ["history", "Record History"],
];
const display = value => value ? String(value).replaceAll("_", " ").replace(/^\w/, letter => letter.toUpperCase()) : "Not recorded";
const format = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const date = value => value && Number.isFinite(Date.parse(value)) ? format.format(new Date(value)) : "Not recorded";
const controlRef = id => id.startsWith("A.") ? id : "A." + id;
const dashes = { modify: "Modify with additional controls", retain: "Retain through authorised acceptance", share: "Share or transfer", avoid: "Avoid" };

function Panel({ title, children }) {
  return <section className={s.recordPanel}><h2>{title}</h2>{children}</section>;
}
function Facts({ entries, detailed = false }) {
  return <dl className={s.recordFacts + (detailed ? " " + shared.detailsFacts : "")}>
    {entries.map(([label, value, icon]) => <div key={label}>
      <dt>{detailed && icon && <RecordIcon name={icon}/>}<span>{label}</span></dt><dd>{value ?? "Not recorded"}</dd>
    </div>)}
  </dl>;
}
function Milestones({ events }) {
  return <ul className={s.recordMilestones}>{events.map(([label, value, state]) => <li key={label} data-state={state}>
    <span className={s.recordMilestone} aria-hidden="true">{state === "done" && <RecordIcon name="check"/>}</span>
    <strong>{label}</strong><span>{date(value)}</span>
  </li>)}</ul>;
}
function Score({ risk, basis }) {
  const item = rating(risk, basis), band = item && riskBand(item.score);
  return <div className={scoreStyles.score + " " + (band ? "" : scoreStyles.unrated)}
    style={band ? { background: band[3], color: band[4] } : undefined}>
    <span className={scoreStyles.title}>{BASES[basis]} risk</span>
    <strong>{item?.score ?? "—"}</strong>
    <span>{band ? band[2] : "Unrated"}</span>
  </div>;
}
function Control({ control }) {
  const label = controlRef(control.control_id) + (control.name ? " · " + control.name : "");
  return control.assessment_id ?
    <Link href={soaControlHref(control.assessment_id, control.control_id)}>{label}</Link> : label;
}

async function RecordAccess({ href, reference }) {
  let image;
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.rpgexcellence.com";
    const url = new URL(href, base);
    if (["http:", "https:"].includes(url.protocol)) {
      image = await QRCode.toDataURL(url.href, { width: 360, margin: 4, errorCorrectionLevel: "M" });
    }
  } catch {
    // The direct record link remains available.
  }
  return <aside className={shared.qrPanel}>
    <h3 className={shared.iconTitle}><RecordIcon name="qr"/>Record access (QR)</h3>
    <ul className={shared.qrCards}><li>
      {image && <img src={image} width={132} height={132} alt={"QR code for ISMS risk record " + reference}/>}
      <div><strong>{reference}</strong><p>Company owner sign-in required.</p>
        <Link className={s.recordButton} href={href}><RecordIcon name="open"/>Open ISMS record</Link></div>
    </li></ul>
  </aside>;
}

function RecordHistory({ risk, decisions }) {
  const events = [
    { key: "created", label: "Risk assessment created", at: risk.created_at },
    risk.updated_at !== risk.created_at && { key: "updated", label: "Risk assessment last updated", at: risk.updated_at },
    { key: "reviewed", label: "Risk assessment reviewed", at: risk.last_reviewed_at },
    ...decisions.flatMap(item => [
      { key: item.id + ":request", label: "Residual-risk acceptance requested", at: item.created_at, details: "Score " + item.accepted_score },
      { key: item.id + ":decision", label: "Residual-risk decision recorded · " + display(item.decision), at: item.decided_at,
        details: [item.acceptance_authority, item.rationale].filter(Boolean).join(" · ") },
    ]),
  ].filter(event => event?.at && Number.isFinite(Date.parse(event.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return <Panel title="Record History">
    {events.length ? <ul className={s.recordHistory + " " + styles.timeline}>{events.map(event => <li key={event.key}>
      <div>{event.label}</div>
      <time dateTime={event.at}>{date(event.at)}</time>
      {event.details && <p className={s.recordProse}>{event.details}</p>}
    </li>)}</ul> : <p>No record events recorded.</p>}
  </Panel>;
}

export default function ISMSRiskRecord({ record, organizationName, today, initialTab, acceptanceAction }) {
  const { risk, methodology, controls, assets, treatments, decisions } = record;
  const acceptance = decisions[0];
  const acceptanceStatus = acceptanceState(risk, acceptance, today);
  const status = risk.status === "acceptance_pending" && ["Accepted", "Rejected"].includes(acceptanceStatus) ?
    "Acceptance " + acceptanceStatus.toLowerCase() : display(risk.status);
  const href = ROOT + "?risk=" + encodeURIComponent(risk.id);
  const tab = TABS.some(([id]) => id === initialTab) ? initialTab : "overview";
  const inherent = rating(risk, "inherent"), residual = rating(risk);
  const delta = inherent && residual ? Math.round(100 * (residual.score - inherent.score) / inherent.score) : null;
  const appetite = methodology?.appetite_score;
  const above = appetite != null && residual && residual.score > appetite;
  const pending = treatments.filter(treatmentOpen).length;
  const verified = treatments.length - pending - treatments.filter(action => action.status === "cancelled").length;
  const openControls = controls.filter(control => control.needsAction).length;
  const verifiedControls = controls.filter(control => control.state === "Verified effective").length;
  const summary = [
    ["Reference", risk.risk_reference, "overview"], ["Type", "Information security", "scope"],
    ["Methodology", methodology?.name ? methodology.name + (methodology.version ? " · v" + methodology.version : "") : null, "matrix"],
    ["Risk owner", risk.risk_owner, "person"], ["Created", date(risk.created_at), "calendar"], ["Next review", date(risk.review_due_date), "calendar"],
  ];
  const lifecycle = [
    ["Record created", risk.created_at, risk.created_at && "done"],
    ["Acceptance requested", acceptance?.created_at, acceptance?.created_at && "done"],
    ["Acceptance decision recorded", acceptance?.decided_at, acceptance?.decided_at && (acceptanceStatus === "Accepted" ? "released" : "done")],
    ["Last review", risk.last_reviewed_at, risk.last_reviewed_at && "done"],
    ["Next review", risk.review_due_date, ""],
  ];
  const scenario = [
    ["Cause", risk.cause, "details"], ["Risk event", risk.event, "alert"], ["Consequence", risk.consequence, "scope"],
    ["Assessment rationale", risk.assessment_rationale, "overview"], ["Assumptions", risk.assumptions, "book"],
    ["CIA properties", risk.cia_properties?.join(", ") || null, "scope"],
  ];

  return <main className={s.page + " " + s.registerPage + " " + s.recordPage}><div className={s.shell}>
    <p className={s.recordBreadcrumb}><Link href="/portal/information-security">Information Security</Link> / <Link href={ROOT}>Risk Management</Link> / {risk.risk_reference}</p>
    <header className={s.hubHero + " " + s.recordHero}>
      <div className={s.recordTitle}><span className={s.recordTitleIcon}><RecordIcon name="overview"/></span>
        <div><small>{risk.risk_reference}{methodology?.version && " · METHODOLOGY v" + methodology.version}</small>
          <h1>{risk.title}</h1><p>{[risk.scope, organizationName, risk.risk_owner].filter(Boolean).join(" · ")}</p></div>
      </div>
      <div className={s.recordHeaderActions}>
        <span className={s.recordStatus} data-status={acceptanceStatus === "Accepted" ? "current" : risk.status === "acceptance_pending" ? "in_review" : risk.status}>{status}</span>
        <a className={s.recordButton} href={ROOT + "/" + encodeURIComponent(risk.id) + "/report"}><RecordIcon name="download"/>Record PDF</a>
        <Link className={s.recordButton} href={href + "&tab=approval"}>Review &amp; approval</Link>
        <Link className={s.recordButton} href={href + "&edit=1"}>Edit assessment details</Link>
      </div>
    </header>
    <DocumentRecordTabs key={tab} tabs={TABS} initial={tab} sectionLabel="Risk assessment sections">
      <DocumentRecordPanel name="overview">
        <div className={s.recordOverview}>
          <Panel title="Risk profile">
            <div className={shared.profile}><Score risk={risk} basis="inherent"/><Score risk={risk} basis="residual"/></div>
            {delta !== null && <p><strong>{delta === 0 ? "No change" : Math.abs(delta) + "% " + (delta < 0 ? "reduction" : "increase")}</strong> in recorded score</p>}
            <p>Target: {rating(risk,"target")?.score ?? "Unrated"}{above && <strong className={styles.warning}> · Above appetite</strong>}</p>
            <DocumentRecordTabButton name="scope">View controls and risk matrix</DocumentRecordTabButton>
          </Panel>
          <Panel title="Assessment details"><Facts entries={summary}/></Panel>
          <Panel title="Lifecycle & compliance"><Milestones events={lifecycle}/></Panel>
        </div>
        <div className={s.recordOverview}>
          <Panel title="Risks & controls"><p>{controls.length} linked controls · {openControls} with open actions</p>
            <DocumentRecordTabButton name="scope">Open risks and controls</DocumentRecordTabButton></Panel>
          <Panel title="Actions & effectiveness"><p>{pending} open treatments · {verified} verified treatments</p>
            <DocumentRecordTabButton name="scope">View treatments and verification</DocumentRecordTabButton></Panel>
          <Panel title="Applicability"><p>{risk.scope || "Scope not recorded"}</p><p>{assets.length} linked {assets.length === 1 ? "asset" : "assets"}</p>
            <DocumentRecordTabButton name="documents">View linked assets and evidence</DocumentRecordTabButton></Panel>
        </div>
        <Panel title="Purpose and scope"><p className={s.recordProse}>{risk.cause && risk.event && risk.consequence ?
          `Because of ${risk.cause}, ${risk.event} may occur, resulting in ${risk.consequence}.` : risk.assessment_rationale || "No scenario recorded."}</p></Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="details">
        <Panel title={<span className={shared.detailsHeading}><span><RecordIcon name="overview"/></span>Assessment Details</span>}>
          <div className={shared.detailsGrid}>
            <section className={shared.detailsGroup}><h3>Assessment context</h3><Facts entries={scenario} detailed/></section>
            <section className={shared.detailsGroup}><h3>Record information</h3><Facts entries={[...summary, ["Source", risk.source, "details"], ["Scope", risk.scope, "scope"]]} detailed/></section>
          </div>
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="scope">
        <Panel title="Risk and control decisions">
          <div className={styles.scores}>{Object.keys(BASES).map(basis => <Score key={basis} risk={risk} basis={basis}/>)}</div>
          <p>{dashes[risk.treatment_decision] || "No treatment decision recorded."}{above && <strong className={styles.warning}> · Above appetite</strong>}</p>
          {controls.length ? <ul className={styles.list}>{controls.map(control => <li key={control.id}>
            <strong><Control control={control}/></strong><small>{control.state}{control.needsAction && " · Action outstanding"}</small>
            {control.evidence && <p className={s.recordProse}>{control.evidence}</p>}
            {control.entry?.action_required && <p className={s.recordProse}>{control.entry.action_required}</p>}
          </li>)}</ul> : <p>No Annex A controls linked.</p>}
        </Panel>
        <ISMSRecordHeatMap risk={risk} methodology={methodology}/>
        <Panel title="Treatments & verification">
          {treatments.length ? <ul className={styles.list}>{treatments.map(action => <li key={action.id}>
            <strong>{action.action}</strong><small>{display(action.status)} · {action.action_owner || "Unassigned"} · Due {date(action.target_date)}</small>
            <p className={s.recordProse}>{action.completion_evidence || "No completion evidence recorded."}</p>
            {action.resources && <p className={s.recordProse}>{action.resources}</p>}
          </li>)}</ul> : <p>No treatment actions recorded.</p>}
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="approval">
        <div className={s.grid}>
          <Panel title="Lifecycle & compliance"><Milestones events={lifecycle}/></Panel>
          <Panel title="Residual-risk acceptance">
            <p>Approved appetite: {appetite != null ? appetite + "/25" : "Not recorded"} · Residual score: {residual?.score ?? "Unrated"}{above && <strong className={styles.warning}> · Above appetite</strong>}</p>
            <Acceptance action={acceptanceAction} record={{ risk, acceptance }} today={today}/>
          </Panel>
        </div>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="documents">
        <Panel title={<span className={shared.iconTitle}><RecordIcon name="documents"/>Documents &amp; Applicability</span>}>
          <div className={shared.documentsGrid}>
            <div>
              <h3>Linked documents</h3>
              <ul className={s.recordDecisions + " " + styles.documentRows}>
                <li><strong className={shared.iconTitle}><RecordIcon name="book"/>Evidence reference</strong>
                  <small className={s.recordProse}>{risk.evidence_reference || "No reference recorded"}</small></li>
                <li><strong className={shared.iconTitle}><RecordIcon name="matrix"/>Statement of Applicability</strong>
                  {controls.length ? <ul className={styles.controlReferences}>{controls.map(control => <li key={control.id}><Control control={control}/></li>)}</ul> :
                    <small>No controls linked.</small>}</li>
              </ul>
              <h3 className={shared.iconTitle}><RecordIcon name="pin"/>Applicability</h3>
              <p>{[organizationName, risk.scope].filter(Boolean).join(" · ") || "Scope not recorded"}</p>
              {risk.affected_processes?.length > 0 && <p className={s.recordProse}>Affected processes · {risk.affected_processes.join(", ")}</p>}
              <h3>Linked assets</h3>
              {assets.length ? <ul className={s.recordDecisions + " " + styles.documentRows}>{assets.map(asset => <li key={asset.id}>
                <strong>{asset.asset_reference} · {asset.asset_name}</strong>
                <small>{asset.classification || "Classification not recorded"} · {display(asset.status)}</small>
              </li>)}</ul> : <p>No assets linked.</p>}
              <Link className={s.recordButton} href={href + "&edit=1"}>Edit assessment details</Link>
            </div>
            <RecordAccess href={href} reference={risk.risk_reference}/>
          </div>
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="distribution">
        <Panel title="Distribution list">
          <p><strong>Current record access</strong> · Company owner</p>
          <p className={s.notice}>No recipients or acknowledgements are recorded for this ISMS assessment.</p>
          <ul className={s.recordDecisions + " " + styles.documentRows}>
            <li><strong className={shared.iconTitle}><RecordIcon name="person"/>Accountable risk owner</strong><small>{risk.risk_owner || "Not recorded"}</small></li>
          </ul>
          <p>Use Document Control to publish an approved copy and request acknowledgements from selected company users.</p>
          <div className={s.recordHeaderActions}>
            <a className={s.recordButton} href={ROOT + "/" + encodeURIComponent(risk.id) + "/report"}><RecordIcon name="download"/>Download record PDF</a>
            <Link className={s.recordButton} href="/portal/documents"><RecordIcon name="open"/>Open Document Control</Link>
          </div>
        </Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="history"><RecordHistory risk={risk} decisions={decisions}/></DocumentRecordPanel>
    </DocumentRecordTabs>
  </div></main>;
}
