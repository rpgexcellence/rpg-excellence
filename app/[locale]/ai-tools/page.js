import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "RPG Excellence Platform | Assess, Audit, Control and Improve",
  description:
    "Explore RPG Excellence assessment, health and safety, internal audit, RCA–8D and practitioner training products.",
};

const solutionHubs = [
  {
    title: "Assessment & Gap Analysis",
    description:
      "Run evidence-led ISO readiness assessments, record findings and manage improvement through a controlled portfolio.",
    status: "Four standards available",
    href: "/portal",
    action: "Open assessments",
  },
  {
    title: "Health & Safety Hub",
    description:
      "Create and control workplace risk assessments, use the interactive 5×5 matrix, manage actions and build assessor competence.",
    status: "Operational hub + training",
    href: "/hs-hub",
    action: "Explore H&S Hub",
  },
  {
    title: "Internal Audit Hub",
    description:
      "Plan programmes, conduct evidence-led audits, control findings and verify corrective-action effectiveness.",
    status: "Audit workflow + refresher",
    href: "/internal-audit",
    action: "Explore Internal Audit",
  },
  {
    title: "RCA–8D Hub",
    description:
      "Lead D1–D8 investigations from problem definition and containment through verified causes, actions and closure.",
    status: "RCA workspace + practitioner course",
    href: "/capa-8d",
    action: "Explore RCA–8D",
  },
];

const academyProducts = [
  ["Risk Assessment Training", "£19.99", "Interactive initial training with practical scenarios and certificate.", "/hs-hub/training"],
  ["Risk Assessment Refresher", "£12.99", "Focused competence refresher with assessment and certificate.", "/hs-hub/training"],
  ["Internal Auditor Refresher", "£19.99", "Evidence-led audit judgement, findings and follow-up practice.", "/internal-audit-training"],
  ["RCA & Corrective Action Practitioner", "£49.99", "180-minute structured course, completed workbook and verifiable certificate.", "/rca-8d-training"],
];

const assessmentModules = [
  {
    title: "ISO 9001 Gap Analysis",
    standard: "ISO 9001:2015/Amd 1:2024",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO 14001 Gap Analysis",
    standard: "ISO 14001:2026",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO 45001 Gap Analysis",
    standard: "ISO 45001:2018",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO/IEC 17024 Gap Analysis",
    standard: "ISO/IEC 17024:2026",
    status: "Available now",
    href: "/portal",
  },
];

