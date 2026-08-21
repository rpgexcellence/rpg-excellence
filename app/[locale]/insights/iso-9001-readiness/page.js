import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "ISO 9001 Moves Beyond the Checklist | RPG Insights",
  description:
    "RPG Insights Issue 002: how RPG Intelligence approaches ISO 9001:2015/Amd 1:2024 through evidence-led assessment, management readiness, certification-readiness decision support and climate-action considerations.",
};

export default async function ISO9001ReadinessInsight({
  params,
}) {
  const { locale } =
    await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div
          className="simpleInner"
          style={{
            maxWidth: "900px",
          }}
        >
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

          <span className="kicker">
            RPG Insights • Issue 002
          </span>

          <h1>
            ISO 9001 Moves Beyond the Checklist
          </h1>

          <p
            style={{
              color: "#617087",
              fontSize: "20px",
              lineHeight: 1.7,
              marginBottom: "36px",
              maxWidth: "780px",
            }}
          >
            From conformity assessment to
            evidence-led management assurance,
            management readiness and clearer
            certification-readiness decisions.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>
              ISO 9001 should do more than confirm
              that a requirement has been addressed
            </h2>

            <p>
              Quality management assessment is most
              useful when it helps an organisation
              understand whether its management system
              is genuinely implemented, evidenced,
              controlled and capable of delivering
              consistent outcomes.
            </p>

            <p>
              That is the approach now built into RPG
              Intelligence for ISO 9001:2015/Amd
              1:2024.
            </p>

            <p>
              The assessment combines structured
              clause evaluation with objective
              evidence, formal findings, management
              action, management readiness and
              certification-readiness decision
              support.
            </p>

            <h2>
              A 71-question evidence-led assessment
            </h2>

            <p>
              The current RPG Intelligence ISO 9001
              model contains 71 assessment questions
              across Clauses 4 to 10.
            </p>

            <p>
              Each question is supported by structured
              assessor intelligence including:
            </p>

            <ul>
              <li>
                requirement summaries
              </li>

              <li>
                assessor guidance
              </li>

              <li>
                interview prompts
              </li>

              <li>
                objective evidence expectations
              </li>

              <li>
                sampling guidance
              </li>

              <li>
                conformity criteria
              </li>

              <li>
                Minor and Major NC guidance
              </li>

              <li>
                management focus
              </li>

              <li>
                maturity guidance
              </li>
            </ul>

            <p>
              The intention is not to replace
              professional judgement. It is to give
              assessors a stronger structure for
              applying it consistently.
            </p>

            <h2>
              Climate action is now part of the QMS
              conversation
            </h2>

            <p>
              ISO 9001:2015/Amd 1:2024 introduces
              explicit consideration of climate
              change within organisational context
              and interested-party requirements.
            </p>

            <p>
              RPG Intelligence reflects that
              directly. The assessment asks whether
              climate change is a relevant issue for
              the QMS and whether relevant interested
              parties have climate-related
              requirements.
            </p>

            <p>
              Where climate change is relevant, the
              assessment expects related risks,
              opportunities and operational
              implications to be reflected in the
              management system.
            </p>

            <h2>
              Evidence Sampling and formal findings
            </h2>

            <p>
              Evidence Sampling creates traceability
              between an assessment conclusion,
              sampled evidence, identified exceptions
              and formal findings.
            </p>

            <p>
              Assessors can record evidence
              confidence, identify exceptions or gaps
              and link those samples directly to
              findings where appropriate.
            </p>

            <p>
              Findings can then be managed through a
              controlled lifecycle covering:
            </p>

            <ul>
              <li>
                Minor and Major Nonconformities
              </li>

              <li>
                observations
              </li>

              <li>
                opportunities for improvement
              </li>

              <li>
                objective evidence
              </li>

              <li>
                risk impact
              </li>

              <li>
                corrective action
              </li>

              <li>
                ownership and target dates
              </li>

              <li>
                verification and closure
              </li>
            </ul>

            <h2>
              From findings to management action
            </h2>

            <p>
              Major and Minor Nonconformities can
              move directly into the Management
              Action Plan.
            </p>

            <p>
              This creates a clearer connection
              between assessment findings and the
              management decisions, resources,
              ownership and timescales required to
              address them.
            </p>

            <p>
              The objective is to move the assessment
              beyond a static list of gaps and into a
              controlled improvement workflow.
            </p>

            <h2>
              Management readiness is separate from
              clause conformity
            </h2>

            <p>
              A system can achieve a reasonable
              conformity score without necessarily
              being management-ready.
            </p>

            <p>
              RPG Intelligence therefore assesses
              management readiness separately across
              nine QMS dimensions:
            </p>

            <ul>
              <li>
                Leadership & Quality Culture
              </li>

              <li>
                Governance & Accountability
              </li>

              <li>
                Customer Focus
              </li>

              <li>
                Process Management
              </li>

              <li>
                Risk & Change Management
              </li>

              <li>
                Operational & Supplier Control
              </li>

              <li>
                Quality Performance & Data
              </li>

              <li>
                Internal Assurance & Management
                Review
              </li>

              <li>
                Improvement & Organisational Learning
              </li>
            </ul>

            <p>
              This gives leadership a different view:
              not simply whether individual clauses
              appear to conform, but whether the
              organisation has the capability to
              sustain an effective QMS.
            </p>

            <h2>
              Certification readiness is a decision
              framework, not a certificate
            </h2>

            <p>
              RPG Intelligence uses the assessment
              score together with management
              readiness, open Major and Minor
              Nonconformities, risk, overdue actions
              and available evidence to form an RPG
              readiness recommendation.
            </p>

            <p>
              Recommendations can include:
            </p>

            <ul>
              <li>
                Assessment incomplete
              </li>

              <li>
                Management readiness incomplete
              </li>

              <li>
                Not ready
              </li>

              <li>
                Significant improvement required
              </li>

              <li>
                Progressing
              </li>

              <li>
                Readiness review recommended
              </li>

              <li>
                Potentially ready
              </li>
            </ul>

            <p>
              This is deliberately not presented as
              an accredited certification decision.
              Certification remains the role of an
              independent certification body.
            </p>

            <h2>
              Executive reporting brings the
              information together
            </h2>

            <p>
              The ISO 9001 Executive Summary and PDF
              Report bring together:
            </p>

            <ul>
              <li>
                weighted Business Assurance scoring
              </li>

              <li>
                clause results and priorities
              </li>

              <li>
                management readiness
              </li>

              <li>
                certification-readiness
                recommendations
              </li>

              <li>
                findings and risk
              </li>

              <li>
                management actions
              </li>

              <li>
                evidence assurance
              </li>

              <li>
                climate-action considerations
              </li>
            </ul>

            <p>
              The result is intended to provide a
              clearer management view of where the
              QMS stands, what evidence supports that
              position and what needs attention next.
            </p>

            <h2>
              The question changes
            </h2>

            <p>
              The aim is not simply to ask:
            </p>

            <p>
              <strong>
                Are we compliant?
              </strong>
            </p>

            <p>
              The more useful management question is:
            </p>

            <p>
              <strong>
                Do we have sufficient evidence,
                control and management confidence to
                move forward?
              </strong>
            </p>

            <p>
              That is the direction we are taking
              with ISO 9001 inside RPG Intelligence.
            </p>

            <div
              style={{
                marginTop: "38px",
                paddingTop: "24px",
                borderTop:
                  "1px solid #dfe6ee",
              }}
            >
              <strong>
                RPG Excellence Ltd
              </strong>

              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                  color: "#617087",
                }}
              >
                Business Assurance • Practical
                Intelligence • Continuous Improvement
              </p>
            </div>
          </article>

          <div
            style={{
              marginTop: "32px",
            }}
          >
            <Link
              href={`/${locale}/insights`}
              className="button buttonGhost"
            >
              More RPG Insights
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
