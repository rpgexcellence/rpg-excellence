import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";
import JsonLd from "../../../../components/JsonLd";
import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";
import { getPublication } from "../../../../lib/publications.mjs";

const product = getPublication("ISO9001-2026-INSIGHTS");
export const metadata = {
  title: "ISO 9001:2026 Technical Insights & Posters — £9.99 | RPG Excellence",
  description: "Seven technical articles, seven chapter covers and 21 supporting posters. Reviewed 53-page collected edition covering Clauses 4–10. £9.99 one-off digital purchase.",
  alternates: { canonical: "/en/publications/iso-9001-2026-technical-insights" },
};
const chapters = [
  [4, "Context", "The business assumptions behind every quality failure"],
  [5, "Leadership", "What leaders authorise under pressure"],
  [6, "Planning", "Why an opportunity deserves its own decision"],
  [7, "Support", "The certificate is current. Can the task be done correctly?"],
  [8, "Operation", "Who checked the requirement before authorising release?"],
  [9, "Performance evaluation", "The dashboard is green. What decision does the evidence support?"],
  [10, "Improvement", "The action is closed. What has actually improved?"],
];

export default async function Page({ params, searchParams }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const query = await searchParams;
  const sessionId = typeof query?.session_id === "string" && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(query.session_id) ? query.session_id : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const owner = isPlatformOwner(user);
  const download = "/api/publications/iso-9001-2026-insights/download";
  const reference = owner ? "" : `?session_id=${encodeURIComponent(sessionId || "")}`;
  const pdfLink = download + reference;
  const bundleLink = pdfLink + (reference ? "&" : "?") + "format=bundle";
  return <PageShell locale={locale}>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name: product.name,
      description: product.description, image: "https://www.rpgexcellence.com/publications/iso-9001-2026-technical-insights-cover.png",
      brand: { "@type": "Brand", name: "RPG Excellence" },
      offers: { "@type": "Offer", price: "9.99", priceCurrency: "GBP", availability: "https://schema.org/InStock", url: `https://www.rpgexcellence.com/${locale}/publications/${product.slug}` } }} />
    <main className="simplePage"><div className="simpleInner" style={{ maxWidth: 1100 }}>
      <span className="kicker">RPG EXCELLENCE · COLLECTED EDITION</span>
      <h1>ISO 9001:2026 Technical Insights &amp; Poster Collection</h1>
      <p style={{ fontSize: 20 }}>The complete seven-part published series on Clauses 4 to 10.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 32, margin: "32px 0", alignItems: "start" }}>
        <img src="/publications/iso-9001-2026-technical-insights-cover.png" alt="RPG Excellence ISO 9001:2026 Technical Insights and Poster Collection front cover" width="612" height="792" style={{ width: "100%", maxWidth: 390, height: "auto", borderRadius: 12, border: "1px solid #d8e2eb" }} />
        <section style={{ padding: 28, border: "1px solid #d8e2eb", borderRadius: 14, background: "#fff" }} aria-label="Purchase and download">
          <h2>£9.99</h2>
          <p>One-off digital purchase. A 53-page PDF and a download bundle containing the PDF and individual PNG artwork.</p>
          <ul><li>Seven complete technical articles</li><li>Seven original chapter covers</li><li>Twenty-one supporting posters</li><li>Clickable contents and chapter bookmarks</li></ul>
          {owner ? <p><strong>Platform owner access</strong><br />Your account includes this publication at no charge.</p> : <>
            <p>Sign in or create an account, then complete secure Stripe checkout. Download access is checked against the purchasing account and confirmed payment.</p>
            <PublicationPurchaseButton publication="ISO9001-2026-INSIGHTS" />
          </>}
          {(owner || sessionId) && <div style={{ marginTop: 22 }}>
            <h3>{owner ? "Your downloads" : "Access your purchase"}</h3>
            <p><a className="button" href={pdfLink}>Download PDF</a></p>
            <p><a className="button" href={bundleLink}>Download PDF and artwork bundle</a></p>
            {!owner && <small>Payment and account ownership are verified before delivery. If payment is processing, try again shortly. Retain this page link for repeat access.</small>}
          </div>}
          {query?.checkout === "cancelled" && <p role="status">Checkout was cancelled. You can start again when ready.</p>}
          <p style={{ fontSize: 13 }}>Digital download · English · October 2026 · Author: Rafal Pereszczako · No subscription required.</p>
        </section>
      </div>
      <h2>Evidence that supports a decision</h2>
      <p>Follow the evidence from context and leadership through planning, delivery, evaluation and improvement. The articles combine technical analysis, hypothetical worked examples, objective evidence and questions for managers and auditors. The posters provide concise prompts for awareness and team discussion.</p>
      <p>This collected edition brings together the previously published RPG Excellence Technical Insight series, with a new front cover, contents and source section. It is a separate companion to the <Link href={`/${locale}/publications/decoding-iso-9001-2026`}>Decoding ISO 9001:2026 practical guide</Link>.</p>
      <h2>Inside the collection</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
        {chapters.map(([clause, topic, title]) => <article key={clause} style={{ padding: 20, border: "1px solid #d8e2eb", borderRadius: 12 }}><small>CLAUSE {clause}</small><h3>{topic}</h3><p>{title}</p></article>)}
      </div>
      <h2>Use within your organisation</h2>
      <p>For quality managers, business leaders, process owners and internal auditors. Purchasers may use the collection and posters for their own internal reference and team briefings. Public redistribution, resale or republication requires written permission from RPG Excellence.</p>
      <p style={{ fontSize: 13 }}>Independent technical interpretation; not issued or endorsed by ISO or BSI. This collection does not replace the licensed standard or confer certification. Worked examples are hypothetical. Illustrative poster photography is generated artwork.</p>
      <p><Link href={`/${locale}/publications`}>All publications</Link> · <Link href={`/${locale}/iso-9001`}>ISO 9001 at a glance</Link> · <Link href={`/${locale}/pricing`}>RPG Excellence pricing</Link></p>
    </div></main>
  </PageShell>;
}
