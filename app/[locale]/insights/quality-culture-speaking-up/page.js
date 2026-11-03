import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import JsonLd from "../../../../components/JsonLd";
import { locales } from "../../../../lib/i18n";
import styles from "./page.module.css";

const slug = "quality-culture-speaking-up";
const cover = "/insights/quality-culture-speaking-up.png";
const title = "Quality culture: what happens when someone raises a concern?";
export const metadata = {
  title: `${title} | RPG Insights`,
  description: "Quality culture through everyday decisions: practical controls, deliverables and leadership responses, informed by ISO 10010:2022 and ISO 9001:2026.",
  alternates: { canonical: `/en/insights/${slug}` },
  openGraph: { type: "article", title, description: "People learn from the response they receive. Turn quality culture into practical controls and evidence.", images: [{ url: cover, width: 1733, height: 907, alt: "RPG Excellence: What happens when someone speaks up?" }] },
};

export default async function QualityCultureInsight({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: title, description: metadata.description, datePublished: "2026-11-03", dateModified: "2026-11-03", mainEntityOfPage: `https://www.rpgexcellence.com/${locale}/insights/${slug}`, image: `https://www.rpgexcellence.com${cover}`, author: { "@id": "https://www.rpgexcellence.com/#organization" }, publisher: { "@id": "https://www.rpgexcellence.com/#organization" } }} />
    <main className={styles.page}><div className={styles.inner}>
      <Link className={styles.back} href={`/${locale}/insights`}>← Back to RPG Insights</Link>
      <header className={styles.header}><p className={styles.kicker}>RPG INSIGHTS · QUALITY CULTURE · 3 NOVEMBER 2026</p><h1>{title}</h1><p className={styles.lead}>People learn from the response they receive. What does yours tell them?</p><p className={styles.byline}>By RPG Excellence · Practical application informed by ISO 10010:2022</p></header>
      <figure className={styles.poster}><a href={cover} target="_blank" rel="noreferrer" aria-label="Open the quality culture poster at full size"><img src={cover} alt="Cartoon of an engineer raising a concern before release and a colleague responding: Let’s check the evidence. Headline: What happens when someone speaks up?" width={1733} height={907} fetchPriority="high" /></a><figcaption>Quality culture becomes visible in the response people receive. <a href={cover} download>Download the poster</a>.</figcaption></figure>
      <nav className={styles.jump} aria-label="In this article"><a href="#guidance">Guidance</a><a href="#example">Worked example</a><a href="#controls">Practical controls</a><a href="#deliverables">Deliverables</a><a href="#management">Management takeaway</a></nav>
      <article className={styles.body}>
<p>Ask a team what quality means and most people will give you a reasonable answer. Ask what happens when somebody spots a problem just before a delivery deadline, and the conversation becomes more useful.</p>
<p>Can they hold the work? Who will support the decision? Will someone examine the concern properly, or will the first response be, “Why are you only telling us now?”</p>
<p>People remember those experiences. They influence whether the next concern is raised early, quietly worked around or left for somebody else to discover.</p>
<p><strong>That is where quality culture becomes visible.</strong></p>
<p>ISO 9001:2026 makes quality culture and ethical behaviour explicit within leadership and awareness requirements. The practical question for an organisation is how to turn those expectations into everyday decisions. ISO 10010:2022 provides useful guidance for doing that.</p>
<section id="guidance"><h2>What ISO 10010 brings to the discussion</h2>
<p>ISO 10010 addresses understanding, evaluating and improving organisational quality culture, with particular attention to leadership and people engagement.</p>
<p>Its approach encourages organisations to understand their context, establish the culture they want, examine the culture they currently have and take action to close the gaps. That work then needs to be embedded and sustained.</p>
<p>This is guidance, rather than an additional set of ISO 9001 certification requirements. It does not make a particular survey, maturity score or culture dashboard compulsory.</p>
<p>Used sensibly, it helps a management team move beyond asking whether people have read the quality policy. A more revealing question is whether the way work is planned, supervised and rewarded supports that policy.</p>
<aside className={styles.note}><h3>Requirements and practical recommendations</h3><p>ISO 9001:2026 addresses promoting quality culture and ethical behaviour in 5.1.1(i), and awareness in 7.3(e). Its informative guidance points to ISO 10010. The controls, deliverables and sample of five concerns below are RPG implementation suggestions; they are not additional ISO requirements.</p></aside></section>

