"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const scopeImage = "/how-it-works/permit-to-work/define-controlled-work.png";
const scopeAlt = "RPG scope form with Electrical work selected and CNC risk assessment RA-2026-0002 linked.";

const stages = [
  {
    title: "Define the work",
    status: "Draft",
    role: "Permit preparer",
    text: "Set the task and scope limits. Select the controlled Site Profile, work area and asset, identify the work party and link the approved CNC risk assessment.",
    action: "Submit for verification",
    detail: "Record the hazards, required precautions, validity window and permit roles before progressing the draft.",
    event: "Draft submitted for verification",
  },
  {
    title: "Verify the controls",
    status: "Awaiting verification",
    role: "Permit verifier",
    text: "Open Safety controls to check the evidence for the electrical permit. Record the applicable isolation and its independent verification.",
    action: "Complete verification",
    detail: "If the required isolation record is missing, verification cannot be completed. The permit remains awaiting verification.",
    blocker: "Show the missing isolation example",
    feedback: "Verification is blocked in this example. The required isolation record is missing from Safety controls.",
    event: "Verification completed",
  },
  {
    title: "Accept control of work",
    status: "Awaiting acceptance",
    role: "Permit receiver",
    text: "The nominated receiver reviews the scope and conditions and records acceptance of control of the work.",
    action: "Accept control of work",
    detail: "Acceptance is recorded at this stage. The permit still shows Awaiting acceptance until the issuer issues it.",
    event: "Receiver accepted control of work",
  },
  {
    title: "Issue the permit",
    status: "Awaiting acceptance",
    role: "Permit issuer",
    text: "The issuer checks readiness. RPG checks the receiver’s declaration, the validity window and the evidence required for this type of permit.",
    action: "Issue permit",
    detail: "The record moves to Issued when the required checks pass.",
    event: "Permit issued",
  },
  {
    title: "Declare work complete",
    status: "Issued",
    role: "Permit receiver",
    text: "The receiver records that the defined work is complete and submits the permit for hand-back.",
    action: "Declare work complete",
    detail: "An issued permit also has separate Suspend permit and Start handover actions. This example follows the planned completion path.",
    event: "Work declared complete",
  },
  {
    title: "Accept hand-back",
    status: "Awaiting hand-back",
    role: "Permit issuer",
    text: "Review the hand-back and confirm reinstatement. Where an isolation record exists, RPG checks that reinstatement and its independent verification are recorded before closure.",
    action: "Accept hand-back and close",
    detail: "If the required reinstatement evidence is incomplete, the permit remains awaiting hand-back.",
    blocker: "Show the incomplete reinstatement example",
    feedback: "Close-out is blocked in this example. The isolation still needs a recorded reinstatement and independent verification.",
    event: "Hand-back accepted and permit closed",
  },
  {
    title: "Review the audit trail",
    status: "Closed",
    role: "Authorised reviewer",
    text: "Review the sequence of decisions. The live record logs when each action happened, who performed it and the reason where one was recorded.",
  },
];

export default function PermitWalkthrough() {
  const [index, setIndex] = useState(0);
  const [showBlocker, setShowBlocker] = useState(false);
  const heading = useRef(null);
  const dialog = useRef(null);
  const moved = useRef(false);
  const stage = stages[index];

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function selectStage(next) {
    moved.current = true;
    setIndex(next);
    setShowBlocker(false);
  }

  return (
    <section className={styles.walkthrough} aria-labelledby="permit-walkthrough-title">
      <header className={styles.intro}>
        <h2 id="permit-walkthrough-title">Walk through a permit</h2>
        <p>The scope image shows the actual RPG form. The clickable stages use a fictional permit and role labels to show how the workflow progresses.</p>
      </header>
      <div className={styles.workspace}>
        <nav className={styles.stages} aria-label="Permit stages">
          <ol>
            {stages.map((item, position) => (
              <li key={item.title}>
                <button type="button" aria-current={index === position ? "step" : undefined} onClick={() => selectStage(position)}>
                  <span aria-hidden="true">{position + 1}</span>{item.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <section className={styles.panel} aria-labelledby="permit-stage-title">
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>{stage.role}</p>
              <h3 id="permit-stage-title" ref={heading} tabIndex={-1}>{stage.title}</h3>
            </div>
            <span className={styles.status}>{stage.status}</span>
          </div>
          <p>{stage.text}</p>
          {index === 0 && (
            <figure className={styles.figure}>
              <button type="button" className={styles.imageButton} onClick={() => dialog.current?.showModal()}>
                <img src={scopeImage} alt={scopeAlt} width={1318} height={633} />
                <span>Enlarge scope screenshot</span>
              </button>
              <figcaption>Actual RPG screen showing the first section of the new permit form.</figcaption>
            </figure>
          )}
          {stage.detail && <p className={styles.detail}>{stage.detail}</p>}
          {stage.blocker && (
            <div className={styles.blocker}>
              <button type="button" aria-expanded={showBlocker} aria-controls="permit-demo-blocker" onClick={() => setShowBlocker(!showBlocker)}>{stage.blocker}</button>
              <p hidden={!showBlocker} id="permit-demo-blocker">{stage.feedback}</p>
            </div>
          )}
          {!stage.action && (
            <ol className={styles.audit} aria-label="Example audit trail">
              {stages.filter(item => item.event).map(item => (
                <li key={item.event}><span>{item.event}</span><small>{item.role}</small></li>
              ))}
            </ol>
          )}
          <div className={styles.actions}>
            {index > 0 && <button type="button" className={styles.previous} onClick={() => selectStage(index - 1)}>Previous stage</button>}
            {stage.action ? (
              <button type="button" className={styles.primary} onClick={() => selectStage(index + 1)}>{stage.action}</button>
            ) : (
              <button type="button" className={styles.primary} onClick={() => selectStage(0)}>Restart walkthrough</button>
            )}
          </div>
        </section>
      </div>
      <dialog className={styles.dialog} ref={dialog} aria-labelledby="permit-image-title">
        <div className={styles.dialogHead}>
          <h3 id="permit-image-title">Define the controlled work</h3>
          <form method="dialog"><button type="submit" aria-label="Close screenshot">×</button></form>
        </div>
        <div className={styles.dialogImage}><img src={scopeImage} alt={scopeAlt} width={1318} height={633} /></div>
      </dialog>
    </section>
  );
}
