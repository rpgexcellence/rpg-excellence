import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

const BSI_URL =
  "https://www.bsigroup.com/en-GB/products-and-services/standards-services/iso-9001-2026-key-changes-and-guidance/";

export const metadata = {
  title: "ISO 9001:2026 Key Changes and Readiness Guidance | RPG Excellence",
  description:
    "A practical overview of the ISO 9001:2026 changes, what they mean for quality management systems and how to prepare your organisation.",
  alternates: { canonical: "/en/insights/iso-9001-2026-update" },
};

const changes = [
  [
    "Clause 3",
    "Terms and definitions",
    "The new edition introduces clearer language around ethical behaviour and quality culture, supporting consistent interpretation across the management system.",
  ],
  [
    "Clause 4",
    "Context of the organisation",
    "Climate change and sustainability become more explicit considerations when evaluating internal and external issues and relevant interested-party expectations.",
  ],
  [
    "Clause 5",
    "Leadership",
    "Top management has a clearer role in building quality culture, encouraging ethical behaviour and keeping the QMS aligned with organisational direction.",
  ],
  [
    "Clause 6",
    "Planning",
    "Risk and opportunity are separated more clearly. The revision strengthens opportunity-based thinking and the organisation’s capacity to adapt and remain resilient.",
  ],
  [
    "Clause 7",
    "Support",
    "Awareness is broadened so that people understand their contribution not only to conformity, but also to quality culture and ethical conduct.",
  ],
  [
    "Clause 8",
    "Operation",
    "The operational framework remains recognisable. Adjustments mainly improve terminology, clarity and traceability rather than introducing a wholesale redesign.",
  ],
  [
    "Clause 9",
    "Performance evaluation",
    "Core monitoring, analysis, audit and management-review requirements remain. Organisations should make stronger practical use of performance data and trends.",
  ],
  [
    "Clause 10",
    "Improvement",
    "Continual improvement remains central, with leadership responsibility and the connection between evidence, action and sustained improvement made more explicit.",
  ],
  [
    "Annex A",
    "Implementation guidance",
    "Expanded supplementary guidance helps organisations interpret and apply the requirements. It supports implementation but does not replace the normative clauses.",
  ],
];

export default async function ISO90012026Update({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="isoUpdatePage">
        <section className="isoUpdateHero">
          <div>
            <span className="isoUpdateKicker">
              STANDARDS UPDATE · SEPTEMBER 2026
            </span>
            <h1>ISO 9001:2026 is published. Prepare with purpose.</h1>
            <p>
              The new edition keeps the familiar quality-management framework
              while strengthening quality culture, ethical leadership, climate
              considerations, opportunity and resilience.
            </p>
            <div className="isoUpdateHeroActions">
              <Link
                className="homePrimaryCta"
                href={`/${locale}/contact?topic=iso-9001-2026`}
              >
                Book an ISO 9001 consultation <span>→</span>
              </Link>
              <a
                className="homeSecondaryCta"
                href={BSI_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the BSI guidance <span>↗</span>
              </a>
            </div>
          </div>
          <aside>
            <span>THE PRACTICAL MESSAGE</span>
            <strong>Evolution, not reinvention.</strong>
            <p>
              Start from your current QMS. Review the changed emphasis, test the
              evidence and control the transition.
            </p>
          </aside>
        </section>
        <section className="isoUpdateLead">
          <div>
            <span>WHAT HAS CHANGED</span>
            <h2>Clause-by-clause overview</h2>
          </div>
          <p>
            This is a concise implementation summary, not a reproduction of the
            standard. Organisations should obtain the published standard and
            confirm applicable transition arrangements with their certification
            body.
          </p>
        </section>
        <section className="isoUpdateChanges">
          {changes.map(([clause, title, text]) => (
            <article key={clause}>
              <span>{clause}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section className="isoUpdatePlan">
          <div>
            <span>RPG READINESS PATH</span>
            <h2>Turn the release into a controlled transition.</h2>
            <p>
              A short, evidence-led review will show what can remain, what needs
              clarification and where operating practice must change.
            </p>
          </div>
          <ol>
            <li>
              <b>01</b>
              <span>
                <strong>Confirm the baseline</strong>Map the current QMS, scope,
                processes and certification cycle.
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                <strong>Review the changes</strong>Compare current controls and
                evidence against the revised emphasis.
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                <strong>Assign ownership</strong>Give each action an accountable
                owner, due date and required evidence.
              </span>
            </li>
            <li>
              <b>04</b>
              <span>
                <strong>Implement and communicate</strong>Update controlled
                information, awareness and operational practice.
              </span>
            </li>
            <li>
              <b>05</b>
              <span>
                <strong>Verify readiness</strong>Use internal audit and
                management review to test effective implementation.
              </span>
            </li>
          </ol>
        </section>
        <section className="isoUpdateCta">
          <div>
            <span>ISO 9001:2026 SUPPORT</span>
            <h2>Know what the revision means for your organisation.</h2>
            <p>
              Book a focused consultation with RPG Excellence to discuss your
              present QMS, priorities and a proportionate transition plan.
            </p>
          </div>
          <Link
            className="homePrimaryCta"
            href={`/${locale}/contact?topic=iso-9001-2026`}
          >
            Book consultation <span>→</span>
          </Link>
        </section>
        <p className="isoUpdateSource">
          Source and further reading:{" "}
          <a href={BSI_URL} target="_blank" rel="noopener noreferrer">
            BSI — ISO 9001:2026 key changes and guidance ↗
          </a>
        </p>
      </main>
    </PageShell>
  );
}
