"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import styles from "./CustomerJourneyCards.module.css";

const artworkNames = ["start", "understand", "build", "implement", "assure", "demonstrate"];

const stageDetails = [
  { title: "Set up your workspace", message: "Your organisation. Your people. Your systems.", icon: "people", steps: ["Open your account", "Complete your company and site profile", "Register your users", "Assign roles and access", "Select applicable systems and standards"] },
  { title: "Understand your starting point", message: "Know where you stand and what needs attention.", icon: "search", steps: ["Complete a readiness assessment", "Identify applicable requirements", "Assess risks and obligations", "Prioritise the gaps that need attention"] },
  { title: "Build your management system", message: "Turn requirements into organised controls.", icon: "system", steps: ["Define responsibilities", "Set objectives and measures", "Create controlled registers", "Connect procedures with supporting evidence"] },
  { title: "Put plans into action", message: "Give everyone clarity on what happens next.", icon: "plan", steps: ["Assign actions and responsibilities", "Manage suppliers and contacts", "Develop competence and retain evidence", "Prepare continuity arrangements"] },
  { title: "Check and improve", message: "See what works and strengthen what needs attention.", icon: "chart", steps: ["Conduct audits", "Investigate findings and their causes", "Verify corrective actions", "Review performance and improve"] },
  { title: "Demonstrate", icon: "report", steps: ["Compile management-ready reports", "Connect reports to supporting evidence", "Review assurance and outstanding actions", "Prepare for certification and stakeholder review"] },
];

function JourneyIcon({ type }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "people" && <><circle cx="12" cy="10" r="4" /><path d="M4 27v-5a8 8 0 0 1 16 0v5H4Zm19-13a4 4 0 1 0-2-7m3 11a7 7 0 0 1 5 7v2h-5" /></>}
    {type === "search" && <><path d="M18 4H5v24h11M18 4l6 6h-6V4ZM9 11h5m-5 5h6m-6 5h3" /><circle cx="22" cy="22" r="6" /><path d="m26.5 26.5 4 4" /></>}
    {type === "system" && <><path d="m13 3 6 0 1 4 3 2 4-1 3 5-3 3v3l3 3-3 5-4-1-3 2-1 3h-6l-1-3-3-2-4 1-3-5 3-3v-3l-3-3 3-5 4 1 3-2 1-4Z" /><circle cx="16" cy="17" r="5" /></>}
    {type === "plan" && <><path d="M11 5h-5v24h20V5h-5M12 3h8v5h-8V3ZM11 15l2 2 4-4m-6 10 2 2 4-4m4-6h1m-1 8h1" /></>}
    {type === "report" && <><path d="M7 3h13l6 6v20H7V3Zm13 0v6h6M11 14h11m-11 5h11m-11 5h7" /></>}
    {type === "chart" && <><path d="M4 29h24M6 28V18h5v10m3 0V12h5v16m3 0V4h5v24M5 12l8-7 5 2 8-6" /></>}
  </svg>;
}

function JourneyCard({ stage, number }) {
  const [flipped, setFlipped] = useState(false);
  const frontButton = useRef(null);
  const backButton = useRef(null);
  function flip(next) {
    setFlipped(next);
    requestAnimationFrame(() => (next ? backButton : frontButton).current?.focus({ preventScroll: true }));
  }
  return <article className={styles.card} onKeyDown={event => {
    if (event.key === "Escape" && flipped) { event.preventDefault(); flip(false); }
  }} aria-label={`Stage ${number}: ${stage.title}`}>
    <div className={`${styles.rotator} ${flipped ? styles.flipped : ""}`}>
      <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped} inert={flipped}>
        <Image src={stage.artwork} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 1050px) 50vw, 33vw" className={styles.artwork} />
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.cardTop}><span className={styles.number}>{number}</span><span className={styles.icon}><JourneyIcon type={stage.icon} /></span></div>
        <h3>{stage.title}</h3><p>{stage.message}</p>
        <button ref={frontButton} type="button" onClick={()=>flip(true)} aria-expanded={flipped} aria-controls={`journey-steps-${number}`} aria-label={`View steps: ${stage.title}`}>View steps <span aria-hidden="true">↻</span></button>
      </div>
      <div id={`journey-steps-${number}`} className={`${styles.face} ${styles.back}`} aria-hidden={!flipped} inert={!flipped}>
        <span className={styles.number}>{number}</span><h3>{stage.title}</h3>
        <ol>{stage.steps.map(step=><li key={step}><span aria-hidden="true">✓</span>{step}</li>)}</ol>
        <button ref={backButton} type="button" onClick={()=>flip(false)} aria-label={`Back to overview: ${stage.title}`}><span aria-hidden="true">↶</span> Back</button>
      </div>
    </div>
  </article>;
}

export default function CustomerJourneyCards({ stages }) {
  return <div className={styles.grid}>
    {stages.map(([number, title, message], index) => <JourneyCard key={number} number={number} stage={{ ...stageDetails[index], title, message, artwork: `/journey-cards/${artworkNames[index]}.png` }} />)}
  </div>;
}
