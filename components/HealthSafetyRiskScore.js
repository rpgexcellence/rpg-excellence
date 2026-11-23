import { residualBand } from "../lib/health-safety-dashboard.mjs";
import { RecordIcon } from "./DocumentRecordTabs";
import Link from "next/link";
import matrix from "./HealthSafetyHubDashboard.module.css";
import styles from "./HealthSafetyRiskScore.module.css";

export default function HealthSafetyRiskScore({ title, position, href }) {
  const band = position ? residualBand(position.score) : "unrated";
  const appearance = `${styles.score} ${matrix[band] ?? styles.unrated}`;
  const contents = <>
    <span className={styles.title}>{title}{href && <RecordIcon name="open"/>}</span>
    <strong>{position?.score ?? "—"}</strong>
    <span>{band[0].toUpperCase() + band.slice(1)}</span>
  </>;
  return href
    ? <Link className={appearance} href={href} aria-label={`${title}, score ${position.score}, ${band}. Show on risk heat map`}>{contents}</Link>
    : <div className={appearance}>{contents}</div>;
}
