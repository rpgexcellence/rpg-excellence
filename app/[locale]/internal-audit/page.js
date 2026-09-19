import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import TrainingPurchaseButton from "../../../components/TrainingPurchaseButton";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "Internal Audit Management Software | RPG Excellence",
  description: "Plan audits, connect objective evidence, control findings and verify corrective-action effectiveness in one traceable ISO audit workspace. Start a 14-day free trial.",
};

const outcomes = [
  ["01", "Never lose sight of the programme", "Plan risk-based audits, scope, criteria, timing and accountable auditors across every site and process."],
  ["02", "Keep evidence connected", "Retain objective evidence against the relevant requirement and preserve a defensible audit trail."],
  ["03", "Produce controlled findings", "Create consistent, traceable findings and clear reports that management can act on."],
  ["04", "Stop actions becoming overdue", "Assign owners, deadlines and follow-up while maintaining a visible record of progress."],
  ["05", "Verify effectiveness independently", "Separate action completion from objective verification before a finding is finally closed."],
  ["06", "Give leadership a clear assurance view", "Expose overdue actions, repeat findings, emerging themes and areas requiring intervention."],
];

const workflow = [
  ["Plan the programme", "Define purpose, scope, criteria, risk and resources."],
  ["Complete the audit", "Interview, observe, sample records and retain evidence."],
  ["Control findings", "Connect requirements, evidence and the precise gap."],
  ["Close actions", "Assign accountable owners and monitor delivery."],
  ["Verify effectiveness", "Confirm the corrective action works before closure."],
];

const painPoints = [
  ["Scattered evidence", "Documents, emails and interview notes become separated from the conclusion they support."],
  ["Overdue findings", "Actions lose momentum when ownership, due dates and escalation are not visible in one place."],
  ["Weak closure", "A completed action is mistaken for an effective action, leaving the original risk unresolved."],
];

