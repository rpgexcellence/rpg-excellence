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
  "Standards & scope",
  "Risk engine",
  "Due diligence",
  "Approval & monitoring",
  "Code of Conduct",
];

const n = (value, fallback = 3) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const displayDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Not recorded";

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

  const active = initial || null;

  const riskTone =
    result.riskBand === "Critical"
      ? "red"
      : result.riskBand === "High"
        ? "amber"
        : result.riskBand === "Medium"
          ? "blue"
          : "green";

  const approvalStatus = String(active?.approval_status || "draft");
  const approvalExpired = Boolean(
    active?.approval_expiry &&
      new Date(active.approval_expiry).getTime() < Date.now(),
  );
  const statusLabels = {
    draft: "Draft",
    pending_approval: "Pending approval",
    conditionally_approved: "Conditionally approved",
    approved: "Approved",
    suspended: "Suspended",
    rejected: "Rejected",
    expired: "Expired",
  };
  const statusLabel = approvalExpired
    ? "Approval expired"
    : statusLabels[approvalStatus] || approvalStatus.replaceAll("_", " ");
  const statusTone =
    approvalExpired || ["suspended", "rejected", "expired"].includes(approvalStatus)
      ? "red"
      : approvalStatus === "approved"
        ? "green"
        : approvalStatus === "conditionally_approved" || approvalStatus === "pending_approval"
          ? "amber"
          : "blue";

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
  .saApprovalStatus{display:grid;grid-template-columns:minmax(230px,.72fr) minmax(0,1.7fr) auto;gap:18px;align-items:center;margin-top:12px;padding:18px 20px;border:1px solid #9fbce0;border-left:7px solid #315fe6;border-radius:14px;background:#f4f8ff;box-shadow:0 8px 24px rgba(18,57,95,.08)}
  .saApprovalStatus.green{border-color:#9bd8bd;border-left-color:#07945d;background:#edfbf4}.saApprovalStatus.amber{border-color:#efc688;border-left-color:#dd8500;background:#fff8e9}.saApprovalStatus.red{border-color:#eba69f;border-left-color:#cf3c30;background:#fff1ef}
  .saApprovalIdentity>span{display:block;color:#607991;font-size:10px;font-weight:950;letter-spacing:.12em}.saApprovalIdentity>strong{display:block;margin-top:4px;font-size:25px;line-height:1.15}.saApprovalIdentity>small{display:block;margin-top:4px;color:#61788e;font-size:11px}
  .saApprovalFacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.saApprovalFacts div{min-width:0;padding:10px;border-radius:9px;background:rgba(255,255,255,.78)}.saApprovalFacts span,.saApprovalFacts b{display:block}.saApprovalFacts span{color:#698096;font-size:9px;text-transform:uppercase}.saApprovalFacts b{margin-top:4px;overflow-wrap:anywhere;font-size:11px}
  .saApprovalStatus>button{min-height:42px;padding:0 14px;border:1px solid #315fe6;border-radius:8px;background:#fff;color:#2059cd;font-weight:900;cursor:pointer}.saApprovalConditions{grid-column:1/-1;margin:0;padding-top:11px;border-top:1px solid rgba(70,103,133,.17);color:#526d84;font-size:12px}.saApprovalConditions b{color:#183b5b}
  @media(max-width:600px){
    .saCocPreview>header{padding:22px}
    .saCocPreview>article{grid-template-columns:1fr;padding:18px}
    .saApprovalStatus{grid-template-columns:1fr}.saApprovalFacts{grid-template-columns:1fr 1fr}.saApprovalStatus>button{width:100%}
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
              href="/portal/suppliers"
              className={!active ? "active" : ""}
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
                {active
                  ? active.legal_name
                  : "Create supplier assurance record"}
              </h1>
              <p>
                {active
                  ? `${active.supplier_reference} · ${statusLabel}`
                  : "Classify once, then let the engine apply the right controls."}
              </p>
            </div>

            <div>
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

          {active && (
            <section
              className={`saApprovalStatus ${statusTone}`}
              aria-label="Controlled supplier approval status"
            >
              <div className="saApprovalIdentity">
                <span>CONTROLLED SUPPLIER STATUS</span>
                <strong>{statusLabel}</strong>
                <small>{active.supplier_reference}</small>
              </div>

              <div className="saApprovalFacts">
                <div><span>Decision date</span><b>{displayDate(active.approved_at)}</b></div>
                <div><span>Approved by</span><b>{active.approved_by || "Not recorded"}</b></div>
                <div><span>Next review</span><b>{displayDate(active.next_review_date)}</b></div>
                <div><span>Approval expiry</span><b>{displayDate(active.approval_expiry)}</b></div>
              </div>

              <button type="button" onClick={() => setStep(4)}>
                Review decision →
              </button>

              {(active.approval_scope || active.approval_conditions || result.blockers.length > 0) && (
                <p className="saApprovalConditions">
                  {active.approval_scope && <><b>Approved scope:</b> {active.approval_scope} </>}
                  {active.approval_conditions && <><b>Conditions:</b> {active.approval_conditions} </>}
                  {result.blockers.length > 0 && <><b>Current blockers:</b> {result.blockers.length}</>}
                </p>
              )}
            </section>
          )}

          <section className="saMetrics">
            <Metric
              label="Supplier portfolio"
              value={suppliers.length}
              detail="Controlled supplier records"
            />
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
          </section>

          {(saved || state?.error) && (
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

          <div className="saTabs" role="tablist">
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
          </div>

          <form action={formAction} className="saPanel">
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

            {step !== 0 &&
              [
                "legal_name",
                "trading_name",
                "registered_address",
                "country",
                "company_number",
                "website",
                "primary_contact_name",
                "primary_contact_title",
                "primary_contact_email",
                "primary_contact_phone",
                "supply_description",
                "sites_and_scope",
              ].map((key) => (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={data[key]}
                />
              ))}

            {step !== 1 && data.uses_subtier_suppliers && (
              <input
                type="hidden"
                name="uses_subtier_suppliers"
                value="on"
              />
            )}

            {step !== 2 && (
              <input
                type="hidden"
                name="criticality"
                value={data.criticality}
              />
            )}

            {step !== 4 &&
              [
                "approval_scope",
                "approval_conditions",
                "approved_by",
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
                      Capture the legal entity, contact and exact
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
                    label="Primary contact"
                    name="primary_contact_name"
                    value={data.primary_contact_name}
                    onChange={(value) =>
                      update("primary_contact_name", value)
                    }
                  />
                  <Field
                    label="Contact title"
                    name="primary_contact_title"
                    value={data.primary_contact_title}
                    onChange={(value) =>
                      update("primary_contact_title", value)
                    }
                  />
                  <Field
                    label="Contact email"
                    name="primary_contact_email"
                    value={data.primary_contact_email}
                    onChange={(value) =>
                      update("primary_contact_email", value)
                    }
                    type="email"
                  />
                  <Field
                    label="Contact phone"
                    name="primary_contact_phone"
                    value={data.primary_contact_phone}
                    onChange={(value) =>
                      update("primary_contact_phone", value)
                    }
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
                  <Field
                    label="Approved sites and operational scope"
                    name="sites_and_scope"
                    value={data.sites_and_scope}
                    onChange={(value) =>
                      update("sites_and_scope", value)
                    }
                    area
                    rows="3"
                    className="wide"
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 2</small>
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
              </>
            )}

            {step === 2 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 3</small>
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

            {step === 3 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 4</small>
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

            {step === 4 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 5</small>
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
                  <Field
                    label="Competent approver"
                    name="approved_by"
                    value={data.approved_by}
                    onChange={(value) =>
                      update("approved_by", value)
                    }
                  />
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

            {step === 5 && (
              <>
                <div className="saSectionHead">
                  <div>
                    <small>STEP 6</small>
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
          </form>

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
.saMessage{margin-top:13px;padding:12px 15px;border-radius:9px;font-weight:800}
.saMessage.success{background:#e7f8f1;color:#08734f}
.saMessage.error{background:#ffe9e6;color:#a72822}
.saTabs{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:20px}
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
}`;
