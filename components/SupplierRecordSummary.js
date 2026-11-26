import Link from "next/link";
import { SUPPLIER_STANDARDS, SUPPLIER_TYPES } from "../lib/supplier-assurance";

export default function SupplierRecordSummary({ step, supplier, contacts, sites, subtiers, audits, reviews, result, documents, stats, onEdit }) {
  const fullName = (person) => [person.first_name, person.last_name].filter(Boolean).join(" ");
  const primary = contacts.find(person => person.is_primary && person.is_active !== false);
  const cards = [
    [
      ["Supplier identity", [["Legal name", supplier.legal_name], ["Trading name", supplier.trading_name], ["Company number", supplier.company_number], ["Country", supplier.country], ["Registered address", supplier.registered_address], ["Website", supplier.website]]],
      ["Supply relationship", [["Scope of supply", supplier.supply_description], ...sites.map(site => [site.site_name, [site.address, site.operational_scope, site.approval_status?.replaceAll("_", " ")].filter(Boolean).join(" · ")])]],
    ],
    [
      ["Primary contact", primary ? [["Name", fullName(primary)], ["Business title", primary.business_title], ["Department", primary.department], ["Email", primary.email], ["Telephone", primary.telephone], ["Mobile", primary.mobile]] : [["Status", "No active primary contact selected"]]],
      ["Supplier contact register", contacts.map(person => [fullName(person), [person.email, person.is_active === false ? "Inactive" : "Active"].filter(Boolean).join(" · ")])],
    ],
    [
      ["Classification and applicable standards", [["Classification", (supplier.supplier_types || []).map(id=>SUPPLIER_TYPES.find(item=>item[0]===id)?.[1] || id).join(", ")], ["Frameworks", (supplier.applicable_standards || []).map(id=>SUPPLIER_STANDARDS.find(item=>item.id===id)?.label || id).join(", ")], ["Products, services or processes", supplier.supply_description]]],
      ["Sub-tier supplier register", subtiers.map(subtier => [subtier.legal_name, [subtier.supply_scope, subtier.approval_status?.replaceAll("_", " "), subtier.certification_standard, subtier.certificate_expiry, subtier.certificate_url && <a key="evidence" href={subtier.certificate_url}>Certificate evidence</a>]])],
    ],
    [
      ["Calculated risk", [["Rating", result.riskBand], ["Score", result.riskScore + "/40"], ["Criticality", supplier.criticality], ["Engine recommendation", result.recommendation]]],
      ["Risk inputs", [["Likelihood", supplier.risk_inputs?.likelihood], ["Consequence", supplier.risk_inputs?.consequence], ["Business dependency", supplier.risk_inputs?.dependency], ["Difficulty detecting failure", supplier.risk_inputs?.detectability], ["Recommended review", result.reviewMonths + " months"]]],
    ],
    [
      ["Evidence and approval gates", [["Applicable controls", result.applicableCount], ["Assurance complete", result.assuranceScore + "%"], ["Mandatory blockers", result.blockers.length], ["Assurance gaps", result.gaps.length]]],
      ["Supplier findings", [["Open", stats.open || 0], ["Pending", stats.pending || 0], ["Closed", stats.closed || 0]]],
    ],
    [
      ["Approval decision", [["Status", supplier.approval_status?.replaceAll("_", " ")], ["Approved scope", supplier.approval_scope], ["Conditions", supplier.approval_conditions], ["Authorised approver", supplier.approved_by], ["Expiry", supplier.approval_expiry], ["Next review", supplier.next_review_date], ["Approver-selected interval", supplier.review_frequency_months && supplier.review_frequency_months + " months"], ["Engine recommendation", result.reviewMonths + " months"], ["Override rationale", supplier.monitoring_plan?.reviewOverrideRationale]]],
      ["Linked audits and QBRs", [...audits.map(audit => [audit.audit_reference, <Link key={audit.id} href={"/portal/internal-audits/" + audit.id}>{audit.title}</Link>]), ...reviews.map(review => [review.qbr_reference, <Link key={review.id} href={"/portal/suppliers/" + supplier.id + "/qbr"}>{review.review_date}</Link>])]],
    ],
    [
      ["Controlled Code of Conduct", documents.map(document => [document.document_reference, <Link key={document.id} href={"/portal/suppliers/" + supplier.id + "/code-of-conduct?document=" + document.id}>Version {document.version} · {document.status}</Link>])],
    ],
  ];
  return <section className="saPanel" aria-label="Saved supplier information">
    <div className="saSectionHead">
      <div><small>STEP {step + 1}</small><h2>{["Supplier identity and relationship", "Supplier contact details", "Classification and applicable standards", "Dynamic supplier risk engine", "Risk-based due diligence", "Approval and monitoring decision", "Dynamic Supplier Code of Conduct"][step]}</h2></div>
      <button className="saSecondary" type="button" onClick={onEdit}>{step === 6 ? "View requirements" : "Edit"}</button>
    </div>
    <div className="saGrid">
      {cards[step].map(([title, rows]) => <article className="saSummaryCard" key={title}>
        <h3>{title}</h3>
        {rows.length ? <dl>{rows.map(([label, value], index) => <div key={label + ":" + index}>
          <dt>{label}</dt>
          <dd>{Array.isArray(value) ? value.filter(Boolean).map((item, part) => <div key={part}>{item}</div>) : value ?? "—"}</dd>
        </div>)}</dl> : <p>No records available.</p>}
      </article>)}
    </div>
  </section>;
}
