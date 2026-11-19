"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./permit-to-work/page.module.css";

export default function WorkflowSteps({ title, intro, stages, stageLabel = "Workflow stages" }) {
  const [index, setIndex] = useState(0);
  const [showBlocker, setShowBlocker] = useState(false);
  const heading = useRef(null);
  const dialog = useRef(null);
  const moved = useRef(false);
  const stage = stages[index];
  const screenshot = stage.screenshot;
  const finalStage = index === stages.length - 1;
  const headingId = useId();
  const stageId = useId();
  const blockerId = useId();
  const imageId = useId();

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
    <section className={styles.walkthrough} aria-labelledby={headingId}>
      <header className={styles.intro}>
        <h2 id={headingId}>{title}</h2>
        <p>{intro}</p>
      </header>
      <div className={styles.workspace}>
        <nav className={styles.stages} aria-label={stageLabel}>
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
        <section className={styles.panel} aria-labelledby={stageId}>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>{stage.role}</p>
              <h3 id={stageId} ref={heading} tabIndex={-1}>{stage.title}</h3>
            </div>
            <span className={styles.status}>{showBlocker && stage.blockedStatus ? stage.blockedStatus : stage.status}</span>
          </div>
          <p>{stage.text}</p>
          {screenshot && (
            <figure className={styles.figure}>
              <button type="button" className={styles.imageButton} onClick={() => dialog.current?.showModal()}>
                <img src={screenshot.src} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} />
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
              <button type="button" aria-expanded={showBlocker} aria-controls={blockerId} onClick={() => setShowBlocker(!showBlocker)}>{showBlocker ? stage.resolve : stage.blocker}</button>
              <p hidden={!showBlocker} id={blockerId}>{stage.feedback}</p>
            </div>
          )}
          {finalStage && stages.some(item => item.event) && (
            <ol className={styles.audit} aria-label="Example audit trail">
              {stages.filter(item => item.event).map(item => (
                <li key={item.event}><span>{item.event}</span><small>{item.role}</small></li>
              ))}
            </ol>
          )}
          <div className={styles.actions}>
            {index > 0 && <button type="button" className={styles.previous} onClick={() => selectStage(index - 1)}>Previous stage</button>}
            {!finalStage ? (
              <button type="button" className={styles.primary} disabled={showBlocker} onClick={() => selectStage(index + 1)}>{stage.action ?? "Next stage"}</button>
            ) : (
              <button type="button" className={styles.primary} onClick={() => selectStage(0)}>Restart walkthrough</button>
            )}
          </div>
        </section>
      </div>
      {screenshot && <dialog className={styles.dialog} ref={dialog} aria-labelledby={imageId}>
        <div className={styles.dialogHead}>
          <h3 id={imageId}>{screenshot.title}</h3>
          <form method="dialog"><button type="submit" aria-label="Close screenshot">×</button></form>
        </div>
        <div className={styles.dialogImage}><img src={screenshot.src} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} /></div>
      </dialog>}
    </section>
  );
}
