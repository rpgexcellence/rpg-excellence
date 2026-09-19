import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "Quality Culture Under ISO 9001:2026 — What Evidence Should Organisations Show? | RPG Insights",
  description:
    "Practical guidance on turning quality culture into observable leadership, employee, process and improvement behaviours under ISO 9001:2026.",
  alternates: { canonical: "/en/insights/quality-culture-iso-9001-2026" },
};

const evidence = [
  [
    "Leadership behaviour",
    "Leaders use quality information when making decisions, protect process integrity under pressure, provide resources and visibly follow through on commitments.",
  ],
  [
    "Speaking up",
    "People can raise defects, risks, weak controls and customer concerns without fear, and can see that credible concerns receive an appropriate response.",
  ],
  [
    "Process ownership",
    "Owners understand expected outcomes, measures, interfaces, risks and authority—and act when performance moves outside control.",
  ],
  [
    "Competence and awareness",
    "People understand how their work affects customers and QMS outcomes, and competence is demonstrated rather than assumed from course attendance.",
  ],
  [
    "Learning from failure",
    "Complaints, nonconformities, audit findings and near misses lead to proportionate causal analysis, action and effectiveness verification.",
  ],
  [
    "Recognition and accountability",
    "The organisation recognises desired behaviours and addresses repeated workarounds, concealed problems or knowingly weak practice.",
  ],
];

export default async function QualityCultureInsight({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: "1040px" }}>
          <Link
            href={`/${locale}/insights`}
            style={{
              display: "inline-block",
              marginBottom: 28,
              color: "#1459D9",
              fontWeight: 700,
            }}
          >
            ← Back to RPG Insights
          </Link>
          <span className="kicker">
            RPG Insights • Issue 020 • Quality Culture
          </span>
          <h1>
            Quality culture is what happens when the procedure is not watching.
          </h1>
          <p
            style={{
              maxWidth: 850,
              color: "#617087",
              fontSize: 20,
              lineHeight: 1.7,
            }}
          >
            ISO 9001:2026 gives quality culture greater visibility. The
            challenge for organisations is to convert a broad idea into
            observable behaviour, credible evidence and management action.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: 36,
              marginTop: 34,
              lineHeight: 1.75,
              fontSize: 17,
            }}
          >
            <h2>Culture is not a poster, value statement or survey score</h2>
            <p>
              Quality culture is the shared pattern of decisions and behaviours
              that determines whether people protect requirements, customers and
              process integrity—especially when time, cost or operational
              pressure makes the right action less convenient.
            </p>
            <p>
              An organisation may have polished policies and still tolerate
              workarounds, delayed escalation, repeated defects or findings
              closed without effective action. Conversely, a strong culture
              becomes visible through everyday control, transparency and
              learning.
            </p>

            <h2>What credible evidence may look like</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                gap: 14,
                margin: "24px 0 34px",
              }}
            >
              {evidence.map(([title, text]) => (
                <section
                  key={title}
                  style={{
                    padding: 21,
                    border: "1px solid #dce5ef",
                    borderRadius: 12,
                    background: "#f8fbff",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{title}</h3>
                  <p
                    style={{ marginBottom: 0, color: "#617087", fontSize: 15 }}
                  >
                    {text}
                  </p>
                </section>
              ))}
            </div>

            <h2>Questions leaders should be able to answer</h2>
            <ul>
              <li>
                What behaviours support the quality outcomes we need, and which
                behaviours undermine them?
              </li>
              <li>
                When did leadership last change a decision because quality
                evidence showed unacceptable risk?
              </li>
              <li>
                Can employees stop, challenge or escalate work without being
                penalised for disrupting delivery?
              </li>
              <li>
                Where do commercial or schedule pressures create incentives to
                bypass the QMS?
              </li>
              <li>
                Do actions address systemic causes, or repeatedly default to
                reminders and retraining?
              </li>
              <li>
                How do we know that reported concerns, audits and complaints
                result in organisational learning?
              </li>
            </ul>

            <h2>How an auditor may test quality culture</h2>
            <p>
              Quality culture should not be reduced to one interview question or
              one score. An auditor is more likely to triangulate evidence
              across leadership interviews, employee experience, process
              performance, customer feedback, audit results, nonconformity
              handling, resource decisions and management review.
            </p>
            <p>
              Consistency matters. If leaders describe an open reporting culture
              but employees cannot explain how to escalate a concern—or records
              show recurring problems accepted without effective treatment—the
              evidence tells a different story.
            </p>

            <h2>A practical improvement model</h2>
            <ol>
              <li>
                <strong>Define:</strong> identify the behaviours necessary to
                achieve intended QMS outcomes.
              </li>
              <li>
                <strong>Diagnose:</strong> use interviews, process data,
                findings and employee experience to identify cultural strengths
                and tensions.
              </li>
              <li>
                <strong>Align:</strong> remove conflicting objectives,
                incentives, resource constraints and leadership signals.
              </li>
              <li>
                <strong>Enable:</strong> provide authority, competence,
                communication and safe routes to challenge or escalate.
              </li>
              <li>
                <strong>Verify:</strong> test whether behaviour and outcomes
                change over time, not merely whether activities were completed.
              </li>
            </ol>

            <h2>How RPG Excellence can help</h2>
            <p>
              RPG Excellence can facilitate leadership briefings,
              quality-culture diagnostics, evidence-led ISO 9001:2026 reviews,
              internal-audit workshops and improvement planning. We help
              translate the standard’s intent into practical questions, evidence
              and accountable actions suited to the organisation.
            </p>
            <div
              style={{
                marginTop: 34,
                padding: 28,
                borderRadius: 14,
                background: "#08294f",
                color: "white",
              }}
            >
              <span className="kicker" style={{ color: "#6ee7d7" }}>
                QUALITY CULTURE REVIEW
              </span>
              <h2 style={{ color: "white" }}>
                Move from stated values to evidence of how work is actually
                managed.
              </h2>
              <p style={{ color: "#d5e3ef" }}>
                Discuss a focused leadership session or quality-culture
                diagnostic with RPG Excellence.
              </p>
              <Link
                className="button"
                href={`/${locale}/contact?topic=quality-culture`}
                style={{ marginTop: 10 }}
              >
                Book a consultation →
              </Link>
            </div>
          </article>
          <section style={{ marginTop: 28 }}>
            <Link
              href={`/${locale}/insights/iso-9001-2026-release`}
              style={{ color: "#1459D9", fontWeight: 700 }}
            >
              ← Read the ISO 9001:2026 release overview
            </Link>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
