import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageShell from '../../../components/PageShell';
import { locales } from '../../../lib/i18n';
import { INDUSTRIES } from '../../../lib/industries';
import styles from './page.module.css';

export const metadata = {
  title: 'Industries | Practical Business Assurance | RPG Excellence',
  description: 'Explore practical applications of RPG Excellence for manufacturing, laboratories, technical services, logistics, consultants and engineering supply chains.',
  alternates: { canonical: '/en/industries' },
};
export default async function IndustriesPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><main className={styles.page}>
    <section className={`${styles.wrap} ${styles.hero}`}>
      <div><p className={styles.eyebrow}>RPG EXCELLENCE / INDUSTRIES</p><h1>Different operations.<br/>The same need for<br/><em>clear assurance.</em></h1><p className={styles.lead}>The work changes from one sector to another. Knowing what needs attention, who owns it and whether the response worked remains essential.</p><div className={styles.actions}><a className={styles.primary} href="#sector-applications">Find your sector <span aria-hidden="true">↓</span></a><Link className={styles.textLink} href={`/${locale}/contact`}>Discuss your requirements →</Link></div></div>
      <figure className={styles.heroPoster}><img src="/images/how-it-works/operations.webp" alt="Illustrative engineering team reviewing an inspection record in a workshop" width="1536" height="1024" fetchPriority="high"/><figcaption><span>RPG EXCELLENCE · BUSINESS ASSURANCE</span><h2>People. Processes.<br/>Evidence that connects them.</h2><p>Understand → act → verify</p></figcaption></figure>
    </section>
    <section id="sector-applications" className={`${styles.wrap} ${styles.sectors}`} aria-labelledby="sector-title">
      <header className={styles.sectionHead}><div><p className={styles.eyebrow}>START WITH YOUR OPERATING CONTEXT</p><h2 id="sector-title">Where does your team need a clearer view?</h2></div><p>Explore illustrative applications, then follow the relevant hub to see how the work is controlled.</p></header>
      <nav className={styles.sectorNav} aria-label="Industry topics">{INDUSTRIES.map(item=><a href={`#${item.id}`} key={item.id}>{item.title} <span aria-hidden="true">↘</span></a>)}</nav>
      <div className={styles.grid}>{INDUSTRIES.map((item,index)=><article className={styles.card} id={item.id} key={item.id}>
        <div className={styles.poster}><img src={item.image} alt="" loading="lazy" decoding="async" width="800" height="530"/><div><span>0{index+1} / {item.title}</span><h3>{item.tagline}</h3><small>RPG EXCELLENCE</small></div></div>
        <div className={styles.cardBody}><h2>{item.title}</h2><p>{item.description}</p><ul>{item.needs.map(need=><li key={need}>{need}</li>)}</ul><details><summary>See a practical example</summary><p>{item.example}</p><small>Illustrative scenario</small></details>{item.note && <p className={styles.note}>{item.note}</p>}<div className={styles.links}>{item.links.map(([label,href])=><Link key={label} href={`/${locale}${href}`}>{label} <span aria-hidden="true">→</span></Link>)}</div></div>
      </article>)}</div>
    </section>
    <section className={`${styles.wrap} ${styles.scope}`}><div><p className={styles.eyebrow}>SCOPE THAT FITS THE WORK</p><h2>Start with the process.<br/>Agree the requirements.</h2></div><div><p>These examples show how existing RPG workflows may support different operating environments. The appropriate modules, permissions, implementation and support are agreed around your organisation’s requirements.</p><p>Using the platform does not itself establish certification, accreditation or compliance with sector-specific obligations.</p><Link className={styles.primary} href={`/${locale}/contact`}>Talk through your use case →</Link></div></section>
  </main></PageShell>;
}
