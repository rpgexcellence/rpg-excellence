"use client";
import { useRef, useState } from "react";
import styles from "./page.module.css";

const steps = [
  { id: "request", label: "Define", file: "moc-request.jpg", title: "Give the proposal a clear boundary.", text: "Describe the current and proposed state, choose the site and department, and identify the requestor and accountable owner. Record whether the change is temporary or permanent and identify the affected equipment.", value: "Agree what is changing and who coordinates the response before resources are committed.", detail: "Example: DEMO-CNC-002, a new CNC machining centre in Machining Cell 2. The description connects the production purpose with installation, document and training needs.", alt: "Actual new-change form filled with the fictional CNC installation scope and ownership" },
  { id: "screen", label: "Screen", file: "moc-screening.jpg", title: "Let the potential impact shape the review.", text: "Answer the screening questions against the proposed change. Any Yes answer requires the Full MOC pathway. Questions for the selected change type add detail, with impact areas covering the affected functions.", value: "Surface cross-functional consequences before the change is treated as a routine equipment purchase.", detail: "The CNC example uses Yes answers for potential safety, integrity, performance, quality, delivery and compliance effects. All-No screening follows MOC Lite; proportionate approval and close-out still apply.", alt: "Actual screening section requiring Full MOC and change-type questions for new equipment" },
  { id: "plan", label: "Connect", file: "moc-planning.jpg", title: "Bring the supporting controls into the request.", text: "Set the change risk level, link approved controlled risk assessments and relevant Permit to Work records, and record hazard analysis and the implementation plan. Full MOC requires at least one approved assessment.", value: "Keep the proposal connected to the assessed work, responsibilities, preparation and contingency arrangements.", detail: "This screenshot is an unsubmitted example. The assessment link is empty because RA-2026-0001 has not yet received independent approval. A provisional High change rating is demonstration data, not an assessed operational conclusion.", alt: "Actual MOC planning section with a provisional High rating, assessment and permit links, and task risk analysis" },
  { id: "assess", label: "Assess", file: "risk-hazards.jpg", title: "Follow the risk into its own controlled record.", text: "The example assessment records delivery and positioning, electrical connection and trial-machining hazards. Each has an initial rating, proposed controls, an expected residual rating and an assigned action with a target date.", value: "Make the source of the risk decision and the outstanding work easier to trace.", detail: "RA-2026-0001 contains three illustrative hazards and three open actions. Expected residual ratings depend on the proposed controls; no implementation or verification is asserted.", alt: "Actual demonstration risk assessment showing three hazards, initial and residual ratings, and assigned actions" },
  { id: "review", label: "Review", file: "risk-review.jpg", title: "Keep assessment and approval distinct.", text: "Submit the assessment for review, then use a competent approver other than the assessor. The review page shows readiness, outstanding actions and the controlled review arrangements.", value: "Keep an independent decision visible rather than treating a completed form as approval.", detail: "This example is In Review. No eligible independent approver was available when captured, so it has not been approved or linked to a saved Full MOC. The walkthrough does not bypass that requirement.", alt: "Actual assessment review screen showing In Review status, readiness checks and an independent approver requirement" },
];

export default function ChangeSteps() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  const step = steps[active];
  function select(index, focus = false) {
    const next = (index + steps.length) % steps.length;
    setActive(next);
    if (focus) refs.current[next]?.focus();
  }
  function handleKey(event, index) {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: steps.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  }
  return <>
    <div className={styles.tabs} role="tablist" aria-label="Explore the Management of Change workflow">{steps.map((item, index) => <button key={item.id} ref={node => { refs.current[index] = node; }} type="button" role="tab" id={`moc-tab-${item.id}`} aria-selected={active === index} aria-controls={`moc-panel-${item.id}`} tabIndex={active === index ? 0 : -1} onClick={() => select(index)} onKeyDown={event => handleKey(event, index)}><span>0{index + 1}</span><strong>{item.label}</strong><small>View platform screen</small></button>)}</div>
    {steps.map((item, index) => <section key={item.id} role="tabpanel" id={`moc-panel-${item.id}`} aria-labelledby={`moc-tab-${item.id}`} hidden={active !== index} className={styles.panel}><div><p className={styles.eyebrow}>INSIDE THE WORKSPACE / 0{index + 1}</p><h3>{item.title}</h3><p>{item.text}</p><aside className={styles.value}><strong>Why it matters</strong><p>{item.value}</p></aside><p className={styles.small}>{item.detail}</p></div><figure className={styles.screen}><a href={`/how-it-works/management-of-change/${item.file}`} target="_blank" rel="noreferrer" aria-label={`Enlarge ${item.label} screenshot`}><img src={`/how-it-works/management-of-change/${item.file}`} alt={item.alt} width="1348" height={item.id === "review" ? "1628" : "928"} loading="lazy"/><span>View full screen ↗</span></a><figcaption>Actual RPG Excellence interface · fictional demonstration entries.</figcaption></figure></section>)}
    <div className={styles.controls}><button type="button" onClick={() => select(active - 1)} aria-label="Previous workflow screen">← Previous</button><span aria-live="polite">0{active + 1} / 0{steps.length} · {step.label}</span><button type="button" onClick={() => select(active + 1)} aria-label="Next workflow screen">Next →</button></div>
  </>;
}