import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../../components/Footer";
import Header from "../../../../components/Header";
import { copy, locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Internal Audit Hub at a Glance | RPG Excellence",
  description: "Explore the RPG Excellence Internal Audit Hub: risk-based programmes, controlled audit delivery, objective evidence, findings, CAPA, auditor competence and effectiveness verification.",
};

const journey = [
  ["01", "Set the mandate", "Define the programme purpose, governance, standards, locations and audit cycle."],
  ["02", "Prioritise by risk", "Use evidence-led FMEA planning to focus audit resources where assurance matters most."],
  ["03", "Plan and perform", "Build the audit plan, allocate competent auditors and retain objective evidence."],
  ["04", "Control findings", "Connect findings to criteria, owners, corrective actions, due dates and supporting evidence."],
  ["05", "Verify and report", "Confirm effectiveness independently and give management a live assurance view."],
];

const documents = [
  ["Programme governance", "Audit programme mandates, scope, standards, locations, cycle and controlled changes."],
  ["Planning records", "Risk profiles, FMEA scoring, audit plans, agendas, sampling rationale and notifications."],
  ["Fieldwork evidence", "Checklists, interview notes, sampled records, uploaded evidence and traceable conclusions."],
  ["Findings and CAPA", "Finding statements, root-cause records, corrective actions, owners, deadlines and closure evidence."],
  ["Competence records", "Auditor scope, training, experience, authorisation and periodic performance verification."],
  ["Management outputs", "Programme dashboards, reports, trends, overdue actions and effectiveness status."],
];

