import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "RPG Intelligence Internal Audit Module | RPG Insights",
  description:
    "RPG Insights Issue 008: a governed, evidence-led internal audit lifecycle aligned with ISO 19011 principles.",
};

export default async function InternalAuditModuleInsight({ params }) {
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

          <span className="kicker">RPG Insights • Issue 008</span>

          <h1>
            From Audit Schedule to Accountable Closure: The RPG Intelligence Internal Audit Module
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
            Internal audit should provide confidence in how a management system
            performs—not simply demonstrate that a checklist was completed.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>Why internal audits lose their value</h2>

            <p>
              Audit programmes are often distributed across spreadsheets,
              calendars, document templates, email chains and separate action
              trackers. Scope decisions become difficult to trace, evidence is
              disconnected from conclusions and follow-up can continue without
              clear accountability.
            </p>

            <p>
              The result may satisfy an administrative requirement while giving
              management limited assurance about risk, conformity, control
              effectiveness or recurring weaknesses.
            </p>

            <h2>One controlled audit lifecycle</h2>

            <p>
              The RPG Intelligence Internal Audit Module brings the complete
              lifecycle into one governed workspace. The process is structured
              through seven controlled gates:
            </p>

            <ol>
              <li><strong>Scope</strong> — purpose, boundaries, processes, locations and criteria;</li>
              <li><strong>Team</strong> — competence, independence, roles and confidentiality;</li>
              <li><strong>Plan</strong> — risk-based sampling, agenda, communication and logistics;</li>
              <li><strong>Fieldwork</strong> — interviews, observations, records, evidence and findings;</li>
              <li><strong>Report</strong> — evidence-based conclusions and controlled issue;</li>
              <li><strong>Actions</strong> — ownership, corrective action and effectiveness follow-up; and</li>
              <li><strong>Close</strong> — accountable confirmation that the audit record is complete.</li>
            </ol>

            <p>
              Each gate preserves the audit trail and prevents important
              governance decisions from being lost between planning, delivery
              and follow-up.
            </p>

            <h2>ISO 19011 principles built into the workflow</h2>

            <p>
              The module is designed around the principles of integrity, fair
              presentation, due professional care, confidentiality,
              independence, evidence-based decision-making and risk-based
              planning.
            </p>

            <p>
              The lead auditor, audit team and relevant competence information
              are recorded. Independence and potential conflicts can be
              considered before fieldwork begins rather than after conclusions
              have already been reached.
            </p>

            <h2>Evidence before conclusion</h2>

            <p>
              Fieldwork connects each assessment criterion to the process being
              audited, the applicable requirement, the sample selected and the
              objective evidence obtained. Auditors can record conformity,
              nonconformity, observations, opportunities for improvement and
              positive practices without losing the relationship to the source
              requirement.
            </p>

            <p>
              Structured evidence challenges identify missing support,
              unsupported assumptions and incomplete verification. These checks
              assist the auditor; they do not replace professional judgement or
              human approval.
            </p>

            <h2>Controlled findings and CAPA integration</h2>

            <p>
              Major and minor nonconformities remain visible in a permanent NC
              register. Ownership, target dates, risk, status and follow-up can
              be monitored without separating the finding from its originating
              audit.
            </p>

            <p>
              Where formal investigation is required, a finding can be linked
              directly to the CAPA–8D workflow. Validated root causes,
              corrective actions, implementation evidence and independent
              effectiveness decisions remain connected to the audit record.
            </p>

            <h2>Reporting and controlled closure</h2>

            <p>
              The reporting gate consolidates the approved scope, criteria,
              methodology, evidence-based conclusions, findings, limitations
              and distribution controls into a controlled audit report.
            </p>

            <p>
              Audit closure is not treated as an administrative tick. The
              responsible auditor confirms that the report has been issued,
              conclusions are supported, required follow-up is complete and the
              permanent record is ready for controlled closure.
            </p>

            <h2>From individual audits to assurance intelligence</h2>

            <p>
              A common data structure makes it possible to examine audit
              coverage, open findings, overdue actions, recurrence, verification
              performance and trends across standards, sites and processes.
            </p>

            <p>
              This shifts internal audit from a periodic compliance exercise to
              a practical management tool—one that helps leaders understand
              whether controls are working and where assurance attention is
              needed next.
            </p>

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link href="/portal/internal-audits" className="button">
                Open Internal Audit Command Centre
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
