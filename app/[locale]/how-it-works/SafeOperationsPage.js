import Link from "next/link";
import PageShell from "../../../components/PageShell";
import WorkflowSteps from "./WorkflowSteps";
import styles from "./permit-to-work/page.module.css";

export default function SafeOperationsPage({ locale, workflow, children }) {
  return <PageShell locale={locale} hideAccountIdentity>
    <main className={styles.page}>
      <header className={styles.hero}>
        <Link className={styles.back} href={`/${locale}/how-it-works#safe-operations`}>How it works</Link>
        <p className={styles.eyebrow}>Safe operations</p>
        <h1>{workflow.title}</h1>
        <p className={styles.lead}>{workflow.description}</p>
        <div className={styles.scenario}><strong>{workflow.scenario}</strong><span>Fictional example</span></div>
      </header>
      <WorkflowSteps title={workflow.walkthrough} intro={workflow.intro} stages={workflow.stages} />
      {children && <div id="detailed-guide" className={styles.guide}>{children}</div>}
    </main>
  </PageShell>;
}
