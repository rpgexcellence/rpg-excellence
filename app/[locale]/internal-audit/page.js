import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import TrainingPurchaseButton from "../../../components/TrainingPurchaseButton";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "Internal Audit Hub | RPG Excellence",
  description: "Plan audit programmes, control objective evidence, report findings and verify corrective-action effectiveness in one traceable internal audit workspace.",
};

const capabilities = [
  ["01", "Audit programme", "Plan risk-based audits, scope, criteria, timing and accountable audit teams across the organisation."],
  ["02", "Fieldwork and evidence", "Build audit trails, retain objective evidence and distinguish supported conclusions from assumption."],
  ["03", "Findings and reports", "Connect requirements, evidence and the precise gap in controlled, management-ready reports."],
  ["04", "Action and follow-up", "Assign findings, monitor action and keep closure separate from independent effectiveness verification."],
  ["05", "Auditor assurance", "Record independence, competence, allocation and periodic performance verification."],
  ["06", "Management insight", "See programme delivery, overdue follow-up, recurring themes and areas requiring attention."],
];

const workflow = [
  ["Plan", "Define purpose, scope, criteria, risk and resources."],
  ["Prepare", "Build samples, trails and evidence requirements."],
  ["Perform", "Interview, observe, test records and corroborate."],
  ["Report", "State balanced conclusions and traceable findings."],
  ["Verify", "Confirm action is effective before independent closure."],
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
          <span className="iahEyebrow">RPG EXCELLENCE · INTERNAL AUDIT HUB</span>
          <h1>Turn audit activity into objective assurance.</h1>
          <p>Plan, perform, report and follow through in one controlled workspace. Keep the programme, evidence, findings, corrective action and independent verification connected.</p>
          <div className="iahActions">
            <Link className="iahButton primary" href="/portal/internal-audit">Open Internal Audit Hub →</Link>
            <Link className="iahButton secondary" href={`/${locale}/internal-audit-training`}>View auditor training</Link>
          </div>
        </div>
        <aside className="iahPreview">
          <header><div><small>ASSURANCE MANAGEMENT BOARD</small><h2>Audit programme</h2></div><b>2026</b></header>
          <div className="iahMetrics"><article><strong>12</strong><span>Planned</span></article><article><strong>7</strong><span>Complete</span></article><article className="amber"><strong>3</strong><span>Follow-up due</span></article></div>
          <div className="iahRows">{[["Operations", "In progress"],["Supplier controls", "Planned"],["Competence process", "Complete"]].map(([name,status]) => <div key={name}><span>{name}</span><em className={status === "Complete" ? "done" : ""}>{status}</em></div>)}</div>
          <div className="iahSignal"><span>Management attention</span><strong>2 effectiveness reviews require evidence</strong></div>
        </aside>
      </section>

      <section className="iahStrip">
        <strong>One controlled audit record</strong>
        {["Programme", "Evidence", "Findings", "Actions", "Verification"].map((item, index) => <span key={item}><i>{String(index + 1).padStart(2,"0")}</i>{item}</span>)}
      </section>

      <section className="iahSection">
        <span className="iahEyebrow">CONTROLLED AUDIT CAPABILITY</span>
        <div className="iahHeading"><h2>Everything needed to move from schedule to verified improvement.</h2><p>Designed for audit managers, lead auditors, process owners and leadership teams that need a dependable record of what was tested, concluded and improved.</p></div>
        <div className="iahGrid">{capabilities.map(([number,title,text]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="iahDark">
        <div><span className="iahEyebrow">EVIDENCE-LED WORKFLOW</span><h2>Preserve independence at every decision gate.</h2><p>Action owners implement. Auditors verify. Management sees where evidence, delay or recurrence prevents defensible closure.</p></div>
        <div className="iahWorkflow">{workflow.map(([title,text],index) => <article key={title}><i>{index + 1}</i><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="iahTraining">
        <div><span className="iahEyebrow">COMMERCIAL TRAINING</span><h2>Internal Auditor Refresher</h2><p>Seven interactive modules covering audit planning, interviewing, objective evidence, findings, reporting and effective follow-up.</p><div className="iahTags"><span>35–45 minutes</span><span>80% pass mark</span><span>Verifiable certificate</span></div></div>
        <aside><strong>£19.99</strong><small>+ VAT / learner</small><TrainingPurchaseButton className="iahButton primary" course="internal-auditor-refresher">Buy refresher training →</TrainingPurchaseButton><Link href={`/${locale}/internal-audit-training`}>See full course details</Link></aside>
      </section>
    </main>
    <Footer locale={locale} />
    <style>{styles}</style>
  </>;
}

const styles = `
  .iahPublic{background:#f3f7fb;color:#071d3a}.iahHero{max-width:1320px;margin:auto;padding:76px 32px 62px;display:grid;grid-template-columns:1.05fr .95fr;gap:55px;align-items:center}.iahEyebrow{display:block;color:#1762ef;font-size:11px;font-weight:950;letter-spacing:.14em}.iahHero h1{max-width:700px;margin:12px 0 21px;font-size:clamp(43px,5.2vw,72px);line-height:.98;letter-spacing:-.05em}.iahHeroCopy>p{max-width:710px;color:#4e6680;font-size:19px;line-height:1.6}.iahActions{display:flex;flex-wrap:wrap;gap:11px;margin-top:28px}.iahButton{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 19px;border-radius:9px;text-decoration:none;font:inherit;font-weight:900;cursor:pointer}.iahButton.primary{border:0;background:#1762ef;color:#fff}.iahButton.secondary{border:1px solid #b9c9da;background:#fff;color:#092746}.iahPreview{padding:25px;border:1px solid #c9daea;border-radius:20px;background:#fff;box-shadow:0 24px 60px #0927461f}.iahPreview header{display:flex;justify-content:space-between;align-items:start;padding-bottom:16px;border-bottom:1px solid #e0e8f0}.iahPreview small{color:#1762ef;font-size:9px;font-weight:950;letter-spacing:.1em}.iahPreview h2{margin:5px 0 0}.iahPreview header>b{padding:8px 10px;border-radius:8px;background:#e9f1ff;color:#1756c1}.iahMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:16px 0}.iahMetrics article{padding:13px;border-top:3px solid #1762ef;border-radius:8px;background:#f2f6fb}.iahMetrics article.amber{border-color:#df980d}.iahMetrics strong,.iahMetrics span{display:block}.iahMetrics strong{font-size:24px}.iahMetrics span{margin-top:4px;color:#60768b;font-size:9px}.iahRows{border:1px solid #dce5ed;border-radius:9px;overflow:hidden}.iahRows>div{display:flex;justify-content:space-between;padding:11px;border-bottom:1px solid #e6edf3;font-size:11px}.iahRows>div:last-child{border:0}.iahRows em{font-style:normal;color:#345f92}.iahRows em.done{color:#07805b}.iahSignal{margin-top:13px;padding:13px;border-radius:9px;background:#fff6df}.iahSignal span,.iahSignal strong{display:block}.iahSignal span{color:#a36700;font-size:8px;font-weight:950;text-transform:uppercase}.iahSignal strong{margin-top:4px;font-size:11px}.iahStrip{display:grid;grid-template-columns:1.5fr repeat(5,1fr);gap:10px;align-items:center;padding:17px max(32px,calc((100% - 1256px)/2));background:#092b55;color:#fff}.iahStrip span{display:flex;align-items:center;gap:8px;color:#d9e6f4;font-size:11px;font-weight:800}.iahStrip i{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#1762ef;font-size:8px;font-style:normal}.iahSection{max-width:1256px;margin:auto;padding:75px 0}.iahHeading{display:grid;grid-template-columns:1.5fr .7fr;gap:45px;align-items:end}.iahHeading h2,.iahDark h2,.iahTraining h2{margin:9px 0 18px;font-size:clamp(32px,4vw,50px);line-height:1.05;letter-spacing:-.04em}.iahHeading p,.iahDark>div>p,.iahTraining p{color:#5a7188;line-height:1.6}.iahGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:32px}.iahGrid article{padding:23px;border:1px solid #d3e0ea;border-radius:14px;background:#fff}.iahGrid b{color:#1762ef;font-size:11px}.iahGrid h3{margin:18px 0 8px}.iahGrid p{margin:0;color:#536b83;line-height:1.55}.iahDark{padding:70px max(32px,calc((100% - 1256px)/2));display:grid;grid-template-columns:.8fr 1.2fr;gap:65px;background:#092b55;color:#fff}.iahDark .iahEyebrow{color:#63e0ce}.iahDark>div>p,.iahWorkflow p{color:#c3d5e6}.iahWorkflow{display:grid;gap:8px}.iahWorkflow article{display:grid;grid-template-columns:35px 1fr;gap:13px;padding:14px;border:1px solid #ffffff21;border-radius:10px;background:#ffffff09}.iahWorkflow i{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#1762ef;font-style:normal;font-weight:900}.iahWorkflow h3{margin:0 0 4px}.iahWorkflow p{margin:0;font-size:12px}.iahTraining{max-width:1192px;margin:70px auto;padding:36px;display:grid;grid-template-columns:1fr 280px;gap:55px;align-items:center;border:1px solid #cbddeb;border-radius:18px;background:#fff}.iahTraining p{max-width:740px}.iahTags{display:flex;flex-wrap:wrap;gap:8px}.iahTags span{padding:7px 9px;border-radius:999px;background:#edf3fa;font-size:10px;font-weight:850}.iahTraining aside{text-align:center}.iahTraining aside>strong,.iahTraining aside>small{display:block}.iahTraining aside>strong{font-size:43px}.iahTraining aside>small{color:#64798e}.iahTraining aside .iahButton{width:100%;margin:17px 0 10px}.iahTraining aside>a{color:#175dcc;font-size:12px;font-weight:850}@media(max-width:950px){.iahHero,.iahHeading,.iahDark,.iahTraining{grid-template-columns:1fr}.iahSection{padding-left:24px;padding-right:24px}.iahGrid{grid-template-columns:1fr 1fr}.iahStrip{grid-template-columns:1fr 1fr}.iahStrip>strong{grid-column:1/-1}}@media(max-width:600px){.iahHero{padding:50px 18px}.iahGrid{grid-template-columns:1fr}.iahSection{padding:55px 18px}.iahDark{padding:55px 18px}.iahTraining{margin:45px 18px;padding:25px}.iahHero h1{font-size:43px}}
`;