<section><h2>Start with the behaviour you expect</h2>
<p>“Everyone takes responsibility for quality” sounds reasonable, but it leaves considerable room for interpretation.</p>
<p>An engineer may understand it as checking their own work. A supervisor may see it as meeting the inspection schedule. A director may expect fewer complaints. Those expectations need connecting.</p>
<p>For a process involving customer deliverables, the organisation could make the following behaviours clear:</p>
<ul><li>Raise uncertainty about requirements before committing to the work.</li><li>Preserve accurate records, including inconvenient results.</li><li>Escalate missing evidence before release.</li><li>Give concerns a reasoned response and explain the decision.</li><li>Check whether corrective actions have worked.</li></ul>
<p>These are practical examples, not a prescribed ISO checklist. Each organisation needs to decide what appropriate behaviour looks like in its own work.</p>
<p>The same discussion should establish what people need to exercise those responsibilities. Asking someone to protect quality while withholding the authority, information or time to do so creates an obvious conflict.</p></section>

<section id="example" className={styles.example}><p className={styles.kicker}>HYPOTHETICAL WORKED EXAMPLE</p><h2>A deadline tests the arrangements</h2>
<p>A technical services team is due to issue a customer report that afternoon. During the final check, an engineer notices that a required technical review has not been completed.</p>
<p>The customer is waiting, and the project is already under commercial pressure.</p>
<p>The engineer raises the concern. The manager establishes what remains outstanding, confirms the release criteria and arranges a competent reviewer. If the commitment cannot be met, the customer receives an accurate explanation and a revised plan.</p>
<p>The concern and the eventual release decision are recorded. The engineer is told what happened. That response supports the behaviour the organisation says it wants.</p>
<p>However, the discussion should continue after the report is issued. Why was the review missing? Was reviewer availability considered when the delivery date was agreed? Had the same problem occurred on other projects?</p>
<p>A supportive response to one concern is valuable. Repeated problems still need process improvement.</p>
<p>Culture and operational control meet at this point: management decisions determine whether the controls can work, while the records help establish whether they actually did.</p></section>

<section id="controls"><h2>Put controls behind the message</h2>
<p>An awareness campaign can introduce expectations. People also need dependable arrangements when a difficult situation arises. For the example above, useful controls could include:</p>
<h3>A clear release gate</h3><p>Define the reviews and evidence needed before issue, the person authorised to release the report and the permitted route for exceptions. Any exception must remain within applicable obligations and the organisation’s approved arrangements.</p>
<h3>An escalation route that works during normal operations</h3><p>Identify who can respond when the usual manager is unavailable. People should know how to raise a concern without having to search for an approving authority at the end of the day.</p>
<h3>Resource checks during planning</h3><p>Include reviewer availability and competence when accepting delivery commitments. A recurring shortage should reach management as a resource decision, rather than repeatedly becoming an individual’s last-minute problem.</p>
<h3>Feedback to the person raising the concern</h3><p>Explain the outcome, including why a concern did or did not require further action. Silence leaves people guessing whether their contribution mattered.</p>
<h3>A fair investigation process</h3><p>Examine the information, workload, instructions and decisions involved before reaching conclusions about an individual. Keep accountability clear and base conclusions on evidence.</p>
<p>These are suggested implementation controls. ISO 9001 does not prescribe this exact arrangement.</p></section>

<section><h2>Understand the current culture before scoring it</h2>
<p>A short survey can help, but the score needs context.</p>
<p>People may answer differently depending on their role, manager, location or shift. A high response rate does not establish that people felt able to answer honestly. A low number of reported concerns could reflect reliable processes, weak reporting or both.</p>
<p>Combine several sources of evidence. Speak with people doing the work. Ask them to describe a recent concern and what happened next. Review actual release decisions, complaints, recurring rework and corrective actions. Observe a handover or planning meeting.</p>
<p>Include management decisions in the sample. If delivery performance is discussed every week but overdue quality actions receive little attention, that difference is worth examining.</p>
<p>Where responses are collected confidentially, explain how they will be used and protect them accordingly. The purpose is to understand operating conditions and improve them.</p>
<p>A culture assessment becomes much more useful when a statement such as “people do not feel heard” can be connected to specific examples and an improvement decision.</p></section>

