import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";
import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";
import { CLAUSE_PUBLICATIONS, getClausePublicationBySlug } from "../../../../lib/iso9001-clause-publications.mjs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale, publication: slug } = await params;
  const publication = getClausePublicationBySlug(slug);
  if (!locales.includes(locale) || !publication) notFound();
  return {
    title: publication.name + " — £4.99 | RPG Excellence",
    description: publication.description,
    openGraph: {
      title: publication.name,
      description: publication.description,
      images: [{ url: publication.image, alt: publication.name + " front poster" }],
    },
  };
}

export default async function Page({ params, searchParams }) {
  const { locale, publication: slug } = await params;
  const publication = getClausePublicationBySlug(slug);
  if (!locales.includes(locale) || !publication) notFound();
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const authenticated = !error && Boolean(user?.id);
  const owner = authenticated && isPlatformOwner(user);
  const sessionId = typeof query?.session_id === "string" && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(query.session_id)
    ? query.session_id : null;
  const pagePath = "/" + locale + "/publications/" + publication.slug;
  const returnPath = pagePath + (sessionId ? "?session_id=" + encodeURIComponent(sessionId) : "");
  const loginPath = "/portal/login?next=" + encodeURIComponent(returnPath);
  const download = "/api/publications/iso-9001-2026-clauses/" + publication.clause + "/download";
  const guideUrl = download + (sessionId ? "?session_id=" + encodeURIComponent(sessionId) : "");
  const postersUrl = download + "?asset=posters" + (sessionId ? "&session_id=" + encodeURIComponent(sessionId) : "");

  return <PageShell locale={locale}>
    <main className="simplePage"><div className="simpleInner" style={{ maxWidth: 1120 }}>
      <Link href={"/" + locale + "/publications"}>← All publications</Link>
      <p className="kicker" style={{ marginTop: 24 }}>RPG EXCELLENCE · ISO 9001:2026 PRACTITIONER SERIES</p>
      <h1>Clause {publication.clause}: {publication.topic}</h1>
      <p style={{ fontSize: 22, maxWidth: 920 }}>{publication.promise}</p>
      <img src={publication.image} alt={publication.name + " publication front poster"} width="1536" height="1024" style={{ display: "block", width: "100%", height: "auto", borderRadius: 16, margin: "24px 0" }} />
      <h2>{publication.name}</h2>
      <p style={{ fontSize: 19 }}>An expanded practical guide for IMS managers, engineers and leadership teams. Connect the clause requirements with operating decisions, useful evidence and the judgement needed to assess results.</p>
      <p><strong style={{ fontSize: 28 }}>£{(publication.unitAmount / 100).toFixed(2)}</strong> · {publication.pages} pages · PDF in English · One-time purchase</p>
      <p>Includes two poster annexes within the book and a separate two-page A3 printable poster PDF. No platform subscription is required to purchase. Sign in to buy and access your files.</p>

      {owner ? <section aria-label="Complimentary publication access">
        <p><strong>Your account has complimentary access to this guide and its posters.</strong></p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><a className="button" href={download}>Download guide PDF</a><a className="button" href={download + "?asset=posters"}>Download printable posters</a></div>
      </section> : sessionId ? <section aria-label="Purchased publication downloads">
        <p>Downloads are released after payment verification. Use the account used at checkout and retain this confirmation page link for future downloads.</p>
        {authenticated ? <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><a className="button" href={guideUrl}>Download purchased guide</a><a className="button" href={postersUrl}>Download purchased posters</a></div> : <Link className="button" href={loginPath}>Sign in to access your purchase</Link>}
      </section> : <PublicationPurchaseButton publication={publication.code} />}
      {query?.checkout === "cancelled" && <p role="status">Checkout was cancelled. You can return when you are ready.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24, margin: "36px 0" }}>
        <section style={{ borderTop: "3px solid #087e82", paddingTop: 18 }}><h2>Understand the requirement</h2><p>All related numbered subclauses, plain-English explanations and references to the supplied standard’s informative Annex A. Required outcomes are distinguished from recommended methods.</p></section>
        <section style={{ borderTop: "3px solid #087e82", paddingTop: 18 }}><h2>Apply it to the work</h2><p>Separate applications for IMS managers, engineers and leaders, with two fictional scenarios and connections to other QMS clauses and integrated management systems.</p></section>
        <section style={{ borderTop: "3px solid #087e82", paddingTop: 18 }}><h2>Test the evidence</h2><p>Audit prompts, common misinterpretations, two reusable worksheets and two printable posters to support discussion and a reasoned decision.</p></section>
      </div>
      <h2>What this guide covers</h2>
      <ul>{publication.contents.map(title => <li key={title}>{title}</li>)}</ul>
      <h2>Put it into practice</h2>
      <p><strong>{publication.question}</strong></p>
      <p>Select one real process, review it with its owner and use the worksheets to record the evidence, authority and next decision. The examples are teaching scenarios; the observation periods and methods are recommendations.</p>
      <h2>Use with your own team</h2>
      <p>Purchasers may copy and adapt the two worksheets and print the poster annexes for internal use within their own organisation, retaining RPG Excellence attribution. Resale, public redistribution and inclusion in a commercial template library are not permitted.</p>
      <p style={{ fontSize: 14 }}>Independent RPG Excellence practitioner commentary. Not an ISO or BSI publication and not a replacement for a licensed copy of ISO 9001:2026. Supporting references are identified in the guide. All scenarios and numerical results are fictional, not customer results or promised savings. Photography is illustrative.</p>
      <h2>Explore the other clause guides</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{CLAUSE_PUBLICATIONS.filter(p => p.clause !== publication.clause).map(p => <Link key={p.code} href={"/" + locale + "/publications/" + p.slug}>Clause {p.clause}: {p.topic}</Link>)}</div>
      <p style={{ marginTop: 24 }}>Publication enquiries: <a href="mailto:info@rpgexcellence.com">info@rpgexcellence.com</a></p>
    </div></main>
  </PageShell>;
}
