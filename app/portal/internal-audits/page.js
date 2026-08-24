import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../lib/supabase/server";
import { createInternalAudit } from "./actions";

const statusLabel = {
  draft: "Draft",
  scope_review: "Scope review",
  team_assignment: "Team assignment",
  plan_review: "Plan review",
  scheduled: "Scheduled",
  notification_sent: "Notification sent",
  documents_requested: "Documents requested",
  fieldwork: "Fieldwork",
  team_review: "Team review",
  technical_review: "Technical review",
  closing_meeting: "Closing meeting",
  report_draft: "Report draft",
  report_approved: "Report approved",
  capa_monitoring: "CAPA monitoring",
  effectiveness_review: "Effectiveness review",
  closed: "Closed",
  cancelled: "Cancelled",
};

const typeLabel = {
  internal_system: "Internal system audit",
  internal_process: "Internal process audit",
  internal_compliance: "Internal compliance audit",
  supplier: "Supplier audit",
  second_party: "Second-party audit",
  follow_up: "Follow-up audit",
  integrated: "Integrated audit",
};

function formatDate(value) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d8e0ea",
        borderRadius: "18px",
        padding: "24px",
      }}
    >
      <div
        style={{
          color: "#607089",
          fontSize: "13px",
          fontWeight: 800,
          letterSpacing: ".04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#061a35",
          fontSize: "38px",
          fontWeight: 800,
          marginTop: "8px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function InternalAuditCommandCentre({
  searchParams,
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login?next=/portal/internal-audits"
    );
  }

  const [
    organizationsResult,
    standardsResult,
    auditsResult,
    findingsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("name"),
    supabase
      .from("internal_audit_standard_catalogue")
      .select("id, display_name, discipline, standard_code")
      .eq("active", true)
      .neq("standard_code", "ISO 19011")
      .order("display_name"),
    supabase
      .from("internal_audits")
      .select(`
        id,
        audit_reference,
        title,
        audit_type,
        audit_method,
        status,
        current_gate,
        organization_id,
        planned_start_at,
        planned_end_at,
        updated_at,
        internal_audit_selected_standards (
          internal_audit_standard_catalogue (
            display_name
          )
        )
      `)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("internal_audit_findings")
      .select("id, status, finding_type")
      .eq("owner_id", user.id)
      .neq("status", "closed")
      .neq("status", "withdrawn"),
  ]);

  if (organizationsResult.error) {
    throw new Error(organizationsResult.error.message);
  }

  if (standardsResult.error) {
    throw new Error(standardsResult.error.message);
  }

  if (auditsResult.error) {
    throw new Error(auditsResult.error.message);
  }

  if (findingsResult.error) {
    throw new Error(findingsResult.error.message);
  }

  const organizations = organizationsResult.data ?? [];
  const standards = standardsResult.data ?? [];
  const audits = auditsResult.data ?? [];
  const openFindings = findingsResult.data ?? [];

  const activeAudits = audits.filter(
    (audit) =>
      !["closed", "cancelled"].includes(audit.status)
  ).length;
  const scheduledAudits = audits.filter((audit) =>
    [
      "scheduled",
      "notification_sent",
      "documents_requested",
    ].includes(audit.status)
  ).length;
  const fieldworkAudits = audits.filter((audit) =>
    ["fieldwork", "team_review", "technical_review"].includes(
      audit.status
    )
  ).length;

  return (
    <main
      style={{
        background: "#f3f6fa",
        minHeight: "100vh",
        padding: "36px 4vw 80px",
      }}
    >
      <div style={{ maxWidth: "1560px", margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "24px",
            flexWrap: "wrap",
            marginBottom: "30px",
          }}
        >
          <div>
            <Link href="/portal" aria-label="RPG Excellence portal">
              <Image
                src="/rpg-excellence-logo.png"
                alt="RPG Excellence"
                width={250}
                height={68}
                style={{ objectFit: "contain", objectPosition: "left" }}
                priority
              />
            </Link>
            <div
              style={{
                color: "#1459d9",
                fontWeight: 800,
                letterSpacing: ".08em",
                marginTop: "24px",
                textTransform: "uppercase",
              }}
            >
              RPG Audit Intelligence
            </div>
            <h1
              style={{
                color: "#061a35",
                fontSize: "clamp(38px, 5vw, 68px)",
                lineHeight: 1.02,
                margin: "12px 0 16px",
              }}
            >
              Internal Audit Command Centre
            </h1>
            <p
              style={{
                color: "#536984",
                fontSize: "20px",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: "900px",
              }}
            >
              Plan, conduct and close evidence-led audits through an
              ISO 19011:2026-aligned, risk-based workflow.
            </p>
          </div>

          <Link href="/portal" className="button buttonGhost">
            ← Customer Portal
          </Link>
        </header>

        {params?.created ? (
          <div
            style={{
              background: "#e8f7ef",
              border: "1px solid #a9dfc1",
              borderRadius: "14px",
              color: "#075d36",
              fontWeight: 700,
              marginBottom: "22px",
              padding: "16px 20px",
            }}
          >
            Audit created successfully. The detailed scope workspace is
            the next controlled deployment.
          </div>
        ) : null}

        <section
          style={{
            background: "#061c39",
            borderRadius: "28px",
            color: "white",
            display: "grid",
            gap: "26px",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(220px, .4fr)",
            marginBottom: "28px",
            padding: "36px 40px",
          }}
        >
          <div>
            <div
              style={{
                color: "#9db7dc",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              ISO 19011:2026 audit governance
            </div>
            <h2 style={{ fontSize: "32px", margin: "12px 0" }}>
              Independent. Evidence-based. Risk-focused.
            </h2>
            <p
              style={{
                color: "#d7e3f4",
                fontSize: "17px",
                lineHeight: 1.65,
                margin: 0,
                maxWidth: "920px",
              }}
            >
              Scope approval, auditor competence, independence,
              objective evidence, representative sampling, technical
              review and accountable closure are controlled throughout
              the audit lifecycle.
            </p>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: "54px",
              fontWeight: 900,
              justifyContent: "flex-end",
            }}
          >
            19011
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            marginBottom: "28px",
          }}
        >
          <StatCard label="Active audits" value={activeAudits} />
          <StatCard label="Scheduled" value={scheduledAudits} />
          <StatCard label="In fieldwork" value={fieldworkAudits} />
          <StatCard label="Open findings" value={openFindings.length} />
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #d8e0ea",
            borderRadius: "22px",
            marginBottom: "28px",
            padding: "30px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              alignItems: "end",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <div>
              <div className="kicker">New audit</div>
              <h2 style={{ color: "#061a35", margin: "8px 0" }}>
                Define the initial audit scope
              </h2>
              <p style={{ color: "#607089", margin: 0 }}>
                Select one standard or combine standards in a single
                integrated audit.
              </p>
            </div>
          </div>

          {organizations.length === 0 ? (
            <div
              style={{
                background: "#fff7e6",
                border: "1px solid #efd18c",
                borderRadius: "14px",
                padding: "18px",
              }}
            >
              Create an organisation in the Customer Portal before
              starting an internal audit.
            </div>
          ) : (
            <form action={createInternalAudit}>
              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <label>
                  <strong>Organisation</strong>
                  <select name="organization_id" required defaultValue="">
                    <option value="" disabled>
                      Select organisation
                    </option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <strong>Audit title</strong>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Integrated UK Operations Audit"
                  />
                </label>

                <label>
                  <strong>Audit type</strong>
                  <select name="audit_type" defaultValue="internal_system">
                    {Object.entries(typeLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <strong>Audit method</strong>
                  <select name="audit_method" defaultValue="onsite">
                    <option value="onsite">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>

                <label>
                  <strong>Planned start</strong>
                  <input name="planned_start_at" type="datetime-local" required />
                </label>

                <label>
                  <strong>Planned end</strong>
                  <input name="planned_end_at" type="datetime-local" required />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  marginTop: "16px",
                }}
              >
                <label>
                  <strong>Audit purpose</strong>
                  <textarea
                    name="purpose"
                    required
                    rows="4"
                    placeholder="Why is the audit being conducted and what assurance is required?"
                  />
                </label>

                <label>
                  <strong>Initial scope</strong>
                  <textarea
                    name="scope_statement"
                    required
                    rows="4"
                    placeholder="Define the processes, functions, locations and boundaries included."
                  />
                </label>

                <label>
                  <strong>Objectives</strong>
                  <textarea
                    name="objectives"
                    rows="3"
                    placeholder="What must this audit determine?"
                  />
                </label>

                <label>
                  <strong>Known risks and changes</strong>
                  <textarea
                    name="known_risks_changes"
                    rows="3"
                    placeholder="Significant change, poor performance, incidents, complaints or recurring findings."
                  />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  marginTop: "16px",
                }}
              >
                <label>
                  <strong>Sites</strong>
                  <input name="sites" placeholder="Sites or locations" />
                </label>
                <label>
                  <strong>Departments</strong>
                  <input name="departments" placeholder="Functions or departments" />
                </label>
                <label>
                  <strong>Processes</strong>
                  <input name="processes" placeholder="Processes in scope" />
                </label>
                <label>
                  <strong>Auditee contact</strong>
                  <input
                    name="auditee_contact_name"
                    placeholder="Primary auditee contact"
                  />
                </label>
                <label>
                  <strong>Auditee email</strong>
                  <input
                    name="auditee_contact_email"
                    type="email"
                    placeholder="name@example.com"
                  />
                </label>
              </div>

              <fieldset
                style={{
                  border: "1px solid #d8e0ea",
                  borderRadius: "16px",
                  margin: "22px 0",
                  padding: "20px",
                }}
              >
                <legend style={{ fontWeight: 800, padding: "0 8px" }}>
                  Audit standards and criteria
                </legend>
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {standards.map((standard) => (
                    <label
                      key={standard.id}
                      style={{
                        alignItems: "flex-start",
                        background: "#f5f8fc",
                        border: "1px solid #dfe6ee",
                        borderRadius: "12px",
                        cursor: "pointer",
                        display: "flex",
                        gap: "12px",
                        padding: "14px",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="standard_ids"
                        value={standard.id}
                        style={{ width: "18px", height: "18px" }}
                      />
                      <span>
                        <strong style={{ display: "block" }}>
                          {standard.display_name}
                        </strong>
                        <span style={{ color: "#607089", fontSize: "14px" }}>
                          {standard.discipline}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className="button">
                Create Audit and Continue Scope Review
              </button>
            </form>
          )}
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #d8e0ea",
            borderRadius: "22px",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "28px 30px 18px" }}>
            <div className="kicker">Audit portfolio</div>
            <h2 style={{ color: "#061a35", margin: "8px 0" }}>
              Recent audits
            </h2>
          </div>

          {audits.length === 0 ? (
            <div
              style={{
                borderTop: "1px solid #e3e9f0",
                color: "#607089",
                padding: "32px",
              }}
            >
              No internal audits have been created yet.
            </div>
          ) : (
            audits.map((audit) => {
              const selectedStandards = (
                audit.internal_audit_selected_standards ?? []
              )
                .map(
                  (row) =>
                    row.internal_audit_standard_catalogue?.display_name
                )
                .filter(Boolean);

              return (
                <article
                  key={audit.id}
                  style={{
                    alignItems: "center",
                    borderTop: "1px solid #e3e9f0",
                    display: "grid",
                    gap: "18px",
                    gridTemplateColumns:
                      "minmax(260px, 1.6fr) minmax(180px, 1fr) minmax(150px, .7fr) minmax(160px, .7fr)",
                    padding: "22px 30px",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color: "#061a35",
                        display: "block",
                        fontSize: "18px",
                      }}
                    >
                      {audit.audit_reference} · {audit.title}
                    </strong>
                    <span style={{ color: "#607089" }}>
                      {typeLabel[audit.audit_type] ?? audit.audit_type} ·{" "}
                      {audit.audit_method}
                    </span>
                  </div>
                  <div style={{ color: "#3e536e" }}>
                    {selectedStandards.join(" · ") || "Criteria pending"}
                  </div>
                  <div>
                    <strong style={{ display: "block", color: "#061a35" }}>
                      {statusLabel[audit.status] ?? audit.status}
                    </strong>
                    <span style={{ color: "#607089", fontSize: "14px" }}>
                      Gate: {audit.current_gate}
                    </span>
                  </div>
                  <div style={{ color: "#3e536e" }}>
                    {formatDate(audit.planned_start_at)}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
