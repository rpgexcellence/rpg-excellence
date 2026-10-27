"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./HealthSafetyLanding.module.css";

const stages = [
  {
    "id": "identify",
    "title": "Identify hazards",
    "benefit": "See what could cause harm before work starts.",
    "tint": "#eef8ff",
    "accent": "#157cb5",
    "steps": [
      "Define the activity, location, people and foreseeable working conditions.",
      "Identify hazards from equipment, substances, environment and interacting work.",
      "Consult the people doing the work and identify who may be harmed."
    ],
    "value": "Make assessment specific to the work. Recognising hazards and affected people early gives teams a clearer basis for choosing controls and planning the task.",
    "records": "Task details, hazards, affected people and consultation.",
    "href": "/portal/health-safety/risk-assessment/new",
    "action": "Create a risk assessment"
  },
  {
    "id": "assess",
    "title": "Assess the risks",
    "benefit": "Make priorities clear and decisions traceable.",
    "tint": "#eafaf5",
    "accent": "#087c76",
    "steps": [
      "Consider existing controls and realistic exposure to each hazard.",
      "Evaluate likelihood and credible severity using the controlled method.",
      "Record the rationale and identify risks requiring further action."
    ],
    "value": "Use a consistent assessment method to support accountable judgement. Make it easier to explain which risks need attention and where resources should be directed.",
    "records": "Initial risk scores, existing controls and assessment rationale.",
    "href": "/portal/health-safety/risk-assessment",
    "action": "Explore the risk register"
  },
  {
    "id": "control",
    "title": "Control the risks",
    "benefit": "Turn assessment into practical protection.",
    "tint": "#f4f0ff",
    "accent": "#6550ad",
    "steps": [
      "Consider eliminating hazards and reducing exposure through the hierarchy of control.",
      "Assign further controls to accountable owners with due dates.",
      "Evaluate residual risk and verify that the controls work in practice."
    ],
    "value": "Give control decisions a clear owner and evidence of delivery. Connect the assessment to action so completion and effectiveness can be reviewed separately.",
    "records": "Control actions, ownership, residual risk and verification evidence.",
    "href": "/portal/health-safety/actions",
    "action": "Explore actions and verification"
  },
  {
    "id": "record",
    "title": "Record and communicate",
    "benefit": "Give teams a shared understanding of the work.",
    "tint": "#fff4e9",
    "accent": "#a46122",
    "steps": [
      "Record significant findings, decisions, responsibilities and review dates.",
      "Use the review and approval workflow to control the assessment.",
      "Communicate the controls and consult or brief affected people."
    ],
    "value": "Keep the reasoning, approval and communication connected. Help supervisors and workers understand the controls they must apply and retain a record for subsequent review.",
    "records": "Approved assessments, significant findings and briefing records.",
    "href": "/portal/health-safety/risk-assessment",
    "action": "Explore controlled assessments"
  },
  {
    "id": "review",
    "title": "Review and build competence",
    "benefit": "Keep assessments relevant as conditions change.",
    "tint": "#edf7fc",
    "accent": "#157d96",
    "steps": [
      "Review assessment currency, control performance and outstanding actions.",
      "Reassess when activities, conditions or evidence change.",
      "Build assessor capability through practical training and refresher learning."
    ],
    "value": "Challenge whether arrangements remain effective. Combine management oversight and learning to identify weak controls, overdue reviews and competence needs.",
    "records": "Review decisions, management oversight and training evidence.",
    "href": "/portal/health-safety/management-board",
    "action": "Explore management insight"
  },
  {
    "id": "inspect",
    "title": "Workplace inspections",
    "benefit": "Check that workplace controls work in practice.",
    "tint": "#eef8f1",
    "accent": "#247a51",
    "steps": [
        "Plan risk-based inspections for your sites, zones and work areas.",
        "Use location-specific checklists to record observations and supporting evidence.",
        "Assign findings to accountable owners and verify actions before closure."
    ],
    "value": "Identify deteriorating conditions and control gaps before they become incidents. Connect routine inspections with clear ownership, due dates and evidence of improvement.",
    "records": "Inspection programmes, completed checklists, findings, action owners and verification evidence.",
    "href": "/portal/health-safety/workplace-inspections",
    "action": "Explore Workplace Inspections"
}
];

const capabilities = [
  [
    "Risk assessment builder",
    "Identify hazards, evaluate risk and record significant findings.",
    "/portal/health-safety/risk-assessment/new"
  ],
  [
    "Actions and verification",
    "Assign control actions and retain effectiveness evidence.",
    "/portal/health-safety/actions"
  ],
  [
    "Management insight",
    "Review exposure, overdue actions, assessment currency and competence.",
    "/portal/health-safety/management-board"
  ],
  [
    "POWRA",
    "Review conditions and controls at the point of work.",
    "/portal/health-safety/powra"
  ],
  [
    "Permit to work",
    "Access permit-to-work arrangements and supporting controls.",
    "/portal/health-safety/permits"
  ],
  [
    "Management of change",
    "Review proposed changes and their implications for people, activities and controls.",
    "/portal/health-safety/moc"
  ],
  [
    "Interactive training",
    "Explore initial and refresher risk-assessment learning.",
    "training"
  ]
];

