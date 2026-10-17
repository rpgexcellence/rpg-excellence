import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import TrackedLink from "../../../components/TrackedLink";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Security, Trust and Responsible AI | RPG Excellence",
  description: "How RPG Excellence approaches security, privacy, access control, resilience and responsible AI-supported work.",
  alternates: { canonical: "/en/security-and-trust" },
};

const areas = [
  ["Hosting and transport", "The service uses managed cloud infrastructure and HTTPS-protected connections. Hosting and subprocessors are governed through supplier and privacy arrangements."],
  ["Authentication and access", "Authenticated workspaces are protected through account-based access. Application records use ownership controls and database row-level security where implemented."],
  ["Data separation", "Organisation and owner identifiers are used to scope controlled platform records and reduce inappropriate cross-account access."],
  ["Enterprise API controls", "Integration credentials are organisation-scoped and permission-limited. Full API keys are displayed once, stored only as cryptographic digests, and may be expired or revoked. Request metadata supports an integration audit trail."],
  ["Backups and resilience", "Managed infrastructure, application recovery arrangements and business-continuity development support service resilience. Recovery claims are kept proportionate to tested arrangements."],
  ["Privacy and retention", "Personal data is handled under the published privacy notice. Users can contact RPG Excellence about access, correction, retention or deletion requirements."],
  ["Evidence and exports", "Controlled records and available reports are designed to support review, traceability and customer retention of relevant assurance outputs."],
  ["Incident contact", "Security or privacy concerns can be raised through the published contact route for triage and appropriate response."],
];

const aiControls = [
  ["Purpose", "AI-supported and automated features are decision-support tools. They help organise information, identify prompts and prepare structured draft material; they do not make certification, legal or regulatory decisions."],
  ["Human authority", "A competent user remains responsible for checking relevance, accuracy, context and evidence. Automated assistance cannot approve an audit, close a finding, accept a risk or verify corrective-action effectiveness on the user's behalf."],
  ["Current processing boundary", "Current controlled report builders can assemble draft narrative from approved records using RPG Excellence application logic. They do not require the user to provide a separate external AI service key."],
  ["Input discipline", "Users should provide only information needed for the task and must not enter passwords, recovery codes, secret keys or unrelated special-category personal data into assisted fields."],
  ["Output verification", "Suggested text may be incomplete, unsuitable or incorrect. It must be tested against source evidence, applicable standards, contractual obligations, local law and site-specific conditions before controlled use."],
  ["Future model changes", "If RPG Excellence introduces an external generative-model provider, the applicable feature documentation will identify the processing purpose, relevant data flow, provider role and user controls before customer use."],
  ["Traceability", "Controlled decisions should retain the responsible user, supporting evidence, review status and approval trail. Generated or assisted wording is not a substitute for objective evidence."],
  ["Challenge and correction", "Users should reject unsuitable suggestions and report material errors or security concerns through the published contact route so that the feature and associated guidance can be reviewed."],
];

export default async function SecurityTrust({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="trustPage">
        <section className="trustHero">
          <span>RPG EXCELLENCE · SECURITY AND TRUST</span>
          <h1>Clear safeguards for controlled assurance information.</h1>
          <p>RPG Excellence is built to help organisations manage sensitive audit, risk, evidence and improvement information. This page explains the operating principles applied to that responsibility without overstating certification or assurance.</p>
          <div>
            <TrackedLink href={`/${locale}/privacy`} event="privacy_notice_viewed">Read privacy notice</TrackedLink>
            <TrackedLink href={`/${locale}/ai-assurance`} event="ai_assurance_viewed">Review AI assurance</TrackedLink>
            <TrackedLink href={`/${locale}/contact?topic=Security%20and%20trust`} event="security_enquiry">Ask a security question</TrackedLink>
          </div>
        </section>

        <section className="trustGrid">
          {areas.map(([heading, text], index) => <article key={heading}><b>{String(index + 1).padStart(2, "0")}</b><h2>{heading}</h2><p>{text}</p></article>)}
        </section>

        <section className="aiAssurance">
          <header>
            <span>RESPONSIBLE AI AND AUTOMATION</span>
            <h2>Professional judgement remains the control.</h2>
            <p>RPG Excellence uses structured assistance to support assurance work. These boundaries apply to every automated or AI-supported feature.</p>
          </header>
          <div className="aiGrid">
            {aiControls.map(([heading, text], index) => <article key={heading}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{heading}</h3><p>{text}</p></div></article>)}
          </div>
          <div className="aiDecision"><strong>Controlled decision rule</strong><p>No assisted output becomes an approved assurance conclusion merely because the platform produced or suggested it. Approval remains attributable to an authorised person and must be supported by appropriate evidence.</p></div>
          <TrackedLink className="aiFrameworkLink" href={`/${locale}/ai-assurance`} event="ai_assurance_viewed">Read the complete AI Assurance and Guardrails statement →</TrackedLink>
        </section>

        <section className="trustBoundaries">
          <div><span>TRANSPARENT BOUNDARIES</span><h2>What RPG Excellence does—and does not claim.</h2></div>
          <ul>
            <li>Supports structured assessment, risk, evidence and improvement workflows.</li>
            <li>Does not issue accredited ISO certification.</li>
            <li>Does not guarantee conformity, security or uninterrupted availability.</li>
            <li>Does not replace competent professional, legal or regulatory advice.</li>
            <li>API availability does not provide unrestricted database access or guarantee compatibility with every third-party system.</li>
            <li>Continues to develop controls and documented assurance as the platform grows.</li>
          </ul>
        </section>

        <section className="trustCta">
          <div><span>NEED DUE-DILIGENCE INFORMATION?</span><h2>Discuss your organisation&apos;s security and assurance requirements.</h2></div>
          <TrackedLink href={`/${locale}/contact?topic=Security%20due%20diligence`} event="security_enquiry">Contact RPG Excellence →</TrackedLink>
        </section>
        <style>{styles}</style>
      </main>
    </PageShell>
  );
}