const supportingDocumentPacks = [
  {
    standard: "ISO 9001:2015/Amd 1:2024",
    system: "Quality Management System",
    shortCode: "QMS",
    documents: [
      {
        code: "RPG-QMS-PRO-001",
        title: "Readiness Assessment Procedure",
        href: "/documents/iso-9001/RPG-QMS-PRO-001_ISO_9001-2015_Amd1-2024_Readiness_Assessment_Procedure.docx",
      },
      {
        code: "RPG-QMS-FRM-001",
        title: "Evidence Sampling Worksheet",
        href: "/documents/iso-9001/RPG-QMS-FRM-001_Evidence_Sampling_Worksheet.docx",
      },
      {
        code: "RPG-QMS-FRM-002",
        title: "Finding and Corrective Action Record",
        href: "/documents/iso-9001/RPG-QMS-FRM-002_Finding_and_Corrective_Action_Record.docx",
      },
      {
        code: "RPG-QMS-FRM-003",
        title: "Management Action Plan",
        href: "/documents/iso-9001/RPG-QMS-FRM-003_Management_Action_Plan.docx",
      },
      {
        code: "RPG-QMS-FRM-004",
        title: "Management Readiness Assessment",
        href: "/documents/iso-9001/RPG-QMS-FRM-004_Management_Readiness_Assessment.docx",
      },
      {
        code: "RPG-QMS-SCR-001",
        title: "Opening Meeting Script",
        href: "/documents/iso-9001/RPG-QMS-SCR-001_Opening_Meeting_Script.docx",
      },
      {
        code: "RPG-QMS-SCR-002",
        title: "Closing Meeting Script",
        href: "/documents/iso-9001/RPG-QMS-SCR-002_Closing_Meeting_Script.docx",
      },
      {
        code: "RPG-QMS-RPT-001",
        title: "Executive Summary Template",
        href: "/documents/iso-9001/RPG-QMS-RPT-001_Executive_Summary_Template.docx",
      },
      {
        code: "RPG-QMS-FRM-005",
        title: "Certification Readiness Decision Guide",
        href: "/documents/iso-9001/RPG-QMS-FRM-005_Certification_Readiness_Decision_Guide.docx",
      },
    ],
  },
  {
    standard: "ISO 45001:2018",
    system: "Occupational Health & Safety Management System",
    shortCode: "OHSMS",
    documents: [
      {
        code: "RPG-OHSMS-PRO-001",
        title: "Readiness Assessment Procedure",
        href: "/documents/iso-45001/RPG-OHSMS-PRO-001_ISO_45001-2018_Readiness_Assessment_Procedure.docx",
      },
      {
        code: "RPG-OHSMS-FRM-001",
        title: "Evidence Sampling Worksheet",
        href: "/documents/iso-45001/RPG-OHSMS-FRM-001_Evidence_Sampling_Worksheet.docx",
      },
      {
        code: "RPG-OHSMS-FRM-002",
        title: "Finding and Corrective Action Record",
        href: "/documents/iso-45001/RPG-OHSMS-FRM-002_Finding_and_Corrective_Action_Record.docx",
      },
      {
        code: "RPG-OHSMS-FRM-003",
        title: "Management Action Plan",
        href: "/documents/iso-45001/RPG-OHSMS-FRM-003_Management_Action_Plan.docx",
      },
      {
        code: "RPG-OHSMS-FRM-004",
        title: "Management Readiness Assessment",
        href: "/documents/iso-45001/RPG-OHSMS-FRM-004_Management_Readiness_Assessment.docx",
      },
      {
        code: "RPG-OHSMS-SCR-001",
        title: "Opening Meeting Script",
        href: "/documents/iso-45001/RPG-OHSMS-SCR-001_Opening_Meeting_Script.docx",
      },
      {
        code: "RPG-OHSMS-SCR-002",
        title: "Closing Meeting Script",
        href: "/documents/iso-45001/RPG-OHSMS-SCR-002_Closing_Meeting_Script.docx",
      },
      {
        code: "RPG-OHSMS-RPT-001",
        title: "Executive Summary Template",
        href: "/documents/iso-45001/RPG-OHSMS-RPT-001_Executive_Summary_Template.docx",
      },
      {
        code: "RPG-OHSMS-FRM-005",
        title: "Certification Readiness Decision Guide",
        href: "/documents/iso-45001/RPG-OHSMS-FRM-005_Certification_Readiness_Decision_Guide.docx",
      },
    ],
  },
];

const plannedModules = [
  {
    title: "Business Continuity Planner",
    status: "Product roadmap",
  },
  {
    title: "ISO 27001 Risk Register",
    status: "Product roadmap",
  },
];

const sectionStyle = {
  marginTop: "48px",
};

const packGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "24px",
};

const packStyle = {
  background: "#ffffff",
  border: "1px solid #d8e0ea",
  borderRadius: "22px",
  padding: "28px",
};

const documentListStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "22px",
};

const documentLinkStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "center",
  padding: "14px 16px",
  background: "#f4f7fb",
  border: "1px solid #dfe6ef",
  borderRadius: "12px",
  color: "#071a33",
  textDecoration: "none",
};

