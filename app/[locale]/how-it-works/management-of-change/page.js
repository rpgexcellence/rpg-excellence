import SafeOperationsPage from "../SafeOperationsPage";
import { safeOperationsWorkflows } from "../safeOperationsWorkflows";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locales } from "../../../../lib/i18n";
import ChangeSteps from "./ChangeSteps";
import styles from "./page.module.css";

export const metadata = {
  title: "How it works — Management of Change | RPG Excellence",
  description: "See real RPG Excellence screens: define a change, screen its impact, connect approved risk assessments and follow review, implementation and verification.",
  alternates: { canonical: "/en/how-it-works/management-of-change" },
};

export default async function ManagementOfChangeWalkthrough({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <SafeOperationsPage locale={locale} workflow={safeOperationsWorkflows.change}><div className={styles.page}>
    <header className={styles.hero}>
      <div>
        <Link className={styles.back} href={`/${locale}/how-it-works`}>How it works / Management of Change</Link>
        <p className={styles.eyebrow}>PLATFORM INSIGHT · CONTROLLED CHANGE</p>
        <h2>Before the change.<br/>Know the impact.</h2>
        <p className={styles.lead}>Start with what is changing. Connect the people, risk assessment and decisions needed to carry it through to a reviewed outcome.</p>
        <aside className={styles.insight}><p className={styles.eyebrow}>THE BUSINESS CONNECTION</p><h2>Make the handover visible.</h2><p>A new machine can affect capacity, quality, maintenance and the people working beside it. Bring those considerations into one change request before implementation.</p><div><span><strong>Define</strong>Scope and ownership</span><span><strong>Connect</strong>Risk and approvals</span><span><strong>Verify</strong>Evidence and outcome</span></div></aside>
        <div className={styles.actions}><Link className={styles.primary} href="/portal/health-safety/moc/new">Start a new change →</Link><Link href="/portal/health-safety/moc">Open MOC register →</Link></div>
        <p className={styles.small}>Sign-in and eligible company access required.</p>
      </div>
      <div className={styles.product}><div className={styles.productBar}><span>RPG EXCELLENCE / MOC</span><strong>Actual platform screen</strong></div><img src="/how-it-works/management-of-change/moc-screening.jpg" alt="Actual MOC form with Yes screening answers requiring the Full MOC pathway" width="1348" height="928" fetchPriority="high"/><div className={styles.productCaption}><p className={styles.eyebrow}>FICTIONAL EXAMPLE / REAL WORKSPACE</p><h2>Installing a CNC machining centre.</h2><p>Follow a clearly labelled demonstration request. See what the user enters, what changes the pathway and where supporting approval is needed.</p><a href="#inside-workflow">Explore the screens ↓</a></div></div>
    </header>

    <nav className={styles.jump} aria-label="Management of Change walkthrough sections"><a href="#starting-point">01 / Starting point</a><a href="#inside-workflow">02 / Inside the workflow</a><a href="#next-gates">03 / From review to closure</a></nav>

    <section id="starting-point" className={styles.section} aria-labelledby="starting-title"><p className={styles.eyebrow}>01 / FIND YOUR WAY IN</p><h2 id="starting-title">Dashboard. Register. New change.</h2><p className={styles.intro}>Use the dashboard to find the module, the register to follow existing work, or New change to define a separate request.</p><div className={styles.startGrid}><figure className={styles.screen}><a href="/how-it-works/management-of-change/moc-register.jpg" target="_blank" rel="noreferrer" aria-label="Enlarge the MOC register screenshot"><img src="/how-it-works/management-of-change/moc-register.jpg" alt="Actual MOC register showing total changes, HSE gate, awaiting approval and overdue counts" width="1348" height="928" loading="lazy"/></a><figcaption>Actual register before the example is saved. Zero counts describe this empty workspace, not business performance.</figcaption></figure><div className={styles.entrySteps}><article><span>01</span><div><h3>Open Health &amp; Safety</h3><p>Find Management of Change in the platform navigation.</p><Link href="/portal/health-safety">H&amp;S dashboard →</Link></div></article><article><span>02</span><div><h3>Review the register</h3><p>See changes at the HSE gate, awaiting approval or overdue. Open a saved record to follow its current stage.</p><Link href="/portal/health-safety/moc">MOC register →</Link></div></article><article><span>03</span><div><h3>Choose New change</h3><p>Select the company site, department and active users who request and own the change.</p><Link href="/portal/health-safety/moc/new">New change →</Link></div></article></div></div></section>

    <section id="inside-workflow" className={styles.section} aria-labelledby="workflow-title"><p className={styles.eyebrow}>02 / EXPLORE THE REAL SCREENS</p><h2 id="workflow-title">One proposal. Connected decisions.</h2><p className={styles.intro}>Select a card, or use the arrows, to follow the demonstration. Open any screenshot at full size.</p><ChangeSteps/></section>

    <section id="next-gates" className={styles.section} aria-labelledby="gates-title"><p className={styles.eyebrow}>03 / WHAT COMES NEXT</p><h2 id="gates-title">Approval starts the next stage.<br/>It does not prove the outcome.</h2><p className={styles.intro}>After a request is saved, the MOC record provides the following stages. These are workflow capabilities, not completed activities in the illustrated example.</p><div className={styles.gates}>
      <article><span>01 / REVIEW</span><h3>HSE gate and functional approvals</h3><p>Record the HSE review and relevant approval decisions. The Full MOC route provides HSE, Engineering, Operations and Quality approvals.</p><strong>Business value</strong><p>Make the basis for the next decision available to the people responsible.</p></article>
      <article><span>02 / IMPLEMENT</span><h3>Readiness, actions and evidence</h3><p>Use the implementation plan and pre-startup safety review (PSSR) where required. Assign change actions, retain objective evidence and submit actions for verification.</p><strong>Business value</strong><p>Connect the planned handover to responsibilities and the evidence of what was done.</p></article>
      <article><span>03 / VERIFY</span><h3>Review the result before closure</h3><p>Record post-implementation observations, action verification decisions and closure comments. For the CNC example, compare cycle time, first-pass acceptance, downtime and operator feedback with the baseline.</p><strong>Business value</strong><p>Distinguish completing the change from demonstrating that it delivered the intended result.</p></article>
    </div><aside className={styles.callout}><strong>When circumstances change, revisit the basis.</strong><p>A different machine, location, contractor method or operating condition may change the assessment. Revisit the scope, controls and applicable approvals before proceeding; a saved request is not an authorisation to start work.</p></aside></section>

    <footer className={styles.finish}><p className={styles.eyebrow}>START WITH THE CHANGE IN FRONT OF YOU</p><h2>Keep the proposal, risk<br/>and response connected.</h2><div className={styles.actions}><Link className={styles.primary} href="/portal/health-safety/moc/new">New change →</Link><Link href="/portal/health-safety/moc">MOC register →</Link><Link href="/portal/health-safety">H&amp;S dashboard →</Link></div><p className={styles.small}>Actual RPG Excellence screens captured on 18 November 2026. All example entries are fictional demonstration data. The fictional assessment received a demonstration approval, and MOC-2026-299EF4 was saved with RA-2026-0002 Version 2 linked. The change awaits HSE gate verification; no implementation, verified improvement or operational release is claimed. This walkthrough is platform insight, not a completed risk assessment.</p></footer>
  </div></SafeOperationsPage>;
}