import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "RPG Excellence Platform & Resources | Connected Assurance",
  description:
    "Explore RPG Excellence assessments, operational hubs, specialist workspaces, practitioner training and controlled assurance resources.",
  alternates: { canonical: "/en/ai-tools" },
};

const solutionHubs = [
  {
    title: "Assessment & Gap Analysis",
    description:
      "Run evidence-led ISO readiness assessments, record findings and manage improvement through a controlled portfolio.",
    status: "Multi-standard assessment portfolio",
    href: "/portal",
    action: "Open assessments",
  },
  {
    title: "Health & Safety Hub",
    description:
      "Create and control workplace risk assessments, use the interactive 5×5 matrix, manage actions and build assessor competence.",
    status: "Operational hub and training",
    href: "/hs-hub",
    action: "Explore H&S Hub",
  },
  {
    title: "Internal Audit Hub",
    description:
      "Plan programmes, conduct evidence-led audits, control findings and verify corrective-action effectiveness.",
    status: "Audit workflow and refresher",
    href: "/internal-audit",
    action: "Explore Internal Audit",
  },
  {
    title: "RCA–8D Hub",
    description:
      "Lead D1–D8 investigations from problem definition and containment through verified causes, actions and closure.",
    status: "RCA workspace and practitioner course",
    href: "/capa-8d",
    action: "Explore RCA–8D",
  },
  {
    title: "Business Continuity Hub",
    description:
      "Connect site profile, context, hazards, BIA, dependencies, continuity plans, exercising and improvement.",
    status: "ISO 22301 connected workflow",
    href: "/business-continuity",
    action: "Explore BCP Hub",
  },
  {
    title: "Information Security Hub",
    description:
      "Connect ISO 27001 gap assessment, information-security risk and Statement of Applicability decisions.",
    status: "Risk and control assurance",
    href: "/information-security",
    action: "Explore ISMS Hub",
  },
];

const assessmentModules = [
  {
    title: "ISO 9001 Gap Analysis",
    standard: "ISO 9001:2015/Amd 1:2024",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO 9001:2026 Gap Analysis",
    standard: "ISO 9001:2026 transition readiness",
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
    title: "ISO/IEC 27001 Gap Analysis",
    standard: "ISO/IEC 27001:2022/Amd 1:2024",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO 22301 Gap Analysis",
    standard: "ISO 22301:2019",
    status: "Available now",
    href: "/portal",
  },
];

const operationalCapabilities = [
  {
    area: "ASSESSMENT CONTROL",
    title: "Gap Analysis & Readiness",
    features: [
      "Multi-standard assessment portfolio",
      "Clause-level scoring, guidance and evidence",
      "Findings and corrective-action workflow",
      "Management boards and executive reports",
    ],
    href: "/portal/history?view=management-board",
  },
  {
    area: "HEALTH & SAFETY",
    title: "Operational Risk Control",
    features: [
      "Workplace risk-assessment workflow",
      "Interactive initial and residual risk matrix",
      "Permit, POWRA and management-of-change control",
      "Owned actions, verification and review",
    ],
    href: "/portal/health-safety",
  },
  {
    area: "INTERNAL AUDIT",
    title: "Audit Assurance",
    features: [
      "Risk-based multi-standard audit programmes",
      "Controlled fieldwork and objective evidence",
      "Auditor approval and competence verification",
      "NC register and management visibility",
    ],
    href: "/portal/internal-audits",
  },
  {
    area: "RCA–8D",
    title: "Corrective Action",
    features: [
      "Controlled D1–D8 investigation gates",
      "Containment, causal paths and structured 5 Why",
      "Action implementation and extent review",
      "Independent effectiveness verification",
    ],
    href: "/portal/rca",
  },
];

const academyProducts = [
  {
    title: "Risk Assessment Training",
    price: "£19.99",
    description:
      "Interactive initial training with practical scenarios, assessment and certificate.",
    href: "/hs-hub/training",
  },
  {
    title: "Risk Assessment Refresher",
    price: "£12.99",
    description:
      "Focused competence refresher with assessment and certificate.",
    href: "/hs-hub/training",
  },
  {
    title: "Internal Auditor Refresher",
    price: "£19.99",
    description:
      "Evidence-led audit judgement, findings and follow-up practice.",
    href: "/internal-audit-training",
  },
  {
    title: "RCA & Corrective Action Practitioner",
    price: "£49.99",
    description:
      "Structured RCA–8D course, completed workbook and verifiable certificate.",
    href: "/rca-8d-training",
  },
];

