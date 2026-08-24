import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "Introducing the RPG Intelligence CAPA–8D Module | RPG Insights",
  description:
    "RPG Insights Issue 005: an evidence-led D0–D8 investigation workspace for root-cause validation, corrective action and effectiveness review.",
};

export default async function CAPA8DReleaseInsight({ params }) {
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
            RPG Insights • Issue 005
          </span>

          <h1>
            Introducing the RPG Intelligence
            CAPA–8D Module
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
            An evidence-led investigation workspace for
            root-cause validation, controlled corrective
            action and effectiveness review.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>A controlled D0–D8 workflow</h2>

            <p>
              The CAPA–8D module can be used independently
              for operational, quality, safety,
              environmental or compliance events, or
              connected to findings raised through an RPG
              Intelligence ISO assessment.
            </p>

            <p>
              Each discipline is reviewed and approved
              before the next stage is unlocked. This
              prevents teams from moving directly to
              corrective action without an adequately
              defined problem and supported cause.
            </p>

            <h2>Interactive root-cause workbench</h2>

            <p>
              During D4, investigators can select or
              combine structured analysis methods:
            </p>

            <ul>
              <li>3 × 5 Whys for occurrence, escape and systemic causal chains</li>
              <li>Ishikawa/Fishbone analysis for interacting causal factors</li>
              <li>HSE Bow Tie analysis for hazards, threats, barriers and consequences</li>
            </ul>

            <p>
              A possible cause remains a hypothesis until
              it has been tested against objective evidence
              and validated by an authorised person.
            </p>

            <h2>Human-controlled decisions</h2>

            <p>
              The module challenges weak conclusions by
              identifying unsupported assumptions, missing
              evidence, required verification and
              unresolved uncertainty. Human approval
              remains mandatory at every gate.
            </p>

            <h2>Action, effectiveness and cost</h2>

            <p>
              Validated causes can be linked to controlled
              corrective actions with owners, target dates,
              implementation controls, effectiveness
              criteria and verification evidence.
            </p>

            <p>
              An optional Cost of Poor Quality facility
              records material, labour, administration,
              operational disruption, customer impact,
              assurance cost and corrective-action
              investment by discipline.
            </p>

            <h2>Controlled outputs</h2>

            <p>
              The module provides an executive summary and
              downloadable report covering the problem,
              containment, validated causes, corrective
              actions, effectiveness, cost and closure
              assurance. A supporting controlled-document
              pack is available through the customer portal.
            </p>

            <p>
              The module supports accountable investigation;
              it does not replace competent-person judgement,
              specialist advice or applicable legal and
              regulatory requirements.
            </p>

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link href="/portal/rca" className="button">
                Open 8D Command Centre
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
