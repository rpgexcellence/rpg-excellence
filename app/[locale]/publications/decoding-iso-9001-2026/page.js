import Link from "next/link";

import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";

import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";

import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";

export const metadata = { title: "Decoding ISO 9001:2026 | RPG Excellence", description: "Independent clause-by-clause guidance to ISO 9001:2026 with worked quality examples, audit evidence and management decisions. Digital PDF, £29.99.", alternates: { canonical: "/en/publications/decoding-iso-9001-2026" } };

export default async function Page({ params, searchParams }) {

  const { locale } = await params;

  if (!locales.includes(locale)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownerAccess = isPlatformOwner(user);

  const { session_id: sessionId } = await searchParams;

  const download = sessionId && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)

    ? `/api/publications/iso-9001-2026/download?session_id=${encodeURIComponent(sessionId)}` : null;

  return <PageShell locale={locale}><main className="simplePage"><div className="simpleInner" style={{maxWidth:960}}>

    <span className="kicker">RPG EXCELLENCE · DIGITAL PUBLICATIONS</span>

    <h1>Decoding ISO 9001:2026</h1>

    <p style={{fontSize:20}}>A Practical Guide to Requirements, Evidence and Quality Decisions</p>

    <p>Turn quality management requirements into clear process controls, stronger audit evidence and confident management decisions. Written for quality managers, process owners, internal auditors and business leaders.</p>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:24,margin:"30px 0"}}>

      <section style={{padding:26,background:"#102b4a",color:"white",borderRadius:12}}><p style={{letterSpacing:2,fontSize:12}}>RPG EXCELLENCE</p><h2 style={{color:"white"}}>DECODING<br/>ISO 9001:2026</h2><p>Practical quality management guide</p><p>33 pages · PDF · 2026 edition</p></section>

      <section style={{padding:26,border:"1px solid #d8e2eb",borderRadius:12}}><h2>£29.99</h2><p>One-off digital purchase. Secure Stripe checkout; download after confirmed payment.</p>{ownerAccess ? (
        <div>
          <p style={{color:"#087f5b",fontWeight:700}}>RPG Excellence — Platform Owner Access</p>
          <p>Your account includes this publication at no charge.</p>
          <a className="button" href="/api/publications/iso-9001-2026/download">Download PDF — Owner Access</a>
        </div>
      ) : (
        <PublicationPurchaseButton publication="ISO9001-2026-GUIDE" />
      )}

      {!ownerAccess && download && <p style={{marginTop:18}}><a className="button" href={download}>Download your purchased PDF</a><br/><small>Payment and account ownership are checked before delivery. If payment is still processing, try again shortly.</small></p>}

      <p style={{fontSize:13}}>Independent commentary; not an ISO or BSI publication. Requires access to an authorised copy of the standard.</p></section>

    </div>

    <h2>What is inside</h2><p>Coverage of Clauses 1–10 and Annex A, practical examples, audit challenges, evidence suggestions, risk and opportunity decisions, supplier controls, leadership accountability and corrective action.</p>

    <p><Link href={`/${locale}/iso-9001`}>Explore ISO 9001 at a glance</Link> · <Link href={`/${locale}/pricing`}>All RPG Excellence pricing</Link></p>

  </div></main></PageShell>;

}