export default async function AiTools({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage aiPage">
        <div className="simpleInner">
          <span className="kicker">
            RPG EXCELLENCE ASSURANCE PLATFORM
          </span>

          <h1>
            Assess. Audit. Control.
            Train. Improve.
          </h1>

          <p className="lead">
            Connected specialist hubs turn management-system requirements,
            workplace risks, audit evidence and recurring problems into
            controlled action—with practical training built into the platform.
          </p>

          <h2>Choose your operational hub</h2>

          <div className="toolGrid">
            {solutionHubs.map(({ title, description, status, href, action }) => (
              <Link
                className="toolCard toolCardLink"
                href={href.startsWith("/portal") ? href : `/${locale}${href}`}
                key={title}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <span className="toolIcon">◈</span>
                <strong>{title}</strong>
                <span>{description}</span>
                <span>{status}</span>
                <span aria-hidden="true">{action} →</span>
              </Link>
            ))}
          </div>

          <h2 style={sectionStyle}>Available ISO gap assessments</h2>

          <div className="toolGrid">
            {assessmentModules.map(
              ({
                title,
                standard,
                status,
                href,
              }) => (
                <Link
                  className="toolCard toolCardLink"
                  href={`/${locale}${href}`}
                  key={standard}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                  aria-label={`Open ${standard} assessment`}
                >
                  <span className="toolIcon">
                    ◈
                  </span>

                  <strong>{title}</strong>

                  <span>{standard}</span>

                  <span>{status}</span>

                  <span aria-hidden="true">
                    Start assessment →
                  </span>
                </Link>
              )
            )}
          </div>

          <section style={sectionStyle}>
            <span className="kicker">RPG TRAINING ACADEMY</span>
            <h2>Practical training with retained evidence</h2>
            <p className="lead">
              Individual courses combine interactive exercises, guided
              feedback, a final assessment and a verifiable certificate.
            </p>
            <div className="toolGrid">
              {academyProducts.map(([title, price, description, href]) => (
                <Link
                  className="toolCard toolCardLink"
                  href={href}
                  key={title}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <span className="toolIcon">◇</span>
                  <strong>{title}</strong>
                  <span>{description}</span>
                  <span>{price} per learner</span>
                  <span aria-hidden="true">View course →</span>
                </Link>
              ))}
            </div>
          </section>

          <section
            id="supporting-documents"
            style={sectionStyle}
          >
            <span className="kicker">
              Controlled resources
            </span>

            <h2>Supporting assessment documents</h2>

            <p className="lead">
              Download practical, editable Word
              templates for planning assessments,
              sampling evidence, recording findings,
              managing actions and reporting readiness.
            </p>

            <div style={packGridStyle}>
              {supportingDocumentPacks.map(
                ({
                  standard,
                  system,
                  shortCode,
                  documents,
                }) => (
                  <article
                    key={standard}
                    style={packStyle}
                  >
                    <span className="kicker">
                      {shortCode} document pack
                    </span>

                    <h3
                      style={{
                        marginBottom: "6px",
                      }}
                    >
                      {standard}
                    </h3>

                    <p>{system}</p>

                    <div style={documentListStyle}>
                      {documents.map(
                        ({ code, title, href }) => (
                          <a
                            href={href}
                            key={code}
                            download
                            style={documentLinkStyle}
                            aria-label={`Download ${code} ${title} as a Word document`}
                          >
                            <span>
                              <small
                                style={{
                                  display: "block",
                                  color: "#526783",
                                  marginBottom: "3px",
                                }}
                              >
                                {code}
                              </small>

                              <strong>{title}</strong>
                            </span>

                            <span
                              aria-hidden="true"
                              style={{
                                color: "#1f5eea",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Word ↓
                            </span>
                          </a>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </div>

            <div className="notice">
              These templates support structured
              readiness assessment and improvement.
              They do not constitute certification,
              legal advice or an accredited audit.
            </div>
          </section>

          <h2>Product roadmap</h2>

          <div className="toolGrid">
            {plannedModules.map(
              ({ title, status }) => (
                <div
                  className="toolCard"
                  key={title}
                >
                  <span className="toolIcon">
                    ◈
                  </span>

                  <strong>{title}</strong>

                  <span>{status}</span>
                </div>
              )
            )}
          </div>

          <div className="notice">
            RPG Intelligence supports structured
            assessment and decision-making. Its
            outputs do not replace competent-person
            judgement, professional advice or a
            site-specific legal review.
          </div>
        </div>
      </main>
    </PageShell>
  );
}
