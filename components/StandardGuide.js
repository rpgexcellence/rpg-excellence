import Link from "next/link";
import StandaloneSoaButton from "./StandaloneSoaButton";

export default function StandardGuide({ guide, locale }) {
  const contactHref = `/${locale}/contact?standard=${encodeURIComponent(guide.code)}&topic=${encodeURIComponent("Gap analysis and certification readiness")}`;
  const assessmentHref = guide.assessmentStandard
    ? `/portal?standard=${encodeURIComponent(guide.assessmentStandard)}#new-assessment`
    : "/portal";
  return <main className={`standardGuide ${guide.accent}`}>
    <section className="guideHero">
      <div><span className="guideBadge">{guide.code} GUIDE</span><h1>{guide.code} — {guide.title}</h1><p>{guide.summary}</p></div>
      <div className="guideHeroActions">
        <aside><strong>Educational guidance</strong><p>This guide paraphrases key themes for practical understanding. It does not reproduce the standard or replace the official licensed publication, legal advice or accredited certification decisions.</p></aside>
        <div className="assessmentLinkBox">
          <div><span>RPG INTELLIGENCE ASSESSMENT</span><strong>{guide.assessmentStandard ? `Assess your ${guide.code} readiness` : `Explore ${guide.code} assurance support`}</strong><p>{guide.assessmentStandard ? "Open the controlled clause-based assessment, record evidence and generate a management-ready readiness result." : "Open RPG Intelligence to review currently available assessments and assurance tools."}</p></div>
          <Link href={assessmentHref}>{guide.assessmentStandard ? "Start this assessment →" : "Open RPG Intelligence →"}</Link>
        </div>
        {guide.code === "ISO/IEC 27001" && (
          <div className="assessmentLinkBox soaProductBox">
            <div>
              <span>STANDALONE STATEMENT OF APPLICABILITY</span>
              <strong>Build or review your 93-control SoA</strong>
              <p>Document applicability, implementation, evidence, residual risk and approval decisions with ISO/IEC 27002-aligned guidance. Includes a controlled executive report and PDF.</p>
              <small>£129 one-off · 30-day completion access · retained read-only record</small>
            </div>
            <StandaloneSoaButton className="soaPurchaseButton">Buy standalone SoA →</StandaloneSoaButton>
          </div>
        )}
      </div>
    </section>
    <section className="guideOverview">
      <div><span className="kicker">Overview</span><h2>What this management system is designed to achieve</h2><p>{guide.purpose}</p><p>The value comes from integrating requirements into normal governance and operations—not producing documents solely for an audit.</p></div>
      <div className="guideFacts"><div><span>Structure</span><strong>Clauses 4–10</strong></div><div><span>Approach</span><strong>Risk based</strong></div><div><span>Use</span><strong>Single or integrated</strong></div><div><span>Assurance</span><strong>Evidence led</strong></div></div>
    </section>
    <section className="clauseSection" id="clauses">
      <span className="kicker">Clause navigator</span><h2>Key clauses explained</h2><p className="clauseIntro">Open any clause to see practical application, possible evidence, common weaknesses and relevant RPG Excellence support.</p>
      <div className="clauseList">{guide.clauses.map((clause) => <details className="clauseCard" key={clause.number}>
        <summary><span>Clause {clause.number}</span><div><strong>{clause.title}</strong><p>{clause.focus}</p></div><b>Explain this clause</b></summary>
        <div className="clauseExplanation">
          <article><h3>Practical application</h3><p>{clause.application}</p><p><strong>For {guide.code}:</strong> {clause.focus}</p></article>
          <article><h3>Objective evidence to consider</h3><p>{clause.evidence}</p></article>
          <article><h3>Common weakness</h3><p>{clause.pitfall}</p></article>
          <article className="rpgSupport"><h3>How RPG Excellence supports you</h3><p>{clause.support}</p><Link href={contactHref}>Discuss Clause {clause.number} support →</Link></article>
        </div>
      </details>)}</div>
    </section>
    <section className="guideSupport"><div><span>RPG EXCELLENCE SUPPORT</span><h2>Move from understanding to controlled implementation.</h2><p>Use RPG Excellence for gap analysis, implementation support, internal auditing, evidence control, findings, CAPA-8D and management reporting across a single or integrated system.</p></div><Link href={contactHref} className="button">Discuss {guide.code} support →</Link></section>
  </main>;
}
