"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./InternalAuditGlance.module.css";

const stages = [
  {id:"programme",title:"Focus the programme",benefit:"Put assurance effort where it matters.",
    tint:"#eef8ff",accent:"#157cb5",
    steps:["Define programme objectives, sites, processes and applicable criteria.",
      "Review risk, performance, change and previous findings.",
      "Plan coverage, timing and resources with a recorded rationale."],
    value:"Direct audit time towards significant exposures and make coverage gaps visible before they become surprises.",
    records:"Programme mandate, FMEA rationale, schedule and coverage.",
    href:"#tour-programme",action:"Explore programme planning"},
  {id:"team",title:"Appoint the right people",benefit:"Build confidence in the people testing controls.",
    tint:"#eafaf5",accent:"#087c76",
    steps:["Confirm competence for the standards, processes and technical scope.",
      "Review independence, conflicts and any necessary safeguards.",
      "Assign the team and retain evidence of authorisation and verification."],
    value:"Support credible conclusions through appropriate expertise, clear roles and objective judgement.",
    records:"Competence, independence, authorisation and performance review.",
    href:"#tour-competence",action:"Explore auditor verification"},
  {id:"fieldwork",title:"Test the real process",benefit:"See whether controls work in practice.",
    tint:"#f4f0ff",accent:"#6550ad",
    steps:["Agree scope, criteria, agenda and a proportionate sampling plan.",
      "Interview people, observe work and examine relevant records.",
      "Connect objective evidence with the requirement being tested."],
    value:"Find weaknesses at process interfaces and retain a defensible basis for each conclusion.",
    records:"Audit mandate, plan, samples, notes and supporting evidence.",
    href:"#tour-evidence",action:"Explore the audit workspace"},
  {id:"findings",title:"Make findings actionable",benefit:"Turn evidence into accountable improvement.",
    tint:"#fff4e9",accent:"#a46122",
    steps:["State the requirement, sampled evidence and precise gap.",
      "Review and issue findings with accountable owners and due dates.",
      "Track correction, cause analysis and corrective-action evidence."],
    value:"Give process owners a clear problem to resolve and keep follow-up visible across the audit record.",
    records:"Reviewed findings, reports, owner responses and corrective actions.",
    href:"#tour-evidence",action:"Explore controlled delivery"},
  {id:"verify",title:"Verify the improvement",benefit:"Know whether the original problem is resolved.",
    tint:"#edf7fc",accent:"#157d96",
    steps:["Check implementation against agreed acceptance criteria.",
      "Evaluate effectiveness using objective evidence and an independent decision.",
      "Close, request further action or escalate; review lessons with leadership."],
    value:"Reduce the chance of recurring failure by separating a completed action from a demonstrated improvement.",
    records:"Effectiveness evidence, verification decisions and closure history.",
    href:"#tour-management",action:"Explore management assurance"}
];
const documents = [
  ["Programme governance", "Audit programme mandates, scope, standards, locations, cycle and controlled changes."],
  ["Planning records", "Risk profiles, FMEA scoring, audit plans, agendas, sampling rationale and notifications."],
  ["Fieldwork evidence", "Checklists, interview notes, sampled records, uploaded evidence and traceable conclusions."],
  ["Findings and CAPA", "Finding statements, root-cause records, corrective actions, owners, deadlines and closure evidence."],
  ["Competence records", "Auditor scope, training, experience, authorisation and periodic performance verification."],
  ["Management outputs", "Programme dashboards, reports, trends, overdue actions and effectiveness status."],
];

