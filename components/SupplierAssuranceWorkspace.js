"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  SUPPLIER_STANDARDS,
  SUPPLIER_TYPES,
  applicableQuestions,
  buildCodeOfConductSections,
  calculateSupplierAssurance,
} from "../lib/supplier-assurance";

const tabs = [
  "Supplier profile",
  "Contact details",
  "Standards & scope",
  "Risk engine",
  "Due diligence",
  "Approval & monitoring",
  "Code of Conduct",
];

const n = (value, fallback = 3) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const initialData = (source = {}) => ({
  legal_name: source.legal_name || "",
  trading_name: source.trading_name || "",
  registered_address: source.registered_address || "",
  country: source.country || "United Kingdom",
  company_number: source.company_number || "",
  website: source.website || "",
  primary_contact_name: source.primary_contact_name || "",
  primary_contact_title: source.primary_contact_title || "",
  primary_contact_email: source.primary_contact_email || "",
  primary_contact_phone: source.primary_contact_phone || "",
  supply_description: source.supply_description || "",
  sites_and_scope: source.sites_and_scope || "",
  uses_subtier_suppliers: Boolean(source.uses_subtier_suppliers),
  criticality: source.criticality || "medium",
  approval_scope: source.approval_scope || "",
  approval_conditions: source.approval_conditions || "",
  approved_by: source.approved_by || "",
  approved_by_person_id: source.approved_by_person_id || "",
  approval_expiry: source.approval_expiry || "",
  next_review_date: source.next_review_date || "",
  review_frequency_months: source.review_frequency_months || 12,
});

function Field({
  label,
  value,
  onChange,
  area = false,
  children,
  className = "",
  ...props
}) {
  return (
    <label className={className}>
      <span>{label}</span>
      {children ||
        (area ? (
          <textarea
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            {...props}
          />
        ) : (
          <input
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            {...props}
          />
        ))}
    </label>
  );
}

function Pill({ tone = "blue", children }) {
  return <span className={`saPill ${tone}`}>{children}</span>;
}

