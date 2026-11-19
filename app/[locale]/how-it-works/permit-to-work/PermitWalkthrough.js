"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const imageDirectory = "/how-it-works/permit-to-work";
const draftAuthorisation = {
  file: "draft-authorisation-and-validity.png",
  width: 1318,
  height: 248,
  title: "Authorisation and validity",
  alt: "RPG draft fields for validity, issuer and receiver, with entries removed.",
  caption: "Actual draft form showing where the validity window and roles are set.",
};

const stages = [
  {
    title: "Define the work",
    status: "Draft",
    role: "Permit preparer",
    text: "Set the task and scope limits. Select the controlled Site Profile, work area and asset, identify the work party and link the approved CNC risk assessment.",
    action: "Submit for verification",
    detail: "Record the hazards, required precautions, validity window and permit roles before progressing the draft.",
    screenshot: {
      file: "define-controlled-work.png",
      width: 1318,
      height: 633,
      title: "Define the controlled work",
      alt: "RPG scope form with Electrical work selected and CNC risk assessment RA-2026-0002 linked.",
      caption: "Actual draft form showing the work scope and risk assessment link.",
    },
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
    resolve: "Switch to the example with verified isolation",
    evidence: ["Required isolation record", "Recorded and independently verified", "Missing"],
    screenshot: {
      file: "draft-hazards-and-controls.png",
      width: 1310,
      height: 285,
      title: "Identify hazards and controls",
      alt: "Actual RPG draft form listing hazards including electricity and stored energy.",
      caption: "Actual draft hazard section. The verifier reviews isolation evidence separately in Safety controls.",
    },
    event: "Verification completed",
  },
  {
    title: "Accept control of work",
    status: "Awaiting acceptance",
    role: "Permit receiver",
    text: "The nominated receiver reviews the scope and conditions and records acceptance of control of the work.",
    action: "Accept control of work",
    detail: "Acceptance is recorded at this stage. The permit still shows Awaiting acceptance until the issuer issues it.",
    screenshot: draftAuthorisation,
    event: "Receiver accepted control of work",
  },
  {
    title: "Issue the permit",
    status: "Awaiting acceptance",
    role: "Permit issuer",
    text: "The issuer checks readiness. RPG checks the receiver’s declaration, the validity window and the evidence required for this type of permit.",
    action: "Issue permit",
    detail: "The record moves to Issued when the required checks pass.",
    screenshot: draftAuthorisation,
    event: "Permit issued",
  },
  {
    title: "Declare work complete",
    status: "Issued",
    role: "Permit receiver",
    text: "The receiver records that the defined work is complete and submits the permit for hand-back.",
    action: "Declare work complete",
    detail: "An issued permit also has separate Suspend permit and Start handover actions. This example follows the planned completion path.",
    evidence: ["Completion confirmation", "Defined work complete. Record ready for hand-back."],
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
    resolve: "Switch to the example with verified reinstatement",
    evidence: ["Reinstatement evidence", "Reinstatement recorded and independently verified", "Independent verification outstanding"],
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
  const screenshot = stage.screenshot;

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function selectStage(next) {
    if (next === index || (showBlocker && next > index)) return;
    moved.current = true;
    setIndex(next);
    setShowBlocker(false);
  }

  return (
    <section className={styles.walkthrough} aria-labelledby="permit-walkthrough-title">
      <header className={styles.intro}>
        <h2 id="permit-walkthrough-title">Walk through a permit</h2>
        <p>Follow a fictional CNC permit. Stages 1–4 include screenshots of the RPG draft form. Completion, hand-back and the audit trail use example records.</p>
      </header>
      <div className={styles.workspace}>
        <nav className={styles.stages} aria-label="Permit stages">
          <ol>
            {stages.map((item, position) => (
              <li key={item.title}>
                <button type="button" aria-current={index === position ? "step" : undefined} disabled={showBlocker && position > index} onClick={() => selectStage(position)}>
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
          {screenshot && (
            <figure className={styles.figure}>
              <button type="button" className={styles.imageButton} onClick={() => dialog.current?.showModal()}>
                <img src={`${imageDirectory}/${screenshot.file}`} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} />
                <span>Enlarge screenshot</span>
              </button>
              <figcaption>{screenshot.caption}</figcaption>
            </figure>
          )}
          {stage.detail && <p className={styles.detail}>{stage.detail}</p>}
          {stage.evidence && (
            <dl className={styles.example}>
              <dt>Example record · {stage.evidence[0]}</dt>
              <dd>{stage.evidence[showBlocker ? 2 : 1]}</dd>
            </dl>
          )}
          {stage.blocker && (
            <div className={styles.blocker}>
              <button type="button" aria-expanded={showBlocker} aria-controls="permit-demo-blocker" onClick={() => setShowBlocker(!showBlocker)}>{showBlocker ? stage.resolve : stage.blocker}</button>
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
              <button type="button" className={styles.primary} disabled={showBlocker} onClick={() => selectStage(index + 1)}>{stage.action}</button>
            ) : (
              <button type="button" className={styles.primary} onClick={() => selectStage(0)}>Restart walkthrough</button>
            )}
          </div>
        </section>
      </div>
      {screenshot && <dialog className={styles.dialog} ref={dialog} aria-labelledby="permit-image-title">
        <div className={styles.dialogHead}>
          <h3 id="permit-image-title">{screenshot.title}</h3>
          <form method="dialog"><button type="submit" aria-label="Close screenshot">×</button></form>
        </div>
        <div className={styles.dialogImage}><img src={`${imageDirectory}/${screenshot.file}`} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} /></div>
      </dialog>}
    </section>
  );
}
