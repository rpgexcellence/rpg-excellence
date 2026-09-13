import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "ISO/IEC 27001 Readiness: Connecting Gap Analysis and the Statement of Applicability | RPG Insights",
  description:
    "How an evidence-led ISO/IEC 27001 gap analysis and controlled Statement of Applicability support distinct but connected ISMS readiness decisions.",
  alternates: { canonical: "/en/insights/iso-27001-gap-analysis-soa" },
};

const comparison = [
  {
    title: "Gap Analysis",
    purpose:
      "Evaluate the management system against ISO/IEC 27001 requirements.",
    questions: [
      "What is implemented?",
      "What objective evidence supports the assessment?",
      "Where are the findings, gaps and actions?",
      "What does management need to prioritise?",
    ],
  },
  {
    title: "Statement of Applicability",
    purpose:
      "Control the organisation’s decisions about information-security controls.",
    questions: [
      "Which controls are applicable?",
      "Why is each control included or excluded?",
      "What is its implementation position?",
      "Who owns it and what evidence supports it?",
    ],
  },
];

const decisionFields = [
  "Applicability decision",
  "Inclusion or exclusion rationale",
  "Implementation status",
  "Control owner",
  "Objective evidence",
  "Residual-risk consideration",
  "Actions and target dates",
  "Review and approval record",
];

export default async function ISO27001GapAnalysisSoaInsight({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: "920px" }}>
          <Link
            href={`/${locale}/insights`}
            style={{
              display: "inline-block",
              marginBottom: "28px",
              color: "#1459D9",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ← Back to RPG Insights
          </Link>

          <span className="kicker">RPG Insights • Issue 013</span>

          <h1>
            ISO/IEC 27001 Readiness: Connecting Gap
            Analysis and the Statement of Applicability
          </h1>

          <p
            style={{
              color: "#617087",
              fontSize: "20px",
              lineHeight: 1.7,
              marginBottom: "36px",
              maxWidth: "840px",
            }}
          >
            Two connected workspaces answer different
            assurance questions: whether the ISMS meets the
            standard&apos;s requirements and how the organisation
            has selected, implemented and evidenced its
            information-security controls.
          </p>

          <article
            className="assuranceCard"
            style={{ padding: "36px", lineHeight: 1.8, fontSize: "17px" }}
          >
            <h2>ISO/IEC 27001 is more than a control checklist</h2>

            <p>
              ISO/IEC 27001:2022 specifies requirements for
              establishing, implementing, maintaining and
              continually improving an information security
              management system. It connects information risk
              with organisational context, leadership,
              planning, support, operation, performance
              evaluation and improvement.
            </p>

            <p>
              A review limited to technical controls can miss
              whether the wider system is governed, resourced,
              understood and evaluated. Equally, a clause-by-
              clause gap analysis does not by itself explain
              which controls the organisation has selected or
              why.
            </p>

            <div
              style={{
                margin: "32px 0",
                padding: "26px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #0d2f5b, #2257f2)",
                color: "white",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#8ff1dc",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                The readiness principle
              </span>
              <strong style={{ display: "block", fontSize: "25px", lineHeight: 1.35 }}>
                Assess the management system and control the
                applicability decisions—without confusing one
                record for the other.
              </strong>
            </div>

            <h2>Two workspaces, two purposes</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                margin: "26px 0 36px",
              }}
            >
              {comparison.map((item) => (
                <section
                  key={item.title}
                  style={{
                    padding: "24px",
                    border: "1px solid #d7e2ef",
                    borderRadius: "16px",
                    background: "#f8fbff",
                  }}
                >
                  <span className="kicker">{item.title}</span>
                  <p style={{ fontWeight: 700 }}>{item.purpose}</p>
                  <ul style={{ marginBottom: 0 }}>
                    {item.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <h2>An evidence-led gap analysis</h2>

            <p>
              A useful gap analysis should do more than mark a
              requirement compliant or non-compliant. The
              assessor should record the current position,
              objective evidence, the significance of any gap
              and the action needed to improve readiness.
            </p>

            <p>
              RPG Excellence connects requirement-level
              assessment with evidence, formal findings,
              accountable actions and management reporting.
              This makes it possible to distinguish documented
              intention from implemented practice and to see
              where management decisions or resources are
              required.
            </p>

            <h2>A Statement of Applicability should be organisation-specific</h2>

            <p>
              The Statement of Applicability should reflect the
              organisation&apos;s information-security risks,
              obligations and chosen treatment. It should not
              be a generic control list copied from another
              organisation or completed only to satisfy an
              external audit request.
            </p>

            <p>
              A control marked as implemented should be
              supported by evidence. An exclusion needs a
              defensible rationale. A planned improvement
              should remain visible as an action rather than
              being presented as a completed control.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
                margin: "26px 0 36px",
              }}
            >
              {decisionFields.map((field, index) => (
                <div
                  key={field}
                  style={{
                    padding: "18px",
                    borderRadius: "12px",
                    border: "1px solid #d7e2ef",
                    background: "#f8fbff",
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: "#2257f2", marginRight: "8px" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {field}
                </div>
              ))}
            </div>

            <h2>Connect risk, control and management attention</h2>

            <p>
              The strongest value appears when gap-analysis
              findings, applicability decisions, evidence and
              action ownership can be viewed together. This
              helps management understand not only whether a
              document exists, but whether the ISMS is
              operating and whether selected controls are
              justified and effective.
            </p>

            <p>
              A controlled workspace also preserves the audit
              trail. Reviewers can see the decision, rationale,
              evidence, owner, implementation status and
              subsequent change rather than relying on an
              overwritten spreadsheet.
            </p>

            <h2>Use the tools for readiness—not as a certification claim</h2>

            <p>
              RPG Excellence supports structured self-
              assessment, evidence gathering, action planning
              and management readiness. It does not issue
              accredited ISO certification, guarantee
              conformity or replace competent information-
              security, legal or certification advice.
            </p>

            <p>
              Used with appropriate competence, the Gap
              Analysis and Statement of Applicability can
              provide a more disciplined starting point for
              implementation, internal review and
              certification preparation.
            </p>

            <div
              style={{
                marginTop: "34px",
                padding: "28px",
                borderRadius: "16px",
                border: "1px solid #b9d7cf",
                background: "#eefaf6",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Explore ISO/IEC 27001 readiness</h2>
              <p>
                Start an evidence-led ISO/IEC 27001 Gap
                Analysis or use the standalone Statement of
                Applicability workspace to manage control
                decisions, ownership and evidence.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "20px" }}>
                <Link className="button" href={`/${locale}/iso-27001`}>
                  Explore ISO/IEC 27001
                </Link>
                <Link className="button secondary" href={`/${locale}/pricing`}>
                  View access options
                </Link>
              </div>
            </div>

            <p
              style={{
                marginTop: "32px",
                paddingTop: "24px",
                borderTop: "1px solid #d7e2ef",
                color: "#617087",
                fontSize: "14px",
              }}
            >
              References:{" "}
              <a
                href="https://www.iso.org/standard/27001"
                target="_blank"
                rel="noreferrer"
              >
                ISO/IEC 27001:2022
              </a>{" "}
              and the UK National Cyber Security Centre&apos;s{ " "}
              <a
                href="https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-a-managing-security-risk/principle-a1-governance"
                target="_blank"
                rel="noreferrer"
              >
                guidance on managing security risk
              </a>
              . ISO standards are copyrighted; users should
              obtain authorised copies where required.
            </p>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
