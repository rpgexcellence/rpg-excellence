import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import TrainingPurchaseButton from "../../../components/TrainingPurchaseButton";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "CAPA-8D Hub | RPG Excellence",
  description: "Control containment, root-cause analysis, corrective action and independent effectiveness verification through a guided evidence-led 8D workflow.",
};

const capabilities = [
  ["01", "Case triage", "Separate correction, containment and systemic investigation; select a proportionate treatment route."],
  ["02", "Guided D1–D8", "Move through controlled disciplines with ownership, required evidence and approval gates."],
  ["03", "Causal analysis", "Test occurrence, escape and system-prevention paths using three-direction 5 Why logic."],
  ["04", "Action control", "Link actions to verified causes, assign owners and retain implementation evidence."],
  ["05", "Effectiveness review", "Keep completion separate from independent evaluation of sustained results."],
  ["06", "Management insight", "See overdue cases, weak causal logic, recurring themes and closure risks."],
];

const disciplines = [
  ["D1", "Team", "Appoint authority and the right technical knowledge."],
  ["D2", "Define", "Describe what, where, when, extent and impact."],
  ["D3", "Contain", "Protect the customer while preserving evidence."],
  ["D4", "Analyse", "Verify occurrence, escape and system causes."],
  ["D5", "Select", "Choose action against the verified mechanism."],
  ["D6", "Implement", "Control change and validate implementation."],
  ["D7", "Prevent", "Review extent and strengthen the wider system."],
  ["D8", "Verify", "Confirm sustained effectiveness before closure."],
];

