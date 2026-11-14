import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";
import terms from "../../../lib/termsContent.json";
import PrintTermsButton from "./PrintTermsButton";
import styles from "./terms.module.css";
export const metadata={title:"Terms and Conditions | RPG Excellence",description:"RPG Excellence terms for software licences, standard support, additional services, data processing and consumer purchases.",alternates:{canonical:"/en/terms"}};
function Paragraph({text}){
 const match=text.match(/^(\d+\.\d+)\s+(.*)$/);
 return <p>{match?<><span className={styles.number}>{match[1]}</span>{match[2]}</>:text}</p>;
}
export default async function Terms({params}){
 const {locale}=await params;if(!locales.includes(locale))notFound();
 return <PageShell locale={locale}><main className={styles.page} id="terms-top"><div className={styles.inner}>
  <div className={styles.heading}><div><p className={styles.eyebrow}>RPG Excellence · Legal information</p><h1>{terms.title}</h1><p className={styles.meta}><span><strong>Effective:</strong> {terms.effective}</span><span><strong>Version:</strong> {terms.version}</span></p></div><div className={styles.actions}><PrintTermsButton/></div></div>
  <div className={styles.introduction}>{terms.introduction.map((text,i)=><p key={i}>{text}</p>)}</div>
  <nav aria-label="Terms contents"><details className={styles.contents}><summary>Contents<span>32 clauses and 3 schedules</span></summary><ol>{terms.sections.map(s=><li key={s.number}><a href={`#clause-${s.number}`}>{s.heading}</a></li>)}</ol><div className={styles.scheduleLinks}>{terms.schedules.map(s=><a key={s.id} href={`#schedule-${s.id}`}>Schedule {s.id} — {s.heading}</a>)}</div></details></nav>
  <article className={styles.body} aria-label="Terms and conditions">
   {terms.sections.map(s=><section className={styles.clause} key={s.number} id={`clause-${s.number}`}><h2>{s.number}. {s.heading}</h2>{s.paragraphs.map((text,i)=><Paragraph key={i} text={text}/>)}</section>)}
   {terms.schedules.map(s=><section className={styles.schedule} key={s.id} id={`schedule-${s.id}`}><div className={styles.scheduleLabel}>Schedule {s.id}</div><h2>{s.heading}</h2>{s.sections.map(part=><section key={part.heading}><h3>{part.heading}</h3>{part.paragraphs.map((text,i)=><Paragraph key={i} text={text}/>)}</section>)}</section>)}
  </article>
  <nav className={styles.end} aria-label="Related legal information"><Link href={`/${locale}/privacy`}>Privacy notice</Link><Link href={`/${locale}/security-and-trust`}>Security and trust</Link><Link href={`/${locale}/contact`}>Contact RPG</Link><a href="#terms-top">Back to top ↑</a></nav>
 </div></main></PageShell>;
}
