"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import TrainingPurchaseButton from './TrainingPurchaseButton';
import styles from './CapaEightDLanding.module.css';

const stages = [
  {id:'triage',code:'START',title:'Choose the right response',benefit:'Match the investigation to the problem.',image:'/audit-journey/programme.png',tint:'#eef8ff',accent:'#157cb5',
    steps:['Record the concern, its impact and the available facts.','Distinguish correction, containment and the need for systemic investigation.','Assign the treatment route and responsible lead.'],
    value:'Focus effort where risk and recurrence justify it, while making immediate responsibilities clear.',records:'Case scope, triage decision and assigned lead.'},
  {id:'define',code:'D1–D2',title:'Build the team. Define the problem.',benefit:'Give the investigation a precise starting point.',image:'/audit-journey/team.png',tint:'#eafaf5',accent:'#087c76',
    steps:['Appoint a lead and the people with relevant technical knowledge.','Describe what happened, where, when, the extent and impact.','Separate confirmed facts from assumptions and preserve supporting evidence.'],
    value:'Reduce time spent investigating vague symptoms or debating different versions of the problem.',records:'Team responsibilities, problem statement and initial evidence.'},
  {id:'contain',code:'D3',title:'Protect while you investigate',benefit:'Control the immediate exposure.',image:'/images/how-it-works/operations.webp',tint:'#fff4e9',accent:'#a46122',
    steps:['Identify immediate protection for affected people, products or services.','Assign containment actions, owners and review points.','Check containment without treating it as the permanent solution.'],
    value:'Give the business a controlled response while the team establishes what caused the failure.',records:'Containment decisions, accountable actions and checks.'},
  {id:'analyse',code:'D4',title:'Test the causal explanation',benefit:'Follow evidence beyond the first plausible answer.',image:'/pricing/review.webp',tint:'#f4f0ff',accent:'#6550ad',
    steps:['Examine occurrence, escape and system-prevention paths.','Use structured analysis to challenge each proposed causal link.','Retain evidence for the verified mechanism and identify remaining uncertainty.'],
    value:'Choose corrective action against an evidenced cause rather than an unsupported conclusion.',records:'Causal analysis, tested explanations and supporting evidence.'},
  {id:'act',code:'D5–D6',title:'Select and implement action',benefit:'Make the change address the verified cause.',image:'/hs-journey/record.png',tint:'#edf7fc',accent:'#157d96',
    steps:['Select actions that address the verified causal mechanism.','Assign owners, target dates and the required implementation evidence.','Control the change and check implementation against the intended action.'],
    value:'Keep the action decision, its owner and evidence of delivery connected to the cause.',records:'Action rationale, responsibilities and implementation evidence.'},
  {id:'verify',code:'D7–D8',title:'Verify and sustain the improvement',benefit:'Keep completion separate from effectiveness.',image:'/audit-journey/verify.png',tint:'#edf8ef',accent:'#247248',
    steps:['Review the wider extent and strengthen relevant system controls.','Evaluate later performance against defined criteria through authorised independent review.','Record learning and the closure decision; extend action when the evidence is insufficient.'],
    value:'Give closure a defensible basis and help the organisation avoid repeating the same failure.',records:'Extent review, effectiveness evidence and authorised closure decision.'},
];
const capabilities = [
  ['Case register','Keep case ownership, status and the response route visible.','/portal/rca'],
  ['Open cases','Follow investigations and actions that need attention.','/portal/rca?view=open'],
  ['Effectiveness review','Review cases awaiting the verification decision.','/portal/rca?view=verification'],
  ['Management board','Review case progress and outstanding work.','/portal/rca?view=management-board'],
];

