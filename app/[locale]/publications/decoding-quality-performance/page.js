import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import QualityPerformancePurchaseButton from "../../../../components/QualityPerformancePurchaseButton";
import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { hasPublicationOwnerAccess } from "../../../../lib/quality-performance-publication";
export const dynamic = "force-dynamic";
export const metadata = { title: "Decoding Quality Performance — £4.99 | RPG Excellence", description: "Connect business priorities, quality decisions and verified results. A practical 20-page PDF with four worksheets and a worked example." };
export default async function Page({ params, searchParams }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const owner = hasPublicationOwnerAccess(user);
  const query = await searchParams;
  const sessionId = typeof query?.session_id === "string" && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(query.session_id) ? query.session_id : null;
  const downloadUrl = "/api/publications/quality-performance/download" + (sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "");
  return <PageShell locale={locale}><main className="simplePage"><div className="simpleInner" style={{maxWidth:960}}>
    <span className="kicker">RPG EXCELLENCE · PRACTITIONER SERIES</span>
    <h1>Decoding Quality Performance</h1>
    <p style={{fontSize:22}}>Can you prove quality is powering performance?</p>
    <img src="/images/publications/quality-performance.png" alt="Quality is powering performance — RPG Excellence" style={{width:"100%",height:"auto",borderRadius:14}} />
    <p>A practical guide to connecting business priorities, quality decisions and verified results, developed around World Quality Week 2026 and applying ISO 9001:2026.</p>
    <p>Move from reporting activity to demonstrating improvement: define the problem, investigate causes, establish a reliable baseline and check whether changes work.</p>
    <ul><li>A worked example connecting process performance, capacity and business value.</li><li>Practical guidance on leadership decisions and management review.</li><li>A focused 30-day improvement cycle.</li><li>Four worksheets for planning, evidence and review.</li></ul>
    <p><strong>£4.99</strong> · 20 pages · PDF digital download</p>
    {owner ? <><p>Your account has complimentary access.</p><a className="button" href="/api/publications/quality-performance/download">Download your PDF — free access</a></> : sessionId ? <><p>Your download is available after payment verification. Sign in with the account used at checkout and keep your confirmation link for future downloads.</p><a className="button" href={downloadUrl}>Download purchased PDF</a></> : <QualityPerformancePurchaseButton />}
    {query?.checkout === "cancelled" && <p>Checkout was cancelled. You can try again whenever you are ready.</p>}
    <p style={{fontSize:13,marginTop:28}}>Independent practitioner commentary by RPG Excellence. This is not an ISO or BSI publication and does not replace an authorised copy of the relevant standard.</p>
  </div></main></PageShell>;
}
