import Link from "next/link";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";

import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";

import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";

import { locales } from "../../../../lib/i18n";

export const metadata = { title: "Decoding ISO 14001:2026 | RPG Excellence", description: "Independent practitioner commentary and seven pocket guides to ISO 14001:2026. Digital PDF, £29.99.", alternates: { canonical: "/en/publications/decoding-iso-14001-2026" } };

export default async function Page({ params, searchParams }) {

  const { locale } = await params;

  if (!locales.includes(locale)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownerAccess = isPlatformOwner(user);
  const { session_id: sessionId } = await searchParams;

  const download = sessionId && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)

    ? `/api/publications/iso-14001-2026/download?session_id=${encodeURIComponent(sessionId)}` : null;

  return <PageShell locale={locale}><main className="simplePage"><div className="simpleInner" style={{maxWidth:960}}>

    <span className="kicker">RPG EXCELLENCE · DIGITAL PUBLICATIONS</span>

    <h1>Decoding ISO 14001:2026</h1>

    <p style={{fontSize:20}}>A Practical Reference and Pocket Guide</p>

    <p>Independent, evidence-led environmental management guidance for practitioners, internal auditors and leaders. Learn how to translate ISO 14001:2026 into decisions, operating controls and measurable improvement.</p>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:24,margin:"30px 0"}}>

      <section style={{padding:26,background:"#102b4a",color:"white",borderRadius:12}}><p style={{letterSpacing:2,fontSize:12}}>RPG EXCELLENCE</p><h2 style={{color:"white"}}>DECODING<br/>ISO 14001:2026</h2><p>A practical reference & pocket guide</p><p>24 pages · PDF · 2026 edition</p></section>

      <section style={{padding:26,border:"1px solid #d8e2eb",borderRadius:12}}>{ownerAccess ? (
        <><h2>Administrator access</h2><p>Your RPG Excellence platform-owner account includes access to this publication at no charge.</p>
        <a className="button" href="/api/publications/iso-14001-2026/download">Download PDF — Owner Access</a></>
      ) : (
        <><h2>£29.99</h2><p>One-off digital purchase. Secure Stripe checkout; download after confirmed payment.</p><PublicationPurchaseButton /></>
      )}

      {download && <p style={{marginTop:18}}><a className="button" href={download}>Download your purchased PDF</a><br/><small>Payment and account ownership are checked before delivery. If payment is still processing, try again shortly.</small></p>}

      <p style={{fontSize:13}}>Independent commentary; not an ISO or BSI publication. Requires access to an authorised copy of the standard.</p></section>

    </div>

    <h2>What is inside</h2><p>Clause-by-clause guidance for Clauses 4–10, practical environmental cases, audit trails, management questions, Annex A interpretation, a 90-day transition model and seven clause-linked Pocket Guides.</p>

    <p><Link href={`/${locale}/iso-14001`}>Explore ISO 14001 at a glance</Link> · <Link href={`/${locale}/pricing`}>All RPG Excellence pricing</Link></p>

  </div></main></PageShell>;

}