export default async function InternalAuditHubPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return <>
    <Header locale={locale} nav={t.nav} />
    <main className="iahPublic">
      <section className="iahHero">
        <div className="iahHeroCopy">
          <div className="iahHeroLabel"><span>INTERNAL AUDIT MANAGEMENT</span><b>14-DAY FREE TRIAL</b></div>
          <h1>Run every audit.<br />Close every finding.<br /><em>Prove every improvement.</em></h1>
          <p>Replace disconnected spreadsheets, emails and action lists with one controlled audit workspace—from annual programme and objective evidence to corrective action and independent effectiveness verification.</p>
          <div className="iahActions">
            <Link className="iahButton primary" href="/portal/login?mode=create">Start your 14-day free trial →</Link>
            <Link className="iahButton secondary" href="#how-it-works">See how it works</Link>
          </div>
          <div className="iahConfidence"><span>✓ No credit card required</span><span>✓ Set up in minutes</span><span>✓ Evidence-ready audit trail</span></div>
        </div>

        <aside className="iahPreview" aria-label="Internal Audit Hub dashboard preview">
          <header><div><small>ASSURANCE MANAGEMENT BOARD</small><h2>Audit programme</h2></div><b>2026</b></header>
          <div className="iahMetrics"><article><strong>12</strong><span>Planned</span></article><article><strong>7</strong><span>Complete</span></article><article className="amber"><strong>3</strong><span>Follow-up due</span></article></div>
          <div className="iahRows">{[["Operations", "In progress"],["Supplier controls", "Planned"],["Competence process", "Complete"]].map(([name,status]) => <div key={name}><span>{name}</span><em className={status === "Complete" ? "done" : ""}>{status}</em></div>)}</div>
          <div className="iahSignal"><span>Management attention</span><strong>3 overdue actions · 2 effectiveness reviews awaiting evidence</strong></div>
        </aside>
      </section>

      <section className="iahStrip" aria-label="Controlled audit journey">
        <strong>One controlled audit record</strong>
        {workflow.map(([item], index) => <span key={item}><i>{String(index + 1).padStart(2,"0")}</i>{item}</span>)}
      </section>

      <section className="iahPain">
        <div className="iahPainIntro"><span className="iahEyebrow">WHEN AUDIT CONTROL BREAKS DOWN</span><h2>Spreadsheets record activity.<br />They do not create assurance.</h2><p>The real value of internal audit is not the completed checklist. It is the ability to demonstrate what was tested, what was found, who acted and whether the improvement genuinely worked.</p></div>
        <div className="iahPainGrid">{painPoints.map(([title,text], index) => <article key={title}><i>0{index + 1}</i><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="iahSection">
        <span className="iahEyebrow">FROM PROGRAMME TO VERIFIED CLOSURE</span>
        <div className="iahHeading"><h2>One audit record. Complete control.</h2><p>Give audit managers, auditors, process owners and leadership one reliable view of what was planned, what remains open and whether corrective action was genuinely effective.</p></div>
        <div className="iahGrid">{outcomes.map(([number,title,text]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="iahDark" id="how-it-works">
        <div className="iahDarkCopy"><span className="iahEyebrow">A DEFENSIBLE AUDIT JOURNEY</span><h2>Evidence at every decision gate.</h2><p>Action owners implement. Auditors verify. Management sees where missing evidence, delay or recurrence prevents defensible closure.</p><Link className="iahTextLink" href="/portal/login?mode=create">Build your first audit programme →</Link></div>
        <div className="iahWorkflow">{workflow.map(([title,text],index) => <article key={title}><i>{index + 1}</i><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="iahInsight">
        <div className="iahInsightCopy"><span className="iahEyebrow">MANAGEMENT VISIBILITY</span><h2>See where assurance is strong—and where intervention is needed.</h2><p>Move beyond a list of completed audits. Monitor programme delivery, overdue follow-up, repeat findings and verification status from a clear management view.</p><ul><li>Programme status across sites and processes</li><li>Open, overdue and recurring findings</li><li>Corrective-action and verification progress</li><li>Evidence-backed reporting for leadership review</li></ul></div>
        <aside className="iahInsightBoard">
          <div className="iahBoardTop"><div><span>Audit readiness</span><strong>86%</strong></div><div><span>Open findings</span><strong className="red">12</strong></div><div><span>Awaiting verification</span><strong className="amberText">4</strong></div></div>
          <div className="iahChart"><header><strong>Assurance trend</strong><small>Last 6 months</small></header><div className="iahChartGrid"><i style={{height:"34%"}}></i><i style={{height:"45%"}}></i><i style={{height:"53%"}}></i><i style={{height:"66%"}}></i><i style={{height:"78%"}}></i><i style={{height:"88%"}}></i></div></div>
          <div className="iahBoardNote"><span>Priority</span><b>Supplier-control recurrence requires management review</b></div>
        </aside>
      </section>

      <section className="iahTraining">
        <div><span className="iahEyebrow">BUILD AUDITOR CAPABILITY</span><h2>Internal Auditor Refresher</h2><p>Seven interactive modules covering audit planning, interviewing, objective evidence, findings, reporting and effective follow-up.</p><div className="iahTags"><span>35–45 minutes</span><span>80% pass mark</span><span>Verifiable certificate</span></div></div>
        <aside><strong>£19.99</strong><small>+ VAT / learner</small><TrainingPurchaseButton className="iahButton primary" course="internal-auditor-refresher">Buy refresher training →</TrainingPurchaseButton><Link href={`/${locale}/internal-audit-training`}>See full course details</Link></aside>
      </section>

      <section className="iahFinalCta">
        <div><span>READY TO REPLACE FRAGMENTED AUDIT RECORDS?</span><h2>Start with one programme.<br />Build assurance from there.</h2><p>Explore the complete Internal Audit Hub free for 14 days.</p></div>
        <div><Link className="iahButton light" href="/portal/login?mode=create">Create your free account →</Link><small>No credit card required</small></div>
      </section>
    </main>
    <Footer locale={locale} />
    <style>{styles}</style>
  </>;
}

const styles = `
  .iahPublic{overflow:hidden;background:#f3f7fb;color:#071d3a}.iahHero{position:relative;max-width:1380px;margin:auto;padding:82px 42px 72px;display:grid;grid-template-columns:1.08fr .92fr;gap:68px;align-items:center}.iahHero:before{content:"";position:absolute;width:520px;height:520px;right:-120px;top:-180px;border-radius:50%;background:#1762ef12;filter:blur(2px)}.iahHeroCopy,.iahPreview{position:relative;z-index:1}.iahHeroLabel{display:flex;align-items:center;gap:12px}.iahHeroLabel span,.iahEyebrow{display:block;color:#1762ef;font-size:11px;font-weight:950;letter-spacing:.14em}.iahHeroLabel b{padding:7px 9px;border-radius:999px;background:#ddf7ef;color:#08755c;font-size:9px;letter-spacing:.08em}.iahHero h1{max-width:760px;margin:16px 0 23px;font-size:clamp(45px,5.25vw,74px);line-height:.98;letter-spacing:-.055em}.iahHero h1 em{color:#1762ef;font-style:normal}.iahHeroCopy>p{max-width:735px;color:#4e6680;font-size:19px;line-height:1.62}.iahActions{display:flex;flex-wrap:wrap;gap:11px;margin-top:29px}.iahButton{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 20px;border-radius:9px;text-decoration:none;font:inherit;font-weight:900;cursor:pointer;transition:transform .2s,box-shadow .2s}.iahButton:hover{transform:translateY(-2px)}.iahButton.primary{border:0;background:#1762ef;color:#fff;box-shadow:0 12px 24px #1762ef2c}.iahButton.secondary{border:1px solid #b9c9da;background:#fff;color:#092746}.iahConfidence{display:flex;flex-wrap:wrap;gap:17px;margin-top:17px;color:#425e78;font-size:11px;font-weight:750}.iahPreview{padding:26px;border:1px solid #c9daea;border-radius:20px;background:#fff;box-shadow:0 28px 70px #09274624}.iahPreview header{display:flex;justify-content:space-between;align-items:start;padding-bottom:16px;border-bottom:1px solid #e0e8f0}.iahPreview small{color:#1762ef;font-size:9px;font-weight:950;letter-spacing:.1em}.iahPreview h2{margin:5px 0 0}.iahPreview header>b{padding:8px 10px;border-radius:8px;background:#e9f1ff;color:#1756c1}.iahMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:16px 0}.iahMetrics article{padding:14px;border-top:3px solid #1762ef;border-radius:8px;background:#f2f6fb}.iahMetrics article.amber{border-color:#df980d}.iahMetrics strong,.iahMetrics span{display:block}.iahMetrics strong{font-size:25px}.iahMetrics span{margin-top:4px;color:#60768b;font-size:9px}.iahRows{border:1px solid #dce5ed;border-radius:9px;overflow:hidden}.iahRows>div{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #e6edf3;font-size:11px}.iahRows>div:last-child{border:0}.iahRows em{font-style:normal;color:#345f92}.iahRows em.done{color:#07805b}.iahSignal{margin-top:13px;padding:14px;border-radius:9px;background:#fff6df}.iahSignal span,.iahSignal strong{display:block}.iahSignal span{color:#a36700;font-size:8px;font-weight:950;text-transform:uppercase}.iahSignal strong{margin-top:5px;font-size:11px}.iahStrip{display:grid;grid-template-columns:1.45fr repeat(5,1fr);gap:10px;align-items:center;padding:17px max(32px,calc((100% - 1300px)/2));background:#092b55;color:#fff}.iahStrip span{display:flex;align-items:center;gap:8px;color:#d9e6f4;font-size:10px;font-weight:800}.iahStrip i{display:grid;place-items:center;flex:none;width:25px;height:25px;border-radius:50%;background:#1762ef;font-size:8px;font-style:normal}.iahPain{max-width:1256px;margin:auto;padding:85px 0;display:grid;grid-template-columns:.85fr 1.15fr;gap:72px}.iahPainIntro h2,.iahHeading h2,.iahDark h2,.iahInsight h2,.iahTraining h2,.iahFinalCta h2{margin:10px 0 18px;font-size:clamp(32px,4vw,50px);line-height:1.05;letter-spacing:-.04em}.iahPainIntro p,.iahHeading p,.iahDarkCopy>p,.iahInsightCopy>p,.iahTraining p{color:#5a7188;line-height:1.65}.iahPainGrid{display:grid;gap:12px}.iahPainGrid article{display:grid;grid-template-columns:44px 1fr;gap:15px;padding:21px;border:1px solid #d5e1eb;border-radius:14px;background:#fff}.iahPainGrid i{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#fff0ed;color:#c53f31;font-size:11px;font-style:normal;font-weight:950}.iahPainGrid h3,.iahPainGrid p{margin:0}.iahPainGrid p{margin-top:6px;color:#60768c;line-height:1.5}.iahSection{max-width:1256px;margin:auto;padding:78px 0 88px;border-top:1px solid #dce5ed}.iahHeading{display:grid;grid-template-columns:1.35fr .75fr;gap:50px;align-items:end}.iahGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:34px}.iahGrid article{padding:25px;border:1px solid #d3e0ea;border-radius:14px;background:#fff;transition:transform .2s,box-shadow .2s}.iahGrid article:hover{transform:translateY(-4px);box-shadow:0 18px 35px #09274612}.iahGrid b{color:#1762ef;font-size:11px}.iahGrid h3{margin:19px 0 9px}.iahGrid p{margin:0;color:#536b83;line-height:1.58}.iahDark{padding:78px max(32px,calc((100% - 1256px)/2));display:grid;grid-template-columns:.82fr 1.18fr;gap:75px;background:#092b55;color:#fff}.iahDark .iahEyebrow{color:#63e0ce}.iahDarkCopy>p,.iahWorkflow p{color:#c3d5e6}.iahTextLink{display:inline-block;margin-top:17px;color:#76e2d1;font-weight:900;text-decoration:none}.iahWorkflow{display:grid;gap:9px}.iahWorkflow article{display:grid;grid-template-columns:39px 1fr;gap:14px;padding:15px;border:1px solid #ffffff21;border-radius:11px;background:#ffffff09}.iahWorkflow i{display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:#1762ef;font-style:normal;font-weight:900}.iahWorkflow h3{margin:0 0 4px}.iahWorkflow p{margin:0;font-size:12px}.iahInsight{max-width:1256px;margin:auto;padding:88px 0;display:grid;grid-template-columns:.9fr 1.1fr;gap:70px;align-items:center}.iahInsightCopy ul{display:grid;gap:11px;padding:0;list-style:none}.iahInsightCopy li{position:relative;padding-left:25px;color:#2f4d69;font-weight:750}.iahInsightCopy li:before{content:"✓";position:absolute;left:0;color:#07936b;font-weight:950}.iahInsightBoard{padding:22px;border:1px solid #cad9e7;border-radius:18px;background:#fff;box-shadow:0 22px 55px #09274618}.iahBoardTop{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.iahBoardTop>div{padding:14px;border-radius:10px;background:#f1f6fb}.iahBoardTop span,.iahBoardTop strong{display:block}.iahBoardTop span{color:#61768a;font-size:9px}.iahBoardTop strong{margin-top:7px;font-size:25px;color:#078a67}.iahBoardTop strong.red{color:#d13e35}.iahBoardTop strong.amberText{color:#d58a00}.iahChart{margin-top:12px;padding:16px;border:1px solid #e0e8ef;border-radius:11px}.iahChart header{display:flex;justify-content:space-between}.iahChart small{color:#7890a5}.iahChartGrid{height:150px;margin-top:18px;padding:0 9px;display:flex;align-items:end;gap:12px;border-bottom:1px solid #cbd8e4;background:repeating-linear-gradient(to top,transparent 0,transparent 36px,#e8eef4 37px)}.iahChartGrid i{flex:1;border-radius:5px 5px 0 0;background:linear-gradient(#54d7b8,#1762ef)}.iahBoardNote{display:flex;gap:11px;margin-top:12px;padding:13px;border-radius:9px;background:#fff5df;font-size:11px}.iahBoardNote span{color:#a56a00;font-weight:950;text-transform:uppercase}.iahTraining{max-width:1192px;margin:0 auto 75px;padding:38px;display:grid;grid-template-columns:1fr 280px;gap:55px;align-items:center;border:1px solid #cbddeb;border-radius:18px;background:#fff}.iahTraining p{max-width:740px}.iahTags{display:flex;flex-wrap:wrap;gap:8px}.iahTags span{padding:7px 9px;border-radius:999px;background:#edf3fa;font-size:10px;font-weight:850}.iahTraining aside{text-align:center}.iahTraining aside>strong,.iahTraining aside>small{display:block}.iahTraining aside>strong{font-size:43px}.iahTraining aside>small{color:#64798e}.iahTraining aside .iahButton{width:100%;margin:17px 0 10px}.iahTraining aside>a{color:#175dcc;font-size:12px;font-weight:850}.iahFinalCta{padding:60px max(32px,calc((100% - 1256px)/2));display:flex;justify-content:space-between;gap:50px;align-items:center;background:linear-gradient(120deg,#102f61,#392078);color:#fff}.iahFinalCta span{color:#68e3d0;font-size:10px;font-weight:950;letter-spacing:.14em}.iahFinalCta h2{margin-bottom:10px}.iahFinalCta p{color:#cddaf0}.iahFinalCta>div:last-child{display:grid;gap:9px;justify-items:center}.iahButton.light{min-width:240px;background:#fff;color:#102f61}.iahFinalCta small{color:#cddaf0}@media(max-width:980px){.iahHero,.iahPain,.iahHeading,.iahDark,.iahInsight,.iahTraining{grid-template-columns:1fr}.iahHero{padding-left:24px;padding-right:24px}.iahPain,.iahSection,.iahInsight{padding-left:24px;padding-right:24px}.iahGrid{grid-template-columns:1fr 1fr}.iahStrip{grid-template-columns:1fr 1fr}.iahStrip>strong{grid-column:1/-1}.iahFinalCta{align-items:start}}@media(max-width:650px){.iahHero{padding:54px 18px}.iahHeroLabel{align-items:flex-start;flex-direction:column}.iahHero h1{font-size:43px}.iahConfidence{display:grid;gap:7px}.iahMetrics{grid-template-columns:1fr}.iahStrip{grid-template-columns:1fr}.iahStrip>strong{grid-column:auto;margin-bottom:5px}.iahPain,.iahSection,.iahInsight{padding:58px 18px}.iahGrid{grid-template-columns:1fr}.iahDark{padding:58px 18px}.iahTraining{margin:40px 18px;padding:25px}.iahFinalCta{padding:48px 18px;flex-direction:column}.iahFinalCta>div:last-child{width:100%}.iahButton.light{width:100%}}
`;
