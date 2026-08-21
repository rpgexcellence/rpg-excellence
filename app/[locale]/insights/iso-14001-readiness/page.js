import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "ISO 14001:2026 — Environmental Management Moves from Compliance to Business Assurance | RPG Insights",
  description:
    "RPG Insights Issue 003: how RPG Intelligence connects ISO 14001:2026 conformity, evidence assurance, compliance obligations, management action, management readiness and certification-readiness decision support.",
};

export default async function ISO14001ReadinessInsight({
  params,
}) {
  const { locale } = await params;

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
            RPG Insights • Issue 003
          </span>

          <h1>
            ISO 14001:2026 — Environmental
            Management Moves from Compliance to
            Business Assurance
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
            Connecting environmental conformity,
            objective evidence, compliance assurance,
            management action and organisational
            readiness in one structured assessment.
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
              Environmental management needs a
              management view
            </h2>

            <p>
              An environmental management system
              should do more than demonstrate that
              individual requirements have been
              considered.
            </p>

            <p>
              It should give management confidence
              that environmental risks, obligations,
              controls, performance and improvement
              are understood and being managed.
            </p>

            <p>
              RPG Intelligence has been developed to
              bring those perspectives together
              within its ISO 14001:2026 assessment
              workflow.
            </p>

            <h2>
              Evidence-led assessment
            </h2>

            <p>
              The assessment is structured around
              clause-level requirements but is
              designed to move beyond a generic
              checklist.
            </p>

            <p>
              Assessor guidance supports the
              evaluation of documented arrangements,
              implementation and objective evidence,
              including risk-based sampling and
              management oversight.
            </p>

            <p>
              Evidence Sampling allows assessors to
              record what was sampled, evaluate
              evidence confidence, identify
              exceptions or gaps and connect evidence
              directly to formal findings where
              appropriate.
            </p>

            <h2>
              Environmental context, risk and
              compliance assurance
            </h2>

            <p>
              Effective environmental management
              depends on understanding the
              organisation's context, environmental
              aspects, risks and opportunities,
              compliance obligations and operational
              controls.
            </p>

            <p>
              RPG Intelligence brings those elements
              into a structured assurance model so
              that conclusions can be supported by
              evidence rather than assessment scores
              alone.
            </p>

            <p>
              Compliance assurance is particularly
              important. Identifying an obligation is
              not the same as demonstrating that it
              is understood, implemented and
              periodically evaluated.
            </p>

            <h2>
              Findings become controlled management
              actions
            </h2>

            <p>
              Formal findings can be recorded as
              Major or Minor Nonconformities,
              observations or opportunities for
              improvement.
            </p>

            <p>
              Findings can capture objective
              evidence, risk impact, corrective
              action, ownership, target dates,
              verification and closure.
            </p>

            <p>
              Major and Minor Nonconformities can
              then feed directly into the Management
              Action Plan, connecting assurance
              results with management ownership,
              resources and timescales.
            </p>

            <h2>
              Management readiness is assessed
              separately
            </h2>

            <p>
              Clause conformity and organisational
              readiness are related, but they are not
              the same thing.
            </p>

            <p>
              RPG Intelligence therefore evaluates
              environmental management readiness
              across nine dimensions:
            </p>

            <ul>
              <li>Leadership</li>
              <li>Governance</li>
              <li>Environmental Context</li>
              <li>Risk Management</li>
              <li>Operational Control</li>
              <li>Compliance Assurance</li>
              <li>Environmental Performance</li>
              <li>Internal Assurance</li>
              <li>Improvement Capability</li>
            </ul>

            <p>
              Each dimension can be supported by
              objective evidence, assessor
              commentary, management concerns,
              actions, owners and target dates.
            </p>

            <h2>
              Certification readiness is more than a
              percentage
            </h2>

            <p>
              RPG Intelligence combines weighted
              assessment results with management
              readiness, open findings, risk and
              action status to support a
              certification-readiness recommendation.
            </p>

            <p>
              This is intended to prevent a headline
              score from obscuring significant
              barriers such as open Major
              Nonconformities, high-risk findings or
              incomplete management readiness.
            </p>

            <p>
              The recommendation remains a readiness
              assessment. It is not an accredited
              certification decision and does not
              replace an independent certification
              audit.
            </p>

            <h2>
              Executive reporting for management
            </h2>

            <p>
              The Executive Summary and PDF reporting
              bring together weighted scoring, clause
              performance, findings, management
              actions, evidence assurance,
              management readiness and
              certification-readiness information.
            </p>

            <p>
              The objective is a clearer management
              picture: where the environmental
              management system stands, what evidence
              supports that position and where
              attention is required next.
            </p>

            <h2>
              From environmental compliance to
              environmental assurance
            </h2>

            <p>
              The question is not simply whether an
              organisation can point to an
              environmental procedure.
            </p>

            <p>
              <strong>
                The stronger question is whether the
                organisation can demonstrate that its
                environmental management system is
                understood, implemented, evidenced
                and capable of being sustained.
              </strong>
            </p>

            <p>
              That is the direction of the ISO
              14001:2026 assessment within RPG
              Intelligence.
            </p>

            <div
              style={{
                marginTop: "38px",
                paddingTop: "24px",
                borderTop: "1px solid #dfe6ee",
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
