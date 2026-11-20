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

function exceptionLabel(item) {
  if (item.key === "risks") return item.count === 1 ? "1 risk above appetite" : item.count + " risks above appetite";
  if (item.key === "treatments-overdue") return item.count === 1 ? "1 overdue treatment" : item.count + " overdue treatments";
  return item.title + " (" + item.count + ")";
}

export default function ExecutiveInsight({ review, controls, detailUrl }) {
  const [label, ask] = statusCopy[review.status];
  const priorities = review.exceptions.filter(item => item.severity === review.status).slice(0, 2);
  const remaining = review.exceptions.filter(item => !priorities.includes(item));
  const decisions = [...new Set(priorities.map(item => item.decision))];
  return <section className={styles.insight} aria-labelledby="executive-insight">
    <header className={styles.insightHead}>
      <h2 id="executive-insight">Executive Insight</h2>
      <strong className={`${styles.signal} ${styles[review.status]}`}>{label}</strong>
    </header>
    {priorities.length > 0 && <ul className={styles.priorityList} aria-label="Reasons for the rating">
      {priorities.map(item => <li key={item.key}><Link href={detailUrl(item.key)}>{exceptionLabel(item)}</Link></li>)}
    </ul>}
    <p className={styles.insightDecision}><strong>{priorities.length ? "Decision required" : "Management action"}</strong> {decisions.length ? decisions.join(" ") : ask}</p>
    {remaining.length > 0 && <ul className={styles.exceptions} aria-label="Other exceptions">
      {remaining.slice(0, 3).map(item => <li key={item.key}>
        <Link href={detailUrl(item.key)}><span className={`${styles.dot} ${styles[item.severity]}`} aria-hidden="true"/>{item.title}<strong className={styles.exceptionCount}>{item.count}</strong></Link>
      </li>)}
    </ul>}
    {remaining.length > 3 && <details className={styles.moreExceptions}>
      <summary>View {remaining.length - 3} more {remaining.length === 4 ? "exception" : "exceptions"}</summary>
      <ul className={styles.exceptions}>{remaining.slice(3).map(item => <li key={item.key}>
        <Link href={detailUrl(item.key)}><span className={`${styles.dot} ${styles[item.severity]}`} aria-hidden="true"/>{item.title}<strong className={styles.exceptionCount}>{item.count}</strong></Link>
      </li>)}</ul>
    </details>}
    {review.missingSources && <p className={styles.insightNote}>One or more sources are unavailable in this scope. The position covers available records only.</p>}
    {controls?.applicable.length > 0 && <p className={styles.assuranceLine}><strong>Control assurance</strong> <Link href={detailUrl("effectiveness")}>{controls.effective.length} of {controls.applicable.length} applicable controls recorded effective</Link></p>}
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
