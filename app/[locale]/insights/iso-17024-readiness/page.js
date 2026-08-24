import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "ISO/IEC 17024:2026 Readiness Assessment Released | RPG Insights",
  description:
    "RPG Insights Issue 006: the release of an evidence-led ISO/IEC 17024:2026 readiness assessment for organisations operating certification of persons.",
};

export default async function ISO17024ReadinessInsight({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: "900px" }}>
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
            RPG Insights • Issue 006
          </span>

          <h1>
            RPG Intelligence Releases ISO/IEC
            17024:2026 Readiness Assessment
          </h1>

          <p
            style={{
              color: "#617087",
              fontSize: "20px",
              lineHeight: 1.7,
              marginBottom: "36px",
              maxWidth: "800px",
            }}
          >
            A structured, evidence-led assessment for
            organisations operating certification of
            persons.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>More than a checklist</h2>

            <p>
              RPG Intelligence has released its
              ISO/IEC 17024:2026 Readiness Assessment,
              providing organisations with a structured
              way to evaluate conformity, evidence
              maturity, management readiness and
              certification assurance across clauses
              4–10.
            </p>

            <p>
              The module contains 82 structured
              questions supported by requirement
              summaries, auditor guidance, suggested
              probing and objective-evidence
              expectations.
            </p>

            <h2>Evidence-led assessment</h2>

            <p>
              Assessors can record evidence samples,
              observations and conclusions against
              individual controls. Identified gaps can
              become formal findings with defined risk,
              ownership, target dates and verification
              evidence.
            </p>

            <p>
              Weighted clause scoring and management
              readiness are presented separately. This
              helps distinguish documented conformity
              from the governance and organisational
              capability needed to sustain credible
              certification of persons.
            </p>

            <h2>Decision-focused outputs</h2>

            <ul>
              <li>Clause-level and overall assurance scoring</li>
              <li>Evidence sampling and confidence records</li>
              <li>Major and Minor Nonconformities, observations and OFIs</li>
              <li>Management-readiness evaluation</li>
              <li>Management action planning and follow-up</li>
              <li>Executive reporting and controlled supporting documents</li>
            </ul>

            <h2>Assurance boundaries</h2>

            <p>
              The RPG Intelligence assessment is a
              readiness and assurance tool. It does not
              award certification, replace an
              accreditation-body assessment or guarantee
              conformity with every applicable
              requirement.
            </p>

            <p>
              Final conclusions remain subject to
              competent-person judgement, objective
              evidence and the organisation’s applicable
              accreditation and regulatory arrangements.
            </p>

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link href="/portal" className="button">
                Open Customer Portal
              </Link>

              <Link
                href={`/${locale}/pricing`}
                className="button buttonGhost"
              >
                View Plans
              </Link>
            </div>

            <div
              style={{
                marginTop: "38px",
                paddingTop: "24px",
                borderTop: "1px solid #dfe6ee",
              }}
            >
              <strong>RPG Excellence Ltd</strong>
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
        </div>
      </main>
    </PageShell>
  );
}
