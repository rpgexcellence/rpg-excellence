"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./BusinessContinuityLanding.module.css";

const stages = [
  {
    "id": "impact",
    "title": "Understand business impact",
    "benefit": "Know what must recover first.",
    "tint": "#eef8ff",
    "accent": "#157cb5",
    "steps": [
      "Define critical activities, disruption impacts and dependencies.",
      "Evaluate how disruption affects customers, operations and commitments over time.",
      "Record recovery priorities, timeframes and minimum operating needs."
    ],
    "value": "Direct recovery investment towards the activities your business depends on. Use assessed impact and dependencies to explain which services need attention first.",
    "records": "Business impact analysis, recovery priorities and dependencies.",
    "href": "/portal/business-continuity/bia",
    "action": "Explore business impact"
  },
  {
    "id": "hazards",
    "title": "Assess disruption risk",
    "benefit": "See where operations are exposed.",
    "tint": "#eafaf5",
    "accent": "#087c76",
    "steps": [
      "Review the site profile and relevant hazard scenarios.",
      "Evaluate disruption likelihood, consequences and existing arrangements.",
      "Identify vulnerable dependencies and prioritise resilience improvements."
    ],
    "value": "Focus preparation on plausible disruptions and weak points. Connect site-specific scenarios with recovery needs so decisions reflect how your business actually operates.",
    "records": "Site profile, evaluated hazards and disruption-risk rationale.",
    "href": "/portal/business-continuity/hazard-scenarios",
    "action": "Explore hazard scenarios"
  },
  {
    "id": "strategy",
    "title": "Choose recovery solutions",
    "benefit": "Make recovery choices you can explain.",
    "tint": "#f4f0ff",
    "accent": "#6550ad",
    "steps": [
      "Compare people, premises, technology, information and supplier options.",
      "Check whether proposed solutions can support recovery priorities.",
      "Define ownership, resource needs and implementation actions."
    ],
    "value": "Make resource and supplier decisions against defined recovery needs. Expose assumptions before disruption and build a practical rationale for continuity investment.",
    "records": "Continuity strategies, solutions and supplier dependencies.",
    "href": "/portal/business-continuity/strategies-solutions",
    "action": "Explore continuity solutions"
  },
  {
    "id": "plans",
    "title": "Build actionable plans",
    "benefit": "Give teams clarity when disruption hits.",
    "tint": "#fff4e9",
    "accent": "#a46122",
    "steps": [
      "Define activation triggers, authority and escalation.",
      "Connect response teams, communications and scenario-specific actions.",
      "Document recovery arrangements and keep contacts and responsibilities current."
    ],
    "value": "Reduce uncertainty about who acts and what happens next. Bring response and recovery arrangements together so teams can work from a shared plan.",
    "records": "BCP plans, incident arrangements, roles and contacts.",
    "href": "/portal/business-continuity/plans",
    "action": "Explore BCP plans"
  },
  {
    "id": "review",
    "title": "Exercise and improve",
    "benefit": "Challenge assumptions before they matter.",
    "tint": "#edf7fc",
    "accent": "#157d96",
    "steps": [
      "Prepare teams through relevant training and scenario discussions.",
      "Exercise recovery assumptions and record observations and lessons.",
      "Assign improvements and revisit plans when dependencies or priorities change."
    ],
    "value": "Build confidence through practice and review. Use lessons and evidence to identify gaps in recovery arrangements and guide further improvement.",
    "records": "Training records, exercise observations and improvement evidence.",
    "href": "/portal/business-continuity/training",
    "action": "Explore team preparedness"
  }
];

const capabilities = [
  [
    "ISO 22301 readiness",
    "Review requirements and identify evidence-backed improvement priorities.",
    "/portal?standard=ISO%2022301%3A2019#new-assessment"
  ],
  [
    "Business impact analysis",
    "Identify priority activities, dependencies and recovery timeframes.",
    "/portal/business-continuity/bia"
  ],
  [
    "Hazard scenarios",
    "Evaluate site-specific disruptions and existing resilience arrangements.",
    "/portal/business-continuity/hazard-scenarios"
  ],
  [
    "Strategies and solutions",
    "Connect recovery needs with practical resources and continuity options.",
    "/portal/business-continuity/strategies-solutions"
  ],
  [
    "Incident management and plans",
    "Define response teams, authority, communications and recovery arrangements.",
    "/portal/business-continuity/plans"
  ],
  [
    "Training and evidence",
    "Prepare teams and retain supporting records for review and improvement.",
    "/portal/business-continuity/training"
  ]
];

