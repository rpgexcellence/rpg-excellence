import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import PartnerApplicationForm from "../../../../components/PartnerApplicationForm";
import { locales } from "../../../../lib/i18n";
import styles from "../../../../components/PartnerProgramme.module.css";

export const metadata = { title: "Become an RPG Excellence Partner", description: "Apply to explore a referral, consultancy or training partnership with RPG Excellence Ltd.", alternates: { canonical: "/en/partners/apply" } };

export default async function PartnerApplication({ params, searchParams }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const query = await searchParams;
  const interest = typeof query?.interest === "string" ? query.interest : "";
  return <PageShell locale={locale}><main className={styles.page}>
    <header className={styles.hero}><div className={styles.shell}><span className={styles.eyebrow}>Become a partner</span><h1>A useful partnership starts with a conversation.</h1><p>Tell us about the work you do, the clients you support and where RPG Excellence could add value. We review every application individually.</p><Link className={styles.secondary} href={`/${locale}/partners`}>← About the Partner Programme</Link></div></header>
    <div className={`${styles.shell} ${styles.applyGrid}`}>
      <PartnerApplicationForm locale={locale} initialInterest={interest} />
      <aside className={styles.aside}><h2>What happens next?</h2><ol><li>Your application is recorded and a reference is shown on screen.</li><li>We review your experience and proposed collaboration.</li><li>If there is a suitable fit, we arrange a discussion.</li><li>Scope and terms are agreed in writing before any partnership begins.</li></ol><hr /><p><strong>RPG EXCELLENCE LTD</strong><br />Registered in England and Wales.<br />Company number 17564662.</p><p>Questions before applying?<br /><a href="mailto:info@rpgexcellence.com?subject=Partner%20Programme">info@rpgexcellence.com</a></p><p className={styles.note}>This application is an expression of interest. It does not create a partnership, a client-access permission or a commitment to pay a referral fee.</p></aside>
    </div>
  </main></PageShell>;
}
