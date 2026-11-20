import Link from "next/link";
import styles from "./board.module.css";

const statusCopy = {
  red: ["Red · Intervention required", "Decide what gets escalated and confirm the owner, deadline and evidence needed to close it."],
  orange: ["Orange · Management attention", "Agree the next checkpoint and confirm what evidence management expects to see."],
  green: ["Green · No escalation triggered", "Maintain oversight and review changes at the next management review."],
  neutral: ["Not rated · Insufficient visibility", "Confirm record coverage and access before relying on the overall position."],
};

const workColumns = [
  ["today", "Due today"],
  ["upcoming", "Due in next 30 days"],
  ["overdue", "Overdue"],
  ["verification", "Awaiting verification"],
];

export default function ExecutiveInsight({ review, controls, detailUrl }) {
  const [label, ask] = statusCopy[review.status];
  const priority = review.exceptions[0];
  return <section className={styles.insight} aria-labelledby="executive-insight">
    <header className={styles.insightHead}>
      <div><h2 id="executive-insight">Executive Insight</h2><p>Management review · position, exceptions and decisions</p></div>
      <strong className={`${styles.signal} ${styles[review.status]}`}>{label}</strong>
    </header>
    <div className={styles.insightBody}>
      <div>
        <h3>Leadership decision</h3>
        <p>{priority && <><strong><Link href={detailUrl(priority.key)}>{priority.title} ({priority.count})</Link></strong><br/></>}{priority ? priority.decision : ask}</p>
        {review.missingSources && <p>One or more sources are unavailable in this scope. The position covers available records only.</p>}
        {controls?.applicable.length > 0 && <p><strong>Control assurance</strong> · <Link href={detailUrl("effectiveness")}>{controls.effective.length} of {controls.applicable.length} applicable controls recorded effective</Link>. {review.unassured > 0 ? "Agree the verification plan for the remaining controls." : "Review the supporting evidence at the next checkpoint."}</p>}
      </div>
      {review.exceptions.length > 0 && <div>
        <h3>Exceptions to review</h3>
        <ul className={styles.exceptions}>{review.exceptions.slice(0, 4).map(item => <li key={item.key}>
          <Link href={detailUrl(item.key)}><span className={`${styles.dot} ${styles[item.severity]}`} aria-label={item.severity}/>{item.title}<strong>{item.count}</strong></Link>
        </li>)}</ul>
        {review.exceptions.length > 4 && <details><summary>View remaining exceptions</summary><ul className={styles.exceptions}>{review.exceptions.slice(4).map(item => <li key={item.key}><Link href={detailUrl(item.key)}>{item.title}<strong>{item.count}</strong></Link></li>)}</ul></details>}
      </div>}
    </div>
    <details className={styles.ratingRules}><summary>How the rating is decided</summary>
      <p>Red covers risks above appetite, high or critical incidents, missed deadlines and expired risk acceptances. Orange covers upcoming deadlines, outstanding decisions or verification, and gaps in recorded control assurance. Green requires records in scope and no triggered rule. When records are unavailable or there is no baseline, the rating is withheld unless a red exception is already known.</p>
      <p>Uses open records as at the board date across all periods. Organisation filters apply throughout. SoA and theme filters apply to SoA records and control actions where relevant.</p>
    </details>
  </section>;
}

export function DeliveryQueue({ review, detailUrl }) {
  return <section className={`${styles.panel} ${styles.queue}`} aria-labelledby="delivery-queue">
    <h2 id="delivery-queue">Due dates and verification</h2>
    <p>Open items across all periods. An item awaiting verification can also be overdue.</p>
    <div className={styles.queueScroll} tabIndex={0} role="region" aria-label="Workstream deadlines and verification counts">
      <table>
        <thead><tr><th scope="col">Workstream</th>{workColumns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
        <tbody>{review.work.map(item => <tr key={item.key}>
          <th scope="row">{item.label}</th>
          {workColumns.map(([key, label]) => <td key={key}>
            {item[key] === false ? "—" : item[key] == null ? "N/A" : item[key].length ? <Link href={detailUrl(item.key + "-" + key)} aria-label={`${item.label}, ${label.toLowerCase()}, ${item[key].length}`}>{item[key].length}</Link> : 0}
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <p>For risk treatments, awaiting verification means implemented and still open for verification. For reviews, the verification column does not apply.</p>
  </section>;
}