function Metric({ label, value, detail, tone = "blue" }) {
  return (
    <article className="saMetric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function SupplierAssuranceWorkspace({
  organization,
  suppliers = [],
  initial,
  documents = [],
  approvers = [],
  evidenceFiles = [],
  subTierSuppliers = [],
  supplierSites = [],
  supplierNcStats = {},
  supplierContacts = [],
  managementBoard = false,
  action,
  generateAction,
  saved,
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => initialData(initial || {}));
  const [types, setTypes] = useState(
    () => initial?.supplier_types || [],
  );
  const [standards, setStandards] = useState(
    () => initial?.applicable_standards || ["iso9001"],
  );
  const [answers, setAnswers] = useState(
    () => initial?.due_diligence_answers || {},
  );
  const [sites, setSites] = useState(() => supplierSites || []);
  const [subTiers, setSubTiers] = useState(() => subTierSuppliers || []);
  const [contacts, setContacts] = useState(() => supplierContacts || []);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [risk, setRisk] = useState(() => ({
    likelihood: n(initial?.risk_inputs?.likelihood),
    consequence: n(initial?.risk_inputs?.consequence),
    dependency: n(initial?.risk_inputs?.dependency),
    detectability: n(initial?.risk_inputs?.detectability),
  }));
  const [performance, setPerformance] = useState(() => ({
    conformity: initial?.performance?.conformity ?? 100,
    delivery: initial?.performance?.delivery ?? 100,
    responsiveness: initial?.performance?.responsiveness ?? 100,
    correctiveAction: initial?.performance?.correctiveAction ?? 100,
  }));

  const questions = useMemo(
    () => applicableQuestions(standards, types),
    [standards, types],
  );

  const result = useMemo(
    () =>
      calculateSupplierAssurance({
        standards,
        types,
        answers,
        riskInputs: risk,
        criticality: data.criticality,
      }),
    [standards, types, answers, risk, data.criticality],
  );

  const codeSections = useMemo(
    () =>
      buildCodeOfConductSections({
        standards,
        types,
        supplierName: data.legal_name || "the Supplier",
      }),
    [standards, types, data.legal_name],
  );

  const averagePerformance = Math.round(
    Object.values(performance).reduce(
      (sum, value) => sum + n(value, 0),
      0,
    ) / 4,
  );

  const update = (key, value) =>
    setData((current) => ({ ...current, [key]: value }));

  const toggle = (list, setter, value) =>
    setter(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value],
    );

  const answer = (id, key, value) =>
    setAnswers((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [key]: value,
      },
    }));

  const addSite = () => setSites((current) => [
    ...current,
    { client_key: crypto.randomUUID(), site_name: "", address: "", scope: "", approval_status: "not_approved" },
  ]);
  const updateSite = (key, field, value) => setSites((current) =>
    current.map((site) => (site.client_key === key ? { ...site, [field]: value } : site))
  );
  const removeSite = (key) => setSites((current) => current.filter((site) => site.client_key !== key));

  const addSubTier = () => setSubTiers((current) => [
    ...current,
    { client_key: crypto.randomUUID(), legal_name: "", supply_scope: "", approval_status: "not_approved", certification_standard: "", certificate_number: "", certification_body: "", certificate_expiry: "", reminder_date: "" },
  ]);
  const updateSubTier = (key, field, value) => setSubTiers((current) =>
    current.map((supplier) => (supplier.client_key === key ? { ...supplier, [field]: value } : supplier))
  );
  const removeSubTier = (key) => setSubTiers((current) => current.filter((supplier) => supplier.client_key !== key));
  const addContact = () => setContacts((current) => [...current, { client_key: crypto.randomUUID(), first_name: "", last_name: "", business_title: "", department: "", telephone: "", mobile: "", email: "", is_primary: current.length === 0, is_active: true }]);
  const updateContact = (key, field, value) => setContacts((current) => current.map((contact) => contact.client_key === key ? { ...contact, [field]: value } : contact));
  const setPrimaryContact = (key) => setContacts((current) => current.map((contact) => ({ ...contact, is_primary: contact.client_key === key })));
  const removeContact = (key) => setContacts((current) => current.filter((contact) => contact.client_key !== key));

  const active = initial || null;

  const riskTone =
    result.riskBand === "Critical"
      ? "red"
      : result.riskBand === "High"
        ? "amber"
        : result.riskBand === "Medium"
          ? "blue"
          : "green";

  const statusLabel = String(
    active?.approval_status || "draft",
  ).replaceAll("_", " ");
  const activeNc = active ? (supplierNcStats[active.id] || { open: 0, pending: 0, closed: 0, total: 0 }) : { open: 0, pending: 0, closed: 0, total: 0 };

  return (
    <main className="saPage">
      <style>{styles}</style>
<style>{`
  .saPage{font-size:16px;line-height:1.5}
  .saSide>small,.saSide nav>span,.saTop>div:first-child>small,.saSectionHead small,.saGenerate>div>small{font-size:12px}
  .saSide nav>a,.saSide nav>a.supplier b,.saTop a,.saTabs button,.saGrid label>span,.saQuestions label>span,.saPerformance label>span,.saActions button,.saGenerate button{font-size:14px}
  .saSide nav>a.supplier small,.saSideFoot span,.saMetric>span,.saMetric small,.saPill,.saDecision span,.saDecision small{font-size:12px}
  .saCocPreview>header{padding:32px}
  .saCocPreview>header>span{font-size:12px}
  .saCocPreview h3{font-size:26px;line-height:1.25}
  .saCocPreview>header p{font-size:15px;line-height:1.7}
  .saCocStandards{padding:18px 24px}
  .saCocPreview>article{gap:9px 18px;padding:20px 24px}
  .saCocPreview>article>b{font-size:16px;line-height:1.4}
  .saCocPreview>article>span{font-size:12px;line-height:1.4}
  .saCocPreview>article>p{font-size:14px;line-height:1.6}
  .saCocPreview>article>small{font-size:12px}
  .saGenerate p,.saSectionHead p{font-size:15px}
  .saGenerate form small{font-size:12px}
  @media(max-width:600px){
    .saCocPreview>header{padding:22px}
    .saCocPreview>article{grid-template-columns:1fr;padding:18px}
  }
`}</style>
      <div className="saShell">
        <aside className="saSide">
          <Link href="/portal" className="saBrand">
            <b>RPG</b> Excellence
          </Link>

          <small>SUPPLIER ASSURANCE HUB</small>

          <nav>
            <Link
              href="/portal/suppliers?view=board"
              className={managementBoard ? "active" : ""}
            >
              Management board
            </Link>

            <Link
              href="/portal/suppliers?new=1"
              className={!active ? "accent" : ""}
            >
              + New supplier
            </Link>

            <span>SUPPLIER REGISTER</span>

            {suppliers.map((supplier) => (
              <Link
                key={supplier.id}
                href={`/portal/suppliers?id=${supplier.id}`}
                className={
                  active?.id === supplier.id
                    ? "active supplier"
                    : "supplier"
                }
              >
                <b>{supplier.legal_name}</b>
                <small>
                  {supplier.supplier_reference} ·{" "}
                  {String(supplier.approval_status).replaceAll(
                    "_",
                    " ",
                  )}
                </small>
                <span className="saSupplierNc">NC: {supplierNcStats[supplier.id]?.open || 0} open · {supplierNcStats[supplier.id]?.pending || 0} pending · {supplierNcStats[supplier.id]?.closed || 0} closed</span>
              </Link>
            ))}
          </nav>

          <div className="saSideFoot">
            <strong>
              {organization?.name || "Organisation required"}
            </strong>
            <span>
              {suppliers.length} supplier
              {suppliers.length === 1 ? "" : "s"} under assurance
            </span>
          </div>
        </aside>

        <section className="saWork">
          <header className="saTop">
            <div>
              <small>INTEGRATED SUPPLIER ASSURANCE</small>
              <h1>
                {managementBoard
                  ? "Supplier assurance management board"
                  : active
                  ? active.legal_name
                  : "Create supplier assurance record"}
              </h1>
              <p>
                {managementBoard
                  ? "Portfolio risk, approval and nonconformity oversight"
                  : active
                  ? `${active.supplier_reference} · ${statusLabel}`
                  : "Classify once, then let the engine apply the right controls."}
              </p>
            </div>

            <div>
              {active ? <Link className="issue" href={`/portal/internal-audit-actions?raise=1&supplier=${active.id}#raise-manual-nc`}>+ Raise Supplier Issue</Link> : null}
              <Link href="/portal">Product dashboard</Link>
              <Link
                className="primary"
                href="/portal/suppliers?new=1"
              >
                + New supplier
              </Link>
            </div>
          </header>

          <section className="saHero">
            <div>
              <span>ONE SUPPLIER · ONE ASSURANCE POSITION</span>
              <h2>
                Risk-based approval across every applicable
                standard.
              </h2>
              <p>
                The engine adapts due diligence, evidence, approval
                and monitoring to the supplier’s scope, criticality
                and management-system requirements.
              </p>
            </div>

            <aside>
              <article>
                <strong>{result.riskBand}</strong>
                <span>risk rating</span>
              </article>
              <article>
                <strong>{result.assuranceScore}%</strong>
                <span>assurance score</span>
              </article>
              <article>
                <strong>{questions.length}</strong>
                <span>applicable controls</span>
              </article>
              <article>
                <strong>{result.blockers.length}</strong>
                <span>approval blockers</span>
              </article>
            </aside>
          </section>

          <section className="saMetrics">
            <Metric
              label="Supplier portfolio"
              value={suppliers.length}
              detail="Controlled supplier records"
            />
            <Metric label="NCs open" value={activeNc.open} detail={active ? "Action required" : "Select a supplier"} tone="red" />
            <Metric label="NCs pending" value={activeNc.pending} detail={active ? "CAPA or verification" : "Select a supplier"} tone="amber" />
            <Metric label="NCs closed" value={activeNc.closed} detail={active ? "Effectiveness verified" : "Select a supplier"} tone="green" />
            <Metric
              label="High / critical"
              value={
                suppliers.filter((item) =>
                  ["High", "Critical"].includes(
                    item.risk_result?.riskBand,
                  ),
                ).length
              }
              detail="Enhanced assurance required"
              tone="red"
            />
            <Metric
              label="Pending approval"
              value={
                suppliers.filter(
                  (item) =>
                    item.approval_status === "pending_approval",
                ).length
              }
              detail="Decision required"
              tone="amber"
            />
            <Metric
              label="Codes issued"
              value={documents.length}
              detail={
                active ? "For selected supplier" : "Select a supplier"
              }
              tone="green"
            />
            <Metric
              label="Risk profile"
              value={active ? result.riskBand : "—"}
              detail={
                active
                  ? `${result.riskScore}/40 · Live supplier risk score`
                  : "Select a supplier"
              }
              tone={active ? riskTone : "blue"}
            />
          </section>

          {managementBoard && (
            <section className="saBoard">
              <header>
                <div>
                  <small>CONTROLLED SUPPLIER PORTFOLIO</small>
                  <h2>Supplier management board</h2>
                  <p>Select a supplier to review its risk, approval, NC position and assurance record.</p>
                </div>
                <Link href="/portal/suppliers?new=1">+ Add supplier</Link>
              </header>

              {suppliers.length ? (
                <div className="saBoardTable">
                  <div className="saBoardRow heading">
                    <span>Supplier</span><span>Approval</span><span>Risk profile</span><span>NC position</span><span>Next review</span><span>Action</span>
                  </div>
                  {suppliers.map((supplier) => {
                    const stats = supplierNcStats[supplier.id] || { open: 0, pending: 0, closed: 0 };
                    const band = supplier.risk_result?.riskBand || "Not assessed";
                    const score = supplier.risk_result?.riskScore;
                    return (
                      <div className="saBoardRow" key={supplier.id}>
                        <span><b>{supplier.legal_name}</b><small>{supplier.supplier_reference}</small></span>
                        <span><Pill tone={supplier.approval_status === "approved" ? "green" : supplier.approval_status === "pending_approval" ? "amber" : "blue"}>{String(supplier.approval_status || "draft").replaceAll("_", " ")}</Pill></span>
                        <span><b>{band}</b><small>{Number.isFinite(Number(score)) ? `${score}/40` : "Complete risk engine"}</small></span>
                        <span><b>{stats.open} open · {stats.pending} pending</b><small>{stats.closed} closed</small></span>
                        <span><b>{supplier.next_review_date || "Not set"}</b><small>{supplier.review_frequency_months || 12}-month cycle</small></span>
                        <span><Link href={`/portal/suppliers?id=${supplier.id}`}>Open record →</Link></span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="saBoardEmpty"><b>No suppliers yet</b><span>Create the first controlled supplier assurance record.</span></div>
              )}
            </section>
          )}

          {!managementBoard && (saved || state?.error) && (
            <div
              className={
                state?.error
                  ? "saMessage error"
                  : "saMessage success"
              }
            >
              {state?.error ||
                "Supplier assurance record saved successfully."}
            </div>
          )}

          {!managementBoard && <div className="saTabs" role="tablist">
            {tabs.map((tab, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={step === index}
                className={step === index ? "active" : ""}
                onClick={() => setStep(index)}
                key={tab}
              >
                <b>{index + 1}</b>
                {tab}
              </button>
            ))}
          </div>}

          {!managementBoard && <form action={formAction} className="saPanel">
            <input
              type="hidden"
              name="supplier_id"
              value={active?.id || ""}
            />
            <input
              type="hidden"
              name="supplier_types"
              value={JSON.stringify(types)}
            />
            <input
              type="hidden"
              name="applicable_standards"
              value={JSON.stringify(standards)}
            />
            <input
              type="hidden"
              name="due_diligence_answers"
              value={JSON.stringify(answers)}
            />
            <input
              type="hidden"
              name="risk_inputs"
              value={JSON.stringify(risk)}
            />
            <input
              type="hidden"
              name="documents"
              value={JSON.stringify(initial?.documents || [])}
            />
            <input
              type="hidden"
              name="performance"
              value={JSON.stringify(performance)}
            />
            <input type="hidden" name="supplier_sites" value={JSON.stringify(sites)} />
            <input type="hidden" name="subtier_suppliers" value={JSON.stringify(subTiers)} />
            <input type="hidden" name="supplier_contacts" value={JSON.stringify(contacts)} />

            {step !== 0 &&
              [
                "legal_name",
                "trading_name",
                "registered_address",
                "country",
                "company_number",
                "website",
                "supply_description",
              ].map((key) => (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={data[key]}
                />
              ))}

            {step !== 2 && data.uses_subtier_suppliers && (
              <input
                type="hidden"
                name="uses_subtier_suppliers"
                value="on"
              />
            )}

            {step !== 3 && (
              <input
                type="hidden"
                name="criticality"
                value={data.criticality}
              />
            )}

            {step !== 5 &&
              [
                "approval_scope",
                "approval_conditions",
                "approved_by_person_id",
                "approval_expiry",
                "next_review_date",
                "review_frequency_months",
              ].map((key) => (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={data[key]}
                />
              ))}

            {step === 0 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 1</small>
                    <h2>Supplier identity and relationship</h2>
                    <p>
                      Capture the legal entity and exact
                      scope before the engine determines applicable
                      controls.
                    </p>
                  </div>
                  <Pill>
                    {active?.supplier_reference ||
                      "Reference created on save"}
                  </Pill>
                </div>

                <div className="saGrid">
                  <Field
                    label="Legal supplier name *"
                    name="legal_name"
                    value={data.legal_name}
                    onChange={(value) =>
                      update("legal_name", value)
                    }
                    required
                  />
                  <Field
                    label="Trading name"
                    name="trading_name"
                    value={data.trading_name}
                    onChange={(value) =>
                      update("trading_name", value)
                    }
                  />
                  <Field
                    label="Registered address *"
                    name="registered_address"
                    value={data.registered_address}
                    onChange={(value) =>
                      update("registered_address", value)
                    }
                    area
                    rows="4"
                    className="wide"
                    required
                  />
                  <Field
                    label="Country"
                    name="country"
                    value={data.country}
                    onChange={(value) =>
                      update("country", value)
                    }
                  />
                  <Field
                    label="Company / registration number"
                    name="company_number"
                    value={data.company_number}
                    onChange={(value) =>
                      update("company_number", value)
                    }
                  />
                  <Field
                    label="Website"
                    name="website"
                    value={data.website}
                    onChange={(value) =>
                      update("website", value)
                    }
                    type="url"
                  />
                  <Field
                    label="Products, services or outsourced process supplied *"
                    name="supply_description"
                    value={data.supply_description}
                    onChange={(value) =>
                      update("supply_description", value)
                    }
                    area
                    rows="4"
                    className="wide"
                    required
                  />
                </div>

                <div className="saRegisterHead">
                  <div><h3>Supplier sites and approved scope</h3><p>Add each operating location separately and control its approval status.</p></div>
                  <button type="button" onClick={addSite}>+ Add site</button>
                </div>
                <div className="saManagedList">
                  {sites.length === 0 && <p className="saEmpty">No sites added. Add at least the principal supply location.</p>}
                  {sites.map((site, index) => (
                    <article key={site.client_key}>
                      <header><b>Site {index + 1}</b><button type="button" onClick={() => removeSite(site.client_key)}>Remove</button></header>
                      <div className="saManagedGrid">
                        <label><span>Site name *</span><input value={site.site_name} onChange={(event) => updateSite(site.client_key, "site_name", event.target.value)} /></label>
                        <label><span>Approval status</span><select value={site.approval_status} onChange={(event) => updateSite(site.client_key, "approval_status", event.target.value)}><option value="approved">Approved</option><option value="conditionally_approved">Conditionally approved</option><option value="not_approved">Not approved</option><option value="pending">Pending assessment</option><option value="suspended">Suspended</option></select></label>
                        <label className="wide"><span>Full address *</span><textarea rows="2" value={site.address} onChange={(event) => updateSite(site.client_key, "address", event.target.value)} /></label>
                        <label className="wide"><span>Approved operational scope *</span><textarea rows="2" value={site.scope} onChange={(event) => updateSite(site.client_key, "scope", event.target.value)} /></label>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="saSectionHead"><div><small>STEP 2</small><h2>Supplier contact details</h2><p>Maintain the supplier people authorised for correspondence, issue ownership and escalation.</p></div><Pill tone="purple">{contacts.filter((contact) => contact.is_active !== false).length} active</Pill></div>
                <div className="saRegisterHead"><div><h3>Contact register</h3><p>These contacts become available as Responsible Owner only when an NC source is Supplier issue.</p></div><button type="button" onClick={addContact}>+ Add contact</button></div>
                <div className="saManagedList">
                  {contacts.length === 0 && <p className="saEmpty">No supplier contacts recorded. Add at least one contact before raising a supplier issue.</p>}
                  {contacts.map((contact, index) => <article key={contact.client_key}><header><b>Contact {index + 1}{contact.is_primary ? " · Primary" : ""}</b><button type="button" onClick={() => removeContact(contact.client_key)}>Remove</button></header><div className="saManagedGrid">
                    <label><span>First name *</span><input value={contact.first_name || ""} onChange={(event) => updateContact(contact.client_key, "first_name", event.target.value)}/></label>
                    <label><span>Surname</span><input value={contact.last_name || ""} onChange={(event) => updateContact(contact.client_key, "last_name", event.target.value)}/></label>
                    <label><span>Business title</span><input value={contact.business_title || ""} onChange={(event) => updateContact(contact.client_key, "business_title", event.target.value)}/></label>
                    <label><span>Department / function</span><input value={contact.department || ""} onChange={(event) => updateContact(contact.client_key, "department", event.target.value)}/></label>
                    <label><span>Telephone</span><input value={contact.telephone || ""} onChange={(event) => updateContact(contact.client_key, "telephone", event.target.value)}/></label>
                    <label><span>Mobile</span><input value={contact.mobile || ""} onChange={(event) => updateContact(contact.client_key, "mobile", event.target.value)}/></label>
                    <label className="wide"><span>Email address *</span><input type="email" value={contact.email || ""} onChange={(event) => updateContact(contact.client_key, "email", event.target.value)}/></label>
                    <label><span><input type="radio" name="primary_supplier_contact" checked={Boolean(contact.is_primary)} onChange={() => setPrimaryContact(contact.client_key)}/> Primary contact</span></label>
                    <label><span><input type="checkbox" checked={contact.is_active !== false} onChange={(event) => updateContact(contact.client_key, "is_active", event.target.checked)}/> Active contact</span></label>
                  </div></article>)}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 3</small>
                    <h2>
                      Classification and applicable standards
                    </h2>
                    <p>
                      Select every relevant relationship. The
                      question set and Code of Conduct change
                      immediately.
                    </p>
                  </div>
                  <Pill tone="purple">
                    {standards.length} standards
                  </Pill>
                </div>

                <h3>Supplier classification</h3>
                <div className="saChoices">
                  {SUPPLIER_TYPES.map(([id, label]) => (
                    <button
                      type="button"
                      className={
                        types.includes(id) ? "selected" : ""
                      }
                      onClick={() =>
                        toggle(types, setTypes, id)
                      }
                      key={id}
                    >
                      <i>
                        {types.includes(id) ? "✓" : "+"}
                      </i>
                      {label}
                    </button>
                  ))}
                </div>

                <h3>Applicable assurance frameworks</h3>
                <div className="saStandardGrid">
                  {SUPPLIER_STANDARDS.map((standard) => (
                    <button
                      type="button"
                      className={
                        standards.includes(standard.id)
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        toggle(
                          standards,
                          setStandards,
                          standard.id,
                        )
                      }
                      key={standard.id}
                    >
                      <b>{standard.label}</b>
                      <span>{standard.name}</span>
                    </button>
                  ))}
                </div>

                <label className="saCheck">
                  <input
                    type="checkbox"
                    name="uses_subtier_suppliers"
                    checked={data.uses_subtier_suppliers}
                    onChange={(event) =>
                      update(
                        "uses_subtier_suppliers",
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    <b>Sub-tier suppliers are used</b>
                    <small>
                      Flow-down and sub-tier assurance requirements
                      will be included.
                    </small>
                  </span>
                </label>
                {data.uses_subtier_suppliers && (
                  <>
                    <div className="saRegisterHead">
                      <div><h3>Sub-tier supplier register</h3><p>Record controlled status, applicable certification and the manually selected renewal reminder date.</p></div>
                      <button type="button" onClick={addSubTier}>+ Add sub-tier supplier</button>
                    </div>
                    <div className="saManagedList">
                      {subTiers.length === 0 && <p className="saEmpty">No sub-tier suppliers added.</p>}
                      {subTiers.map((supplier, index) => (
                        <article key={supplier.client_key}>
                          <header><b>Sub-tier supplier {index + 1}</b><button type="button" onClick={() => removeSubTier(supplier.client_key)}>Remove</button></header>
                          <div className="saManagedGrid">
                            <label><span>Legal name *</span><input value={supplier.legal_name} onChange={(event) => updateSubTier(supplier.client_key, "legal_name", event.target.value)} /></label>
                            <label><span>Approval status</span><select value={supplier.approval_status} onChange={(event) => updateSubTier(supplier.client_key, "approval_status", event.target.value)}><option value="approved">Approved</option><option value="conditionally_approved">Conditionally approved</option><option value="not_approved">Not approved</option><option value="pending">Pending assessment</option><option value="suspended">Suspended</option><option value="expired">Approval expired</option></select></label>
                            <label className="wide"><span>Products, services or process supplied *</span><textarea rows="2" value={supplier.supply_scope} onChange={(event) => updateSubTier(supplier.client_key, "supply_scope", event.target.value)} /></label>
                            <label><span>Certification / standard</span><input value={supplier.certification_standard} onChange={(event) => updateSubTier(supplier.client_key, "certification_standard", event.target.value)} placeholder="e.g. ISO 9001:2015" /></label>
                            <label><span>Certificate number</span><input value={supplier.certificate_number} onChange={(event) => updateSubTier(supplier.client_key, "certificate_number", event.target.value)} /></label>
                            <label><span>Certification body</span><input value={supplier.certification_body} onChange={(event) => updateSubTier(supplier.client_key, "certification_body", event.target.value)} /></label>
                            <label><span>Certificate renewal / expiry</span><input type="date" value={supplier.certificate_expiry} onChange={(event) => updateSubTier(supplier.client_key, "certificate_expiry", event.target.value)} /></label>
                            <label><span>Send renewal reminder on</span><input type="date" value={supplier.reminder_date} onChange={(event) => updateSubTier(supplier.client_key, "reminder_date", event.target.value)} /></label>
                            <label className="saFileButton"><span>Certification evidence</span><input type="file" name={`subtier_certificate_${supplier.client_key}`} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event) => updateSubTier(supplier.client_key, "pending_certificate_name", event.target.files?.[0]?.name || "")} /><b>+ Add certificate</b></label>
                            <div className="saCertificateState">
                              {supplier.pending_certificate_name && <span>✓ Selected: <b>{supplier.pending_certificate_name}</b> — press Save draft to upload</span>}
                              {supplier.certificate_url && <a className="saDownload" href={supplier.certificate_url} target="_blank" rel="noreferrer">↧ {supplier.certificate_file_name || "Download current certificate"}</a>}
                              {!supplier.pending_certificate_name && !supplier.certificate_url && <small>No certificate attached</small>}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 4</small>
                    <h2>Dynamic supplier risk engine</h2>
                    <p>
                      Score the relationship before controls.
                      Assurance gaps then adjust the risk position
                      automatically.
                    </p>
                  </div>
                  <Pill tone={riskTone}>
                    {result.riskScore}/40 · {result.riskBand}
                  </Pill>
                </div>

                <div className="saRiskSummary">
                  <div>
                    <span>ENGINE DECISION</span>
                    <strong>{result.recommendation}</strong>
                    <small>
                      Recommended review: every{" "}
                      {result.reviewMonths} months
                    </small>
                  </div>
                  <div className={`saRiskDial ${riskTone}`}>
                    <strong>{result.riskScore}</strong>
                    <span>RISK</span>
                  </div>
                </div>

                <div className="saGrid risk">
                  <Field
                    label="Supplier criticality"
                    value={data.criticality}
                    onChange={() => {}}
                  >
                    <select
                      name="criticality"
                      value={data.criticality}
                      onChange={(event) =>
                        update(
                          "criticality",
                          event.target.value,
                        )
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">
                        Critical
                      </option>
                    </select>
                  </Field>

                  {[
                    ["likelihood", "Likelihood of failure"],
                    ["consequence", "Consequence of failure"],
                    ["dependency", "Business dependency"],
                    [
                      "detectability",
                      "Difficulty detecting failure",
                    ],
                  ].map(([key, label]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <div className="saScale">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            type="button"
                            className={
                              risk[key] === value
                                ? "selected"
                                : ""
                            }
                            onClick={() =>
                              setRisk((current) => ({
                                ...current,
                                [key]: value,
                              }))
                            }
                            key={value}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <small>
                        1 = lowest · 5 = highest
                      </small>
                    </label>
                  ))}
                </div>

                <div className="saRule">
                  <b>Automated controls</b>
                  <span>
                    {["High", "Critical"].includes(
                      result.riskBand,
                    )
                      ? "Technical approval + enhanced monitoring + supplier audit"
                      : result.riskBand === "Medium"
                        ? "Documented approval + periodic monitoring"
                        : "Simplified approval + routine monitoring"}
                  </span>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 5</small>
                    <h2>Risk-based due diligence</h2>
                    <p>
                      {questions.length} controls generated from the
                      selected scope. Mandatory gaps automatically
                      block approval.
                    </p>
                  </div>
                  <Pill
                    tone={
                      result.blockers.length ? "red" : "green"
                    }
                  >
                    {result.blockers.length
                      ? `${result.blockers.length} blockers`
                      : "No blockers"}
                  </Pill>
                </div>

                <div className="saProgress">
                  <i
                    style={{
                      width: `${result.assuranceScore}%`,
                    }}
                  />
                  <span>
                    {result.assuranceScore}% assurance complete
                  </span>
                </div>

                <div className="saQuestions">
                  {questions.map((item, index) => {
                    const current = answers[item.id] || {};

                    return (
                      <article
                        key={item.id}
                        className={
                          item.blocker &&
                          [
                            "no",
                            "unanswered",
                            undefined,
                          ].includes(current.response)
                            ? "blocker"
                            : ""
                        }
                      >
                        <header>
                          <b>{item.id}</b>
                          <div>
                            <span>{item.category}</span>
                            <strong>{item.question}</strong>
                          </div>
                          {item.blocker && (
                            <em>MANDATORY</em>
                          )}
                        </header>

                        <div className="saResponses">
                          {[
                            ["yes", "Yes"],
                            ["partial", "Partial"],
                            ["no", "No"],
                            ["na", "N/A"],
                          ].map(([value, label]) => (
                            <button
                              type="button"
                              className={
                                current.response === value
                                  ? `selected ${value}`
                                  : ""
                              }
                              onClick={() =>
                                answer(
                                  item.id,
                                  "response",
                                  value,
                                )
                              }
                              key={value}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <label>
                          <span>
                            Evidence expected: {item.evidence}
                          </span>
                          <textarea
                            value={
                              current.evidence || ""
                            }
                            onChange={(event) =>
                              answer(
                                item.id,
                                "evidence",
                                event.target.value,
                              )
                            }
                            rows="2"
                            placeholder="Record document references, observations, certificate details or required action"
                          />
                        </label>

                        <div className="saEvidenceFiles">
                          <label className="saFileButton">
                            <input
                              type="file"
                              name={`evidence_file_${item.id}`}
                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                              onChange={(event) => setSelectedFiles((currentFiles) => ({ ...currentFiles, [item.id]: event.target.files?.[0]?.name || "" }))}
                            />
                            <b>+ Add evidence</b>
                          </label>
                          {selectedFiles[item.id] && <span>Ready to save: {selectedFiles[item.id]}</span>}
                          {evidenceFiles.filter((file) => file.control_id === item.id).map((file) => <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer">↧ {file.file_name}</a>)}
                        </div>

                        <small>
                          Control {index + 1} of{" "}
                          {questions.length} · Weight{" "}
                          {item.weight}
                        </small>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 6</small>
                    <h2>
                      Approval and monitoring decision
                    </h2>
                    <p>
                      Translate the evaluated risk and evidence
                      into a controlled decision and proportionate
                      monitoring plan.
                    </p>
                  </div>
                  <Pill
                    tone={
                      result.blockers.length ? "red" : "green"
                    }
                  >
                    {result.blockers.length
                      ? "Approval blocked"
                      : "Eligible for approval"}
                  </Pill>
                </div>

                <div className="saDecision">
                  <article>
                    <span>Risk</span>
                    <strong className={riskTone}>
                      {result.riskBand}
                    </strong>
                    <small>
                      {result.riskScore}/40
                    </small>
                  </article>
                  <article>
                    <span>Assurance</span>
                    <strong>
                      {result.assuranceScore}%
                    </strong>
                    <small>
                      {result.gaps.length} gaps
                    </small>
                  </article>
                  <article>
                    <span>Performance</span>
                    <strong>
                      {averagePerformance}%
                    </strong>
                    <small>
                      Current weighted snapshot
                    </small>
                  </article>
                  <article>
                    <span>Review</span>
                    <strong>
                      {result.reviewMonths}m
                    </strong>
                    <small>
                      Engine recommendation
                    </small>
                  </article>
                </div>

                <div className="saGrid">
                  <Field
                    label="Approved scope"
                    name="approval_scope"
                    value={data.approval_scope}
                    onChange={(value) =>
                      update("approval_scope", value)
                    }
                    area
                    rows="4"
                    className="wide"
                  />
                  <Field
                    label="Approval conditions / restrictions"
                    name="approval_conditions"
                    value={data.approval_conditions}
                    onChange={(value) =>
                      update("approval_conditions", value)
                    }
                    area
                    rows="4"
                    className="wide"
                  />
                  <Field label="Competent approver" value={data.approved_by_person_id || ""} onChange={() => {}}>
                    <select name="approved_by_person_id" value={data.approved_by_person_id || ""} onChange={(event) => update("approved_by_person_id", event.target.value)}>
                      <option value="">Select an authorised company approver</option>
                      {approvers.map((person) => <option key={person.id} value={person.id}>{person.first_name} {person.last_name} · {person.position || person.email}</option>)}
                    </select>
                  </Field>
                  <Field
                    label="Review frequency (months)"
                    name="review_frequency_months"
                    value={String(
                      data.review_frequency_months,
                    )}
                    onChange={(value) =>
                      update(
                        "review_frequency_months",
                        value,
                      )
                    }
                    type="number"
                    min="1"
                    max="60"
                  />
                  <Field
                    label="Approval expiry"
                    name="approval_expiry"
                    value={data.approval_expiry}
                    onChange={(value) =>
                      update("approval_expiry", value)
                    }
                    type="date"
                  />
                  <Field
                    label="Next review date"
                    name="next_review_date"
                    value={data.next_review_date}
                    onChange={(value) =>
                      update("next_review_date", value)
                    }
                    type="date"
                  />
                </div>

                <h3>Performance snapshot</h3>
                <div className="saPerformance">
                  {[
                    ["conformity", "Conformity"],
                    ["delivery", "On-time delivery"],
                    [
                      "responsiveness",
                      "Responsiveness",
                    ],
                    [
                      "correctiveAction",
                      "Corrective action",
                    ],
                  ].map(([key, label]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={performance[key]}
                        onChange={(event) =>
                          setPerformance(
                            (current) => ({
                              ...current,
                              [key]: n(
                                event.target.value,
                                0,
                              ),
                            }),
                          )
                        }
                      />
                      <b>%</b>
                    </label>
                  ))}
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 7</small>
                    <h2>
                      Dynamic Supplier Code of Conduct
                    </h2>
                    <p>
                      The document is assembled from common
                      responsible-business requirements plus
                      supplier-specific ISO, laboratory,
                      certification and aerospace controls.
                    </p>
                  </div>
                  <Pill tone="purple">
                    {codeSections.length} sections
                  </Pill>
                </div>

                <div className="saCocPreview">
                  <header>
                    <span>
                      RPG EXCELLENCE · CONTROLLED
                      SUPPLIER DOCUMENT
                    </span>
                    <h3>
                      Supplier Code of Conduct &amp;
                      Assurance Requirements
                    </h3>
                    <p>
                      <b>Supplier:</b>{" "}
                      {data.legal_name ||
                        "Complete supplier name"}
                      <br />
                      <b>Address:</b>{" "}
                      {data.registered_address ||
                        "Complete registered address"}
                      <br />
                      <b>Scope:</b>{" "}
                      {data.supply_description ||
                        "Complete supply description"}
                    </p>
                  </header>

                  <div className="saCocStandards">
                    {standards.map((id) => (
                      <Pill key={id}>
                        {SUPPLIER_STANDARDS.find(
                          (item) => item.id === id,
                        )?.label || id}
                      </Pill>
                    ))}
                  </div>

                  {codeSections.map((item, index) => (
                    <article key={item.id}>
                      <b>
                        {index + 1}. {item.title}
                      </b>
                      <span>
                        {item.applicability}
                      </span>
                      <p>
                        {item.paragraphs[0]}
                      </p>
                      <small>
                        {item.requirements.length}{" "}
                        controlled requirements included
                      </small>
                    </article>
                  ))}
                </div>

                {!active && (
                  <div className="saNotice">
                    Save the supplier record first.
                    The blue button will then generate
                    a controlled, versioned PDF
                    populated with the supplier name,
                    address, scope and applicable
                    requirements.
                  </div>
                )}
              </>
            )}

            <footer className="saActions">
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setStep(
                      Math.max(0, step - 1),
                    )
                  }
                  disabled={step === 0}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStep(
                      Math.min(
                        tabs.length - 1,
                        step + 1,
                      ),
                    )
                  }
                  disabled={
                    step === tabs.length - 1
                  }
                >
                  Next →
                </button>
              </div>

              <div>
                <button
                  name="intent"
                  value="save"
                  disabled={pending}
                >
                  Save draft
                </button>
                <button
                  name="intent"
                  value="submit"
                  className="outline"
                  disabled={pending}
                >
                  Submit for approval
                </button>
                <button
                  name="intent"
                  value="approve"
                  className="primary"
                  disabled={
                    pending ||
                    result.blockers.length > 0
                  }
                >
                  {pending
                    ? "Saving…"
                    : "Approve supplier"}
                </button>
              </div>
            </footer>
          </form>}

          {active && (
            <section className="saGenerate">
              <div>
                <small>
                  CONTROLLED DOCUMENT GENERATOR
                </small>
                <h2>
                  Supplier-specific Code of Conduct
                </h2>
                <p>
                  Create a new controlled version using
                  the supplier’s saved name, address,
                  scope, classification and applicable
                  standards.
                </p>

                {documents.length > 0 && (
                  <div className="saDocList">
                    {documents.map((document) => (
                      <Link
                        key={document.id}
                        href={`/portal/suppliers/${active.id}/code-of-conduct?document=${document.id}`}
                      >
                        <b>
                          {
                            document.document_reference
                          }
                        </b>
                        <span>
                          Version {document.version} ·{" "}
                          {document.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <form action={generateAction}>
                <input
                  type="hidden"
                  name="supplier_id"
                  value={active.id}
                />
                <button type="submit">
                  Generate Supplier Code of Conduct →
                </button>
                <small>
                  Creates a controlled HTML preview
                  and downloadable PDF
                </small>
              </form>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

const styles = `
*{box-sizing:border-box}
.saPage{min-height:100vh;background:#edf3f8;color:#071d3a;font-family:Arial,sans-serif}
.saShell{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}
.saSide{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:26px 18px;background:#07294f;color:#d7e4f1;overflow:auto}
.saBrand{margin:0 8px 28px;color:#fff;font-size:22px;text-decoration:none}
.saSide>small{margin:0 9px 12px;color:#7695b4;font-size:9px;font-weight:950;letter-spacing:.13em}
.saSide nav{display:grid;gap:5px}
.saSide nav>a{padding:11px;border-radius:8px;color:#d7e4f1;text-decoration:none;font-size:12px;font-weight:800}
.saSide nav>a:hover,.saSide nav>a.active{background:#19558e;color:#fff}
.saSide nav>a.accent{background:#315fe6;color:#fff}
.saSide nav>span{margin:18px 9px 5px;color:#7695b4;font-size:9px;font-weight:950;letter-spacing:.12em}
.saSide nav>a.supplier{display:grid;gap:4px;border:1px solid #ffffff0d}
.saSide nav>a.supplier b{font-size:11px}
.saSide nav>a.supplier small{color:#9db4ca;font-size:8px;text-transform:capitalize}
.saSide nav>a.supplier .saSupplierNc{color:#66dfd5;font-size:8px;font-weight:800;line-height:1.35}
.saSideFoot{display:grid;gap:5px;margin-top:auto;padding:15px;border-top:1px solid #ffffff1c}
.saSideFoot span{color:#9db4ca;font-size:10px}
.saWork{min-width:0;padding:28px clamp(20px,3vw,48px) 100px}
.saTop{display:flex;justify-content:space-between;gap:20px;align-items:start}
.saTop>div:first-child>small,.saSectionHead small,.saGenerate>div>small{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.13em}
.saTop h1{margin:6px 0;font-size:34px}
.saTop p{margin:0;color:#687d92;text-transform:capitalize}
.saTop>div:last-child{display:flex;gap:8px}
.saTop a{padding:11px 14px;border:1px solid #c7d5e3;border-radius:9px;background:#fff;color:#173b60;text-decoration:none;font-size:12px;font-weight:850}
.saTop a.primary{border-color:#315fe6;background:#315fe6;color:#fff}
.saTop a.issue{border-color:#c87900;background:#fff4df;color:#8a5100}
.saHero{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:25px;align-items:center;margin-top:22px;padding:28px 30px;border-radius:18px;background:linear-gradient(120deg,#06264d,#0a3a68);color:#fff;box-shadow:0 16px 36px #082a5426}
.saHero>div>span{color:#61dfdc;font-size:10px;font-weight:950;letter-spacing:.12em}
.saHero h2{margin:10px 0 8px;font-size:31px}
.saHero p{max-width:700px;margin:0;color:#cbdbea;line-height:1.55}
.saHero aside{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.saHero article{padding:13px;border:1px solid #ffffff20;border-radius:10px;background:#ffffff0b}
.saHero article strong,.saHero article span{display:block}
.saHero article strong{font-size:22px}
.saHero article span{margin-top:3px;color:#b8ccdf;font-size:9px}
.saMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:13px}
.saMetric{display:flex;min-height:112px;flex-direction:column;justify-content:space-between;padding:17px;border:1px solid #d6e1eb;border-radius:13px;background:#fff}
.saMetric>span{color:#5f748a;font-size:11px;font-weight:850}
.saMetric strong{font-size:28px}
.saMetric small{color:#8292a3;font-size:9px}
.saMetric .red,.saDecision strong.red{color:#c8322b}
.saMetric .amber,.saDecision strong.amber{color:#cc7900}
.saMetric .green,.saDecision strong.green{color:#008f60}
.saMetric .blue,.saDecision strong.blue{color:#315fe6}
.saBoard{margin-top:20px;padding:24px;border:1px solid #d2dee9;border-radius:16px;background:#fff;box-shadow:0 12px 30px #12395f0c}
.saBoard>header{display:flex;justify-content:space-between;gap:20px;align-items:start;margin-bottom:18px}
.saBoard>header small{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.13em}
.saBoard>header h2{margin:5px 0 6px;font-size:24px}
.saBoard>header p{margin:0;color:#687d92}
.saBoard>header>a,.saBoardRow a{padding:10px 13px;border-radius:8px;background:#315fe6;color:#fff;text-decoration:none;font-size:12px;font-weight:850;white-space:nowrap}
.saBoardTable{overflow:auto;border:1px solid #d9e3ec;border-radius:11px}
.saBoardRow{display:grid;grid-template-columns:minmax(190px,1.5fr) minmax(120px,1fr) minmax(110px,.8fr) minmax(150px,1fr) minmax(130px,1fr) 115px;gap:14px;align-items:center;min-width:930px;padding:15px;border-top:1px solid #e1e8ef}
.saBoardRow:first-child{border-top:0}
.saBoardRow.heading{background:#f2f6fa;color:#526b83;font-size:11px;font-weight:900}
.saBoardRow>span{display:grid;gap:4px;color:#16395d;font-size:12px}
.saBoardRow>span small{color:#7890a6;font-size:10px}
.saBoardRow>span:last-child{justify-items:start}
.saBoardEmpty{display:grid;gap:6px;padding:35px;border:1px dashed #c9d6e2;border-radius:11px;color:#627990;text-align:center}
.saBoardEmpty b{color:#173b60;font-size:18px}
.saMessage{margin-top:13px;padding:12px 15px;border-radius:9px;font-weight:800}
.saMessage.success{background:#e7f8f1;color:#08734f}
.saMessage.error{background:#ffe9e6;color:#a72822}
.saTabs{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:20px}
.saTabs button{display:flex;align-items:center;gap:7px;min-height:55px;padding:10px;border:1px solid #d3dfe9;border-radius:9px;background:#f9fbfd;color:#5f748a;font-size:10px;font-weight:850;cursor:pointer}
.saTabs button b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#e7edf4}
.saTabs button.active{border-color:#315fe6;background:#fff;color:#16395d;box-shadow:0 7px 20px #133b6412}
.saTabs button.active b{background:#315fe6;color:#fff}
.saPanel{margin-top:9px;padding:26px;border:1px solid #d2dee9;border-radius:16px;background:#fff;box-shadow:0 12px 30px #12395f0c}
.saSectionHead{display:flex;justify-content:space-between;gap:20px;align-items:start;margin-bottom:23px}
.saSectionHead h2{margin:5px 0 7px;font-size:24px}
.saSectionHead p{max-width:750px;margin:0;color:#687d92;line-height:1.5}
.saPill{display:inline-flex;padding:7px 9px;border-radius:999px;background:#e9f0ff;color:#2757c9;font-size:9px;font-weight:900}
.saPill.red{background:#ffe7e4;color:#af2720}
.saPill.amber{background:#fff0ce;color:#855700}
.saPill.green{background:#e2f7ef;color:#087450}
.saPill.purple{background:#eee9ff;color:#6243c4}
.saGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.saGrid label,.saQuestions label{display:grid;gap:7px}
.saGrid label>span,.saQuestions label>span,.saPerformance label>span{color:#3d566f;font-size:11px;font-weight:900}
.saGrid input,.saGrid textarea,.saGrid select,.saQuestions textarea{width:100%;padding:12px;border:1px solid #c8d6e3;border-radius:9px;background:#fbfdff;color:#102e4c;font:inherit;outline:0}
.saGrid input:focus,.saGrid textarea:focus,.saGrid select:focus,.saQuestions textarea:focus{border-color:#315fe6;box-shadow:0 0 0 3px #315fe615}
.saGrid .wide{grid-column:1/-1}
.saPanel h3{margin:25px 0 11px;font-size:15px}
.saChoices{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.saChoices button,.saStandardGrid button{display:flex;align-items:center;gap:8px;min-height:52px;padding:11px;border:1px solid #cfdae5;border-radius:9px;background:#f9fbfd;color:#29445f;text-align:left;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
.saChoices button i{display:grid;place-items:center;width:21px;height:21px;border-radius:6px;background:#e6edf4;font-style:normal}
.saChoices button.selected,.saStandardGrid button.selected{border-color:#315fe6;background:#edf3ff;color:#1c51c6}
.saChoices button.selected i{background:#315fe6;color:#fff}
.saStandardGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.saStandardGrid button{display:grid;gap:4px}
.saStandardGrid button span{color:#708397;font-size:9px;font-weight:500}
.saCheck{display:flex;align-items:start;gap:11px;margin-top:18px;padding:15px;border:1px solid #d4dfe9;border-radius:10px;background:#f8fbfe}
.saCheck input{margin-top:3px}
.saCheck span{display:grid;gap:4px}
.saCheck small{color:#72859a}
.saRiskSummary{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;margin-bottom:20px;padding:20px;border-radius:13px;background:#07294f;color:#fff}
.saRiskSummary>div:first-child{display:grid;gap:7px}
.saRiskSummary span{color:#70dcd7;font-size:9px;font-weight:950;letter-spacing:.12em}
.saRiskSummary strong{font-size:18px}
.saRiskSummary small{color:#adc3d7}
.saRiskDial{display:grid;place-items:center;width:84px;height:84px;border:7px solid #315fe6;border-radius:50%}
.saRiskDial.red{border-color:#e34a41}
.saRiskDial.amber{border-color:#f0a21b}
.saRiskDial.green{border-color:#14aa78}
.saRiskDial strong{font-size:25px}
.saRiskDial span{font-size:8px;color:#b7cadc}
.saGrid.risk{grid-template-columns:repeat(5,1fr)}
.saScale{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
.saScale button{height:40px;border:1px solid #cedae5;background:#f7fafc;color:#3f5870;font-weight:900;cursor:pointer}
.saScale button:first-child{border-radius:7px 0 0 7px}
.saScale button:last-child{border-radius:0 7px 7px 0}
.saScale button.selected{border-color:#315fe6;background:#315fe6;color:#fff}
.saGrid.risk label>small{color:#8795a5;font-size:8px}
.saRule{display:flex;justify-content:space-between;gap:20px;margin-top:18px;padding:14px;border-left:4px solid #315fe6;background:#f0f5fc;font-size:11px}
.saProgress{position:relative;height:23px;margin-bottom:15px;overflow:hidden;border-radius:999px;background:#e7edf3}
.saProgress i{display:block;height:100%;background:linear-gradient(90deg,#315fe6,#13a77b)}
.saProgress span{position:absolute;inset:0;display:grid;place-items:center;font-size:9px;font-weight:950}
.saQuestions{display:grid;gap:10px;max-height:760px;overflow:auto;padding-right:5px}
.saQuestions article{padding:16px;border:1px solid #d7e1ea;border-radius:11px;background:#fff}
.saQuestions article.blocker{border-left:4px solid #db3a32}
.saQuestions header{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:11px;align-items:start}
.saQuestions header>b{display:grid;place-items:center;width:39px;height:39px;border-radius:9px;background:#e9f0ff;color:#315fe6;font-size:10px}
.saQuestions header div{display:grid;gap:5px}
.saQuestions header span{color:#315fe6;font-size:9px;font-weight:950;text-transform:uppercase}
.saQuestions header strong{font-size:12px;line-height:1.4}
.saQuestions header em{padding:5px 7px;border-radius:999px;background:#ffe5e2;color:#a72a23;font-size:8px;font-style:normal;font-weight:950}
.saResponses{display:flex;gap:5px;margin:12px 0}
.saResponses button{padding:7px 12px;border:1px solid #ccd8e3;border-radius:7px;background:#f7fafc;color:#4f657b;font-size:9px;font-weight:900;cursor:pointer}
.saResponses button.selected.yes{border-color:#0b9b6c;background:#e3f7ef;color:#08714f}
.saResponses button.selected.partial{border-color:#e3a122;background:#fff2d4;color:#855700}
.saResponses button.selected.no{border-color:#d94840;background:#ffe8e5;color:#a52b25}
.saResponses button.selected.na{border-color:#7890a8;background:#edf1f5}
.saQuestions article>small{display:block;margin-top:7px;color:#8a99a8;font-size:8px}
.saRegisterHead{display:flex;justify-content:space-between;gap:18px;align-items:end;margin:24px 0 11px}.saRegisterHead h3{margin:0 0 5px}.saRegisterHead p{margin:0;color:#708397;font-size:12px}.saRegisterHead>button{padding:10px 13px;border:1px solid #315fe6;border-radius:8px;background:#315fe6;color:#fff;font-weight:900;cursor:pointer}
.saManagedList{display:grid;gap:12px}.saManagedList>article{padding:16px;border:1px solid #cfdae5;border-radius:12px;background:#f9fbfd}.saManagedList>article>header{display:flex;justify-content:space-between;margin-bottom:13px}.saManagedList>article>header button{border:0;background:transparent;color:#b52f29;font-weight:850;cursor:pointer}.saManagedGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.saManagedGrid label{display:grid;gap:6px}.saManagedGrid label>span{color:#3d566f;font-size:11px;font-weight:900}.saManagedGrid input,.saManagedGrid textarea,.saManagedGrid select{width:100%;padding:11px;border:1px solid #c8d6e3;border-radius:8px;background:#fff;font:inherit}.saManagedGrid .wide{grid-column:1/-1}.saEmpty{margin:0;padding:17px;border:1px dashed #b9c9d8;border-radius:10px;color:#708397;text-align:center}
.saFileButton{position:relative;display:inline-grid!important;width:max-content;align-content:center}.saFileButton input{position:absolute!important;width:1px!important;height:1px!important;opacity:0}.saFileButton b{display:inline-flex;padding:9px 12px;border:1px solid #315fe6;border-radius:7px;background:#fff;color:#315fe6;cursor:pointer}.saDownload{align-self:end;padding:10px;color:#2059cd;font-weight:850}.saEvidenceFiles{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.saEvidenceFiles span{color:#607991;font-size:11px}.saEvidenceFiles a{padding:7px 9px;border-radius:7px;background:#edf3ff;color:#2059cd;text-decoration:none;font-size:11px;font-weight:800}
.saCertificateState{display:flex;min-height:42px;align-items:center;gap:8px;flex-wrap:wrap}.saCertificateState span{padding:8px 10px;border-radius:7px;background:#e7f8f1;color:#08734f;font-size:11px}.saCertificateState small{color:#7b8c9d}.saCertificateState .saDownload{padding:8px 10px;border-radius:7px;background:#edf3ff;text-decoration:none}
.saDecision{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:20px}
.saDecision article{display:grid;gap:4px;padding:16px;border:1px solid #d7e1ea;border-radius:11px;background:#f9fbfd}
.saDecision span{color:#5e7287;font-size:10px;font-weight:900}
.saDecision strong{font-size:24px}
.saDecision small{color:#8996a5}
.saPerformance{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.saPerformance label{position:relative;display:grid;gap:7px;padding:13px;border:1px solid #d7e1ea;border-radius:9px}
.saPerformance input{width:100%;padding:8px 30px 8px 9px;border:1px solid #cbd8e3;border-radius:7px}
.saPerformance label>b{position:absolute;right:22px;bottom:22px;color:#708397}
.saCocPreview{overflow:hidden;border:1px solid #cbd8e3;border-radius:13px;background:#f7f9fc}
.saCocPreview>header{padding:24px;background:#07294f;color:#fff}
.saCocPreview>header>span{color:#65ded9;font-size:9px;font-weight:950;letter-spacing:.12em}
.saCocPreview h3{margin:9px 0;font-size:22px}
.saCocPreview p{margin:0;color:#d0dfec;font-size:11px;line-height:1.6}
.saCocStandards{display:flex;gap:5px;flex-wrap:wrap;padding:13px 18px;border-bottom:1px solid #dae3eb}
.saCocPreview>article{display:grid;grid-template-columns:1fr auto;gap:4px 15px;padding:13px 18px;border-bottom:1px solid #e0e7ee}
.saCocPreview>article>b{font-size:11px}
.saCocPreview>article>span{color:#315fe6;font-size:8px;font-weight:900}
.saCocPreview>article>p{grid-column:1/-1;color:#64788b;font-size:9px}
.saCocPreview>article>small{grid-column:1/-1;color:#8b98a6;font-size:8px}
.saNotice{margin-top:14px;padding:14px;border-radius:9px;background:#fff3d8;color:#795300;font-size:11px;line-height:1.5}
.saActions{display:flex;justify-content:space-between;gap:15px;margin-top:25px;padding-top:18px;border-top:1px solid #e0e7ee}
.saActions>div{display:flex;gap:7px}
.saActions button,.saGenerate button{padding:11px 14px;border:1px solid #c8d5e2;border-radius:8px;background:#fff;color:#29445f;font:inherit;font-size:11px;font-weight:900;cursor:pointer}
.saActions button.primary,.saGenerate button{border-color:#315fe6;background:#315fe6;color:#fff}
.saActions button.outline{border-color:#315fe6;color:#315fe6}
.saActions button:disabled{opacity:.45;cursor:not-allowed}
.saGenerate{display:grid;grid-template-columns:1fr auto;gap:25px;align-items:center;margin-top:15px;padding:24px;border:1px solid #9db7dc;border-radius:15px;background:linear-gradient(120deg,#fff,#eef4ff)}
.saGenerate h2{margin:5px 0 7px}
.saGenerate p{margin:0;color:#64788e}
.saGenerate form{display:grid;gap:7px;text-align:center}
.saGenerate form small{color:#74869a;font-size:8px}
.saDocList{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
.saDocList a{display:grid;gap:3px;padding:9px;border:1px solid #cbd8e5;border-radius:8px;background:#fff;color:#183b5f;text-decoration:none;font-size:9px}
.saDocList a span{color:#76899c;text-transform:capitalize}
@media(max-width:1250px){
  .saHero{grid-template-columns:1fr}
  .saGrid.risk{grid-template-columns:1fr 1fr}
  .saChoices{grid-template-columns:repeat(3,1fr)}
  .saTabs{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:900px){
  .saShell{display:block}
  .saSide{position:static;height:auto;padding:16px 20px}
  .saSide nav,.saSide>small,.saSideFoot{display:none}
  .saBrand{display:block;margin:0}
  .saWork{padding:20px 14px 80px}
  .saTop>div:last-child{display:none}
  .saMetrics{grid-template-columns:1fr 1fr}
  .saGrid,.saStandardGrid,.saPerformance{grid-template-columns:1fr 1fr}
  .saManagedGrid{grid-template-columns:1fr}
  .saManagedGrid .wide{grid-column:auto}
  .saGenerate{grid-template-columns:1fr}
}
@media(max-width:600px){
  .saHero{padding:22px}
  .saHero h2{font-size:25px}
  .saMetrics,.saGrid,.saGrid.risk,.saChoices,.saStandardGrid,.saPerformance,.saDecision{grid-template-columns:1fr}
  .saTabs{display:flex;overflow:auto}
  .saTabs button{min-width:155px}
  .saPanel{padding:18px}
  .saSectionHead,.saActions{display:grid}
  .saActions>div{display:grid;grid-template-columns:1fr 1fr}
  .saActions>div:last-child{grid-template-columns:1fr}
  .saGrid .wide{grid-column:auto}
  .saRegisterHead{display:grid}.saRegisterHead>button{width:100%}
}`;