const specialistWorkspaces = [
  {
    title: "ISO/IEC 27001 Statement of Applicability",
    description:
      "A dedicated workspace for all 93 Annex A controls, applicability decisions, implementation status, residual risk and executive reporting.",
    access: "Available independently or through applicable packages",
    href: "/portal/soa",
  },
  {
    title: "Controlled Evidence Library",
    description:
      "Organise documents and evidence by assessment, audit, CAPA and operational workflow.",
    access: "Controlled through organisation access rights",
    href: "/portal/documents",
  },
  {
    title: "Management Reporting",
    description:
      "Bring readiness, audits, findings, actions and verification into management-level registers and downloadable reports.",
    access: "Live portfolio intelligence",
    href: "/portal/reports",
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

const styles = `
.platformPage {
  background:
    radial-gradient(circle at 90% 0%, #dcecff 0, transparent 28%),
    #f4f8fc;
  color: #071d3a;
}

.platformHero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(350px, 0.75fr);
  gap: 45px;
  align-items: center;
  padding: 78px 5vw 66px;
  background: linear-gradient(120deg, #061d3b, #0d3e70);
  color: #fff;
}

.platformKicker {
  display: block;
  color: #56dfd2;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.17em;
}

.platformHero h1 {
  max-width: 900px;
  margin: 14px 0 22px;
  font-size: clamp(46px, 5.5vw, 76px);
  line-height: 1;
  letter-spacing: -0.05em;
}

.platformHero p {
  max-width: 770px;
  color: #d4e2ef;
  font-size: 19px;
  line-height: 1.65;
}

.platformBoundary {
  padding: 27px;
  border: 1px solid #78dcd855;
  border-radius: 17px;
  background: #ffffff0d;
}

.platformBoundary strong,
.platformBoundary span {
  display: block;
}

.platformBoundary strong {
  margin-bottom: 11px;
  font-size: 22px;
}

.platformBoundary span {
  color: #c6d8e8;
  line-height: 1.6;
}

.platformSection {
  padding: 72px 5vw;
}

.platformSection.white {
  background: #fff;
}

.sectionHead {
  max-width: 850px;
  margin-bottom: 29px;
}

.sectionHead .platformKicker {
  color: #235fdf;
}

.sectionHead h2 {
  margin: 10px 0 12px;
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1.07;
  letter-spacing: -0.04em;
}

.sectionHead p {
  color: #566e87;
  font-size: 17px;
  line-height: 1.65;
}

.platformGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.platformCard {
  display: flex;
  min-height: 275px;
  flex-direction: column;
  padding: 25px;
  border: 1px solid #d3e0ec;
  border-radius: 16px;
  background: #fff;
  color: #071d3a;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.platformCard:hover {
  transform: translateY(-3px);
  border-color: #91b3ef;
  box-shadow: 0 16px 34px #173c6615;
}

.platformCard .cardType {
  color: #235fdf;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.14em;
}

.platformCard h3 {
  margin: 20px 0 10px;
  font-size: 22px;
}

.platformCard p {
  flex: 1;
  margin: 0;
  color: #5a7086;
  line-height: 1.6;
}

.platformCard small {
  display: block;
  margin-top: 18px;
  color: #526b84;
}

.platformCard b {
  display: block;
  margin-top: 17px;
  color: #235fdf;
}

.capabilityGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
}

.capabilityCard {
  padding: 28px;
  border: 1px solid #d3e0ec;
  border-radius: 17px;
  background: #fff;
  color: #071d3a;
  text-decoration: none;
}

.capabilityCard h3 {
  margin: 13px 0;
  font-size: 25px;
}

.capabilityCard ul {
  padding-left: 20px;
  color: #566e87;
  line-height: 1.8;
}

.capabilityCard strong {
  color: #235fdf;
}

.documentGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.documentPack {
  padding: 28px;
  border: 1px solid #d3e0ec;
  border-radius: 18px;
  background: #fff;
}

.documentPack h3 {
  margin: 12px 0 5px;
  font-size: 25px;
}

.documentPack > p {
  color: #60758b;
}

.documentList {
  display: grid;
  gap: 9px;
  margin-top: 20px;
}

.documentLink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px;
  border: 1px solid #dfe7ef;
  border-radius: 11px;
  background: #f5f8fc;
  color: #071d3a;
  text-decoration: none;
}

.documentLink small,
.documentLink strong {
  display: block;
}

.documentLink small {
  margin-bottom: 4px;
  color: #5c7187;
}

.documentLink > b {
  flex-shrink: 0;
  color: #235fdf;
}

.platformNotice {
  margin-top: 27px;
  padding: 20px;
  border-left: 5px solid #235fdf;
  border-radius: 10px;
  background: #eaf1ff;
  color: #36516c;
  line-height: 1.65;
}

@media (max-width: 1050px) {
  .platformHero {
    grid-template-columns: 1fr;
  }

  .platformGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .platformHero,
  .platformSection {
    padding: 50px 20px;
  }

  .platformHero h1 {
    font-size: 44px;
  }

  .platformGrid,
  .capabilityGrid,
  .documentGrid {
    grid-template-columns: 1fr;
  }

  .platformCard {
    min-height: 0;
  }
}
`;

export default async function PlatformResources({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="platformPage">
        <style>{styles}</style>

        <section className="platformHero">
          <div>
            <span className="platformKicker">
              PLATFORM &amp; PRACTITIONER RESOURCES
            </span>

            <h1>
              One connected route from requirement to verified improvement.
            </h1>

            <p>
              Explore the operational hubs, ISO gap assessments, specialist
              workspaces, training and controlled document packs available
              from RPG Excellence.
            </p>
          </div>

          <aside className="platformBoundary">
            <strong>Where RPG Intelligence fits</strong>

            <span>
              Automated assistance supports selected assessment and analysis
              activities. Named people remain responsible for review,
              approval, action and closure.
            </span>
          </aside>
        </section>

        <section className="platformSection">
          <header className="sectionHead">
            <span className="platformKicker">OPERATIONAL HUBS</span>
            <h2>Choose the business problem you need to control.</h2>

            <p>
              Each hub provides a dedicated workflow while connecting evidence,
              owners, findings, actions and management visibility.
            </p>
          </header>

          <div className="platformGrid">
            {solutionHubs.map(
              ({ title, description, status, href, action }) => (
                <Link
                  className="platformCard"
                  href={
                    href.startsWith("/portal")
                      ? href
                      : `/${locale}${href}`
                  }
                  key={title}
                >
                  <span className="cardType">RPG OPERATIONAL HUB</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <small>{status}</small>
                  <b>{action} →</b>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="platformSection white">
          <header className="sectionHead">
            <span className="platformKicker">ISO GAP ASSESSMENTS</span>
            <h2>Assess the selected standard at requirement level.</h2>

            <p>
              Select the appropriate framework, retain objective evidence,
              identify gaps and connect findings to accountable improvement.
            </p>
          </header>

          <div className="platformGrid">
            {assessmentModules.map(
              ({ title, standard, status, href }) => (
                <Link
                  className="platformCard"
                  href={href}
                  key={standard}
                  aria-label={`Open ${standard} assessment`}
                >
                  <span className="cardType">GAP ANALYSIS</span>
                  <h3>{title}</h3>
                  <p>{standard}</p>
                  <small>{status}</small>
                  <b>Start assessment →</b>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="platformSection">
          <header className="sectionHead">
            <span className="platformKicker">OPERATIONAL CAPABILITY</span>
            <h2>What the connected workspaces control.</h2>

            <p>
              RPG Excellence extends beyond assessment. Operational records
              retain ownership, status, evidence and review history.
            </p>
          </header>

          <div className="capabilityGrid">
            {operationalCapabilities.map(
              ({ area, title, features, href }) => (
                <Link
                  className="capabilityCard"
                  href={href}
                  key={title}
                >
                  <span className="platformKicker">{area}</span>
                  <h3>{title}</h3>

                  <ul>
                    {features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <strong>Open workspace →</strong>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="platformSection white">
          <header className="sectionHead">
            <span className="platformKicker">SPECIALIST WORKSPACES</span>
            <h2>Controlled records around the assurance journey.</h2>
          </header>

          <div className="platformGrid">
            {specialistWorkspaces.map(
              ({ title, description, access, href }) => (
                <Link
                  className="platformCard"
                  href={href}
                  key={title}
                >
                  <span className="cardType">SPECIALIST WORKSPACE</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <small>{access}</small>
                  <b>Open workspace →</b>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="platformSection">
          <header className="sectionHead">
            <span className="platformKicker">RPG TRAINING ACADEMY</span>
            <h2>Practical learning with retained evidence.</h2>

            <p>
              Courses combine guided content, practical application, final
              assessment and verifiable certificates.
            </p>
          </header>

          <div className="platformGrid">
            {academyProducts.map(
              ({ title, price, description, href }) => (
                <Link
                  className="platformCard"
                  href={`/${locale}${href}`}
                  key={title}
                >
                  <span className="cardType">PRACTITIONER TRAINING</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <small>{price} per learner</small>
                  <b>View course →</b>
                </Link>
              )
            )}
          </div>
        </section>

        <section
          className="platformSection white"
          id="supporting-documents"
        >
          <header className="sectionHead">
            <span className="platformKicker">CONTROLLED RESOURCES</span>
            <h2>Supporting assessment documents.</h2>

            <p>
              Download editable Word templates for assessment planning,
              evidence sampling, findings, actions and readiness reporting.
            </p>
          </header>

          <div className="documentGrid">
            {supportingDocumentPacks.map(
              ({ standard, system, shortCode, documents }) => (
                <article className="documentPack" key={standard}>
                  <span className="platformKicker">
                    {shortCode} DOCUMENT PACK
                  </span>

                  <h3>{standard}</h3>
                  <p>{system}</p>

                  <div className="documentList">
                    {documents.map(({ code, title, href }) => (
                      <a
                        className="documentLink"
                        href={href}
                        key={code}
                        download
                        aria-label={`Download ${code} ${title}`}
                      >
                        <span>
                          <small>{code}</small>
                          <strong>{title}</strong>
                        </span>

                        <b aria-hidden="true">Word ↓</b>
                      </a>
                    ))}
                  </div>
                </article>
              )
            )}
          </div>

          <div className="platformNotice">
            These resources support structured assessment and improvement.
            They do not constitute certification, legal advice or an
            accredited audit.
          </div>

          <div className="platformNotice">
            RPG Intelligence is a decision-support layer within selected
            workflows—not a separate substitute for professional judgement.
            Outputs require competent review and do not replace legal,
            technical, security or certification advice.
          </div>
        </section>
      </main>
    </PageShell>
  );
}