function BenefitIcon({ type }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {type === "target" ? <><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="m16 16 10-10m-6 0h6v6"/></> :
      type === "people" ? <><circle cx="12" cy="11" r="4"/><path d="M4 27v-4a8 8 0 0 1 16 0v4m1-21a4 4 0 0 1 0 8m3 4a7 7 0 0 1 4 7v2"/></> :
      <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8m-8 5h8m-8 4h5"/></>}
  </svg>;
}

export default function BusinessContinuityLanding({ locale = "en" }) {
  const [flipped, setFlipped] = useState(() => stages.map(() => false));
  const [playing, setPlaying] = useState(false);
  const player = useRef(null);
  useEffect(() => { if (playing) player.current?.focus(); }, [playing]);
  const frontButtons = useRef([]);
  const backButtons = useRef([]);
  const turnCard = (index, next) => {
    setFlipped(current => current.map((value, i) => i === index ? next : value));
    requestAnimationFrame(() => (next ? backButtons : frontButtons).current[index]?.focus());
  };
  const overview = `/${locale}/business-continuity`;
  const plans = `/${locale}/pricing`;

  return <main className={styles.page}>
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="bcp-sales-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>BUSINESS CONTINUITY · ISO 22301</p>
        <h1 id="bcp-sales-title">Prepare for disruption. Make recovery a business decision.</h1>
        <p className={styles.promise}>Know your priorities. Prepare your people. Prove your arrangements.</p>
        <p className={styles.lead}>Connect business impact, site-specific hazards, recovery solutions and actionable plans in one BCP workspace.</p>
        <aside className={styles.executiveInsight} aria-labelledby="bcp-executive-title">
          <p className={styles.insightLabel}>EXECUTIVE INSIGHT</p>
          <h2 id="bcp-executive-title">Know what must recover—and what recovery depends on.</h2>
          <p>Bring operational priorities, dependencies and recovery arrangements into a connected view so leadership can challenge assumptions, allocate resources and own continuity decisions.</p>
          <ul><li><strong>Protect business continuity</strong><span>Identify priority activities and the dependencies needed to sustain them.</span></li><li><strong>Direct investment</strong><span>Use business impact and recovery needs to inform spending priorities.</span></li><li><strong>Build assurance</strong><span>Review recovery assumptions, responsibilities and supporting evidence.</span></li></ul>
        </aside>
        <div className={styles.actions}><Link className={styles.primary} href={plans}>Explore BCP plans <span aria-hidden="true">→</span></Link><Link className={styles.textLink} href="/portal/business-continuity">Explore the workspace <span aria-hidden="true">→</span></Link></div>
      </div>
      <aside className={styles.videoPanel} aria-label="Business-continuity video overview">
        <div className={styles.videoScreen}>
          {playing ? <iframe ref={player} tabIndex={0} title="RPG Excellence business continuity overview"
            src="https://www.youtube-nocookie.com/embed/SFDpsP9s22s?autoplay=1&playsinline=1&rel=0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> :
            <button className={styles.videoButton} type="button" onClick={() => setPlaying(true)} aria-label="Watch the RPG Excellence business continuity video">
              <Image className={styles.videoArt} src="/bcp-journey/strategy.png" fill sizes="(max-width: 950px) 95vw, 46vw" alt="" priority />
              <span className={styles.videoCopy}><span className={styles.videoTitle}>From business impact<br/>to practical recovery.</span><span className={styles.videoDuration}>Watch the BCP overview</span><span className={styles.playIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5v14l11-7z" fill="currentColor"/></svg></span></span>
            </button>}
        </div>
        <a className={styles.youtube} href="https://www.youtube.com/watch?v=SFDpsP9s22s" target="_blank" rel="noopener noreferrer">Watch on YouTube <span aria-hidden="true">↗</span><span className={styles.srOnly}> (opens in a new tab)</span></a>
      </aside>
    </section>

    <section className={`${styles.container} ${styles.journey}`} aria-labelledby="bcp-journey-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>BCP JOURNEY</p><h2 id="bcp-journey-title">From disruption exposure to practical recovery.</h2><p>Explore five connected stages. Tap a card to see the practical steps.</p></div>
      <div className={styles.cards}>
        {stages.map((stage, index) => <article key={stage.id} className={styles.card} style={{ "--card-tint": stage.tint, "--card-accent": stage.accent }} aria-label={`${index + 1}. ${stage.title}`} onKeyDown={event => { if (event.key === "Escape" && flipped[index]) { event.preventDefault(); turnCard(index, false); } }}>
          <div className={`${styles.cardInner} ${flipped[index] ? styles.isFlipped : ""}`}>
            <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped[index]} inert={flipped[index] ? true : undefined}>
              <div className={styles.illustration}><Image src={`/bcp-journey/${stage.id}.png`} fill sizes="(max-width: 600px) 90vw, (max-width: 950px) 44vw, 31vw" alt=""/><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span></div>
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

    <section className={`${styles.container} ${styles.explore}`} aria-labelledby="bcp-explore-title">
      <div className={styles.commercialHeading}><p className={styles.eyebrow}>START WITH YOUR PRIORITY</p><h2 id="bcp-explore-title">Where do you want to start?</h2><p>Choose one starting point. Explore the detail when you need it.</p></div>
      <div className={styles.priorityGrid}>
        <article><span className={`${styles.benefitIcon} ${styles.mint}`}><BenefitIcon type="document"/></span><div><h3>Understand ISO 22301 readiness</h3><p>Know what needs attention before committing time and budget. Review requirements and organise evidence behind your improvement priorities.</p><Link href="/portal?standard=ISO%2022301%3A2019#new-assessment">Explore gap analysis <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.lavender}`}><BenefitIcon type="target"/></span><div><h3>Identify recovery priorities</h3><p>Focus preparation on the activities that matter most. Understand disruption impacts, dependencies and minimum operating needs.</p><Link href="/portal/business-continuity/bia">Explore business impact <span aria-hidden="true">→</span></Link></div></article>
        <article><span className={`${styles.benefitIcon} ${styles.apricot}`}><BenefitIcon type="people"/></span><div><h3>Prepare your response</h3><p>Give teams a shared plan. Connect activation decisions, responsibilities, communication and recovery arrangements.</p><Link href="/portal/business-continuity/plans">Explore BCP plans <span aria-hidden="true">→</span></Link></div></article>
      </div>
    </section>

    <section className={`${styles.container} ${styles.scenario}`} aria-labelledby="bcp-scenario-title">
      <div className={styles.scenarioIntro}><p className={styles.eyebrow}>ILLUSTRATIVE SCENARIO</p><h2 id="bcp-scenario-title">Your main site is unavailable.<br/>What happens next?</h2><p>Which activities take priority? Can teams work elsewhere? Who activates recovery? Follow one disruption through four clear decisions.</p><Link className={styles.textLink} href="/portal/business-continuity/plans">Explore the BCP workspace <span aria-hidden="true">→</span></Link></div>
      <ol className={styles.scenarioSteps}>
        <li><span>01</span><h3>Confirm priorities</h3><p>Use business impact to identify the activities, timeframes and dependencies that matter.</p></li>
        <li><span>02</span><h3>Select arrangements</h3><p>Check alternative premises, remote working, technology and supplier options against recovery needs.</p></li>
        <li><span>03</span><h3>Activate response</h3><p>Confirm decision authority, response-team roles and communication with affected parties.</p></li>
        <li><span>04</span><h3>Review recovery</h3><p>Check progress, record lessons and update arrangements where assumptions proved weak.</p></li>
      </ol>
    </section>

    <section className={`${styles.container} ${styles.benefits}`} aria-label="Detailed BCP capabilities">
      <details className={styles.capabilities}><summary>Explore the connected workspace</summary><div className={styles.capabilityGrid}>{capabilities.map(([title, text, href]) => <article key={title}><h3>{title}</h3><p>{text}</p><Link href={href}>Open workspace <span aria-hidden="true">→</span></Link></article>)}</div></details>
    </section>

    <section className={`${styles.container} ${styles.closing}`} aria-labelledby="bcp-closing-title"><div><p className={styles.eyebrow}>YOUR NEXT STEP</p><h2 id="bcp-closing-title">Bring recovery priorities, people and plans together.</h2><p>Explore the available plans and choose access that fits your organisation.</p></div><Link className={styles.primary} href={plans}>Explore BCP plans <span aria-hidden="true">→</span></Link></section>
  </main>;
}
