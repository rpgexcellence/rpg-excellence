import Link from "next/link";
import { SUPPLIER_STANDARDS, SUPPLIER_TYPES, calculateSupplierAssurance } from "../lib/supplier-assurance";
import styles from "./SupplierRecordSummary.module.css";

const headings = [
  "Supplier identity and relationship", "Supplier contact details", "Classification and applicable standards",
  "Dynamic supplier risk engine", "Risk-based due diligence", "Approval and monitoring decision", "Dynamic Supplier Code of Conduct",
];
const descriptions = [
  "Capture the legal entity and exact scope before the engine determines applicable controls.",
  "Maintain the supplier people authorised for correspondence, issue ownership and escalation.",
  "Select every relevant relationship. Saved selections update the question set and Code of Conduct requirements.",
  "Score the relationship before controls. Assurance gaps then adjust the risk position automatically.",
  "",
  "Translate the evaluated risk and evidence into a controlled decision and proportionate monitoring plan.",
  "The document is assembled from common responsible-business requirements plus supplier-specific ISO, laboratory, certification and aerospace controls.",
];
const impactScale = [1, 2, 3, 4, 5];
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const fields = [["conformity","Conformity"],["delivery","On-time delivery"],["responsiveness","Responsiveness"],["correctiveAction","Corrective action"]];

export function dateLabel(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? dateFormat.format(timestamp) : null;
}
function titleCase(value) {
  return value?.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}
