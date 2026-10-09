"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./InformationSecurityLanding.module.css";

const stages = [
  {
    id: "scope", title: "Define scope", benefit: "Set clear boundaries and ownership.",
    tint: "#eef8ff", accent: "#157cb5",
    steps: ["Define the organisation, locations, systems and information covered by your ISMS.", "Identify interested parties and the security requirements that matter.", "Establish responsibilities, policy and governance."],
    value: "Reduce ambiguity about what needs protection and who is accountable. A defined scope helps direct investment towards the information, services and obligations that matter.",
    records: "Context, scope, policy and interested-party requirements.",
    href: "overview", action: "Explore the ISMS journey",
  },
  {
    id: "risk", title: "Assess risk", benefit: "Prioritise what threatens your business.",
    tint: "#eafaf5", accent: "#087c76",
    steps: ["Identify assets, threats, vulnerabilities and potential consequences.", "Evaluate impact, likelihood and existing controls.", "Record the assessment rationale and accountable risk owner."],
    value: "Focus resources on the risks that matter to your business. Compare potential disruption, information loss and contractual consequences before choosing treatment priorities.",
    records: "Risk assessment and treatment records.",
    href: "/portal/information-security/risk-management", action: "Open the risk workspace",
  },
  {
    id: "controls", title: "Select controls", benefit: "Choose protection you can justify.",
    tint: "#f4f0ff", accent: "#6550ad",
    steps: ["Choose controls appropriate to your assessed risks and requirements.", "Record applicability and justify inclusion or exclusion in the SoA.", "Connect control ownership, implementation status and supporting evidence."],
    value: "Make control decisions traceable and easier to explain during reviews. Give management and customer assurance teams a documented rationale for where protection is needed.",
    records: "Statement of Applicability and linked control evidence.",
    href: "/portal/soa", action: "Open the SoA register",
  },
  {
    id: "treatment", title: "Implement treatment", benefit: "Turn decisions into owned action.",
    tint: "#fff4e9", accent: "#a46122",
    steps: ["Choose the treatment decision and define the intended outcome.", "Assign an owner, due date and implementation actions.", "Retain evidence and record the residual-risk acceptance decision."],
    value: "Give teams clear ownership and visibility of work still required. Use owners, deadlines and acceptance decisions to make treatment progress and unresolved exposure easier to review.",
    records: "Treatment actions, implementation evidence and acceptance decisions.",
    href: "/portal/information-security/risk-management", action: "Open risk treatment",
  },
  {
    id: "monitor", title: "Monitor and improve", benefit: "Verify results with reliable evidence.",
    tint: "#edf7fc", accent: "#157d96",
    steps: ["Monitor risk exposure, control status and overdue treatments.", "Evaluate performance using reliable evidence and review findings.", "Record improvement actions and revisit decisions when circumstances change."],
    value: "Support management decisions with a clear view of exposure and priorities. Use review evidence to challenge whether controls remain appropriate and where further investment is needed.",
    records: "Management oversight, performance measures and review evidence.",
    href: "/portal/soa/management-board", action: "Open management oversight",
  },
];

const capabilities = [
  ["ISO/IEC 27001 gap analysis", "Review requirements, retain evidence and turn gaps into owned improvement.", "/portal/information-security"],
  ["Security risk register", "Connect assets, threats, consequences, controls and residual-risk decisions.", "/portal/information-security/risk-management"],
  ["Statement of Applicability", "Justify control applicability, assign ownership and retain evidence.", "/portal/soa"],
  ["Risk treatment", "Track actions and accountable acceptance against assessed security risk.", "/portal/information-security/risk-management"],
  ["Evidence control", "Keep supporting documents, records and implementation evidence together.", "/portal/documents"],
  ["Management insight", "Review exposure, incomplete controls and treatment priorities.", "/portal/soa/management-board"],
];