<section id="deliverables"><h2>What should the work produce?</h2>
<p>The deliverables can be straightforward. A smaller organisation may combine them into a few controlled records.</p>
<div className={styles.tableWrap} role="region" aria-label="Suggested quality culture deliverables" tabIndex={0}><table><caption>Suggested deliverables — adapt to your organisation</caption><thead><tr><th scope="col">Deliverable</th><th scope="col">What it should contain</th></tr></thead><tbody>
<tr><th scope="row">A current-state assessment</th><td>Evidence from people, observed work and process results, including differences between teams and limitations in the assessment.</td></tr>
<tr><th scope="row">Clear behavioural expectations</th><td>Practical examples for leaders, managers and staff, linked to responsibilities and decision authority.</td></tr>
<tr><th scope="row">An improvement plan</th><td>The gaps being addressed, named owners, resources, completion dates and how effectiveness will be reviewed.</td></tr>
<tr><th scope="row">Updated operating controls</th><td>Changes to planning, release, escalation, communication, competence or other processes where the assessment identified weaknesses.</td></tr>
<tr><th scope="row">A management review record</th><td>Progress, unresolved barriers, resource decisions and evidence of whether behaviour and results are changing.</td></tr>
</tbody></table></div>
<p>The quality manager can coordinate this work. Process owners and leaders need to own the decisions within their responsibilities.</p>
<p>Calling it a “quality culture programme” does not transfer those responsibilities to the quality department.</p></section>

<section id="management" className={styles.takeaway}><p className={styles.kicker}>A MEASURABLE MANAGEMENT TAKEAWAY</p><h2>Measure the response as well as the reporting</h2>
<p>Counting concerns tells you how much was reported. It does not tell you whether the response was useful.</p>
<p>A practical starting point is to review five recent quality concerns. For each, establish whether:</p>
<ol><li>Someone acknowledged and assessed it.</li><li>The decision and its reasons were recorded.</li><li>Necessary action had an owner.</li><li>The person raising it received feedback.</li><li>Any claimed improvement had supporting evidence.</li></ol>
<p><strong>Report how many of the five have that complete trail and identify what remains unresolved.</strong> Five is a suggested starting sample, not an ISO requirement.</p>
<p>Over time, consider this alongside customer outcomes, repeat problems, rework and relevant process measures. Be careful about incentives that encourage people to reduce the reported number rather than address the underlying issue.</p></section>

<section><h2>Leadership has to make the arrangements credible</h2>
<p>People notice whether leaders provide resources, accept unwelcome information and apply the same expectations when a valued customer or an important deadline is involved.</p>
<p>They also notice whether a difficult issue disappears from the agenda once the immediate pressure has passed.</p>
<p>ISO 10010 gives organisations a useful framework for improving quality culture. The work becomes credible through the decisions made, the controls provided and the response people experience.</p>
<p>At RPG Excellence, we encourage teams to connect those elements with the evidence already available in their management systems. A useful starting point is the next planning meeting, release decision or review of a concern someone has raised.</p>
<p className={styles.question}>When someone in your organisation says, “I think we need to check this before we proceed,” what response can they reasonably expect?</p></section>

<aside className={styles.sources}><h2>Sources and reading</h2><ul><li><a href="https://www.iso.org/quality-management/iso-9001-2026" target="_blank" rel="noreferrer">ISO — ISO 9001:2026</a>. Requirement references above were checked against the supplied licensed text; standard wording is not reproduced.</li><li><a href="https://www.iso.org/standard/38457.html" target="_blank" rel="noreferrer">ISO 10010:2022 — Guidance to understand, evaluate and improve organisational quality culture</a>. Guidance framework; practical examples in this article are RPG interpretations.</li></ul><p>Independent RPG Excellence guidance. Read alongside the applicable licensed standards. The worked example is hypothetical, and the poster is an illustrative generated cartoon.</p></aside>

<section className={styles.cta}><h2>Make the discussion useful at work</h2><p>Explore our ISO 9001 guidance and the Decoding ISO 9001:2026 practical guide for further implementation discussions.</p><div className={styles.actions}><Link className={styles.primary} href={`/${locale}/iso-9001`}>ISO 9001 at a glance →</Link><Link className={styles.secondary} href={`/${locale}/publications/decoding-iso-9001-2026`}>Explore the practical guide →</Link></div></section>

</article></div></main>
</PageShell>;
}
