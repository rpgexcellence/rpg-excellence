import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";
import styles from "../../../components/PartnerProgramme.module.css";

export const metadata = { title: "Partner with RPG Excellence", description: "Explore referral, consultancy and training partnerships with RPG Excellence. Bring your expertise and help clients turn findings into verified improvement.", alternates: { canonical: "/en/partners" } };

const routes = [
  { number: "01", title: "Referral partners", interest: "Referral partner", text: "Introduce organisations that need practical assurance software and support. Stay focused on your own services while we explore the platform requirements with the prospective client.", points: ["Agree how introductions will be made and recorded.", "Define any referral fee and payment conditions in writing.", "Share prospective client details only with appropriate permission."] },
  { number: "02", title: "Consultancy partners", interest: "Consultancy partner", text: "Bring your implementation, internal audit and improvement expertise into a more connected client workflow. Use the platform to help clients retain the evidence behind their decisions.", points: ["Support assessments, audit programmes and management systems.", "Connect findings, responsibilities, actions and effectiveness reviews.", "Agree client ownership, access and delivery responsibilities."] },
  { number: "03", title: "Training partners", interest: "Training partner", text: "Connect practical learning with the work people need to carry out. Explore how relevant RPG Excellence tools and practitioner resources could support your training services.", points: ["Discuss course suitability and the intended learning outcomes.", "Agree use of publications, workbooks and platform access.", "Define delivery roles and licensing before materials are used."] },
];

export default async function Partners({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const apply = `/${locale}/partners/apply`;
  return <PageShell locale={locale}><main className={styles.page}>
    <section className={styles.hero}><div className={styles.shell}>
      <span className={styles.eyebrow}>RPG Excellence · Partner Programme</span>
      <h1>Bring your expertise.<br />Make improvement count.</h1>
      <p>Help clients move from disconnected assessments and completed actions to evidence they can trust. We welcome partnership enquiries from consultants, independent practitioners and training providers.</p>
      <div className={styles.actions}><Link className={styles.primary} href={apply}>Explore a partnership →</Link><a className={styles.secondary} href="#partner-routes">Find your route</a></div>
    </div></section>
    <section className={styles.shell} id="partner-routes"><div className={styles.intro}><span className={styles.eyebrow}>Three ways to work together</span><h2>Start with the value you bring to clients.</h2><p>Choose a route that fits your business. If your work spans more than one area, we can discuss a combination during the application review.</p></div>
      <div className={styles.cards}>{routes.map(route => <article className={styles.card} key={route.number}><span>{route.number}</span><h3>{route.title}</h3><p>{route.text}</p><ul>{route.points.map(point => <li key={point}>{point}</li>)}</ul><Link href={`${apply}?interest=${encodeURIComponent(route.interest)}`}>Discuss this route →</Link></article>)}</div>
    </section>
    <section className={styles.band}><div className={`${styles.shell} ${styles.split}`}><div><span className={styles.eyebrow}>Why RPG Excellence?</span><h2>Your expertise, supported by connected evidence.</h2><p>A good partnership should help clients put requirements into practice and see whether the changes work. RPG Excellence brings assessments, operational records and improvement workflows into a shared platform.</p><Link href={`/${locale}/ai-tools`}>Explore the platform and resources →</Link></div>
      <ul className={styles.list}><li><strong>A practical client offering</strong>Connect management-system assessments, internal audits, risk, findings and actions to the work clients already need to manage.</li><li><strong>Evidence behind decisions</strong>Help clients retain responsibility, supporting information and effectiveness reviews alongside their records.</li><li><strong>Clear professional responsibility</strong>Your advice and delivery remain grounded in your competence, the agreed scope and the client’s needs.</li><li><strong>A defined working arrangement</strong>Discuss demonstrations, familiarisation, delivery support and commercial terms before committing to a partnership.</li></ul>
    </div></section>
    <section className={styles.shell}><div className={styles.intro}><span className={styles.eyebrow}>From enquiry to agreement</span><h2>Agree the fit before the commitment.</h2></div><ol className={styles.steps}><li><strong>Tell us about your work</strong>Share your expertise, services, markets and proposed collaboration.</li><li><strong>Review the opportunity</strong>Discuss client needs, platform suitability and the support required.</li><li><strong>Agree responsibilities</strong>Set out scope, commercial terms, data handling and permitted use of the RPG Excellence brand.</li><li><strong>Prepare to work together</strong>Agree familiarisation and the first client engagement before delivery begins.</li></ol></section>
    <section className={styles.band}><div className={`${styles.shell} ${styles.faq}`}><span className={styles.eyebrow}>Questions before you apply</span><h2>What to expect</h2>
      <details><summary>Can independent consultants apply?</summary><p>Yes. We welcome enquiries from independent practitioners as well as consultancy and training businesses. Tell us about your experience, the clients you support and the services you provide.</p></details>
      <details><summary>What are the commission rates and fees?</summary><p>Commercial arrangements are agreed individually. Any referral payment, qualifying conditions, payment timing, fees and responsibilities must be recorded in a written agreement before work starts.</p></details>
      <details><summary>Does applying make me an authorised partner?</summary><p>No. Application is an expression of interest. Partner status and permission to use partner branding begin only after approval and a written agreement.</p></details>
      <details><summary>Can I use RPG Excellence publications in my training?</summary><p>We can discuss suitable materials and licensing. Buying a publication or submitting an application does not grant permission to reproduce, rebrand or distribute it to learners.</p></details>
      <details><summary>Does partnership grant access to client records?</summary><p>No. Access depends on the client’s authorisation and the platform permissions assigned to your account. Data-sharing responsibilities must be agreed before client information is exchanged.</p></details>
    </div></section>
    <section className={styles.shell}><div className={styles.cta}><div><h2>Let’s explore what we could deliver together.</h2><p>Start with your expertise and the outcomes your clients need.</p></div><Link className={styles.primary} href={apply}>Become a partner →</Link></div></section>
  </main></PageShell>;
}