export default async function InternalAuditGlancePage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return <>
    <Header locale={locale} nav={t.nav} />
    <main className="iagPage">
      <section className="iagHero">
        <div className="iagHeroCopy">
          <span className="iagEyebrow">INTERNAL AUDIT HUB · PRODUCT TOUR</span>
          <h1>See the complete audit journey <em>before you begin.</em></h1>
          <p>The Hub connects programme governance, risk-based planning, audit delivery, objective evidence, findings, corrective action and independent verification in one controlled workspace.</p>
          <div className="iagActions">
            <Link className="iagButton primary" href="/portal/login?mode=create">Start your 14-day free trial →</Link>
            <Link className="iagButton secondary" href={`/${locale}/internal-audit`}>Back to Internal Audit Hub</Link>
          </div>
          <div className="iagChecks"><span>✓ Real product views</span><span>✓ No credit card required</span><span>✓ Built for ISO management systems</span></div>
        </div>
        <div className="iagHeroVisual">
          <img src="/internal-audit-glance/command-centre.png" alt="RPG Excellence Internal Audit Command Centre showing live programme and finding status" />
          <div className="iagFloat one"><b>11</b><span>Active audits</span></div>
          <div className="iagFloat two"><b>2</b><span>Open findings</span></div>
        </div>
      </section>

      <section className="iagJourney">
        <div className="iagSectionHead"><span className="iagEyebrow">WHAT THE CUSTOMER CAN EXPECT</span><h2>One connected assurance lifecycle.</h2><p>Every stage builds the evidence needed for the next—without losing the relationship between the audit, finding, action and final verification.</p></div>
        <div className="iagJourneyGrid">{journey.map(([n,title,text]) => <article key={n}><b>{n}</b><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="iagFeature light">
        <div className="iagFeatureCopy"><span className="iagNumber">01</span><span className="iagEyebrow">PROGRAMME GOVERNANCE</span><h2>Build a defensible three-year audit programme.</h2><p>Define controlled locations, applicable standards and clause coverage, then plan audits across the cycle. The programme shows what is scheduled, why it was selected and where coverage remains incomplete.</p><ul><li>Multi-site and central-function audit universe</li><li>Integrated ISO-standard coverage</li><li>Risk-based frequency and sampling rationale</li><li>Live programme register and delivery status</li></ul></div>
        <figure className="iagShot"><img src="/internal-audit-glance/three-year-programme.png" alt="Three-year internal audit programme and delivery schedule" loading="lazy" /><figcaption>Risk-based delivery schedule and controlled programme register</figcaption></figure>
      </section>

      <section className="iagFeature reverse">
        <div className="iagFeatureCopy"><span className="iagNumber">02</span><span className="iagEyebrow">RISK-BASED PLANNING</span><h2>Score the evidence—not the auditor’s instinct.</h2><p>The embedded FMEA engine profiles credible process failure, consequences, likelihood and detectability. It recommends audit priority and frequency while preserving lead-auditor judgement and a transparent rationale.</p><ul><li>Quality, legal, environmental, OH&amp;S, security and continuity impacts</li><li>Consistent risk scoring and priority bands</li><li>Documented overrides and professional judgement</li><li>Direct connection into the audit programme</li></ul></div>
        <figure className="iagShot"><img src="/internal-audit-glance/fmea-risk-planning.png" alt="FMEA risk planning screen for internal audit prioritisation" loading="lazy" /><figcaption>Evidence-led FMEA prioritisation for programme decisions</figcaption></figure>
      </section>

      <section className="iagDark">
        <div className="iagDarkIntro"><span className="iagEyebrow">CONTROLLED DELIVERY</span><h2>From approved scope to verified closure.</h2><p>The Hub keeps the complete audit record together, including the mandate, plan, fieldwork, evidence, findings, actions, reports and final effectiveness decision.</p></div>
        <div className="iagDarkFlow">{["Mandate","Scope & criteria","Audit plan","Fieldwork","Findings","CAPA","Verification"].map((item,index)=><div key={item}><i>{index + 1}</i><span>{item}</span></div>)}</div>
        <div className="iagOutcomeGrid"><article><b>Clear accountability</b><p>Lead auditors, audit teams, process owners and action owners have defined responsibilities.</p></article><article><b>Traceable evidence</b><p>Conclusions remain connected to criteria, samples and uploaded objective evidence.</p></article><article><b>Independent closure</b><p>Action completion and effectiveness verification remain separate decisions.</p></article></div>
      </section>

      <section className="iagCompetence">
        <div className="iagSectionHead"><span className="iagEyebrow">AUDITOR ASSURANCE</span><h2>Only verified people conduct audits.</h2><p>Record competence by standard and technical area, approve defined authorisation periods and periodically verify performance using completed audit work.</p></div>
        <div className="iagDoubleShots">
          <figure className="iagShot"><img src="/internal-audit-glance/auditor-competence.png" alt="Internal auditor competence and authorisation register" loading="lazy" /><figcaption>Competence, scope and auditor authorisation</figcaption></figure>
          <figure className="iagShot"><img src="/internal-audit-glance/auditor-verification.png" alt="Quarterly internal auditor performance verification assessment" loading="lazy" /><figcaption>Evidence-based quarterly performance verification</figcaption></figure>
        </div>
      </section>

      <section className="iagDocuments">
        <div className="iagSectionHead"><span className="iagEyebrow">CONTROLLED DOCUMENTS AND RECORDS</span><h2>Know what will be retained in the Hub.</h2><p>Internal Audit documents and records remain accessible through the controlled Document Register, helping customers maintain one organised source of audit evidence.</p></div>
        <div className="iagDocGrid">{documents.map(([title,text],index)=><article key={title}><span>{String(index + 1).padStart(2,"0")}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="iagManagement">
        <div><span className="iagEyebrow">MANAGEMENT ASSURANCE</span><h2>See what needs attention now.</h2><p>The Command Centre converts detailed audit records into a clear portfolio view: scheduled work, fieldwork status, open findings, overdue actions, clause coverage and verification requirements.</p></div>
        <div className="iagMetrics"><article><strong>Live</strong><span>programme status</span></article><article><strong>Visible</strong><span>open and overdue actions</span></article><article><strong>Traceable</strong><span>evidence and decisions</span></article><article><strong>Verified</strong><span>improvement outcomes</span></article></div>
      </section>

      <section className="iagCta"><div><span>EXPLORE THE COMPLETE WORKSPACE</span><h2>Start with one audit.<br />Build assurance from there.</h2><p>Use the Internal Audit Hub free for 14 days. No credit card required.</p></div><Link className="iagButton white" href="/portal/login?mode=create">Create your free account →</Link></section>
    </main>
    <Footer locale={locale} />
    <style>{styles}</style>
  </>;
}

const styles = `
  .iagPage{overflow:hidden;background:#f4f7fb;color:#071d3a}.iagEyebrow{display:block;color:#2161ef;font-size:11px;font-weight:950;letter-spacing:.14em}.iagHero{max-width:1400px;margin:auto;padding:78px 36px 72px;display:grid;grid-template-columns:.78fr 1.22fr;gap:58px;align-items:center}.iagHero h1{margin:14px 0 22px;font-size:clamp(43px,5.2vw,72px);line-height:.98;letter-spacing:-.055em}.iagHero h1 em{color:#2161ef;font-style:normal}.iagHeroCopy>p{color:#506a82;font-size:18px;line-height:1.65}.iagActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.iagButton{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 20px;border-radius:9px;font-weight:900;text-decoration:none}.iagButton.primary{background:#2161ef;color:#fff;box-shadow:0 12px 25px #2161ef2b}.iagButton.secondary{border:1px solid #bdccda;background:#fff;color:#123553}.iagChecks{display:flex;gap:15px;flex-wrap:wrap;margin-top:16px;color:#456078;font-size:10px;font-weight:800}.iagHeroVisual{position:relative;padding:10px;border:1px solid #cad9e7;border-radius:20px;background:#fff;box-shadow:0 30px 70px #0b2b4f24}.iagHeroVisual img,.iagShot img{display:block;width:100%;height:auto;border-radius:12px}.iagFloat{position:absolute;padding:11px 14px;border-radius:11px;background:#fff;box-shadow:0 12px 30px #08294d2d}.iagFloat b,.iagFloat span{display:block}.iagFloat b{font-size:22px;color:#2161ef}.iagFloat span{font-size:9px;font-weight:800;color:#61788f}.iagFloat.one{left:-25px;bottom:25px}.iagFloat.two{right:-18px;top:35px}.iagJourney,.iagCompetence,.iagDocuments{max-width:1280px;margin:auto;padding:82px 24px}.iagSectionHead{max-width:820px}.iagSectionHead h2,.iagFeature h2,.iagDark h2,.iagManagement h2,.iagCta h2{margin:10px 0 17px;font-size:clamp(32px,4vw,51px);line-height:1.05;letter-spacing:-.045em}.iagSectionHead>p,.iagFeatureCopy>p,.iagDarkIntro>p,.iagManagement>div>p{color:#587189;line-height:1.65}.iagJourneyGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:34px}.iagJourneyGrid article{padding:20px;border:1px solid #d4e0ea;border-radius:13px;background:#fff}.iagJourneyGrid b{color:#2161ef;font-size:10px}.iagJourneyGrid h3{margin:16px 0 8px}.iagJourneyGrid p{margin:0;color:#60778e;line-height:1.5;font-size:12px}.iagFeature{padding:82px max(28px,calc((100% - 1280px)/2));display:grid;grid-template-columns:.68fr 1.32fr;gap:58px;align-items:center}.iagFeature.light{background:#fff}.iagFeature.reverse{grid-template-columns:.68fr 1.32fr}.iagFeature.reverse .iagFeatureCopy{order:2}.iagFeature.reverse .iagShot{order:1}.iagNumber{display:grid;place-items:center;width:39px;height:39px;margin-bottom:18px;border-radius:11px;background:#e8efff;color:#2161ef;font-weight:950}.iagFeatureCopy ul{display:grid;gap:10px;padding:0;list-style:none}.iagFeatureCopy li{position:relative;padding-left:24px;color:#294b68;font-weight:750}.iagFeatureCopy li:before{content:'✓';position:absolute;left:0;color:#07956c;font-weight:950}.iagShot{margin:0;padding:9px;border:1px solid #cad9e7;border-radius:16px;background:#fff;box-shadow:0 20px 45px #09284616}.iagShot figcaption{padding:11px 7px 3px;color:#61788d;font-size:10px;font-weight:800}.iagDark{padding:80px max(28px,calc((100% - 1280px)/2));background:#0c2e59;color:#fff}.iagDark .iagEyebrow{color:#61dfcb}.iagDarkIntro{max-width:780px}.iagDarkIntro>p{color:#c5d5e5}.iagDarkFlow{display:grid;grid-template-columns:repeat(7,1fr);margin-top:34px;border:1px solid #ffffff25;border-radius:13px;overflow:hidden}.iagDarkFlow div{min-height:92px;padding:16px;border-right:1px solid #ffffff25;background:#ffffff08}.iagDarkFlow div:last-child{border:0}.iagDarkFlow i,.iagDarkFlow span{display:block}.iagDarkFlow i{color:#62dfcc;font-size:10px;font-style:normal;font-weight:950}.iagDarkFlow span{margin-top:17px;font-weight:900}.iagOutcomeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.iagOutcomeGrid article{padding:19px;border-radius:12px;background:#ffffff0d}.iagOutcomeGrid p{margin-bottom:0;color:#c5d5e5;line-height:1.5}.iagDoubleShots{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:35px;align-items:start}.iagDocuments{border-top:1px solid #dce5ed}.iagDocGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:34px}.iagDocGrid article{display:grid;grid-template-columns:43px 1fr;gap:13px;padding:20px;border:1px solid #d4e1eb;border-radius:13px;background:#fff}.iagDocGrid>article>span{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eaf0ff;color:#2161ef;font-size:10px;font-weight:950}.iagDocGrid h3,.iagDocGrid p{margin:0}.iagDocGrid p{margin-top:6px;color:#60778e;line-height:1.5}.iagManagement{padding:75px max(28px,calc((100% - 1280px)/2));display:grid;grid-template-columns:.82fr 1.18fr;gap:60px;align-items:center;background:#fff}.iagMetrics{display:grid;grid-template-columns:1fr 1fr;gap:11px}.iagMetrics article{padding:22px;border-top:4px solid #2161ef;border-radius:12px;background:#f2f6fb}.iagMetrics strong,.iagMetrics span{display:block}.iagMetrics strong{font-size:23px}.iagMetrics span{margin-top:6px;color:#657c91;font-size:11px}.iagCta{padding:64px max(28px,calc((100% - 1280px)/2));display:flex;align-items:center;justify-content:space-between;gap:50px;background:linear-gradient(120deg,#112f60,#3d237e);color:#fff}.iagCta>div>span{color:#64e0cd;font-size:10px;font-weight:950;letter-spacing:.14em}.iagCta p{color:#cfdaee}.iagButton.white{min-width:245px;background:#fff;color:#143761}@media(max-width:980px){.iagHero,.iagFeature,.iagFeature.reverse,.iagManagement{grid-template-columns:1fr}.iagFeature.reverse .iagFeatureCopy,.iagFeature.reverse .iagShot{order:initial}.iagJourneyGrid{grid-template-columns:1fr 1fr}.iagDarkFlow{grid-template-columns:1fr 1fr}.iagDarkFlow div{border-bottom:1px solid #ffffff25}.iagDoubleShots,.iagOutcomeGrid{grid-template-columns:1fr}.iagFloat{display:none}}@media(max-width:650px){.iagHero{padding:50px 18px}.iagHero h1{font-size:42px}.iagChecks{display:grid;gap:7px}.iagJourney,.iagCompetence,.iagDocuments{padding:58px 18px}.iagJourneyGrid,.iagDocGrid,.iagDarkFlow,.iagMetrics{grid-template-columns:1fr}.iagFeature,.iagDark,.iagManagement{padding:58px 18px}.iagCta{padding:50px 18px;flex-direction:column;align-items:flex-start}.iagCta .iagButton{width:100%}}
`;
