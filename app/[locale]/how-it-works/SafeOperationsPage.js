import Link from "next/link";
import PageShell from "../../../components/PageShell";
import WorkflowSteps from "./WorkflowSteps";
import { HOW_IT_WORKS_GROUPS } from "../../../lib/howItWorks";
import styles from "./permit-to-work/page.module.css";

const safeOperations = HOW_IT_WORKS_GROUPS.find(group => group.title === "Safe operations").links;

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
      <aside className={styles.resources} aria-label="Related resources">
        <Link href={workflow.portal}>{workflow.portalLabel}</Link>
        {workflow.guide && <Link href={`/${locale}${workflow.guide}`}>{workflow.guideLabel}</Link>}
        {children && <a href="#detailed-guide">Detailed product guide</a>}
      </aside>
      <nav className={styles.resources} aria-label="More Safe Operations walkthroughs">
        {safeOperations.filter(([, path]) => !path.endsWith(`/${workflow.slug}`)).map(([name, path]) =>
          <Link key={path} href={`/${locale}${path}`}>{name}</Link>)}
      </nav>
      {children && <div id="detailed-guide" className={styles.guide}>{children}</div>}
    </main>
  </PageShell>;
}
