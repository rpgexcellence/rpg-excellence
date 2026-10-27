import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import JsonLd from "../../../../components/JsonLd";
import { locales } from "../../../../lib/i18n";
import styles from "./page.module.css";

export const metadata = {
  title: "Scan. Check. Report. | RPG Insights Issue 031",
  description: "Bring workplace safety information and accident, incident and near-miss reporting to employees through their zone QR code and phone browser.",
  alternates: { canonical: "/en/insights/scan-check-report-workplace-safety" },
  openGraph: { title: "Scan. Check. Report. Safety at the point of work", description: "Workplace safety information and zone-linked reporting from a phone.", images: [{ url: "/insights/rpg-scan-check-report-poster.png", alt: "RPG Excellence Scan Check Report promotional poster" }] },
};

const steps = [
  ["01", "Scan your zone", "Use the work-area QR code to reach the relevant zone page in your phone browser. You do not need to return to a laptop to submit a report."],
  ["02", "Check the controls", "Where published and permitted, view local risk assessments, hazards, PPE and key controls, inspections and actions. Available information follows your organisation’s publication and access settings."],
  ["03", "Report what matters", "Report an accident, incident, near miss, hazard or concern in the context of that work area. Describe what happened and any immediate action; a photo and contact details are optional."],
];

export default async function WorkplaceSafetyInsight({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const articleUrl = `https://www.rpgexcellence.com/${locale}/insights/scan-check-report-workplace-safety`;
  return <PageShell locale={locale}>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: "Scan. Check. Report. Safety at the point of work", description: metadata.description, datePublished: "2026-10-27", dateModified: "2026-10-27", mainEntityOfPage: articleUrl, image: "https://www.rpgexcellence.com/insights/rpg-scan-check-report-poster.png", author: { "@id": "https://www.rpgexcellence.com/#organization" }, publisher: { "@id": "https://www.rpgexcellence.com/#organization" } }} />
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link className={styles.back} href={`/${locale}/insights`}>← Back to RPG Insights</Link>
        <header className={styles.intro}>
          <div>
            <p className={styles.kicker}>RPG INSIGHTS · ISSUE 031 · 27 OCTOBER 2026</p>
            <h1>Scan. Check.<br />Report.</h1>
            <p className={styles.lead}>Safety information where work happens. Reporting when it matters.</p>
            <p>A hazard noticed on the shop floor should not have to wait until someone returns to a desk. RPG Excellence connects a work-area QR code with mobile access to local safety information and accident, incident and near-miss reporting.</p>
            <Link className={styles.primary} href={`/${locale}/hs-hub`}>Explore the Health &amp; Safety Hub →</Link>
            <p className={styles.small}>Phone camera and browser. Zone-linked reports. No sign-in required to submit a zone report.</p>
          </div>
          <figure className={styles.poster}>
            <a href="/insights/rpg-scan-check-report-poster.png" target="_blank" rel="noreferrer"><img src="/insights/rpg-scan-check-report-poster.png" alt="Promotional poster showing a worker using a phone beside a work-area sign, with risk assessments, hazards, PPE and reporting illustrated on screen" width="1056" height="1493" /></a>
            <figcaption>Illustrative product preview. Operational posters use the actual zone QR code.</figcaption>
          </figure>
        </header>
        <section className={styles.steps} aria-label="The employee journey">{steps.map(([n,title,text])=><article key={n}><b>{n}</b><h2>{title}</h2><p>{text}</p></article>)}</section>
        <article className={styles.body}>
          <section><h2>Make the reporting route part of everyday work</h2><p>A person sees a damaged guard, experiences an injury or notices a near miss. The important first step is to make the situation safe and follow the site’s procedures. Once safe, a clear reporting route helps them capture the event while the details are still fresh.</p><p>The zone form links the report to the work area. It supports an account of the event, apparent urgency, immediate action and whether a responsible person has been informed. Optional photo evidence can help authorised reviewers understand the location and condition.</p></section>
          <section><h2>Local information without the trip back to a laptop</h2><p>The employee work-area page brings available safety information closer to the point of work: published assessments, hazards and controls, PPE requirements and relevant inspection information. Staff can consult it through their phone browser, subject to the access and publication settings saved by their organisation.</p><p>Public reporting and access to internal safety records have separate controls. No sign-in is needed to submit a zone report; that does not make every internal assessment or company record publicly available.</p></section>
          <section><h2>Commercial value: less friction, better context</h2><p>Consider a hypothetical warehouse where a worker notices repeated damage at the same pedestrian barrier. A zone-linked report can identify the location, describe the concern and add a photo without waiting for office access. An authorised manager can review the evidence and decide what action is needed.</p><ul><li><strong>Reduce reporting effort:</strong> put the route beside the work area, on the device people already carry.</li><li><strong>Improve the first account:</strong> capture local context and optional evidence while it is available.</li><li><strong>Support participation:</strong> allow reports without sign-in, with contact details optional.</li><li><strong>Strengthen management review:</strong> connect reported concerns with the work area and follow-up decisions.</li></ul><p>Measure the effect using your own baseline: time from event to report, completeness of location information, time to first review and repeated concerns. More reports can indicate better participation; report counts alone do not establish whether risk has increased or decreased.</p></section>
          <aside className={styles.insight}><p className={styles.kicker}>EXECUTIVE INSIGHT</p><h2>The QR code opens the door. The management response creates the value.</h2><p>Assign responsibility for reviewing incoming reports, agree escalation arrangements and check whether actions address the underlying concern. A simpler reporting route needs a dependable response behind it.</p></aside>
          <section><h2>A poster that leads to the right work area</h2><p>Display each operational poster where people can safely read and scan it. Use that zone’s generated QR code and verify that it opens the intended page. Check the published information from an employee’s point of view and keep the poster aligned with changes to the zone.</p><p>The promotional artwork on this page illustrates the experience. Its work-area sign is not a working QR code and must not replace a generated operational zone poster.</p><a className={styles.download} href="/downloads/RPG-Scan-Check-Report-A4.pdf" download>Download the A4 promotional poster ↓</a></section>
          <section><h2>Choice and clear limits</h2><p>People may report without providing contact details, or choose to leave them for follow-up. Written information and photos may still identify people or places; anonymous submission is not a guarantee of untraceability.</p><p>For immediate danger, follow site emergency procedures and contact the responsible team directly. The reporting form is not continuously monitored and does not summon emergency assistance.</p></section>
          <section className={styles.cta}><h2>Bring safety information and reporting closer to your people.</h2><p>Explore how the H&amp;S Hub connects workplace risk assessments, controls, inspections, actions and zone-linked reporting.</p><div><Link className={styles.primary} href={`/${locale}/hs-hub`}>Explore the H&amp;S Hub →</Link><Link className={styles.secondary} href={`/${locale}/contact`}>Discuss your workplace needs →</Link></div></section>
        </article>
      </div>
    </main>
  </PageShell>;
}
