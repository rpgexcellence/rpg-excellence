import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

const ISO_URL = "https://www.iso.org/standard/9001";
const BSI_URL =
  "https://www.bsigroup.com/en-GB/products-and-services/standards-services/iso-9001-2026-key-changes-and-guidance/";

export const metadata = {
  title:
    "ISO 9001:2026 Is Published — What Organisations Should Do Now | RPG Insights",
  description:
    "A practical guide to ISO 9001:2026, its main areas of emphasis and the actions organisations can take to plan a controlled QMS transition.",
  alternates: { canonical: "/en/insights/iso-9001-2026-release" },
};

const changes = [
  [
    "Quality culture",
    "Quality is placed more visibly in the way people think, decide, communicate and act—not only in documented processes.",
  ],
  [
    "Ethical behaviour",
    "Leadership and organisational conduct receive clearer attention as conditions supporting trust, conformity and sustainable performance.",
  ],
  [
    "Risk and opportunity",
    "Risk and opportunity are separated more clearly, strengthening proactive planning for adverse and beneficial outcomes.",
  ],
  [
    "Climate and sustainability",
    "Organisational context gives more explicit attention to climate-related and sustainability considerations where these affect the QMS.",
  ],
  [
    "Leadership",
    "Top management must connect strategic direction, quality culture, resources, performance and improvement with greater visibility.",
  ],
  [
    "Clarity and integration",
    "Targeted drafting changes improve usability and alignment with other ISO management-system standards.",
  ],
];

export default async function ISO90012026Release({ params }) {
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
            RPG Insights • Issue 019 • Standards Update
          </span>
          <h1>ISO 9001:2026 is published. What should organisations do now?</h1>
          <p
            style={{
              maxWidth: 850,
              color: "#617087",
              fontSize: 20,
              lineHeight: 1.7,
            }}
          >
            The sixth edition of the world’s most widely used quality-management
            standard retains a familiar framework, while sharpening expectations
            around quality culture, ethical behaviour, leadership, risk,
            opportunity and organisational context.
          </p>

          <section
            className="assuranceCard"
            style={{
              padding: 36,
              marginTop: 34,
              lineHeight: 1.75,
              fontSize: 17,
            }}
          >
            <h2>A revision to use—not simply file</h2>
            <p>
              ISO published ISO 9001:2026 on 16 September 2026. For certified
              organisations, publication begins a transition conversation; it
              does not mean that the existing management system should be
              discarded or that every document must be rewritten.
            </p>
            <p>
              The practical task is to understand the changed emphasis, compare
              it with the way the organisation currently operates, and make
              proportionate improvements supported by objective evidence.
            </p>
            <p>
              A strong transition should protect what already works while
              exposing areas where the documented system and actual management
              practice have drifted apart.
            </p>

            <h2>What receives greater emphasis?</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 14,
                margin: "24px 0 34px",
              }}
            >
              {changes.map(([title, text]) => (
                <article
                  key={title}
                  style={{
                    padding: 20,
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
                </article>
              ))}
            </div>

            <h2>Five actions to begin now</h2>
            <ol>
              <li>
                <strong>Obtain and review the published standard.</strong> Work
                from the authoritative requirements and confirm the transition
                arrangements applicable to your certification.
              </li>
              <li>
                <strong>Brief leadership.</strong> Explain the business
                implications, not merely the changed clause wording. Leadership
                needs to understand its role in quality culture and transition
                governance.
              </li>
              <li>
                <strong>Complete an evidence-led gap review.</strong> Compare
                existing controls, behaviours, decisions and records with the
                revised emphasis.
              </li>
              <li>
                <strong>Create a controlled action plan.</strong> Assign owners,
                resources, completion dates, evidence expectations and approval
                routes.
              </li>
              <li>
                <strong>Verify implementation.</strong> Use internal audit,
                performance data and management review to test whether changes
                operate effectively in practice.
              </li>
            </ol>

            <h2>Avoid the document-rewrite trap</h2>
            <p>
              The transition should not become a document-renaming exercise. A
              revised policy or procedure does not demonstrate culture,
              leadership or effective implementation. Evidence may include
              decisions, behaviours, competence, process performance, issue
              escalation, action closure and learning from failure or
              opportunity.
            </p>

            <h2>How RPG Excellence can help</h2>
            <p>
              RPG Excellence can support organisations with an initial ISO
              9001:2026 transition review, leadership briefing, evidence-led gap
              assessment, controlled action planning, internal-audit preparation
              and management-review readiness.
            </p>
            <p>
              RPG Intelligence is being developed to connect requirements,
              evidence, findings, accountable actions and readiness reporting in
              one controlled assurance workflow. The aim is to show not only
              whether a clause has been addressed, but whether the management
              system is operating and improving.
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
                ISO 9001:2026 TRANSITION SUPPORT
              </span>
              <h2 style={{ color: "white" }}>
                Understand your current position before launching a large change
                programme.
              </h2>
              <p style={{ color: "#d5e3ef" }}>
                Book a focused consultation to discuss your certification cycle,
                present QMS and the most proportionate next step.
              </p>
              <Link
                className="button"
                href={`/${locale}/contact?topic=iso-9001-2026`}
                style={{ marginTop: 10 }}
              >
                Book an ISO 9001 consultation →
              </Link>
            </div>
          </section>
          <p style={{ marginTop: 24, color: "#617087", fontSize: 13 }}>
            Authoritative references:{" "}
            <a href={ISO_URL} target="_blank" rel="noopener noreferrer">
              ISO — ISO 9001:2026
            </a>{" "}
            ·{" "}
            <a href={BSI_URL} target="_blank" rel="noopener noreferrer">
              BSI — Key changes and guidance
            </a>
            . This article is implementation guidance and does not reproduce or
            replace the standard.
          </p>
          <section
            style={{
              marginTop: 32,
              padding: 28,
              border: "1px solid #dce5ef",
              borderRadius: 14,
              background: "#fff",
            }}
          >
            <span className="kicker">NEXT RPG INSIGHT</span>
            <h2>Quality Culture: what will an auditor expect to see?</h2>
            <p style={{ color: "#617087" }}>
              Continue with our practical follow-up on leadership behaviour,
              speaking up, process discipline, evidence and organisational
              learning.
            </p>
            <Link
              className="button"
              href={`/${locale}/insights/quality-culture-iso-9001-2026`}
            >
              Read the Quality Culture insight →
            </Link>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