export default function InternalAuditGlance({ locale = "en" }) {
  const [flipped, setFlipped] = useState(() => stages.map(() => false));
  const frontButtons = useRef([]);
  const backButtons = useRef([]);
  const turnCard = (index, next) => {
    setFlipped(current => current.map((value, i) => i === index ? next : value));
    requestAnimationFrame(() => (next ? backButtons : frontButtons).current[index]?.focus());
  };
  return <main className={styles.iagPage}>
      <section className={styles.iagHero}>
        <div className={styles.iagHeroCopy}>
          <span className={styles.iagEyebrow}>INTERNAL AUDIT HUB · PRODUCT TOUR</span>
          <h1>Explore the audit journey.<br /><em>See the evidence behind each decision.</em></h1>
          <p>The Hub connects programme governance, risk-based planning, audit delivery, objective evidence, findings, corrective action and independent verification in one controlled workspace.</p>
          <div className={styles.iagActions}>
            <Link className={[ styles.iagButton, styles.primary ].join(" ")} href="/portal/login?mode=create">Start your 14-day free trial →</Link>
            <Link className={[ styles.iagButton, styles.secondary ].join(" ")} href={`/${locale}/internal-audit`}>Back to Internal Audit Hub</Link>
            <Link className={styles.iagTrainingLink} href={`/${locale}/internal-audit-training`}>Explore auditor training →</Link>
          </div>
          <aside className={styles.iagExecutive}><span>EXECUTIVE INSIGHT</span><h2>See what connects the conclusion to the control.</h2><p>Follow the risk into the audit scope, the sample into the finding and the corrective action into an independent effectiveness decision.</p></aside>
          <div className={styles.iagChecks}><span>✓ Real product views</span><span>✓ No credit card required</span><span>✓ Built for ISO management systems</span></div>
        </div>
        <figure className={styles.iagHeroVisual}>
          <a className={styles.iagImageLink} href="/internal-audit-glance/command-centre.png" target="_blank" rel="noopener noreferrer" aria-label="Open example product screenshot at full size (new tab)"><img src="/internal-audit-glance/command-centre.png" alt="RPG Excellence Internal Audit Command Centre showing live programme and finding status" /></a>
          <figcaption>Example product screen. Values shown are illustrative.</figcaption>
        </figure>
      </section>

      <section className={styles.iagJourney}>
        <div className={styles.iagSectionHead}><span className={styles.iagEyebrow}>WHAT THE CUSTOMER CAN EXPECT</span><h2>One connected assurance lifecycle.</h2><p>Flip a card to explore practical steps and supporting records, then follow its link into the product tour below.</p></div>
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

      <section id="tour-programme" className={[ styles.iagFeature, styles.light ].join(" ")}>
        <div className={styles.iagFeatureCopy}><span className={styles.iagNumber}>01</span><span className={styles.iagEyebrow}>PROGRAMME GOVERNANCE</span><h2>Build a defensible three-year audit programme.</h2><p>Define controlled locations, applicable standards and clause coverage, then plan audits across the cycle. The programme shows what is scheduled, why it was selected and where coverage remains incomplete.</p><ul><li>Multi-site and central-function audit universe</li><li>Integrated ISO-standard coverage</li><li>Risk-based frequency and sampling rationale</li><li>Live programme register and delivery status</li></ul></div>
        <figure className={styles.iagShot}><a className={styles.iagImageLink} href="/internal-audit-glance/three-year-programme.png" target="_blank" rel="noopener noreferrer" aria-label="Open example product screenshot at full size (new tab)"><img src="/internal-audit-glance/three-year-programme.png" alt="Three-year internal audit programme and delivery schedule" loading="lazy" /></a><figcaption>Risk-based delivery schedule and controlled programme register · Open image for full size</figcaption></figure>
      </section>

      <section id="tour-risk" className={[ styles.iagFeature, styles.reverse ].join(" ")}>
        <div className={styles.iagFeatureCopy}><span className={styles.iagNumber}>02</span><span className={styles.iagEyebrow}>RISK-BASED PLANNING</span><h2>Make audit priorities transparent.</h2><p>The embedded FMEA engine profiles credible process failure, consequences, likelihood and detectability. It recommends audit priority and frequency while preserving lead-auditor judgement and a transparent rationale.</p><ul><li>Quality, legal, environmental, OH&amp;S, security and continuity impacts</li><li>Consistent risk scoring and priority bands</li><li>Documented overrides and professional judgement</li><li>Direct connection into the audit programme</li></ul></div>
        <figure className={styles.iagShot}><a className={styles.iagImageLink} href="/internal-audit-glance/fmea-risk-planning.png" target="_blank" rel="noopener noreferrer" aria-label="Open example product screenshot at full size (new tab)"><img src="/internal-audit-glance/fmea-risk-planning.png" alt="FMEA risk planning screen for internal audit prioritisation" loading="lazy" /></a><figcaption>Evidence-led FMEA prioritisation for programme decisions · Open image for full size</figcaption></figure>
      </section>

      <section id="tour-evidence" className={styles.iagDark}>
        <div className={styles.iagDarkIntro}><span className={styles.iagEyebrow}>CONTROLLED DELIVERY</span><h2>From approved scope to verified closure.</h2><p>The Hub keeps the complete audit record together, including the mandate, plan, fieldwork, evidence, findings, actions, reports and final effectiveness decision.</p></div>
        <div className={styles.iagDarkFlow}>{["Mandate","Scope & criteria","Audit plan","Fieldwork","Findings","CAPA","Verification"].map((item,index)=><div key={item}><i>{index + 1}</i><span>{item}</span></div>)}</div>
        <div className={styles.iagOutcomeGrid}><article><b>Clear accountability</b><p>Lead auditors, audit teams, process owners and action owners have defined responsibilities.</p></article><article><b>Traceable evidence</b><p>Conclusions remain connected to criteria, samples and uploaded objective evidence.</p></article><article><b>Independent closure</b><p>Action completion and effectiveness verification remain separate decisions.</p></article></div>
      </section>

      <section id="tour-competence" className={styles.iagCompetence}>
        <div className={styles.iagSectionHead}><span className={styles.iagEyebrow}>AUDITOR ASSURANCE</span><h2>Only verified people conduct audits.</h2><p>Record competence by standard and technical area, approve defined authorisation periods and periodically verify performance using completed audit work.</p></div>
        <div className={styles.iagDoubleShots}>
          <figure className={styles.iagShot}><a className={styles.iagImageLink} href="/internal-audit-glance/auditor-competence.png" target="_blank" rel="noopener noreferrer" aria-label="Open example product screenshot at full size (new tab)"><img src="/internal-audit-glance/auditor-competence.png" alt="Internal auditor competence and authorisation register" loading="lazy" /></a><figcaption>Competence, scope and auditor authorisation · Open image for full size</figcaption></figure>
          <figure className={styles.iagShot}><a className={styles.iagImageLink} href="/internal-audit-glance/auditor-verification.png" target="_blank" rel="noopener noreferrer" aria-label="Open example product screenshot at full size (new tab)"><img src="/internal-audit-glance/auditor-verification.png" alt="Quarterly internal auditor performance verification assessment" loading="lazy" /></a><figcaption>Evidence-based quarterly performance verification · Open image for full size</figcaption></figure>
        </div>
      </section>

      <section className={styles.iagDocuments}>
        <div className={styles.iagSectionHead}><span className={styles.iagEyebrow}>CONTROLLED DOCUMENTS AND RECORDS</span><h2>Know what will be retained in the Hub.</h2><p>Internal Audit documents and records remain accessible through the controlled Document Register, helping customers maintain one organised source of audit evidence.</p></div>
        <div className={styles.iagDocGrid}>{documents.map(([title,text],index)=><article key={title}><span>{String(index + 1).padStart(2,"0")}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section id="tour-management" className={styles.iagManagement}>
        <div><span className={styles.iagEyebrow}>MANAGEMENT ASSURANCE</span><h2>See what needs attention now.</h2><p>The Command Centre converts detailed audit records into a clear portfolio view: scheduled work, fieldwork status, open findings, overdue actions, clause coverage and verification requirements.</p></div>
        <div className={styles.iagMetrics}><article><strong>Live</strong><span>programme status</span></article><article><strong>Visible</strong><span>open and overdue actions</span></article><article><strong>Traceable</strong><span>evidence and decisions</span></article><article><strong>Verified</strong><span>improvement outcomes</span></article></div>
      </section>

      <section className={styles.iagCta}><div><span>EXPLORE THE COMPLETE WORKSPACE</span><h2>Start with one audit.<br />Build assurance from there.</h2><p>Use the Internal Audit Hub free for 14 days. No credit card required.</p></div><Link className={[ styles.iagButton, styles.white ].join(" ")} href="/portal/login?mode=create">Create your free account →</Link></section>
    </main>
}
