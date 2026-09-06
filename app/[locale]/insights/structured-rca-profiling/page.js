import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "Structured D4 Root-Cause Profiling | RPG Insights",
  description:
    "RPG Insights Issue 007: turning evidence-supported D4 root-cause analysis into consistent, reportable organisational intelligence.",
};

export default async function StructuredRCAProfilingInsight({ params }) {
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

          <span className="kicker">RPG Insights • Issue 007</span>

          <h1>
            From Root Cause to Organisational Insight: Structured D4 Profiling
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
            A plausible explanation is not enough. Effective root-cause analysis
            must identify an evidence-supported, correctable condition and turn
            it into information the organisation can learn from.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>Why root-cause analysis often stops too early</h2>

            <p>
              Investigations frequently conclude with labels such as human
              error, procedure not followed, inadequate training or equipment
              failure. These statements may describe the event, but they do not
              necessarily explain which management-system control failed, how
              widely the condition exists or who is accountable for correcting
              it.
            </p>

            <p>
              Without consistent classification, each investigation remains an
              isolated record. Recurring weaknesses across processes, sites and
              standards are difficult to identify, and corrective-action
              decisions become harder to prioritise.
            </p>

            <h2>A category-first profiling workflow</h2>

            <p>
              RPG Intelligence now guides the person conducting D4 through a
              controlled sequence. The investigator first selects a broad legacy
              category and then chooses the detailed profile that best reflects
              the evidence-supported causal condition.
            </p>

            <p>The profile then records:</p>

            <ul>
              <li>the specific failure mechanism;</li>
              <li>the affected process or activity;</li>
              <li>the extent of the condition;</li>
              <li>the prevention, detection, response or recovery layer affected;</li>
              <li>the relationship to previous or recurring events;</li>
              <li>the accountable system owner;</li>
              <li>the applicable management-system standards; and</li>
              <li>the rationale connecting the selected profile to objective evidence.</li>
            </ul>

            <h2>Legacy coding with modern assurance controls</h2>

            <p>
              The A–P coding structure provides recognisable categories covering
              documented information, competence, governance, facilities,
              environmental management, materials, equipment, training,
              external providers, information security and occupational health
              and safety.
            </p>

            <p>
              Profiles can be associated with ISO 9001, ISO 14001, ISO 45001,
              ISO 22301, ISO/IEC 27001, ISO/IEC 17024 and AS9100. This makes the
              resulting data useful across integrated management systems rather
              than limiting it to a single standard or audit programme.
            </p>

            <h2>Evidence determines the number of causal legs</h2>

            <p>
              A robust investigation should consider how the event occurred,
              why it was not prevented or detected and whether a wider systemic
              condition exists. It should not, however, manufacture three root
              causes when the evidence supports only one.
            </p>

            <p>
              The upgraded workflow allows an RCA to conclude with a validated
              occurrence cause where no separate escape or systemic causal
              stream is supported. Optional hypotheses can be formally rejected
              while remaining visible in the controlled audit trail.
            </p>

            <h2>Human validation remains the decision point</h2>

            <p>
              Saving a profile does not validate the cause. A competent person
              must review the analysis, validation method, objective result,
              contradictory evidence and profiling rationale before approving
              the D4 causal conclusion.
            </p>

            <p>
              Changing a validated profile reopens the cause for human review.
              This protects the integrity of the controlled record and prevents
              material changes from bypassing approval.
            </p>

            <h2>Turning investigations into management intelligence</h2>

            <p>
              Consistent profiling creates a foundation for trend analysis. An
              organisation can examine recurring categories, failed control
              layers, affected processes, systemic owners, standards and
              recurrence relationships across its RCA portfolio.
            </p>

            <p>
              The purpose is not to add administration. It is to help leaders
              distinguish isolated events from repeated management-system
              weaknesses and direct corrective-action investment where it can
              have the greatest effect.
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
                Business Assurance • Practical Intelligence • Continuous Improvement
              </p>
            </div>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