const styles = `
.trustPage{background:#f7fafc;color:#071d3a}.trustHero{max-width:1160px;margin:auto;padding:82px 28px 65px}.trustHero>span,.trustBoundaries span,.trustCta span,.aiAssurance>header>span{color:#078b91;font-size:11px;font-weight:950;letter-spacing:.14em}.trustHero h1{max-width:900px;margin:14px 0 22px;font-size:clamp(48px,5vw,72px);line-height:1;letter-spacing:-.05em}.trustHero p{max-width:900px;color:#526a80;font-size:18px;line-height:1.7}.trustHero>div{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.trustHero a,.trustCta a{display:inline-flex;min-height:49px;padding:0 19px;align-items:center;border-radius:8px;background:#1762e8;color:#fff;text-decoration:none;font-weight:900}.trustHero a:nth-child(2){border:1px solid #bdcbd7;background:#fff;color:#173b5b}.trustGrid{max-width:1160px;margin:auto;padding:0 28px 75px;display:grid;grid-template-columns:1fr 1fr;gap:13px}.trustGrid article{padding:26px;border:1px solid #d5e1ea;border-radius:14px;background:#fff}.trustGrid article>b{color:#078b91}.trustGrid h2{margin:16px 0 9px;font-size:21px}.trustGrid p{margin:0;color:#5b7287;line-height:1.62}.aiAssurance{padding:72px max(28px,calc((100% - 1104px)/2));background:linear-gradient(135deg,#eef8f7,#eef4ff)}.aiAssurance>header{max-width:850px}.aiAssurance>header h2{margin:10px 0 12px;font-size:clamp(36px,4vw,52px);letter-spacing:-.04em}.aiAssurance>header p{color:#536d82;font-size:17px;line-height:1.65}.aiGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:30px}.aiGrid article{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:22px;border:1px solid #cbdae5;border-radius:14px;background:#fff}.aiGrid article>b{color:#078b91;font-size:12px}.aiGrid h3{margin:0 0 7px;font-size:18px}.aiGrid p{margin:0;color:#597184;line-height:1.58}.aiDecision{margin-top:16px;padding:22px 24px;border-left:5px solid #1762e8;border-radius:12px;background:#082b50;color:#fff}.aiDecision strong{display:block;margin-bottom:7px;color:#65e0d7}.aiDecision p{margin:0;color:#d5e2ec;line-height:1.6}.aiFrameworkLink{display:inline-flex;margin-top:18px;color:#1459d9;text-decoration:none;font-weight:900}.trustBoundaries{max-width:none;padding:65px max(28px,calc((100% - 1104px)/2));display:grid;grid-template-columns:1fr 1fr;gap:60px;background:#082b50;color:#fff}.trustBoundaries h2{font-size:42px;letter-spacing:-.04em}.trustBoundaries ul{line-height:2;color:#ccdae6}.trustCta{max-width:1104px;margin:65px auto;padding:36px;display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;border-radius:18px;background:#e9f3ff}.trustCta h2{margin:9px 0;font-size:34px}@media(max-width:760px){.trustGrid,.aiGrid,.trustBoundaries,.trustCta{grid-template-columns:1fr}.trustGrid{padding:0 18px 50px}.trustHero{padding:55px 18px}.trustHero h1{font-size:44px}.aiAssurance{padding:50px 18px}.trustBoundaries{padding:50px 22px}.trustCta{margin:40px 18px;padding:26px}}
`;
