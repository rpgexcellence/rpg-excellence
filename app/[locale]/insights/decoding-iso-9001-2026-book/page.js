import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Decoding ISO 9001:2026 — New Practical Guide | RPG Insights",
  description: "Introducing RPG Excellence's independent 33-page ISO 9001:2026 guide covering requirements, audit evidence and quality decisions.",
  alternates: { canonical: "/en/insights/decoding-iso-9001-2026-book" },
};

export default async function Article({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <main className="simplePage"><div className="simpleInner" style={{ maxWidth: 980 }}>
        <p><Link href={`/${locale}/insights`}>← Back to RPG Insights</Link></p>
        <span className="kicker">RPG INSIGHTS · ISSUE 027 · NEW PUBLICATION</span>
        <h1>Decoding ISO 9001:2026</h1>
        <p style={{ fontSize: 21 }}>A Practical Guide to Requirements, Evidence and Quality Decisions</p>
        <p>Understanding quality management requirements is one thing. Applying them consistently in daily operations is another. Our new independent publication is designed to help quality professionals and business leaders turn requirements into practical decisions, effective controls and useful evidence.</p>
        <section className="assuranceCard" style={{ padding: 28, margin: "26px 0" }}>
          <h2>What is inside?</h2>
          <ul>
            <li>Practical guidance across Clauses 1–10 and Annex A.</li>
            <li>Examples of process controls and objective audit evidence.</li>
            <li>Leadership accountability and quality decision-making.</li>
            <li>Risk, opportunity and supplier management considerations.</li>
            <li>Performance evaluation, internal audits and corrective action.</li>
          </ul>
          <h2>Who is it for?</h2>
          <p>Quality managers, internal auditors, process owners, consultants and leaders responsible for implementing or improving a quality management system.</p>
          <h2>Practical guidance, without unnecessary complexity</h2>
          <p>This book does not reproduce the standard. It explains how to interpret requirements in context, assess implementation and recognise credible evidence of an effective quality management system.</p>
        </section>
        <div style={{ padding: 26, border: "1px solid #d8e2eb", borderRadius: 12, margin: "24px 0" }}>
          <h2>33-page digital PDF · £29.99</h2>
          <p>One-off purchase through RPG Excellence.</p>
          <p><Link className="button" href={`/${locale}/publications/decoding-iso-9001-2026`}>Explore the publication</Link></p>
        </div>
        <p style={{ fontSize: 14 }}>Independent RPG Excellence commentary. Not an ISO or BSI publication or endorsement. This guide does not replace an authorised copy of the applicable standard.</p>
      </div></main>
    </PageShell>
  );
}
