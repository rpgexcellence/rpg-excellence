import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import JsonLd from "../../../../components/JsonLd";
import { locales } from "../../../../lib/i18n";
import styles from "./page.module.css";

const slug = "iso-9001-2026-technical-insights-publication";
const cover = "/publications/iso-9001-2026-technical-insights-cover.png";
export const metadata = {
  title: "ISO 9001:2026 Technical Insights Collection | RPG Insights Issue 032",
  description: "The seven-part RPG Excellence Technical Insight series is now a 53-page PDF with seven chapter covers and 21 supporting posters. £9.99 one-off purchase.",
  alternates: { canonical: `/en/insights/${slug}` },
  openGraph: { title: "ISO 9001:2026 — Technical Insights & Poster Collection", description: "Seven articles, 21 supporting posters and a practical focus on evidence and decisions. One 53-page PDF, £9.99.", images: [{ url: cover, alt: "RPG Excellence ISO 9001:2026 Technical Insights and Poster Collection front cover" }] },
};
const steps = [
  ["01", "Understand the control", "Read the technical analysis for the clause and connect it to a process, responsibility or decision in your own organisation."],
  ["02", "Challenge the evidence", "Use the hypothetical worked examples and auditor questions to examine what your records establish, where they are incomplete and what needs checking."],
  ["03", "Start a useful discussion", "Use a supporting poster from the PDF to brief the team. Select one practical action, give it an owner and review the result."],
];
const chapters = [
  ["4", "Context", "The business assumptions behind every quality failure."],
  ["5", "Leadership", "What leaders authorise under pressure."],
  ["6", "Planning", "Why an opportunity deserves its own decision."],
  ["7", "Support", "The certificate is current. Can the task be done correctly?"],
  ["8", "Operation", "Who checked the requirement before authorising release?"],
  ["9", "Performance evaluation", "The dashboard is green. What decision does the evidence support?"],
  ["10", "Improvement", "The action is closed. What has actually improved?"],
];
export default async function PublicationInsight({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const publicationHref = `/${locale}/publications/iso-9001-2026-technical-insights`;
  const articleUrl = `https://www.rpgexcellence.com/${locale}/insights/${slug}`;
  return <PageShell locale={locale}>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: "ISO 9001:2026: From Quality Evidence to Management Decisions", description: metadata.description, datePublished: "2026-10-27", dateModified: "2026-10-27", mainEntityOfPage: articleUrl, image: `https://www.rpgexcellence.com${cover}`, author: { "@id": "https://www.rpgexcellence.com/#organization" }, publisher: { "@id": "https://www.rpgexcellence.com/#organization" } }} />
    <main className={styles.page}><div className={styles.inner}>
      <Link className={styles.back} href={`/${locale}/insights`}>← Back to RPG Insights</Link>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>RPG INSIGHTS · ISSUE 032 · 27 OCTOBER 2026</p>
          <h1>From quality evidence<br />to management decisions.</h1>
          <p className={styles.lead}>The complete ISO 9001:2026 Technical Insight series, collected for practical use.</p>
          <p>A training record confirms attendance. A dashboard reports a trend. A closure date says an action has been completed. Each is useful information, but the next question matters: what decision does that evidence support?</p>
          <p>RPG Excellence has brought the seven published articles together in a reviewed 53-page PDF, with seven original chapter covers and 21 supporting posters.</p>
          <Link className={styles.primary} href={publicationHref}>Explore the publication — £9.99 →</Link>
          <p className={styles.small}>One-off digital purchase. All articles and posters are included inside the PDF.</p>
        </div>
        <figure className={styles.poster}>
          <a href={cover} target="_blank" rel="noreferrer"><img src={cover} alt="Front cover of the RPG Excellence ISO 9001:2026 Technical Insights and Poster Collection" width="1224" height="1584" /></a>
          <figcaption>The reviewed collected edition: 53 pages, seven articles and 21 supporting posters.</figcaption>
        </figure>
      </header>
      <section className={styles.steps} aria-label="Using the publication">{steps.map(([n,title,text]) => <article key={n}><b>{n}</b><h2>{title}</h2><p>{text}</p></article>)}</section>
      <article className={styles.body}>
        <section><h2>Bring the seven discussions into the work</h2><p>The Technical Insight series examines ISO 9001:2026 through the decisions that determine whether a quality management system works. The collected edition places those discussions in one reference for quality managers, leaders, process owners and internal auditors.</p><p>This is a collection of the previously published series, with a new front cover, contents and source section. It includes the original chapter covers and supporting posters. It is a separate companion to the earlier <Link href={`/${locale}/publications/decoding-iso-9001-2026`}>Decoding ISO 9001:2026 practical guide</Link>.</p></section>
        <section><h2>Seven clauses, seven operating questions</h2><ul>{chapters.map(([clause,topic,question]) => <li key={clause}><strong>Clause {clause} — {topic}:</strong> {question}</li>)}</ul><p>The sequence follows the relationship between organisational context, leadership, planning, support, operational delivery, performance evaluation and improvement. Read it in order or start with the decision your team is currently struggling to make.</p></section>
        <section><h2>Test the conclusion behind the number</h2><p>One hypothetical example in the collection compares 20 complaints across 1,000 completed jobs with 10 complaints across 250 jobs. The complaint count has halved, but the rate has increased from 2% to 4%.</p><p>The calculation is straightforward. The management judgement needs more care. Are the periods and job populations comparable? Has the service mix changed? Has complaint recording improved? A favourable headline does not settle those questions.</p><p>Other chapters apply the same discipline to competence evidence, acceptance criteria, planned changes, leadership decisions and corrective-action effectiveness. The examples are hypothetical teaching cases, rather than reported RPG customer outcomes.</p></section>
        <aside className={styles.insight}><p className={styles.kicker}>EXECUTIVE INSIGHT</p><h2>A completed record should help explain the decision.</h2><p>Ask who relied on the information, what it established and what uncertainty remained. A signature or status can be part of the evidence; its meaning depends on the work and the checks behind it.</p></aside>
        <section><h2>Use the posters to open a conversation</h2><p>The 21 supporting posters are included inside the PDF. They provide concise prompts for internal briefings, quality awareness and audit-team discussions. Their role is to focus attention on a question that can be followed into actual work.</p><p>For a competence discussion, go beyond the attendance record and examine an appropriate demonstration of ability. For corrective action, ask what evidence would show that the action addressed the cause. For supplier assurance, trace a delivery through the requirements and acceptance checks.</p><p>Purchasers may use the collection and posters for their own internal reference and team briefings. Public redistribution, resale or republication requires written permission from RPG Excellence.</p></section>
        <section><h2>A management exercise for the next 30 days</h2><p>Select five recent quality decisions. For each, identify the requirement or intended result, the evidence used, the person authorised to decide and the follow-up needed to assess the outcome.</p><p>Report how many of the five can be supported by that trail, and assign responsibility for gaps. This is a suggested management exercise, not an additional ISO requirement or a universal audit sample size. It provides a practical way to turn the reading into a focused review.</p></section>
        <section><h2>Publication details</h2><p><strong>ISO 9001:2026 — Technical Insights &amp; Poster Collection</strong><br />53 pages · Seven articles · Seven chapter covers · 21 supporting posters<br /><strong>£9.99 GBP · One-off PDF purchase</strong></p><p>Secure Stripe checkout and account-based download access are provided through the publication page. Sign in or create an account to purchase. No platform subscription is required.</p><p className={styles.small}>Independent RPG Excellence interpretation, not an ISO or BSI publication. The collection does not replace the licensed standard, and purchase or use does not confer certification. Practical recommendations are distinguished from requirement interpretation. Illustrative poster photography is generated artwork.</p></section>
        <section className={styles.cta}><h2>Which quality decision would you examine first?</h2><p>Explore the collection and use its questions to follow the evidence into your own processes.</p><div><Link className={styles.primary} href={publicationHref}>View the £9.99 publication →</Link><Link className={styles.secondary} href={`/${locale}/iso-9001`}>ISO 9001 at a glance →</Link></div></section>
      </article>
    </div></main>
  </PageShell>;
}
