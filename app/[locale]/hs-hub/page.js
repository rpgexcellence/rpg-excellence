import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "Health & Safety Hub | RPG Excellence",
  description: "Create, control and review workplace risk assessments and build competent risk assessors through interactive training.",
};

const matrix = [
  [5, 10, 15, 20, 25],
  [4, 8, 12, 16, 20],
  [3, 6, 9, 12, 15],
  [2, 4, 6, 8, 10],
  [1, 2, 3, 4, 5],
];

const tone = (score) => score >= 15 ? "unacceptable" : score >= 10 ? "inadequate" : score >= 5 ? "adequate" : "acceptable";

const capabilities = [
  ["01", "Risk Assessment Builder", "Create suitable and sufficient assessments through a controlled, guided workflow."],
  ["02", "Interactive 5×5 Matrix", "Evaluate initial and residual risk consistently using likelihood and credible severity."],
  ["03", "Action & Verification", "Assign additional controls, monitor deadlines and verify whether controls are effective."],
  ["04", "Training Academy", "Develop competent assessors through scenarios, practical exercises and assessment."],
  ["05", "Approval & Communication", "Control review, approval, consultation, briefing and workforce acknowledgement."],
  ["06", "Management Insight", "See elevated risks, overdue actions, upcoming reviews and performance trends."],
];

const process = [
  ["1", "Identify hazards", "Examine the activity, environment, equipment, materials and foreseeable abnormal conditions."],
  ["2", "Assess the risks", "Identify who may be harmed and evaluate realistic likelihood and the worst credible consequence."],
  ["3", "Control the risks", "Apply the hierarchy of control and define accountable additional action where needed."],
  ["4", "Record findings", "Capture significant findings, decisions, owners, dates, consultation and approval."],
  ["5", "Review controls", "Confirm controls operate in practice and reassess following change, events or emerging evidence."],
];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function RiskMatrix() {
  return <div className="hshMatrixCard" aria-label="Five by five workplace risk matrix">
    <div className="hshMatrixHead"><div><span>INTERACTIVE RISK MODEL</span><h2>5×5 risk matrix</h2></div><b>Likelihood × Severity</b></div>
    <div className="hshMatrixBody">
      <div className="hshYAxis">LIKELIHOOD</div>
      <div className="hshGrid">
        {matrix.flatMap((row, rowIndex) => row.map((score, columnIndex) => <div className={`hshCell ${tone(score)}`} key={`${rowIndex}-${columnIndex}`}><strong>{score}</strong><small>{tone(score)}</small></div>))}
      </div>
      <div className="hshXAxis">SEVERITY →</div>
    </div>
    <div className="hshLegend"><span className="acceptable">Acceptable 1–4</span><span className="adequate">Adequate 5–9</span><span className="inadequate">Inadequate 10–14</span><span className="unacceptable">Unacceptable 15–25</span></div>
  </div>;
}

