import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import JsonLd from "../../../../components/JsonLd";
import { locales } from "../../../../lib/i18n";
import styles from "./page.module.css";

const slug = "quality-powering-performance";
const cover = "/insights/quality-powering-performance.png";
const title = "Can you prove quality is powering performance?";
export const metadata = {
  title: `${title} | RPG Insights Issue 034`,
  description: "World Quality Week 2026: connect quality activity to customer outcomes, reliable measures and credible business value. Includes a downloadable poster and the £4.99 Decoding Quality Performance companion guide.",
  alternates: { canonical: `/en/insights/${slug}` },
  openGraph: {
    type: "article",
    title,
    description: "Quality: powering performance. Practical evidence, a fictional worked example and a clear decision for management review.",
    images: [{ url: cover, width: 1672, height: 941, alt: "RPG Excellence: Quality powering performance, World Quality Week 9–13 November 2026" }],
  },
};
const steps = [
  ["01", "Choose a business problem", "Select one recurring problem. Establish its frequency, its consequences and its process owner. Agree what improvement would look like before choosing an intervention."],
  ["02", "Check effectiveness", "Ask three questions: Is the change in place? Does it address the cause? What result has changed? These questions require different evidence."],
  ["03", "Explain the value", "Pair the outcome measure with evidence that the control is working and a balancing measure, such as turnaround time. This helps reveal whether an improvement in one place has shifted a problem elsewhere."],
];
export default async function QualityPerformanceInsight({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const publicationHref = `/${locale}/publications/decoding-quality-performance`;
  const articleUrl = `https://www.rpgexcellence.com/${locale}/insights/${slug}`;
  return <PageShell locale={locale}>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: title, description: metadata.description, datePublished: "2026-11-06", dateModified: "2026-11-06", mainEntityOfPage: articleUrl, image: `https://www.rpgexcellence.com${cover}`, author: { "@id": "https://www.rpgexcellence.com/#organization" }, publisher: { "@id": "https://www.rpgexcellence.com/#organization" } }} />
    <main className={styles.page}><div className={styles.inner}>
      <Link className={styles.back} href={`/${locale}/insights`}>← Back to RPG Insights</Link>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>RPG INSIGHTS · ISSUE 034 · 6 NOVEMBER 2026</p>
          <h1>Can you prove quality<br />is powering performance?</h1>
          <p className={styles.lead}>World Quality Week: connect quality activity to credible outcomes.</p>
          <p>World Quality Week takes place on 9–13 November 2026 under the CQI theme <em>Quality: powering performance</em> <a href="#source-1">[1]</a>. It is a timely opportunity to connect quality activity to credible outcomes.</p>
          <p>Ask a quality team how its management system is performing and you may hear that audits are complete, training is up to date and corrective actions are closing. Those facts matter. A director may still ask: what has improved for the customer or the business?</p>
          <Link className={styles.primary} href={publicationHref}>Explore the publication — £4.99 →</Link>
          <p className={styles.small}>One-off PDF purchase. 20 pages with a worked example and four worksheets.</p>
        </div>
        <figure className={styles.poster}>
          <a href={cover} target="_blank" rel="noreferrer" aria-label="Open the World Quality Week poster at full size"><img src={cover} alt="RPG Excellence poster: Quality powering performance. World Quality Week, 9–13 November 2026. What has actually improved for your customer?" width={1672} height={941} fetchPriority="high" /></a>
          <figcaption>Quality: powering performance. Open the poster to view it at full size.</figcaption>
        </figure>
      </header>
      <section className={styles.steps} aria-label="Putting quality performance into practice">{steps.map(([n,heading,text]) => <article key={n}><b>{n}</b><h2>{heading}</h2><p>{text}</p></article>)}</section>
      <article className={styles.body}>
        <section><h2>Start with a business question</h2><p>ISO 9001:2026 strengthens the emphasis on leadership, quality culture and strategic alignment <a href="#source-2">[2]</a>. For practitioners, the challenge is to make those connections visible in decisions, controls and results.</p></section>
        <section><h2>Choose a problem people recognise</h2><p>Improve QMS effectiveness can be difficult to act on without context. Reduce repeat report corrections that delay customer acceptance gives a team something concrete to investigate.</p><p>Select one recurring problem. Establish its frequency, its consequences and its process owner. Agree what improvement would look like before choosing an intervention. Then trace a real case from the first customer requirement to acceptance.</p><p>Look across handovers. Was information complete? Were the right resources available? Could the control detect the error? Did delivery pressure encourage a shortcut? The error at the end of the process may have started much earlier.</p></section>
        <section><h2>Separate action completion from effectiveness</h2><p>A procedure has been revised. Has the revised process been used? Training has been delivered. Can people now perform the task correctly? A new review has been introduced. Does it prevent the error without creating a delay elsewhere?</p><p>Ask three questions: Is the change in place? Does it address the cause? What result has changed? These questions require different evidence. A signed training sheet may show attendance; it cannot alone prove that the operational problem has been resolved.</p><p>For a rare failure, a short period without recurrence may mean little. Check the control directly and allow enough relevant exposure before making a claim of sustained improvement.</p></section>
        <section><h2>Make performance numbers comparable</h2><p>Consider a fictional service business. Before a change, 100 of 1,000 issued reports required correction. Afterwards, 48 of 800 required correction. The correction rate moved from 10% to 6%: an improvement of four percentage points, or a 40% relative reduction in the rate.</p><p>The correction count fell by 52, but output also fell. At the original rate, 800 reports would have generated 80 corrections. The later 48 represent 32 fewer against that simple volume-adjusted comparison.</p><p>Before attributing the result to the change, check customer mix, work complexity and counting rules. Plot results over time. A better percentage is encouraging; the evidence still needs to explain why it changed.</p></section>
        <aside className={styles.insight}><p className={styles.kicker}>EXECUTIVE INSIGHT</p><h2>Report business value honestly</h2><p>Suppose those 32 fewer corrections each release 1.5 hours. That is 48 hours of capacity. At an assumed £40 per hour, it has an illustrative value of £1,920. It is not automatically a cash saving.</p><p>If the new review step uses 20 hours for the same workload, net released capacity is 28 hours, valued at £1,120 before implementation costs and other effects. Record the assumptions and ask Finance to review material claims.</p><p>Pair the outcome measure with evidence that the control is working and a balancing measure, such as turnaround time. This helps reveal whether an improvement in one place has shifted a problem elsewhere.</p></aside>
        <section><h2>Look at leadership decisions under pressure</h2><p>Quality culture becomes visible when someone raises a discrepancy shortly before dispatch. What happens next? Can the person speak openly? Is the risk considered? Is the decision authorised? Does leadership address the conditions behind the problem?</p><p>Awareness sessions can help. People also learn from the decisions they see rewarded, tolerated or challenged. A lower number of concerns may indicate fewer problems, or less confidence in reporting. Understand the context before celebrating the number.</p></section>
        <section><h2>Bring a decision to management review</h2><p>Present one improvement with its business problem, baseline, cause, intervention, outcome and remaining uncertainty. Explain what the change cost and whether benefits represent cash savings, released capacity or avoided expenditure.</p><p>Then ask for a clear decision: approve a wider rollout, retain an interim control, allocate resources or investigate an unresolved issue. Record the owner and the next review date.</p><p>For World Quality Week, choose one current improvement and test whether you can explain the result with evidence. Where a connection is missing, assign someone to resolve it.</p></section>
        <section><h2>Use the poster to open the discussion</h2><p>Which measure would convince your leadership team that Quality is improving business performance?</p><a className={styles.download} href={cover} download="RPG-World-Quality-Week-2026.png">Download the World Quality Week poster →</a></section>
        <section><h2>Make improvement count with RPG Excellence</h2><p>At RPG Excellence, this thinking underpins our practical tools for assessments, audits, findings, actions and effectiveness review. The aim is to help teams keep evidence and responsibility connected through to a result they can explain.</p><p>Our companion publication, <strong>Decoding Quality Performance</strong>, develops the approach through worked calculations, verification guidance and reusable worksheets for process owners and leaders.</p><p><strong>£4.99 GBP · One-off PDF purchase</strong><br />20 pages · Four worksheets · A worked example</p><p className={styles.small}>The worked example is fictional. The practical methods are RPG guidance, not additional ISO requirements. Independent RPG Excellence commentary, not an ISO or BSI publication. Illustrative poster photography is generated artwork.</p></section>
        <section><h2>Sources</h2><ol><li id="source-1">CQI. <a href="https://www.quality.org/how-will-you-celebrate-wqw-2026" target="_blank" rel="noreferrer">How will you celebrate World Quality Week 2026?</a></li><li id="source-2">ISO. <a href="https://www.iso.org/quality-management/iso-9001-2026" target="_blank" rel="noreferrer">ISO 9001:2026: What businesses need to know.</a></li></ol></section>
        <section className={styles.cta}><h2>What has actually improved for your customer?</h2><p>Use the guide to connect the problem, the action and the evidence for the result.</p><div><Link className={styles.primary} href={publicationHref}>View Decoding Quality Performance — £4.99 →</Link><Link className={styles.secondary} href={`/${locale}/iso-9001`}>ISO 9001 at a glance →</Link></div></section>
      </article>
    </div></main>
  </PageShell>;
}
