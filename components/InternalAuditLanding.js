"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import TrainingPurchaseButton from "./TrainingPurchaseButton";
import styles from "./InternalAuditLanding.module.css";

const stages = [
  {id:"programme",title:"Focus the programme",benefit:"Put assurance effort where it matters.",
    tint:"#eef8ff",accent:"#157cb5",
    steps:["Define programme objectives, sites, processes and applicable criteria.",
      "Review risk, performance, change and previous findings.",
      "Plan coverage, timing and resources with a recorded rationale."],
    value:"Direct audit time towards significant exposures and make coverage gaps visible before they become surprises.",
    records:"Programme mandate, FMEA rationale, schedule and coverage.",
    href:"/portal/internal-audit-programme",action:"Explore programme planning"},
  {id:"team",title:"Appoint the right people",benefit:"Build confidence in the people testing controls.",
    tint:"#eafaf5",accent:"#087c76",
    steps:["Confirm competence for the standards, processes and technical scope.",
      "Review independence, conflicts and any necessary safeguards.",
      "Assign the team and retain evidence of authorisation and verification."],
    value:"Support credible conclusions through appropriate expertise, clear roles and objective judgement.",
    records:"Competence, independence, authorisation and performance review.",
    href:"/portal/internal-auditor-verification",action:"Explore auditor verification"},
  {id:"fieldwork",title:"Test the real process",benefit:"See whether controls work in practice.",
    tint:"#f4f0ff",accent:"#6550ad",
    steps:["Agree scope, criteria, agenda and a proportionate sampling plan.",
      "Interview people, observe work and examine relevant records.",
      "Connect objective evidence with the requirement being tested."],
    value:"Find weaknesses at process interfaces and retain a defensible basis for each conclusion.",
    records:"Audit mandate, plan, samples, notes and supporting evidence.",
    href:"/portal/internal-audits",action:"Explore the audit workspace"},
  {id:"findings",title:"Make findings actionable",benefit:"Turn evidence into accountable improvement.",
    tint:"#fff4e9",accent:"#a46122",
    steps:["State the requirement, sampled evidence and precise gap.",
      "Review and issue findings with accountable owners and due dates.",
      "Track correction, cause analysis and corrective-action evidence."],
    value:"Give process owners a clear problem to resolve and keep follow-up visible across the audit record.",
    records:"Reviewed findings, reports, owner responses and corrective actions.",
    href:"/portal/internal-audit-actions",action:"Explore findings and actions"},
  {id:"verify",title:"Verify the improvement",benefit:"Know whether the original problem is resolved.",
    tint:"#edf7fc",accent:"#157d96",
    steps:["Check implementation against agreed acceptance criteria.",
      "Evaluate effectiveness using objective evidence and an independent decision.",
      "Close, request further action or escalate; review lessons with leadership."],
    value:"Reduce the chance of recurring failure by separating a completed action from a demonstrated improvement.",
    records:"Effectiveness evidence, verification decisions and closure history.",
    href:"/portal/internal-audit-actions",action:"Explore effectiveness review"}
];

const capabilities = [
  ["Audit Command Centre","See programme delivery, fieldwork and findings that need attention.","/portal/internal-audits"],
  ["Risk-based programme","Connect locations, selected standards, planned audits and coverage.","/portal/internal-audit-programme"],
  ["FMEA planning","Record failure modes, evidence and priority recommendations for programme decisions.","/portal/internal-audit-fmea-planning"],
  ["Auditor verification","Review competence, independence, authorisation and periodic performance.","/portal/internal-auditor-verification"],
  ["Findings and follow-up","Keep owners, due dates, responses and verification evidence connected.","/portal/internal-audit-actions"],
  ["Documents and evidence","Retain controlled programme, mandate, competence and planning records.","/portal/documents"]
];
const records = [
  ["RPG-IA-PRO-001","Internal Audit Procedure","Establish the controlled method, responsibilities and decision gates."],
  ["RPG-IA-FRM-001","Annual Internal Audit Programme","Record objectives, risk basis, schedule, coverage and resources."],
  ["RPG-IA-FRM-002","Audit Mandate, Scope and Criteria","Define assurance questions, boundaries, criteria and approval."],
  ["RPG-IA-FRM-003","Competence and Independence Declaration","Record competence evidence, conflicts, safeguards and appointment decisions."],
  ["RPG-IA-FRM-004","Audit Plan and Agenda","Connect the mandate with sampling, logistics and communication."]
];

