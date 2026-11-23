import Link from "next/link";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { POWRA_ROOT, decisionDetails } from "../../../../lib/powra-workflow.mjs";
import styles from "./powra.module.css";

export function PowraHero({ title, reference, description, children }) {
  return <>
    <p className={styles.crumb}><Link href="/portal/health-safety">Health &amp; Safety Hub</Link> / <Link href={POWRA_ROOT}>POWRA</Link></p>
    <header className={styles.hero}>
      <div className={styles.identity}><span className={styles.iconBox}><RecordIcon name="overview"/></span>
        <div>{reference && <strong>{reference}</strong>}<h1>{title}</h1><p>{description}</p></div></div>
      <div className={styles.actions}>{children}</div>
    </header>
  </>;
}

export function DecisionBadge({ decision }) {
  const [name, tone] = decisionDetails[decision] ?? decisionDetails.pending;
  return <span className={styles.label + " " + styles[tone]}>{name}</span>;
}

export function PowraFacts({ rows }) {
  return <dl className={styles.facts}>{rows.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value || "Not recorded"}</dd></div>)}</dl>;
}