function BenefitIcon({ type }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {type === "target" ? <><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="m16 16 10-10m-6 0h6v6"/></> :
      type === "people" ? <><circle cx="12" cy="11" r="4"/><path d="M4 27v-4a8 8 0 0 1 16 0v4m1-21a4 4 0 0 1 0 8m3 4a7 7 0 0 1 4 7v2"/></> :
      <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8m-8 5h8m-8 4h5"/></>}
  </svg>;
}

export default function InformationSecurityLanding({ locale = "en" }) {
  const [flipped, setFlipped] = useState(() => stages.map(() => false));
  const [playing, setPlaying] = useState(false);
  const frontButtons = useRef([]);
  const backButtons = useRef([]);
  const player = useRef(null);
  useEffect(() => { if (playing) player.current?.focus(); }, [playing]);
  const turnCard = (index, next) => {
    setFlipped(current => current.map((value, i) => i === index ? next : value));
    requestAnimationFrame(() => (next ? backButtons : frontButtons).current[index]?.focus());
  };
  const overview = `/${locale}/information-security/hub-at-a-glance`;
  const plans = `/${locale}/pricing`;

  return <main className={styles.page}>
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="isms-sales-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>INFORMATION SECURITY · ISO/IEC 27001</p>
        <h1 id="isms-sales-title">Make security decisions you can defend.</h1>
        <p className={styles.promise}>Know what matters. Assign action. Show evidence.</p>
        <p className={styles.lead}>Connect risk assessment, control decisions and accountable treatment in one ISMS workspace.</p>
        <aside className={styles.executiveInsight} aria-labelledby="isms-executive-title">
          <p className={styles.insightLabel}>EXECUTIVE INSIGHT</p>
          <h2 id="isms-executive-title">Know where exposure sits—and what needs a decision.</h2>
          <p>Bring risk, control ownership and treatment evidence into a connected view so leadership can challenge priorities, allocate resources and explain its decisions.</p>
          <ul><li><strong>Protect business continuity</strong><span>Identify the information and services your operations depend on.</span></li><li><strong>Direct investment</strong><span>Use assessed exposure and control gaps to inform spending priorities.</span></li><li><strong>Build assurance</strong><span>Organise the rationale and evidence needed for management and customer reviews.</span></li></ul>
        </aside>
        <div className={styles.actions}><Link className={styles.primary} href={plans}>Explore ISMS plans <span aria-hidden="true">→</span></Link><Link className={styles.textLink} href="/portal/information-security">Explore the workspace <span aria-hidden="true">→</span></Link></div>
      </div>
      <aside className={styles.videoPanel} aria-label="Information-security video overview">
        <div className={styles.videoScreen}>
          {playing ? <iframe ref={player} tabIndex={0} title="Information Security Risk: From Assessment to Accountable Action"
            src="https://www.youtube-nocookie.com/embed/QjWB-7huCrQ?autoplay=1&playsinline=1&rel=0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> :
            <button className={styles.videoButton} type="button" onClick={() => setPlaying(true)} aria-label="Watch Information Security Risk: From Assessment to Accountable Action, 1 minute 9 seconds">
              <Image className={styles.videoArt} src="/isms-journey/controls.png" fill sizes="(max-width: 950px) 90vw, 46vw" alt="" priority />
              <span className={styles.videoCopy}><span className={styles.videoTitle}>From assessment<br/>to accountable action.</span><span className={styles.videoDuration}>Watch the overview · 1:09</span><span className={styles.playIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5v14l11-7z" fill="currentColor"/></svg></span></span>
            </button>}
        </div>
        <a className={styles.youtube} href="https://www.youtube.com/watch?v=QjWB-7huCrQ" target="_blank" rel="noopener noreferrer">Watch on YouTube <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>
      </aside>
    </section>

    <section className={`${styles.container} ${styles.journey}`} aria-labelledby="isms-journey-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>ISMS JOURNEY</p><h2 id="isms-journey-title">From uncertainty to accountable assurance.</h2><p>Explore five connected stages. Tap a card to see the practical steps.</p></div>
      <div className={styles.cards}>
        {stages.map((stage, index) => <article key={stage.id} className={styles.card} style={{ "--card-tint": stage.tint, "--card-accent": stage.accent }} aria-label={`${index + 1}. ${stage.title}`} onKeyDown={event => { if (event.key === "Escape" && flipped[index]) { event.preventDefault(); turnCard(index, false); } }}>
          <div className={`${styles.cardInner} ${flipped[index] ? styles.isFlipped : ""}`}>
            <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped[index]} inert={flipped[index] ? true : undefined}>
              <div className={styles.illustration}><Image src={`/isms-journey/${stage.id}.png`} fill sizes="(max-width: 600px) 90vw, (max-width: 950px) 44vw, 31vw" alt=""/><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span></div>
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

    <section className={`${styles.container} ${styles.explore}`} aria-labelledby="isms-explore-title">
      <div className={styles.commercialHeading}><p className={styles.eyebrow}>START WITH YOUR PRIORITY</p><h2 id="isms-explore-title">Explore by your priority</h2><p>Choose the work that matters now, then follow the connections through your ISMS.</p></div>
      <div className={styles.priorityGrid}>
        <article><span className={`${styles.benefitIcon} ${styles.mint}`}><BenefitIcon type="document"/></span><div><h3>Understand ISO/IEC 27001 readiness</h3><p>Identify gaps, organise supporting evidence and define improvement priorities.</p><Link href="/portal/information-security">Explore gap analysis <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.lavender}`}><BenefitIcon type="target"/></span><div><h3>Prioritise security risks</h3><p>Connect assessment, control decisions and treatment to accountable owners.</p><Link href="/portal/information-security/risk-management">Explore risk management <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.apricot}`}><BenefitIcon type="people"/></span><div><h3>Justify your control decisions</h3><p>Review applicability, ownership, implementation status and evidence.</p><Link href="/portal/soa">Explore the SoA <span aria-hidden="true">→</span></Link></div></article>
      </div>
    </section>

    <section className={`${styles.container} ${styles.scenario}`} aria-labelledby="isms-scenario-title">
      <div className={styles.scenarioIntro}><p className={styles.eyebrow}>ILLUSTRATIVE SCENARIO</p><h2 id="isms-scenario-title">A lost laptop.<br/>A traceable response.</h2><p>Follow a security-risk decision from assessed exposure to owned treatment and review evidence.</p><Link className={styles.textLink} href="/portal/information-security/risk-management">Explore the risk workspace <span aria-hidden="true">→</span></Link></div>
      <ol className={styles.scenarioSteps}>
        <li><span>01</span><h3>Assess exposure</h3><p>Consider the information involved, possible consequences and existing protection.</p></li>
        <li><span>02</span><h3>Review controls</h3><p>Review relevant safeguards, their applicability and evidence of implementation.</p></li>
        <li><span>03</span><h3>Assign treatment</h3><p>Define further action, the accountable owner and the intended outcome.</p></li>
        <li><span>04</span><h3>Verify evidence</h3><p>Review implementation evidence and revisit the residual-risk decision.</p></li>
      </ol>
    </section>

    <section className={`${styles.container} ${styles.outputs}`} aria-labelledby="isms-outputs-title"><div className={styles.commercialHeading}><h2 id="isms-outputs-title">What your team can manage</h2><p>Build a clear record of what matters, what was decided and what still needs attention.</p></div><ul className={styles.outputGrid}>
      <li><strong>Defined scope</strong><span>Boundaries, requirements and responsibilities.</span></li>
      <li><strong>Assessed risks</strong><span>Exposure, rationale and accountable owners.</span></li>
      <li><strong>Justified SoA</strong><span>Control applicability and supporting decisions.</span></li>
      <li><strong>Owned treatments</strong><span>Actions, due dates and acceptance decisions.</span></li>
      <li><strong>Review evidence</strong><span>Implementation records and management priorities.</span></li>
    </ul></section>

    <section className={`${styles.container} ${styles.benefits}`} aria-labelledby="isms-benefits-title">
      <h2 id="isms-benefits-title">What your team gains</h2>
      <div className={styles.benefitGrid}>
        <article><span className={`${styles.benefitIcon} ${styles.mint}`}><BenefitIcon type="target"/></span><div><h3>Clear priorities</h3><p>Focus on the risks that matter to your business objectives.</p></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.lavender}`}><BenefitIcon type="people"/></span><div><h3>Visible accountability</h3><p>Connect decisions to owners, actions and timelines.</p></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.apricot}`}><BenefitIcon type="document"/></span><div><h3>Traceable decisions</h3><p>Show a clear link from risk to control, treatment and evidence.</p></div></article>
      </div>
      <nav className={styles.connected} aria-label="Connected ISMS workspaces"><Link href="/portal/information-security/risk-management">Risk register <span aria-hidden="true">→</span></Link><Link href="/portal/soa">Statement of Applicability <span aria-hidden="true">→</span></Link><Link href="/portal/information-security/risk-management">Treatment actions <span aria-hidden="true">→</span></Link><Link href="/portal/documents">Evidence <span aria-hidden="true">→</span></Link></nav>
      <details className={styles.capabilities}><summary>Explore the connected workspace</summary><div className={styles.capabilityGrid}>{capabilities.map(([title, text, href]) => <article key={title}><h3>{title}</h3><p>{text}</p><Link href={href}>Open workspace <span aria-hidden="true">→</span></Link></article>)}</div></details>
    </section>

    <section className={`${styles.container} ${styles.closing}`} aria-labelledby="isms-closing-title"><div><p className={styles.eyebrow}>YOUR NEXT STEP</p><h2 id="isms-closing-title">Bring risk, ownership and evidence together.</h2><p>Explore the available plans and choose access that fits your organisation.</p></div><Link className={styles.primary} href={plans}>Explore ISMS plans <span aria-hidden="true">→</span></Link></section>
  </main>;
}
