import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";
import PermitWalkthrough from "./PermitWalkthrough";
import styles from "./page.module.css";

export const metadata = {
  title: "Permit to Work walkthrough",
  description: "Explore how RPG Excellence handles a CNC commissioning permit, from scope and verification through issue, hand-back and close-out.",
  alternates: { canonical: "/en/how-it-works/permit-to-work" },
};

export default async function PermitToWorkPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale} hideAccountIdentity>
      <main className={styles.page}>
        <header className={styles.hero}>
          <Link className={styles.back} href={`/${locale}/how-it-works`}>How it works</Link>
          <p className={styles.eyebrow}>Safe operations</p>
          <h1>Permit to Work</h1>
          <p className={styles.lead}>Follow an electrical permit for a CNC machining centre. See who verifies the controls, who accepts the work and what RPG records before the permit can be closed.</p>
          <div className={styles.scenario}>
            <strong>CNC commissioning example</strong>
            <span>Electrical work</span>
            <Link href={`/${locale}/how-it-works/risk-assessments`}>Linked risk assessment RA-2026-0002</Link>
          </div>
        </header>

        <PermitWalkthrough />

      </main>
    </PageShell>
  );
}