export default function CapaEightDLanding({locale='en'}) {
  const [flipped,setFlipped]=useState(()=>stages.map(()=>false));
  const frontButtons=useRef([]), backButtons=useRef([]);
  const turnCard=(index,next)=>{
    setFlipped(current=>current.map((value,i)=>i===index?next:value));
    requestAnimationFrame(()=>(next?backButtons:frontButtons).current[index]?.focus());
  };
  return <main className={styles.page}>
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="capa-title">
      <div className={styles.heroCopy}><p className={styles.eyebrow}>CAPA–8D / EVIDENCE-LED PROBLEM SOLVING</p><h1 id="capa-title">Find the cause.<br/>Own the action.<br/>Verify the change.</h1><p className={styles.promise}>Protect now. Investigate properly. Improve for the long term.</p><p className={styles.lead}>Connect triage, containment, causal analysis, corrective action and independent effectiveness review in one controlled CAPA–8D workspace.</p>
        <aside className={styles.executiveInsight}><p className={styles.insightLabel}>EXECUTIVE INSIGHT</p><h2>Has the problem been resolved—or has the action only been completed?</h2><p>Give leaders a clear view of the evidence behind the cause, the response and the decision to close.</p><ul><li><strong>Protect commitments</strong><span>Control immediate exposure while the team investigates.</span></li><li><strong>Direct the response</strong><span>Connect verified causes to accountable action.</span></li><li><strong>Challenge closure</strong><span>Review sustained results before accepting effectiveness.</span></li></ul></aside>
        <div className={styles.actions}><Link className={styles.primary} href="/portal/rca">Explore the CAPA–8D workspace →</Link><Link className={styles.textLink} href={`/${locale}/rca-8d-training`}>View practitioner training →</Link></div>
      </div>
      <aside className={styles.heroPanel} aria-label="CAPA–8D in practice"><div className={styles.heroPhoto}><Image src="/images/how-it-works/operations.webp" fill sizes="(max-width:950px) 95vw, 46vw" alt="Illustrative engineering team reviewing evidence beside guarded equipment" priority/><span className={styles.photoTag}>FROM THE POINT OF WORK TO VERIFIED IMPROVEMENT</span></div><div className={styles.heroCaption}><p className={styles.eyebrow}>A CONTROLLED DECISION TRAIL</p><h2>Follow the evidence.<br/>Make the improvement count.</h2><p>Problem → cause → action → evidence → review.</p><a className={styles.textLink} href="#capa-journey">Explore the practical steps ↓</a></div></aside>
    </section>
    <section id="capa-journey" className={`${styles.container} ${styles.journey}`} aria-labelledby="capa-journey-title"><header className={styles.sectionHeading}><p className={styles.eyebrow}>YOUR CORRECTIVE-ACTION JOURNEY</p><h2 id="capa-journey-title">Six stages. One traceable response.</h2><p>Tap “View steps” to turn a card and explore the decisions, evidence and business value.</p></header>
      <div className={styles.cards}>{stages.map((stage,index)=><article key={stage.id} className={styles.card} style={{'--card-tint':stage.tint,'--card-accent':stage.accent}} aria-label={`${index+1}. ${stage.title}`} onKeyDown={event=>{if(event.key==='Escape'&&flipped[index]){event.preventDefault();turnCard(index,false);}}}>
        <div className={`${styles.cardInner} ${flipped[index]?styles.isFlipped:''}`}>
          <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped[index]} inert={flipped[index]?true:undefined}><div className={styles.illustration}><Image src={stage.image} fill sizes="(max-width:600px) 92vw, (max-width:1100px) 45vw, 31vw" alt=""/><span className={styles.number}>0{index+1}</span><span className={styles.discipline}>{stage.code}</span></div><div className={styles.frontCopy}><h3>{stage.title}</h3><p>{stage.benefit}</p><button type="button" className={styles.flipButton} ref={node=>{frontButtons.current[index]=node;}} aria-expanded={flipped[index]} aria-controls={`capa-detail-${stage.id}`} aria-label={`View steps for ${stage.title}`} onClick={()=>turnCard(index,true)}>View steps <span aria-hidden="true">↻</span></button></div></div>
          <div id={`capa-detail-${stage.id}`} className={`${styles.face} ${styles.back}`} aria-hidden={!flipped[index]} inert={!flipped[index]?true:undefined}><span className={styles.backLabel}>YOUR NEXT STEPS / {stage.code}</span><h3>{stage.title}</h3><ol className={styles.steps}>{stage.steps.map(step=><li key={step}>{step}</li>)}</ol><div className={styles.value}><strong>Business value</strong><p>{stage.value}</p></div><p className={styles.records}><strong>Supporting records</strong>{stage.records}</p><div className={styles.backActions}><Link className={styles.workspaceLink} href="/portal/rca">Open CAPA–8D →</Link><button type="button" ref={node=>{backButtons.current[index]=node;}} className={styles.flipButton} aria-label={`Back to ${stage.title}`} onClick={()=>turnCard(index,false)}>Back <span aria-hidden="true">↶</span></button></div></div>
        </div>
      </article>)}</div>
    </section>
    <section className={`${styles.container} ${styles.posters}`} aria-label="CAPA–8D practical principles">
      <article className={styles.photoPoster}><img src="/pricing/review.webp" alt="Illustrative colleagues examining evidence together" loading="lazy" width="800" height="530"/><div><span>RPG EXCELLENCE / ROOT-CAUSE ANALYSIS</span><h2>A plausible answer<br/>needs evidence.</h2><p>Examine occurrence, escape and system-prevention paths. Test the explanation before choosing the action.</p><a href="#capa-journey">Explore causal analysis →</a><small>UNDERSTAND. CHALLENGE. VERIFY.</small></div></article>
      <article className={styles.photoPoster}><img src="/audit-journey/verify.png" alt="Illustrative professionals reviewing an improvement outcome" loading="lazy" width="800" height="530"/><div><span>RPG EXCELLENCE / EFFECTIVENESS REVIEW</span><h2>Action completed.<br/>Outcome verified?</h2><p>Keep delivery evidence separate from evidence that the response has worked over the agreed review period.</p><Link href="/portal/rca?view=verification">Explore effectiveness review →</Link><small>IMPLEMENT. REVIEW. SUSTAIN.</small></div></article>
    </section>
    <section className={`${styles.container} ${styles.scenario}`} aria-labelledby="capa-example-title"><div className={styles.scenarioIntro}><p className={styles.eyebrow}>ILLUSTRATIVE SCENARIO</p><h2 id="capa-example-title">The defect returned.<br/>What needs to change?</h2><p>A process produced the same defect after an earlier action. Follow the response beyond another completed task.</p></div><ol className={styles.scenarioSteps}><li><span>01</span><h3>Contain the exposure</h3><p>Identify affected work and record immediate protection and checks.</p></li><li><span>02</span><h3>Test the mechanism</h3><p>Examine what caused the defect, how it escaped and why prevention failed.</p></li><li><span>03</span><h3>Change the control</h3><p>Assign action against the verified cause and retain implementation evidence.</p></li><li><span>04</span><h3>Review later results</h3><p>Use agreed criteria and subsequent performance to decide whether the response was effective.</p></li></ol></section>
    <section className={`${styles.container} ${styles.benefits}`}><details className={styles.capabilities}><summary>Explore the connected CAPA–8D workspace</summary><div className={styles.capabilityGrid}>{capabilities.map(([title,body,href])=><article key={title}><h3>{title}</h3><p>{body}</p><Link href={href}>Open workspace →</Link></article>)}</div></details></section>
    <section className={`${styles.container} ${styles.training}`} aria-labelledby="capa-training-title"><div><p className={styles.eyebrow}>BUILD PRACTITIONER CAPABILITY</p><h2 id="capa-training-title">RCA & Corrective Action Practitioner</h2><p>Ten interactive modules covering triage, containment, problem definition, three-direction 5 Why analysis, human factors, action strength and effectiveness verification.</p><div className={styles.tags}><span>Approximately 180 minutes</span><span>Downloadable workbook</span><span>Final assessment</span><span>Verifiable certificate</span></div></div><aside><strong>£49.99</strong><span>Total course price per learner.<br/>No VAT is currently added.</span><TrainingPurchaseButton className={styles.primary} course="rca-8d-practitioner">Buy practitioner training →</TrainingPurchaseButton><Link className={styles.textLink} href={`/${locale}/rca-8d-training`}>See full course details →</Link></aside></section>
    <section className={`${styles.container} ${styles.closing}`}><div><p className={styles.eyebrow}>YOUR NEXT STEP</p><h2>Bring causes, actions and effectiveness evidence together.</h2><p>Start with the problem you need to resolve, then keep the full decision trail connected.</p></div><Link className={styles.primary} href="/portal/rca">Open the CAPA–8D Hub →</Link></section>
  </main>;
}