function BenefitIcon({ type }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {type === "target" ? <><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="m16 16 10-10m-6 0h6v6"/></> :
      type === "people" ? <><circle cx="12" cy="11" r="4"/><path d="M4 27v-4a8 8 0 0 1 16 0v4m1-21a4 4 0 0 1 0 8m3 4a7 7 0 0 1 4 7v2"/></> :
      <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8m-8 5h8m-8 4h5"/></>}
  </svg>;
}

export default function HealthSafetyLanding({ locale = "en" }) {
  const [flipped, setFlipped] = useState(() => stages.map(() => false));
  const frontButtons = useRef([]);
  const backButtons = useRef([]);
  const turnCard = (index, next) => {
    setFlipped(current => current.map((value, i) => i === index ? next : value));
    requestAnimationFrame(() => (next ? backButtons : frontButtons).current[index]?.focus());
  };
  const overview = `/${locale}/hs-hub`;
  const training = `/${locale}/hs-hub/training`;

  return <main className={styles.page}>
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hs-sales-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>HEALTH & SAFETY · WORKPLACE RISK CONTROL</p>
        <h1 id="hs-sales-title">Turn workplace risk into controlled action.</h1>
        <p className={styles.promise}>Protect your people. Own the controls. Verify what works.</p>
        <p className={styles.lead}>Connect workplace risk assessment, control actions, approval, review and assessor competence in one H&S workspace.</p>
        <aside className={styles.executiveInsight} aria-labelledby="hs-executive-title">
          <p className={styles.insightLabel}>EXECUTIVE INSIGHT</p>
          <h2 id="hs-executive-title">Know where people are exposed—and where action is needed.</h2>
          <p>Bring workplace hazards, control delivery and assessment currency into a connected view so leadership can challenge priorities, allocate resources and act on evidence.</p>
          <ul><li><strong>Protect people</strong><span>Keep attention on hazards, affected people and practical controls.</span></li><li><strong>Direct action</strong><span>Connect additional controls with accountable owners and deadlines.</span></li><li><strong>Build capability</strong><span>Use review evidence and training to strengthen assessment practice.</span></li></ul>
        </aside>
        <div className={styles.actions}><Link className={styles.primary} href="/portal/health-safety">Explore the H&S Hub <span aria-hidden="true">→</span></Link><Link className={styles.textLink} href={training}>View training options <span aria-hidden="true">→</span></Link></div>
      </div>
      <aside className={`${styles.videoPanel} ${styles.workplacePanel}`} aria-label="Practical workplace risk control">
        <div className={styles.workplaceImage}><Image src="/hs-journey/identify.png" fill sizes="(max-width:950px) 95vw, 46vw" alt="Engineering professionals inspecting workplace hazards and recording their assessment" priority /></div>
        <div className={styles.workplaceCopy}><p className={styles.eyebrow}>ASSESSMENT → ACTION → VERIFIED CONTROL</p><h2>Good assessment changes what happens at work.</h2><p>Give teams clear controls, give action owners clear responsibility and give leaders evidence of progress.</p><Link className={styles.textLink} href="/portal/health-safety/risk-assessment/new">Explore guided assessment <span aria-hidden="true">→</span></Link></div>
      </aside>
    </section>

    <section className={`${styles.container} ${styles.journey}`} aria-labelledby="hs-journey-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>WORKPLACE RISK JOURNEY</p><h2 id="hs-journey-title">Six stages. One practical route to safer work.</h2><p>Explore six connected stages. Tap a card to see the practical steps.</p></div>
      <div className={styles.cards}>
        {stages.map((stage, index) => <article key={stage.id} className={styles.card} style={{ "--card-tint": stage.tint, "--card-accent": stage.accent }} aria-label={`${index + 1}. ${stage.title}`} onKeyDown={event => { if (event.key === "Escape" && flipped[index]) { event.preventDefault(); turnCard(index, false); } }}>
          <div className={`${styles.cardInner} ${flipped[index] ? styles.isFlipped : ""}`}>
            <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped[index]} inert={flipped[index] ? true : undefined}>
              <div className={styles.illustration}><Image src={`/hs-journey/${stage.id}.png`} fill sizes="(max-width: 600px) 90vw, (max-width: 1100px) 44vw, 31vw" alt=""/><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span></div>
              <div className={styles.frontCopy}><h3>{stage.title}</h3><p>{stage.benefit}</p><button ref={node => { frontButtons.current[index] = node; }} className={styles.flipButton} type="button" onClick={() => turnCard(index, true)} aria-label={`View steps for ${stage.title}`}>View steps <span aria-hidden="true">↻</span></button></div>
            </div>
            <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped[index]} inert={!flipped[index] ? true : undefined}>
              <span className={styles.backLabel}>YOUR NEXT STEPS · {String(index + 1).padStart(2, "0")}</span><h3>{stage.title}</h3>
              <ol className={styles.steps}>{stage.steps.map(step => <li key={step}>{step}</li>)}</ol>
              <div className={styles.value}><strong>Business value</strong><p>{stage.value}</p></div>
              <p className={styles.records}><strong>Supporting records</strong>{stage.records}</p>
              <div className={styles.backActions}><Link className={styles.workspaceLink} href={stage.href === "overview" ? overview : stage.href}>{stage.action} <span aria-hidden="true">→</span></Link><button ref={node => { backButtons.current[index] = node; }} className={styles.flipButton} type="button" onClick={() => turnCard(index, false)} aria-label={`Back to ${stage.title}`}>Back <span aria-hidden="true">↶</span></button></div>
            </div>
          </div>
        </article>)}
      </div>
    </section>

    <section className={`${styles.container} ${styles.explore}`} aria-labelledby="hs-explore-title">
      <div className={styles.commercialHeading}><p className={styles.eyebrow}>START WITH YOUR PRIORITY</p><h2 id="hs-explore-title">Where do you want to start?</h2><p>Choose one starting point. Explore the detail when you need it.</p></div>
      <div className={styles.priorityGrid}>
        <article><span className={`${styles.benefitIcon} ${styles.mint}`}><BenefitIcon type="document"/></span><div><h3>Assess the work</h3><p>Move beyond a blank template. Follow a guided workflow to connect hazards, affected people, risk decisions and controls.</p><Link href="/portal/health-safety/risk-assessment/new">Explore risk assessment <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.lavender}`}><BenefitIcon type="target"/></span><div><h3>See what needs attention</h3><p>Keep elevated risk, overdue control actions and reviews visible. Give management a clearer basis for deciding what happens next.</p><Link href="/portal/health-safety/management-board">Explore management insight <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.apricot}`}><BenefitIcon type="people"/></span><div><h3>Build assessor competence</h3><p>Develop practical judgement through interactive scenarios, exercises and assessment. Explore initial and refresher learning.</p><Link href={training}>Explore training options <span aria-hidden="true">→</span></Link></div></article>
      </div>
    </section>

    <section className={`${styles.container} ${styles.scenario}`} aria-labelledby="hs-scenario-title">
      <div className={styles.scenarioIntro}><p className={styles.eyebrow}>ILLUSTRATIVE SCENARIO</p><h2 id="hs-scenario-title">The task is planned.<br/>The conditions have changed.</h2><p>A temporary obstruction changes access to the work area. Use the point-of-work review to challenge assumptions and confirm the next action.</p><Link className={styles.textLink} href="/portal/health-safety/powra">Explore POWRA <span aria-hidden="true">→</span></Link></div>
      <ol className={styles.scenarioSteps}>
        <li><span>01</span><h3>Check conditions</h3><p>Confirm what has changed in the activity, access route and nearby work.</p></li>
        <li><span>02</span><h3>Review protection</h3><p>Check whether the planned controls still address the hazards and affected people.</p></li>
        <li><span>03</span><h3>Decide and assign</h3><p>Escalate unresolved concerns and agree the controls and responsibilities needed before proceeding.</p></li>
        <li><span>04</span><h3>Record and revisit</h3><p>Record the decision, communicate changes and revisit the assessment where necessary.</p></li>
      </ol>
    </section>

    <section className={`${styles.container} ${styles.benefits}`} aria-label="Detailed H&S capabilities">
      <details className={styles.capabilities}><summary>Explore the connected workspace</summary><div className={styles.capabilityGrid}>{capabilities.map(([title, text, href]) => <article key={title}><h3>{title}</h3><p>{text}</p><Link href={href === "training" ? training : href}>Explore this area <span aria-hidden="true">→</span></Link></article>)}</div></details>
    </section>

    <section className={`${styles.container} ${styles.closing}`} aria-labelledby="hs-closing-title"><div><p className={styles.eyebrow}>YOUR NEXT STEP</p><h2 id="hs-closing-title">Bring workplace risk, people and controls together.</h2><p>Explore the H&S workspace or build practical assessment skills through training.</p></div><Link className={styles.primary} href="/portal/health-safety">Explore the H&S Hub <span aria-hidden="true">→</span></Link></section>
    <div className={`${styles.container} ${styles.guidance}`}><a href="https://www.hse.gov.uk/risk/" target="_blank" rel="noopener noreferrer">View official HSE risk guidance <span aria-hidden="true">↗</span></a></div>
  </main>;
}