function framework(id) {
  return SUPPLIER_STANDARDS.find(item => item.id === id)?.label || id;
}
function nameOf(person) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ");
}
function scoreLabel(value) {
  return value != null ? value + "%" : null;
}
function toneFor(band) {
  return ["High", "Critical"].includes(band) ? "red" : band === "Medium" ? "amber" : "green";
}
function Pill({ children, tone = "" }) {
  return <span className={"saPill " + tone}>{children}</span>;
}
function Facts({ rows }) {
  return <dl className={styles.facts}>{rows.map(([label, value]) => <div key={label}>
    <dt>{label}</dt><dd>{value === "" || value == null ? "—" : value}</dd>
  </div>)}</dl>;
}
function Card({ title, children, wide = false }) {
  return <article className={styles.card + (wide ? " " + styles.wide : "")}><h3>{title}</h3>{children}</article>;
}
function Table({ headings, rows, empty }) {
  return rows.length ? <div className={styles.tableWrap}>
    <table><thead><tr>{headings.map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
      <tbody>{rows.map(([id, values]) => <tr key={id}>{values.map((value, index) =>
        index === 0 ? <th scope="row" key={headings[index]}>{value || "—"}</th> :
          <td key={headings[index]}>{value === "" || value == null ? "—" : value}</td>)}</tr>)}</tbody></table>
  </div> : <p>{empty}</p>;
}
function RiskMatrix({ likelihood, consequence }) {
  return <>
    <table className={styles.matrix} aria-label="Likelihood by consequence risk matrix">
      <thead><tr><th scope="col">L / C</th>{impactScale.map(value => <th key={value} scope="col">{value}</th>)}</tr></thead>
      <tbody>{[...impactScale].reverse().map(row => <tr key={row}><th scope="row">{row}</th>
        {impactScale.map(column => {
          const score = row * column;
          const selected = row === Number(likelihood) && column === Number(consequence);
          const band = score >= 15 ? styles.high : score >= 6 ? styles.medium : styles.low;
          return <td key={column} className={band + (selected ? " " + styles.selected : "")} aria-current={selected || undefined}>{score}</td>;
        })}
      </tr>)}</tbody>
    </table>
    <small>Matrix shows likelihood × consequence. The engine also uses dependency, detectability, criticality and evidence gaps.</small>
  </>;
}
function automatedControls(result) {
  return ["High","Critical"].includes(result.riskBand)
    ? "Technical approval + enhanced monitoring + supplier audit"
    : result.riskBand === "Medium" ? "Documented approval + periodic monitoring" : "Simplified approval + routine monitoring";
}
export function SupplierRiskDecision({ result, position = "both" }) {
  return <>
    {position !== "controls" && <div className="saRiskSummary">
      <div><span>ENGINE DECISION</span><strong>{result.recommendation}</strong><small>Recommended review: every {result.reviewMonths} months</small></div>
      <div className={"saRiskDial " + toneFor(result.riskBand)}><strong>{result.riskScore}</strong><span>RISK</span></div>
    </div>}
    {position !== "decision" && <div className="saRule"><b>Automated controls</b><span>{automatedControls(result)}</span></div>}
  </>;
}

export function SupplierCodeRequirements({ supplier, standards, sections }) {
  return <div className={"saCocPreview " + styles.wide}>
    <header><span>RPG EXCELLENCE · CONTROLLED SUPPLIER DOCUMENT</span>
      <h3>Supplier Code of Conduct &amp; Assurance Requirements</h3>
      <p><b>Supplier:</b> {supplier.legal_name || "Complete supplier name"}<br />
        <b>Address:</b> {supplier.registered_address || "Complete registered address"}<br />
        <b>Scope:</b> {supplier.supply_description || "Complete supply description"}</p>
    </header>
    <div className="saCocStandards">{standards.map(id => <Pill key={id}>{framework(id)}</Pill>)}</div>
    {sections.map((item, index) => <article key={item.id}>
      <b>{index + 1}. {item.title}</b><span>{item.applicability}</span>
      <p>{item.paragraphs[0]}</p><small>{item.requirements.length} controlled requirements included</small>
    </article>)}
  </div>;
}

function FindingLinks({ findings }) {
  return findings.length ? <ul className={styles.links}>{findings.map(finding => <li key={finding.id}>
    <Link href={"/portal/internal-audit-actions/" + finding.id}>{finding.finding_reference || finding.title || "Open supplier finding"}</Link>
    {finding.linked_rca_case_id && <> · <Link href={"/portal/rca/" + finding.linked_rca_case_id}>Linked CAPA</Link></>}
  </li>)}</ul> : <p>No linked supplier findings recorded.</p>;
}

export function SupplierDueDiligenceSummary({ findings, stats, result, invitation, showInvitationHistory }) {
  return <div className={styles.grid + " " + styles.sectionGap}>
    <Card title="Findings, gaps and actions">
      <Facts rows={[["Open supplier NCRs", findings.filter(item => ["major_nc", "minor_nc"].includes(item.finding_type) && !(item.status === "closed" && item.closure_verified)).length], ["Pending", stats.pending ?? 0], ["Closed", stats.closed ?? 0], ["Evidence gaps", result.gaps.length]]} />
      <FindingLinks findings={findings} />
    </Card>
    <Card title="Supplier submission">
      <Facts rows={[["Status", invitation?.label], ["Supplier files", invitation?.fileCount],
        ["RPG evidence review", invitation?.review], ["Clarification", invitation?.clarification]]} />
      {showInvitationHistory && <button className="saSecondary" type="button" onClick={showInvitationHistory}>
        {invitation?.review === "Awaiting review" ? "Review submitted evidence" : "Invitation history"}
      </button>}
    </Card>
  </div>;
}

export function SupplierControlledHistory({ supplier, review, invitation }) {
  return <details className={styles.history}><summary>Controlled history</summary>
    <Facts rows={[["Approval recorded", dateLabel(supplier.approved_at)], ["Approved by", supplier.approved_by],
      ["Latest quarterly review", review && <>{review.qbr_reference} · {dateLabel(review.review_date)}</>],
      ["Last supplier update", dateLabel(supplier.updated_at)], ["Latest invitation", invitation?.label],
      ["Evaluation", titleCase(supplier.approval_status)]]} />
  </details>;
}

export function SupplierInvitationWorkflow() {
  return <details className={styles.history} data-device-draft-exclude="true">
    <summary>Invitation workflow and permissions</summary>
    <div className={styles.workflow}>
      <div><h3>Outlook delivery</h3><p>Preview the welcome email and create a draft in the authorised RPG mailbox. Review and send it from Outlook.</p></div>
      <div><h3>Secure supplier access</h3><p>The invitation is tied to this record and the verified recipient email. The supplier can save responses, add evidence and submit before the invitation expires.</p></div>
      <div><h3>RPG evaluation and decision</h3><p>Review submitted evidence or request clarification in Invitation history. An authorised company approver records the decision after mandatory assurance checks.</p></div>
      <div><h3>Controlled history</h3><p>Invitation history records delivery status, submission revisions, evidence review and clarification requests. Each acknowledgement identifies its Code of Conduct version.</p></div>
    </div>
  </details>;
}

export default function SupplierRecordSummary({
  step, supplier, contacts, sites, subtiers, audits, reviews, documents, codeSections, findings, invitation,
  getRecommendedReviewDate, openGapControl, onEdit, footer,
}) {
  const standards = supplier.applicable_standards || [];
  const types = supplier.supplier_types || [];
  const riskInputs = Object.fromEntries(["likelihood", "consequence", "dependency", "detectability"]
    .map(key => [key, supplier.risk_inputs?.[key] ?? 3]));
  const answers = supplier.due_diligence_answers || {};
  const result = calculateSupplierAssurance({ standards, types, answers, riskInputs, criticality:supplier.criticality });
  const primary = contacts.find(person => person.is_primary && person.is_active !== false);
  const review = reviews[0];
  const performance = supplier.performance || {};
  const snapshot = fields.map(([key]) => performance[key]).filter(value => typeof value === "number");
  const code = documents.find(document => document.status === "issued");
  const documentHref = id => "/portal/suppliers/" + supplier.id + "/code-of-conduct?document=" + id;
  const acknowledgement = document => invitation?.acknowledgements?.find(item => item.documentId === document.id);
  const displayMetrics = [
    ["Risk", result.riskBand, result.riskScore + "/40"],
    ["Assurance", result.assuranceScore + "%", result.gaps.length + " gaps"],
    ["Performance", snapshot.length ? Math.round(snapshot.reduce((sum,count)=>sum+count,0) / snapshot.length) + "%" : "—", "Current snapshot"],
    ["Review", result.reviewMonths + " months", "Engine recommendation"],
  ];

  let content;
  switch (step) {
    case 0:
      content = <>
        <Card title="Supplier identity"><Facts rows={[["Trading name", supplier.trading_name], ["Legal name", supplier.legal_name],
          ["Company / registration number", supplier.company_number], ["VAT", supplier.vat_number], ["Registered address", supplier.registered_address],
          ["Website", supplier.website], ["Country", supplier.country], ["Accountable owner", supplier.accountable_owner_name]]} /></Card>
        <Card title="Supply relationship"><Facts rows={[["Products, services or outsourced process supplied", supplier.supply_description],
          ["Criticality", titleCase(supplier.criticality)], ["Risk rating", result.riskBand]]} /></Card>
        <Card title="Supplier sites and approved scope" wide>
          <Table headings={["Site", "Full address", "Approved operational scope", "Approval status"]} empty="No supplier sites recorded."
            rows={sites.map(site => [site.id, [site.site_name, site.address, site.scope, titleCase(site.approval_status)]])} />
        </Card>
      </>;
      break;
    case 1:
      content = <>
        <Card title="Primary contact"><Facts rows={primary ? [["Contact", nameOf(primary)], ["Business title", primary.business_title],
          ["Department / function", primary.department], ["Email", primary.email], ["Telephone", primary.telephone], ["Mobile", primary.mobile],
          ["Status", "Active"]] : [["Status", "No active primary contact selected"]]} /></Card>
        <Card title="Supplier contacts and escalation">
          <Table headings={["Contact", "Business title", "Department", "Email", "Telephone", "Mobile", "Primary", "Status"]}
            empty="No supplier contacts recorded." rows={contacts.map(person => [person.id, [nameOf(person), person.business_title, person.department,
              person.email, person.telephone, person.mobile, person.is_primary ? "Yes" : "—", person.is_active === false ? "Inactive" : "Active"]])} />
          <Facts rows={[["Escalation", supplier.escalation_contact]]} />
        </Card>
      </>;
      break;
    case 2:
      content = <>
        <Card title="Supplier classification and applicable assurance frameworks" wide>
          <Facts rows={[["Classification", types.map(id => SUPPLIER_TYPES.find(item => item[0] === id)?.[1] || id).join(", ")],
            ["Applicable assurance frameworks", standards.map(framework).join(", ")],
            ["Products, services or outsourced process supplied", supplier.supply_description],
            ["Sub-tier suppliers are used", supplier.uses_subtier_suppliers ? "Yes" : "No"]]} />
        </Card>
        {supplier.uses_subtier_suppliers && <Card title="Sub-tier supplier register" wide>
          <Table headings={["Sub-tier", "Scope", "Approval", "Standard", "Certificate", "Certification body", "Expiry", "Renewal reminder", "Evidence"]}
            empty="No sub-tier suppliers recorded."
            rows={subtiers.map(item => [item.id, [item.legal_name, item.supply_scope, titleCase(item.approval_status), item.certification_standard,
              item.certificate_number, item.certification_body, dateLabel(item.certificate_expiry), dateLabel(item.reminder_date),
              item.certificate_storage_path && item.certificate_url && item.certificate_url !== "#" ? <a href={item.certificate_url}>{item.certificate_file_name || "Certificate evidence"}</a> : null]])} />
        </Card>}
      </>;
      break;
    case 3:
      content = <>
        <div className={styles.wide}><SupplierRiskDecision result={result} /></div>
        <Card title="Calculated risk">
          <div className={styles.score}><strong>{result.riskScore}/40</strong><Pill tone={toneFor(result.riskBand)}>{result.riskBand}</Pill></div>
          <progress className={styles.scoreBar} aria-label="Calculated risk score" value={result.riskScore} max="40" />
          <Facts rows={[["Criticality", titleCase(supplier.criticality)], ["Likelihood", riskInputs.likelihood],
            ["Consequence", riskInputs.consequence], ["Business dependency", riskInputs.dependency], ["Detectability", riskInputs.detectability],
            ["Mandatory blockers", result.blockers.length], ["Engine-recommended interval", result.reviewMonths + " months"]]} />
        </Card>
        <Card title="Risk matrix"><RiskMatrix likelihood={riskInputs.likelihood} consequence={riskInputs.consequence} /></Card>
        <Card title="Engine decision and automated controls" wide>
          <Facts rows={[["Engine decision", result.recommendation], ["Automated controls", automatedControls(result)]]} />
        </Card>
      </>;
      break;
    case 5:
      content = <>
        <div className={"saDecision " + styles.wide}>{displayMetrics.map(([label,value,detail]) =>
          <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div>
        <Card title="Approval decision"><Facts rows={[["Recorded decision", titleCase(supplier.approval_status)], ["Competent approver", supplier.approved_by],
          ["Approved scope", supplier.approval_scope], ["Approval conditions / restrictions", supplier.approval_conditions],
          ["Approval expiry", dateLabel(supplier.approval_expiry)], ["Current evaluation", invitation?.review]]} />
          <button className="saSecondary" type="button" onClick={onEdit}>Review decision</button></Card>
        <Card title="Review intervals"><Facts rows={[["Engine recommendation", result.reviewMonths + " months"],
          ["Engine-recommended review", dateLabel(getRecommendedReviewDate(result.reviewMonths))], ["Approver-selected interval", supplier.review_frequency_months && supplier.review_frequency_months + " months"],
          ["Override rationale", supplier.monitoring_plan?.reviewOverrideRationale], ["Next review", dateLabel(supplier.next_review_date)]]} /></Card>
        <Card title="Assurance gaps" wide>
          <Table headings={["Control", "Severity", "Responsible contact", "Due", "Evidence"]} empty="No open assurance gaps."
            rows={result.gaps.filter(id => answers[id]?.gap_review_outcome !== "effective").map(id => {
              const answer = answers[id] || {};
              const contact = contacts.find(person => person.id === answer.gap_owner_contact_id);
              return [id, [id, titleCase(answer.gap_severity), contact ? nameOf(contact) : answer.gap_owner, dateLabel(answer.gap_due_date),
                <button key={id} type="button" className="saSecondary" onClick={() => openGapControl(id)}>Open control evidence</button>]];
            })} />
        </Card>
        <Card title="Performance snapshot"><Facts rows={[["Current snapshot", displayMetrics[2][1]], ...fields.map(([key,label]) => [label, scoreLabel(performance[key])])]} /></Card>
        <Card title="Quarterly monitoring">
          <Facts rows={[["Quarterly business review", review && <Link href={"/portal/suppliers/" + supplier.id + "/qbr?review=" + review.id}>{review.qbr_reference} · Completed</Link>],
            ["Measured QBR performance", scoreLabel(review?.measuredPerformance)], ["Next QBR", dateLabel(review?.next_qbr_date)]]} />
          <FindingLinks findings={findings} />
        </Card>
        <Card title="Supplier audit history" wide>
          <Table headings={["Audit", "Method", "Gate", "Status", "Planned dates"]} empty="No supplier audits recorded."
            rows={audits.map(audit => [audit.id, [<Link key={audit.id} href={"/portal/internal-audits/" + audit.id}>{audit.audit_reference} · {audit.title}</Link>,
              titleCase(audit.audit_method), titleCase(audit.current_gate), titleCase(audit.status), [dateLabel(audit.planned_start_at), dateLabel(audit.planned_end_at)].filter(Boolean).join(" – ")]])} />
        </Card>
      </>;
      break;
    case 6: {
      const accepted = code && acknowledgement(code);
      content = <>
        <Card title="Controlled Code of Conduct">
          <Facts rows={[["Current version", code && "v" + code.version + ".0"], ["Document reference", code?.document_reference],
            ["Acknowledgement", accepted ? "Accepted" : code ? "Awaiting acknowledgement" : null],
            ["Accepted against", accepted && "v" + accepted.version + ".0"],
            ["Evidence", accepted && <>Supplier declaration by {accepted.signatory} · {dateLabel(accepted.submittedAt)}</>]]} />
          <div className={styles.actions}>
            {code && <Link className="saSecondary" href={documentHref(code.id)}>Preview document</Link>}
            <button className="saSecondary" type="submit" form="supplier-code-generator">Generate next version</button>
          </div>
        </Card>
        <Card title="Version history">
          <Table headings={["Version", "Status", "Acknowledgement", "Document"]} empty="No versions have been issued."
            rows={documents.map(document => [document.id, ["v" + document.version + ".0", titleCase(document.status),
              acknowledgement(document) ? "Accepted" : "Not recorded",
              <Link key={document.id} href={documentHref(document.id)}>View {document.document_reference}</Link>]])} />
        </Card>
        <SupplierCodeRequirements supplier={supplier} standards={standards} sections={codeSections} />
      </>;
      break;
    }
    default:
      return null;
  }

  const badges = {0:supplier.supplier_reference, 1:contacts.filter(person => person.is_active !== false).length + " active",
    2:standards.length + " standards", 3:result.riskScore + "/40 · " + result.riskBand, 6:codeSections.length + " sections"};
  return <section className="saPanel" aria-label="Saved supplier information">
    <div className="saSectionHead"><div><small>STEP {step + 1}</small><h2>{headings[step]}</h2><p>{descriptions[step]}</p></div>
      <div className={styles.actions}>{badges[step] && <Pill tone={[1,2,6].includes(step) ? "purple" : ""}>{badges[step]}</Pill>}
        {step !== 6 && <button className="saSecondary" type="button" onClick={onEdit}>Edit</button>}</div>
    </div>
    <div className={styles.grid}>{content}</div>
    {footer}
    <SupplierControlledHistory supplier={supplier} review={review} invitation={invitation} />
  </section>;
}
