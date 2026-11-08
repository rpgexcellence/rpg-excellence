import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";
import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Decoding Environmental Aspects — £7.99 | RPG Excellence",
  description: "A practical 30-page environmental workbook with five reusable worksheets, a worked water-and-waste case and four guidance posters. PDF bundle £7.99.",
  openGraph: {
    title: "Decoding Environmental Aspects — RPG Excellence",
    description: "From a listed aspect to a control you can test. 30-page workbook, five worksheets and four guidance posters — £7.99.",
    images: [{ url: "/images/publications/environmental-aspects.png", alt: "Decoding Environmental Aspects publication" }],
  },
};

const features = [
  ["Explain the decision", "Connect the activity, environmental interaction, significance decision and evidence. Apply climate, biodiversity and life cycle thinking to a real process."],
  ["Check the control", "Clarify ownership, contractor interfaces, operating conditions and review triggers. Use practical questions to test whether a control works."],
  ["Test the improvement", "Work through water use and waste trade-offs. Distinguish absolute performance, intensity and modelled financial effects before making a claim."],
];

export default async function Page({ params, searchParams }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const authenticated = !error && Boolean(user?.id);
  const owner = authenticated && isPlatformOwner(user);
  const sessionId = typeof query?.session_id === "string" && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(query.session_id)
    ? query.session_id : null;
  const returnPath = "/" + locale + "/publications/decoding-environmental-aspects";
  const returnWithSession = returnPath + (sessionId ? "?session_id=" + encodeURIComponent(sessionId) : "");
  const loginPath = "/portal/login?next=" + encodeURIComponent(returnWithSession);
  const download = "/api/publications/environmental-aspects/download";
  const guideDownload = download + (sessionId ? "?session_id=" + encodeURIComponent(sessionId) : "");
  const posterDownload = download + "?asset=posters" + (sessionId ? "&session_id=" + encodeURIComponent(sessionId) : "");

  return <PageShell locale={locale}>
    <main className="simplePage"><div className="simpleInner" style={{ maxWidth: 1120 }}>
      <Link href={"/" + locale + "/publications"}>← All publications</Link>
      <p className="kicker" style={{ marginTop: 24 }}>RPG EXCELLENCE · ENVIRONMENTAL MANAGEMENT</p>
      <h1>Decoding Environmental Aspects</h1>
      <p style={{ fontSize: 22, maxWidth: 850 }}>From a listed aspect to a control you can test.</p>
      <img src="/images/publications/environmental-aspects.png" alt="Your aspects register is complete. Do the controls work? Decoding Environmental Aspects — £7.99." width="1920" height="1008" style={{ display: "block", width: "100%", height: "auto", borderRadius: 16, margin: "24px 0" }} />
      <p style={{ fontSize: 19, maxWidth: 950 }}>A practical workbook for environmental managers, QHSE leaders and operational teams. Review one process, make the environmental reasoning visible and connect the assessment to an owner, a control and evidence of performance.</p>
      <p><strong style={{ fontSize: 28 }}>£7.99</strong> · One-time purchase · 30-page PDF in English · First edition, November 2026</p>
      <p>Includes five reusable worksheets and four guidance posters within the workbook, plus a separate four-page printable poster PDF. No platform subscription is required to purchase; sign in to buy and access your files.</p>

      {owner ? <section aria-label="Complimentary publication access">
        <p><strong>Your account has complimentary access to both files.</strong></p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><a className="button" href={download}>Download workbook PDF</a><a className="button" href={download + "?asset=posters"}>Download printable posters</a></div>
      </section> : sessionId ? <section aria-label="Purchased publication downloads">
        <p>Downloads are released after server-side payment verification. Use the account used at checkout and keep this confirmation page link for future downloads.</p>
        {authenticated ? <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><a className="button" href={guideDownload}>Download purchased workbook</a><a className="button" href={posterDownload}>Download purchased posters</a></div> : <Link className="button" href={loginPath}>Sign in to access your purchase</Link>}
      </section> : <PublicationPurchaseButton publication="ENVIRONMENTAL-ASPECTS-GUIDE" />}
      {query?.checkout === "cancelled" && <p role="status">Checkout was cancelled. You can return when you are ready.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24, margin: "36px 0" }}>{features.map(([title, text]) => <section key={title} style={{ borderTop: "3px solid #087e82", paddingTop: 18 }}><h2 style={{ fontSize: 23 }}>{title}</h2><p>{text}</p></section>)}</div>
      <h2>What is inside</h2>
      <ul>
        <li>Process boundaries, control and influence, and clear aspect and impact descriptions.</li>
        <li>Normal, abnormal and emergency conditions; climate mitigation and adaptation; location-specific biodiversity and life cycle considerations.</li>
        <li>An explained example significance method, compliance evidence, operational controls and environmental change review.</li>
        <li>Emergency exercises, a worked water-and-waste trial and a suggested 90-day implementation programme.</li>
        <li>Five worksheets covering context, significance, change, control verification and management decisions.</li>
        <li>Four branded posters on environmental interactions, climate, life cycle perspective and change planning.</li>
      </ul>
      <h2>Use it with your team</h2>
      <p>Purchasers may copy and adapt the five worksheets for internal use within their own organisation. The four posters may be printed and used internally with RPG Excellence attribution retained. Resale, public redistribution and inclusion in a commercial template library are not permitted.</p>
      <p style={{ fontSize: 14 }}>Independent practitioner guidance for environmental management in the context of ISO 14001:2026. Not an ISO or BSI publication, not a complete interpretation of the standard and not a substitute for a licensed copy or site-specific legal and technical advice. The worked examples and numerical results are fictional teaching examples, not customer results or promised savings.</p>
      <p>Questions about the publication? <a href="mailto:info@rpgexcellence.com">info@rpgexcellence.com</a></p>
    </div></main>
  </PageShell>;
}