export default async function HealthSafetyHubPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return <main className="hshPage">
    <Header locale={locale} nav={t.nav} />
    <style>{`
      *{box-sizing:border-box}.hshPage{--navy:#071d3a;--blue:#1459d9;--green:#079669;--pale:#edf5fb;--line:#d7e3ee;color:var(--navy);background:#fff}.hshHero{position:relative;overflow:hidden;padding:92px clamp(24px,6vw,92px) 80px;background:radial-gradient(circle at 82% 18%,#cfe5ff 0,transparent 28%),linear-gradient(135deg,#f7fbff,#eaf4fc)}.hshHero:after{content:"";position:absolute;width:540px;height:540px;border:70px solid #ffffff70;border-radius:50%;right:-210px;bottom:-350px}.hshHeroInner{position:relative;z-index:1;max-width:1480px;margin:auto;display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}.hshEyebrow{color:var(--blue);font-size:12px;font-weight:950;letter-spacing:.16em}.hshHero h1{font-size:clamp(48px,5.5vw,82px);line-height:.98;letter-spacing:-.055em;margin:18px 0 23px;max-width:800px}.hshHero h1 span{color:var(--green)}.hshLead{font-size:20px;line-height:1.6;color:#455f7b;max-width:720px}.hshActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.hshButton{display:inline-flex;align-items:center;justify-content:center;padding:15px 20px;border-radius:10px;background:var(--green);color:#fff;font-weight:900;box-shadow:0 10px 24px #087c5a25}.hshButton.secondary{background:#fff;color:var(--blue);border:1px solid #a9c6ec;box-shadow:none}.hshTrust{display:flex;gap:22px;flex-wrap:wrap;margin-top:25px;color:#4e6985;font-size:13px;font-weight:750}.hshPreview{padding:18px;border:1px solid #cbddec;border-radius:22px;background:#ffffffcc;box-shadow:0 30px 65px #17395e20;backdrop-filter:blur(8px)}.hshPreviewTop{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:8px 5px 18px}.hshPreviewTop strong{font-size:18px}.hshPreviewTop span{padding:7px 10px;border-radius:999px;background:#e5f8ef;color:#057951;font-size:11px;font-weight:900}.hshPreviewMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.hshPreviewMetrics div{padding:14px;border:1px solid #deE8f1;border-radius:12px;background:#fff}.hshPreviewMetrics small,.hshPreviewMetrics strong{display:block}.hshPreviewMetrics small{color:#667d94;font-size:10px;font-weight:800}.hshPreviewMetrics strong{font-size:27px;margin-top:5px}.hshPreviewMetrics .red{color:#c82f27}.hshPreviewMetrics .amber{color:#db7800}.hshMini{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin-top:12px}.hshMiniProcess,.hshMiniMatrix{padding:15px;border:1px solid #dfe8f1;border-radius:13px;background:#fff}.hshMiniProcess>strong,.hshMiniMatrix>strong{font-size:13px}.hshMiniSteps{display:grid;gap:8px;margin-top:12px}.hshMiniSteps span{display:flex;align-items:center;gap:8px;font-size:11px;color:#536a83}.hshMiniSteps b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#e6efff;color:var(--blue)}.hshMiniGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-top:12px}.hshMiniGrid i{aspect-ratio:1;border-radius:3px;background:#38a874}.hshMiniGrid i:nth-child(4n){background:#f4bd3b}.hshMiniGrid i:nth-child(5n),.hshMiniGrid i:nth-child(9n){background:#e96738}.hshMiniGrid i:nth-child(10n),.hshMiniGrid i:nth-child(14n){background:#c9342c}.hshSection{padding:78px clamp(24px,6vw,92px)}.hshSectionInner{max-width:1480px;margin:auto}.hshSectionHead{display:flex;justify-content:space-between;gap:45px;align-items:end;margin-bottom:30px}.hshSectionHead h2{font-size:clamp(34px,4vw,55px);line-height:1.05;letter-spacing:-.04em;margin:10px 0 0;max-width:850px}.hshSectionHead p{max-width:500px;color:#60768d;line-height:1.6}.hshCards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.hshCard{min-height:220px;padding:25px;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 12px 30px #153c680b}.hshCard span{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#e9f1ff;color:var(--blue);font-weight:950}.hshCard h3{margin:22px 0 10px;font-size:20px}.hshCard p{margin:0;color:#61768d;line-height:1.6}.hshProcessSection{background:var(--navy);color:#fff}.hshProcessSection .hshSectionHead p{color:#b9c9da}.hshProcess{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.hshStep{position:relative;min-height:270px;padding:23px;border:1px solid #ffffff1f;border-radius:15px;background:#ffffff0b}.hshStep:after{content:"→";position:absolute;right:-11px;top:38px;color:#62d5b2;font-size:21px;z-index:2}.hshStep:last-child:after{display:none}.hshStep>span{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--green);font-weight:950}.hshStep h3{font-size:19px;margin:22px 0 11px}.hshStep p{color:#bdd0e2;line-height:1.55;margin:0;font-size:14px}.hshMatrixLayout{display:grid;grid-template-columns:1fr .82fr;gap:22px;align-items:start}.hshMatrixCard{border:1px solid var(--line);border-radius:19px;padding:25px;background:#fff;box-shadow:0 16px 36px #153c6810}.hshMatrixHead{display:flex;justify-content:space-between;gap:15px;align-items:start}.hshMatrixHead span{font-size:10px;letter-spacing:.14em;color:var(--green);font-weight:950}.hshMatrixHead h2{margin:6px 0 0;font-size:29px}.hshMatrixHead>b{font-size:12px;color:#667d94}.hshMatrixBody{position:relative;padding:13px 0 25px 31px}.hshYAxis{position:absolute;left:0;top:46%;font-size:10px;font-weight:900;letter-spacing:.1em;transform:rotate(-90deg) translateX(-50%);transform-origin:left top}.hshGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.hshCell{aspect-ratio:1.42;border-radius:8px;padding:9px;color:#fff;display:flex;align-items:end;justify-content:space-between}.hshCell strong{font-size:20px}.hshCell small{text-transform:uppercase;font-size:7px;font-weight:950}.hshCell.acceptable,.hshLegend .acceptable{background:#2fa775}.hshCell.adequate,.hshLegend .adequate{background:#efb838;color:#392600}.hshCell.inadequate,.hshLegend .inadequate{background:#e76639}.hshCell.unacceptable,.hshLegend .unacceptable{background:#be3028}.hshXAxis{text-align:center;font-size:10px;font-weight:900;letter-spacing:.12em;margin-top:10px}.hshLegend{display:flex;gap:7px;flex-wrap:wrap}.hshLegend span{padding:6px 8px;border-radius:999px;color:#fff;font-size:9px;font-weight:900}.hshLegend .adequate{color:#392600}.hshMatrixCopy{padding:20px 8px}.hshMatrixCopy h2{font-size:40px;line-height:1.08;letter-spacing:-.04em;margin:9px 0 17px}.hshMatrixCopy p{color:#60768d;font-size:17px;line-height:1.7}.hshMatrixCopy ul{padding:0;list-style:none;display:grid;gap:12px;margin-top:22px}.hshMatrixCopy li{padding-left:28px;position:relative;color:#284762}.hshMatrixCopy li:before{content:"✓";position:absolute;left:0;color:var(--green);font-weight:950}.hshTraining{background:linear-gradient(120deg,#eaf8f3,#f4f9fd)}.hshTrainingCard{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;padding:38px;border:1px solid #bfe3d6;border-radius:20px;background:#fff;box-shadow:0 18px 50px #0a79571a}.hshTrainingCard h2{font-size:38px;letter-spacing:-.035em;margin:8px 0 13px}.hshTrainingCard p{max-width:850px;color:#5c738a;line-height:1.65}.hshTrainingFacts{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}.hshTrainingFacts span{padding:8px 11px;border-radius:999px;background:#edf5fb;color:#244665;font-size:12px;font-weight:850}.hshPrice{text-align:right;min-width:210px}.hshPrice small,.hshPrice strong{display:block}.hshPrice small{color:#647c93;font-weight:800}.hshPrice strong{font-size:34px;margin:6px 0 16px}.hshPrice em{display:block;margin-top:9px;color:#07845c;font-style:normal;font-size:12px;font-weight:850}.hshGuidance{padding:32px clamp(24px,6vw,92px);background:#f5f8fb}.hshGuidanceInner{max-width:1480px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:25px}.hshGuidance strong{font-size:18px}.hshGuidance p{margin:6px 0 0;color:#647990}.hshGuidance a{white-space:nowrap;color:var(--blue);font-weight:900}@media(max-width:1050px){.hshHeroInner,.hshMatrixLayout{grid-template-columns:1fr}.hshCards{grid-template-columns:repeat(2,1fr)}.hshProcess{grid-template-columns:1fr 1fr}.hshStep:after{display:none}}@media(max-width:680px){.hshHero{padding-top:58px}.hshPreviewMetrics,.hshMini,.hshCards,.hshProcess{grid-template-columns:1fr}.hshSectionHead,.hshTrainingCard,.hshGuidanceInner{display:block}.hshTrainingCard{padding:25px}.hshPrice{text-align:left;margin-top:26px}.hshCell{aspect-ratio:1;padding:5px}.hshCell small{display:none}.hshLegend{display:grid;grid-template-columns:1fr 1fr}.hshGuidance a{display:inline-block;margin-top:15px}}
    `}</style>

    <section className="hshHero">
      <div className="hshHeroInner">
        <div>
          <span className="hshEyebrow">RPG EXCELLENCE · HEALTH & SAFETY</span>
          <h1>Turn workplace risk into <span>controlled action.</span></h1>
          <p className="hshLead">Create, approve, communicate and review workplace risk assessments—then build assessor capability through original, practical and interactive training.</p>
          <div className="hshActions"><Link className="hshButton" href="/portal/login?next=/portal/health-safety">Explore the H&S Hub →</Link><Link className="hshButton secondary" href={`/${locale}/hs-hub/training`}>View training options</Link></div>
          <div className="hshTrust"><span>✓ Controlled workflow</span><span>✓ Action ownership</span><span>✓ Evidence and audit trail</span></div>
        </div>
        <div className="hshPreview">
          <div className="hshPreviewTop"><strong>Risk Assessment overview</strong><span>LIVE CONTROL</span></div>
          <div className="hshPreviewMetrics"><div><small>CURRENT ASSESSMENTS</small><strong>128</strong></div><div><small>HIGH RISKS</small><strong className="red">7</strong></div><div><small>OVERDUE ACTIONS</small><strong className="amber">4</strong></div></div>
          <div className="hshMini"><div className="hshMiniProcess"><strong>Guided assessment</strong><div className="hshMiniSteps">{["Identify hazards","Assess risk","Control risk","Record findings","Review controls"].map((step,index)=><span key={step}><b>{index+1}</b>{step}</span>)}</div></div><div className="hshMiniMatrix"><strong>Residual risk</strong><div className="hshMiniGrid">{Array.from({length:25},(_,index)=><i key={index}/>)}</div></div></div>
        </div>
      </div>
    </section>

    <section className="hshSection"><div className="hshSectionInner"><div className="hshSectionHead"><div><span className="hshEyebrow">ONE CONTROLLED WORKSPACE</span><h2>Everything needed to assess, control and demonstrate progress.</h2></div><p>Designed for organisations that need more than a downloadable template: accountable decisions, visible actions and evidence that controls work in practice.</p></div><div className="hshCards">{capabilities.map(([number,title,text])=><article className="hshCard" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="hshSection hshProcessSection"><div className="hshSectionInner"><div className="hshSectionHead"><div><span className="hshEyebrow">HSE-ALIGNED RISK PROCESS</span><h2>A practical five-stage route from hazard to review.</h2></div><p>The system guides users through the recognised risk-management sequence while retaining accountable professional judgement.</p></div><div className="hshProcess">{process.map(([number,title,text])=><article className="hshStep" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="hshSection"><div className="hshSectionInner hshMatrixLayout"><RiskMatrix/><div className="hshMatrixCopy"><span className="hshEyebrow">CONSISTENT EVALUATION</span><h2>The matrix calculates. Accountable judgement decides.</h2><p>Users evaluate likelihood and credible severity before and after additional controls. Elevated residual risk remains visible until it is properly governed.</p><ul><li>Initial and residual risk shown separately</li><li>Risk bands match the controlled RPG methodology</li><li>Unacceptable risk triggers escalation and action</li><li>Control effectiveness must be verified with evidence</li></ul></div></div></section>

    <section className="hshSection hshTraining"><div className="hshSectionInner"><div className="hshTrainingCard"><div><span className="hshEyebrow">INTERACTIVE TRAINING ACADEMY</span><h2>Workplace Risk Assessment Training</h2><p>Original RPG Excellence learning built around realistic decisions, hazard spotting, hierarchy-of-control challenges, matrix exercises and a final assessed scenario.</p><div className="hshTrainingFacts"><span>50–60 minutes</span><span>Practical scenarios</span><span>80% pass mark</span><span>Digital certificate</span><span>Refresher available</span></div></div><div className="hshPrice"><small>ONE-OFF ACCESS</small><strong>£19.99 + VAT</strong><Link className="hshButton" href={`/${locale}/hs-hub/training`}>View training →</Link><em>Included with eligible subscriptions</em></div></div></div></section>

    <section className="hshGuidance"><div className="hshGuidanceInner"><div><strong>Suitable and sufficient. Proportionate. Reviewed when things change.</strong><p>RPG Excellence supports structured decision-making; organisations remain responsible for competent assessment and implementation of controls.</p></div><a href="https://www.hse.gov.uk/risk/" target="_blank" rel="noreferrer">View official HSE guidance →</a></div></section>
    <Footer locale={locale}/>
  </main>;
}
