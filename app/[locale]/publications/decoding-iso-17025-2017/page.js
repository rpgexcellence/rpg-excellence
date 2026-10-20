import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";
import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";

export const metadata = {
  title: "Decoding ISO/IEC 17025:2017 | RPG Excellence",
  description: "Independent 52-page practical laboratory competence guide with technical applications, examples, audit evidence, templates and posters. Digital PDF, £29.99.",
  alternates: { canonical: "/en/publications/decoding-iso-17025-2017" },
};

const topics = [
  "Impartiality risks, employee relationships and safeguards",
  "Competence, authorisation and monitoring of personnel",
  "Equipment, calibration and metrological traceability",
  "Method selection, verification and validation",
  "Measurement uncertainty and decision rules",
  "Proficiency testing, technical quality control and result validity",
  "Reporting, nonconforming work and corrective action",
  "Information management, internal audits and management review",
];

export default async function Page({ params, searchParams }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Both protected RPG Excellence owner accounts are resolved through
  // the existing shared helper. No administrator permissions are changed.
  const ownerAccess = isPlatformOwner(user);
  const { session_id: sessionId } = await searchParams;
  const download = sessionId && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)
    ? `/api/publications/iso-17025-2017/download?session_id=${encodeURIComponent(sessionId)}`
    : null;

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: 1020 }}>
          <span className="kicker">RPG EXCELLENCE · DECODING STANDARDS</span>
          <h1>Decoding ISO/IEC 17025:2017</h1>
          <p style={{ fontSize: 20 }}>From Laboratory Requirements to Technical Competence, Valid Results and Audit Evidence</p>
          <p>Developed for testing and calibration laboratories, technical managers, quality specialists and auditors. This practical guide takes you beyond a summary of requirements and into the controls, technical judgments and evidence needed in day-to-day laboratory operations.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24, margin: "32px 0" }}>
            <section style={{ padding: 30, background: "#102b4a", color: "#fff", borderRadius: 14 }}>
              <p style={{ letterSpacing: 2, fontSize: 12, color: "#b9e6ea" }}>RPG EXCELLENCE · TECHNICAL SERIES</p>
              <h2 style={{ color: "#fff", fontSize: 31, lineHeight: 1.2, margin: "24px 0" }}>DECODING<br />ISO/IEC<br />17025:2017</h2>
              <p>Laboratory competence | Technical decisions | Evidence-based assurance</p>
              <p style={{ marginTop: 32, color: "#b9e6ea" }}>52 pages · Digital PDF · 2026 release</p>
            </section>
            <section style={{ padding: 30, border: "1px solid #d8e2eb", borderRadius: 14, background: "#fff" }}>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>DIGITAL PUBLICATION</p>
              <h2>£29.99</h2>
              <p>One-off purchase through secure Stripe checkout. Download after confirmed payment.</p>
              {ownerAccess ? (
                <div>
                  <p style={{ color: "#087f5b", fontWeight: 700 }}>RPG Excellence — Platform Owner Access</p>
                  <p>Your administrator account includes this publication at no charge.</p>
                  <a className="button" href="/api/publications/iso-17025-2017/download">Download PDF — Owner Access</a>
                </div>
              ) : (
                <PublicationPurchaseButton publication="ISO17025-2017-GUIDE" />
              )}
              {!ownerAccess && download && (
                <p style={{ marginTop: 20 }}><a className="button" href={download}>Download your purchased PDF</a><br /><small>Your account and payment will be verified before delivery.</small></p>
              )}
              <p style={{ fontSize: 13, marginTop: 22 }}>Independent RPG Excellence commentary. Not an ISO, IEC, BSI or accreditation-body publication and not a substitute for an authorised copy of the standard.</p>
            </section>
          </div>
          <h2>What you will learn</h2>
          <p>Coverage of Clauses 1–8 and Annexes A and B, with implementation examples and additional technical application chapters.</p>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: "12px 28px", paddingLeft: 22 }}>
            {topics.map((topic) => <li key={topic}>{topic}</li>)}
          </ul>
          <h2>Designed for practical use</h2>
          <p>Includes worked scenarios, illustrative risk controls, audit questions, example records, technical templates and printable posters. Where ANAB-specific requirements are discussed, they are distinguished from the underlying ISO/IEC 17025 requirements.</p>
          <p><Link href={`/${locale}/publications`}>Browse all publications</Link> · <Link href={`/${locale}/insights/decoding-iso-17025-2017-publication`}>Read the publication newsletter</Link></p>
        </div>
      </main>
    </PageShell>
  );
}