export default async function CapaEightDHubPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return <>
    <Header locale={locale} nav={t.nav} />
    <main className="c8Public">
      <section className="c8Hero">
        <div>
          <span className="c8Eyebrow">RPG EXCELLENCE · CAPA–8D HUB</span>
          <h1>Move from recurring symptoms to verified improvement.</h1>
          <p>Control the full corrective-action journey: immediate protection, precise problem definition, evidence-led causal analysis, accountable action and independent effectiveness review.</p>
          <div className="c8Actions">
            <Link className="c8Button primary" href="/portal/rca">Open CAPA–8D Hub →</Link>
            <Link className="c8Button secondary" href={`/${locale}/rca-8d-training`}>View practitioner training</Link>
          </div>
        </div>
        <aside className="c8Preview">
          <header><div><small>CONTROLLED PROBLEM SOLVING</small><h2>Case progress</h2></div><span>Effectiveness review</span></header>
          <div className="c8Steps">{disciplines.map(([code],index)=><i className={index < 6 ? "done" : index === 6 ? "active" : ""} key={code}>{code}</i>)}</div>
          <div className="c8Cause">
            <article><b>Occurrence cause</b><span>Verified mechanism</span></article>
            <article><b>Escape cause</b><span>Detection failure</span></article>
            <article><b>System cause</b><span>Prevention weakness</span></article>
          </div>
          <div className="c8Gate"><span>Closure gate</span><strong>Evidence of sustained result required</strong></div>
        </aside>
      </section>

      <section className="c8Ribbon"><strong>Controlled improvement</strong>{["Protect","Define","Analyse","Act","Verify"].map((item,index)=><span key={item}><i>{String(index+1).padStart(2,"0")}</i>{item}</span>)}</section>

      <section className="c8Section">
        <span className="c8Eyebrow">ONE EVIDENCE-LED WORKSPACE</span>
        <div className="c8Heading"><h2>Corrective action that can withstand challenge.</h2><p>Designed for quality, safety, engineering and operational teams that need causal conclusions, action decisions and closure to remain traceable.</p></div>
        <div className="c8Grid">{capabilities.map(([number,title,text])=><article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="c8Flow">
        <header><span className="c8Eyebrow">GUIDED RCA–8D WORKFLOW</span><h2>Eight disciplines. One controlled decision trail.</h2><p>Each gate requires the evidence needed to support the next decision; preceding disciplines must be approved before later closure.</p></header>
        <div>{disciplines.map(([code,title,text])=><article key={code}><i>{code}</i><section><h3>{title}</h3><p>{text}</p></section></article>)}</div>
      </section>

      <section className="c8Training">
        <div><span className="c8Eyebrow">COMMERCIAL TRAINING</span><h2>RCA and Corrective Action Practitioner</h2><p>Ten detailed interactive modules covering triage, containment, problem definition, three-direction 5 Why analysis, human factors, action strength and effectiveness verification.</p><div className="c8Tags"><span>90 minutes</span><span>12-question assessment</span><span>80% pass mark</span><span>Verifiable certificate</span></div></div>
        <aside><strong>£49.99</strong><small>+ VAT / learner</small><TrainingPurchaseButton className="c8Button primary" course="rca-8d-practitioner">Buy practitioner training →</TrainingPurchaseButton><Link href={`/${locale}/rca-8d-training`}>See full course details</Link></aside>
      </section>
    </main>
    <Footer locale={locale}/>
    <style>{styles}</style>
  </>;
}

const styles=`
  .c8Public{background:#f3f8f7;color:#071d3a}.c8Hero{max-width:1320px;margin:auto;padding:76px 32px 62px;display:grid;grid-template-columns:1.05fr .95fr;gap:55px;align-items:center}.c8Eyebrow{display:block;color:#078873;font-size:11px;font-weight:950;letter-spacing:.14em}.c8Hero h1{max-width:730px;margin:12px 0 21px;font-size:clamp(43px,5.2vw,72px);line-height:.98;letter-spacing:-.05em}.c8Hero>div>p{max-width:720px;color:#4f6878;font-size:19px;line-height:1.6}.c8Actions{display:flex;flex-wrap:wrap;gap:11px;margin-top:28px}.c8Button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 19px;border-radius:9px;text-decoration:none;font:inherit;font-weight:900;cursor:pointer}.c8Button.primary{border:0;background:#078873;color:#fff}.c8Button.secondary{border:1px solid #b8ccc8;background:#fff;color:#092746}.c8Preview{padding:25px;border:1px solid #c8ddd9;border-radius:20px;background:#fff;box-shadow:0 24px 60px #063f351c}.c8Preview header{display:flex;justify-content:space-between;gap:15px;align-items:start;padding-bottom:16px;border-bottom:1px solid #dfeae8}.c8Preview small{color:#078873;font-size:9px;font-weight:950;letter-spacing:.1em}.c8Preview h2{margin:5px 0 0}.c8Preview header>span{padding:7px 9px;border-radius:999px;background:#fff1d9;color:#9c6100;font-size:8px;font-weight:900}.c8Steps{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;margin:18px 0}.c8Steps i{display:grid;place-items:center;height:39px;border-radius:7px;background:#e7efed;color:#728984;font-style:normal;font-size:10px;font-weight:950}.c8Steps i.done{background:#078873;color:#fff}.c8Steps i.active{outline:3px solid #f0b734;background:#fff7dd;color:#805800}.c8Cause{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.c8Cause article{padding:12px;border-radius:9px;background:#eff7f5}.c8Cause b,.c8Cause span{display:block}.c8Cause b{font-size:10px}.c8Cause span{margin-top:4px;color:#607a75;font-size:8px}.c8Gate{margin-top:13px;padding:13px;border-radius:9px;background:#fff5d9}.c8Gate span,.c8Gate strong{display:block}.c8Gate span{color:#9b6500;font-size:8px;font-weight:950;text-transform:uppercase}.c8Gate strong{margin-top:4px;font-size:11px}.c8Ribbon{display:grid;grid-template-columns:1.5fr repeat(5,1fr);gap:10px;align-items:center;padding:17px max(32px,calc((100% - 1256px)/2));background:#073d36;color:#fff}.c8Ribbon span{display:flex;align-items:center;gap:8px;color:#d3e7e2;font-size:11px;font-weight:800}.c8Ribbon i{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#0ba286;font-size:8px;font-style:normal}.c8Section{max-width:1256px;margin:auto;padding:75px 0}.c8Heading{display:grid;grid-template-columns:1.5fr .7fr;gap:45px;align-items:end}.c8Heading h2,.c8Flow h2,.c8Training h2{margin:9px 0 18px;font-size:clamp(32px,4vw,50px);line-height:1.05;letter-spacing:-.04em}.c8Heading p,.c8Flow header p,.c8Training p{color:#587169;line-height:1.6}.c8Grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:32px}.c8Grid article{padding:23px;border:1px solid #d0e2de;border-radius:14px;background:#fff}.c8Grid b{color:#078873;font-size:11px}.c8Grid h3{margin:18px 0 8px}.c8Grid p{margin:0;color:#536e68;line-height:1.55}.c8Flow{padding:70px max(32px,calc((100% - 1256px)/2));display:grid;grid-template-columns:.75fr 1.25fr;gap:60px;background:#073d36;color:#fff}.c8Flow .c8Eyebrow{color:#67e3d0}.c8Flow header p,.c8Flow article p{color:#bed7d1}.c8Flow>div{display:grid;grid-template-columns:1fr 1fr;gap:9px}.c8Flow article{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:14px;border:1px solid #ffffff20;border-radius:10px;background:#ffffff09}.c8Flow article>i{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;background:#0ba286;font-style:normal;font-weight:950}.c8Flow h3{margin:0 0 4px}.c8Flow article p{margin:0;font-size:11px;line-height:1.4}.c8Training{max-width:1192px;margin:70px auto;padding:36px;display:grid;grid-template-columns:1fr 280px;gap:55px;align-items:center;border:1px solid #c8deda;border-radius:18px;background:#fff}.c8Training p{max-width:760px}.c8Tags{display:flex;flex-wrap:wrap;gap:8px}.c8Tags span{padding:7px 9px;border-radius:999px;background:#eaf5f2;font-size:10px;font-weight:850}.c8Training aside{text-align:center}.c8Training aside>strong,.c8Training aside>small{display:block}.c8Training aside>strong{font-size:43px}.c8Training aside>small{color:#647c76}.c8Training aside .c8Button{width:100%;margin:17px 0 10px}.c8Training aside>a{color:#067966;font-size:12px;font-weight:850}@media(max-width:950px){.c8Hero,.c8Heading,.c8Flow,.c8Training{grid-template-columns:1fr}.c8Section{padding-left:24px;padding-right:24px}.c8Grid{grid-template-columns:1fr 1fr}.c8Ribbon{grid-template-columns:1fr 1fr}.c8Ribbon>strong{grid-column:1/-1}}@media(max-width:600px){.c8Hero{padding:50px 18px}.c8Grid,.c8Flow>div{grid-template-columns:1fr}.c8Section,.c8Flow{padding:55px 18px}.c8Training{margin:45px 18px;padding:25px}.c8Hero h1{font-size:43px}}
`;