function BenefitIcon({ type }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {type === "target" ? <><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="m16 16 10-10m-6 0h6v6"/></> :
      type === "people" ? <><circle cx="12" cy="11" r="4"/><path d="M4 27v-4a8 8 0 0 1 16 0v4m1-21a4 4 0 0 1 0 8m3 4a7 7 0 0 1 4 7v2"/></> :
      <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8m-8 5h8m-8 4h5"/></>}
  </svg>;
}

export default function InternalAuditLanding({ locale = "en" }) {
  const [flipped, setFlipped] = useState(() => stages.map(() => false));
  const frontButtons = useRef([]);
  const backButtons = useRef([]);
  const turnCard = (index, next) => {
    setFlipped(current => current.map((value, i) => i === index ? next : value));
    requestAnimationFrame(() => (next ? backButtons : frontButtons).current[index]?.focus());
  };
  const trial = "/portal/login?mode=create";
  return <main className={styles.page}>
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="audit-sales-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>INTERNAL AUDIT · CONNECTED BUSINESS ASSURANCE</p>
        <h1 id="audit-sales-title">Find the weakness.<br/>Own the action.<br/>Verify the improvement.</h1>
        <p className={styles.promise}>Plan with purpose. Test with evidence. Close with confidence.</p>
        <p className={styles.lead}>Bring risk-based programmes, competent auditors, objective evidence and controlled follow-up into one connected Internal Audit Hub.</p>
        <aside className={styles.executiveInsight} aria-labelledby="audit-executive-title">
          <p className={styles.insightLabel}>EXECUTIVE INSIGHT</p>
          <h2 id="audit-executive-title">Which business decisions can you trust your audit evidence to support?</h2>
          <p>Give leadership a clear view of what was tested, where exposure remains and whether corrective action changed the outcome.</p>
          <ul><li><strong>Protect commitments</strong><span>Test the controls that customers and operations depend on.</span></li><li><strong>Focus resources</strong><span>Use risk and performance to explain audit priorities.</span></li><li><strong>Reduce recurrence</strong><span>Verify results before accepting closure.</span></li></ul>
        </aside>
        <div className={styles.actions}><Link className={styles.primary} href={trial}>Start your 14-day free trial <span aria-hidden="true">→</span></Link><Link className={styles.textLink} href={`/${locale}/internal-audit/hub-at-a-glance`}>Explore the product tour <span aria-hidden="true">→</span></Link></div>
      </div>
      <aside className={styles.heroPanel} aria-label="Internal audit overview">
        <div className={styles.heroPhoto}><Image src="/audit-journey/fieldwork.png" fill sizes="(max-width: 950px) 95vw, 46vw" alt="Illustrative professional audit interview in an engineering workplace" priority/><span className={styles.photoTag}>EVIDENCE AT THE POINT OF WORK</span></div>
        <div className={styles.heroCaption}><p className={styles.eyebrow}>FROM AUDIT ACTIVITY TO BUSINESS ASSURANCE</p><h2>Follow one decision from evidence to verified action.</h2><p>Scope → team → plan → fieldwork → findings → follow-up.</p><Link className={styles.textLink} href={`/${locale}/internal-audit/hub-at-a-glance`}>See the real product screens <span aria-hidden="true">→</span></Link></div>
      </aside>
    </section>

    <section className={`${styles.container} ${styles.journey}`} aria-labelledby="audit-journey-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>YOUR INTERNAL AUDIT JOURNEY</p><h2 id="audit-journey-title">Five stages. One connected assurance trail.</h2><p>Tap or click “View steps” to explore the decisions, records and business value.</p></div>
      <div className={styles.cards}>{stages.map((stage,index) => <article key={stage.id} className={styles.card} style={{"--card-tint":stage.tint,"--card-accent":stage.accent}} aria-label={`${index+1}. ${stage.title}`} onKeyDown={event=>{if(event.key==="Escape" && flipped[index]){event.preventDefault();turnCard(index,false);}}}>
        <div className={`${styles.cardInner} ${flipped[index] ? styles.isFlipped : ""}`}>
          <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped[index]} inert={flipped[index] ? true : undefined}>
            <div className={styles.illustration}><Image src={`/audit-journey/${stage.id}.png`} fill sizes="(max-width: 600px) 92vw, (max-width: 1100px) 45vw, 31vw" alt=""/><span className={styles.number}>{String(index+1).padStart(2,"0")}</span></div>
            <div className={styles.frontCopy}><h3>{stage.title}</h3><p>{stage.benefit}</p><button ref={node=>{frontButtons.current[index]=node;}} className={styles.flipButton} type="button" aria-label={`View steps for ${stage.title}`} onClick={()=>turnCard(index,true)}>View steps <span aria-hidden="true">↻</span></button></div>
          </div>
          <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped[index]} inert={!flipped[index] ? true : undefined}>
            <span className={styles.backLabel}>YOUR NEXT STEPS · {String(index+1).padStart(2,"0")}</span><h3>{stage.title}</h3>
            <ol className={styles.steps}>{stage.steps.map(step=><li key={step}>{step}</li>)}</ol>
            <div className={styles.value}><strong>Business value</strong><p>{stage.value}</p></div>
            <p className={styles.records}><strong>Supporting records</strong>{stage.records}</p>
            <div className={styles.backActions}><Link className={styles.workspaceLink} href={stage.href}>{stage.action} <span aria-hidden="true">→</span></Link><button ref={node=>{backButtons.current[index]=node;}} className={styles.flipButton} type="button" aria-label={`Back to ${stage.title}`} onClick={()=>turnCard(index,false)}>Back <span aria-hidden="true">↶</span></button></div>
          </div>
        </div>
      </article>)}</div>
    </section>

    <section className={`${styles.container} ${styles.explore}`} aria-labelledby="audit-priority-title">
      <div className={styles.commercialHeading}><p className={styles.eyebrow}>START WITH YOUR PRIORITY</p><h2 id="audit-priority-title">Where does your assurance need attention?</h2><p>Choose a starting point, then follow the connected records.</p></div>
      <div className={styles.priorityGrid}>
        <article><span className={`${styles.benefitIcon} ${styles.mint}`}><BenefitIcon type="target"/></span><div><h3>Focus the audit programme</h3><p>Connect risk, change, locations and selected standards. See where planned coverage needs a management decision.</p><Link href="/portal/internal-audit-programme">Explore programme planning <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.lavender}`}><BenefitIcon type="people"/></span><div><h3>Strengthen auditor confidence</h3><p>Review competence and independence, define authorised scope and assess performance using completed audit work.</p><Link href="/portal/internal-auditor-verification">Explore auditor verification <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.apricot}`}><BenefitIcon type="document"/></span><div><h3>Resolve recurring findings</h3><p>Keep the problem, owner response, corrective action and effectiveness decision in one traceable follow-up.</p><Link href="/portal/internal-audit-actions">Explore findings and actions <span aria-hidden="true">→</span></Link></div></article>
      </div>
    </section>

    <section className={`${styles.container} ${styles.scenario}`} aria-labelledby="audit-scenario-title">
      <div className={styles.scenarioIntro}><p className={styles.eyebrow}>ILLUSTRATIVE SCENARIO</p><h2 id="audit-scenario-title">The same supplier defect appears again.<br/>What did the last audit miss?</h2><p>Follow the issue through a control sample, a precise finding and an independent effectiveness decision.</p><Link className={styles.textLink} href="/portal/internal-audits">Explore the audit workspace <span aria-hidden="true">→</span></Link></div>
      <ol className={styles.scenarioSteps}>
        <li><span>01</span><h3>Follow the risk</h3><p>Use complaints, supplier results and previous findings to justify a targeted process audit.</p></li>
        <li><span>02</span><h3>Test the control</h3><p>Sample approval, incoming inspection and escalation records. Check what happened at the point of work.</p></li>
        <li><span>03</span><h3>Own the correction</h3><p>State the requirement and gap. Assign an owner to investigate causes and implement corrective action.</p></li>
        <li><span>04</span><h3>Verify the result</h3><p>Check later deliveries and control performance against agreed criteria before accepting closure.</p></li>
      </ol>
    </section>

    <section className={`${styles.container} ${styles.benefits}`} aria-label="Internal audit workspace and records">
      <details className={styles.capabilities}><summary>Explore the connected audit workspace</summary><div className={styles.capabilityGrid}>{capabilities.map(([title,text,href])=><article key={title}><h3>{title}</h3><p>{text}</p><Link href={href}>Open workspace <span aria-hidden="true">→</span></Link></article>)}</div></details>
      <details className={styles.capabilities}><summary>See the supporting procedure and planning records</summary><p className={styles.resourceIntro}>These RPG records provide a practical foundation for programme governance, auditor appointment and audit planning. Adapt and approve them for your organisation.</p><div className={styles.recordGrid}>{records.map(([code,title,text])=><article key={code}><span>{code}</span><h3>{title}</h3><p>{text}</p></article>)}</div><Link className={styles.textLink} href="/portal/documents">Open the controlled Document Register <span aria-hidden="true">→</span></Link></details>
    </section>

    <section className={`${styles.container} ${styles.training}`} aria-labelledby="audit-training-title">
      <div><p className={styles.eyebrow}>BUILD AUDITOR CAPABILITY</p><h2 id="audit-training-title">Internal Auditor Refresher</h2><p>Seven interactive modules covering planning, interviewing, objective evidence, findings, reporting and follow-up.</p><div className={styles.tags}><span>35–45 minutes</span><span>80% pass mark</span><span>Verifiable certificate</span></div></div>
      <aside><strong>£19.99</strong><span>+ VAT / learner</span><TrainingPurchaseButton className={styles.primary} course="internal-auditor-refresher">Buy refresher training →</TrainingPurchaseButton><Link className={styles.textLink} href={`/${locale}/internal-audit-training`}>See course details →</Link></aside>
    </section>

    <section className={`${styles.container} ${styles.closing}`} aria-labelledby="audit-closing-title"><div><p className={styles.eyebrow}>YOUR NEXT STEP</p><h2 id="audit-closing-title">Bring audit priorities, people and evidence together.</h2><p>Start your 14-day free trial and explore the connected audit workspace.</p></div><Link className={styles.primary} href={trial}>Start your free trial <span aria-hidden="true">→</span></Link></section>
  </main>;
}
