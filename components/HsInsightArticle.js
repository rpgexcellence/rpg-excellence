import Link from "next/link";

import JsonLd from "./JsonLd";
import PageShell from "./PageShell";

export default function HsInsightArticle({ locale, article }) {
  const url = `https://www.rpgexcellence.com/en/insights/${article.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: `https://www.rpgexcellence.com${article.image}`,
    datePublished: "2026-09-14",
    dateModified: "2026-09-14",
    mainEntityOfPage: url,
    author: { "@id": "https://www.rpgexcellence.com/#organization" },
    publisher: { "@id": "https://www.rpgexcellence.com/#organization" },
  };

  return (
    <PageShell locale={locale}>
      <JsonLd data={schema} />
      <main className="hsArticle">
        <article>
          <Link className="back" href={`/${locale}/insights`}>← Back to RPG Insights</Link>
          <span className="kicker">RPG Insights • Issue {article.issue}</span>
          <h1>{article.title}</h1>
          <p className="standfirst">{article.standfirst}</p>
          <img className="hero" src={article.image} alt={article.imageAlt} width="1672" height="941" />

          <div className="articleBody">
            <p className="opening">{article.opening}</p>
            {article.roadmap?.length ? <section className="implementationRoadmap" aria-label="Business continuity implementation pathway">{article.roadmap.map(([number,title,text])=><article key={number}><b>{number}</b><strong>{title}</strong><span>{text}</span></article>)}</section> : null}
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.points?.length ? <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
              </section>
            ))}

            <aside className="decision">
              <span>MANAGEMENT TEST</span>
              <h2>{article.managementTest}</h2>
              <p>{article.managementAnswer}</p>
            </aside>

            <section>
              <h2>How RPG Excellence supports the control</h2>
              <p>{article.productCopy}</p>
              <Link className="cta" href={article.productHref}>{article.productLabel} →</Link>
            </section>

            <p className="disclaimer">This article provides general information and does not replace a task-specific assessment, competent professional judgement or legal advice.</p>
          </div>
        </article>
      </main>
      <style>{`
        .hsArticle{background:#f2f7fb;color:#071a3d;padding:58px 24px 90px}.hsArticle>article{max-width:1040px;margin:auto}.back{display:inline-block;margin-bottom:30px;color:#1459d9;text-decoration:none;font-weight:800}.kicker{display:block;color:#087f6c;font-size:12px;font-weight:900;letter-spacing:.13em}.hsArticle h1{max-width:920px;margin:13px 0 22px;font-size:clamp(40px,5.7vw,72px);line-height:1.02;letter-spacing:-.045em}.standfirst{max-width:850px;margin:0 0 35px;color:#4d627c;font-size:21px;line-height:1.65}.hero{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:22px;box-shadow:0 22px 55px #071a3d24}.articleBody{max-width:790px;margin:46px auto 0}.articleBody p,.articleBody li{font-size:17px;line-height:1.75;color:#334c68}.articleBody .opening{font-size:21px;color:#0a2345}.articleBody section{margin-top:43px}.articleBody h2{margin:0 0 14px;font-size:30px;letter-spacing:-.025em}.articleBody ul{padding-left:25px}.articleBody li{margin:8px 0}.implementationRoadmap{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:38px -80px!important}.implementationRoadmap article{min-height:138px;padding:18px;border-radius:13px;background:linear-gradient(145deg,#082b54,#154f88);color:#fff}.implementationRoadmap b,.implementationRoadmap strong,.implementationRoadmap span{display:block}.implementationRoadmap b{color:#54ddd2;font-size:12px}.implementationRoadmap strong{margin:12px 0 7px;font-size:18px}.implementationRoadmap span{color:#bfd1e3;font-size:12px;line-height:1.45}.decision{margin:48px 0;padding:30px;border-left:6px solid #f0a51a;border-radius:14px;background:#fff5df}.decision span{color:#a76700;font-size:11px;font-weight:900;letter-spacing:.12em}.decision h2{margin-top:9px}.cta{display:inline-flex;margin-top:12px;padding:13px 18px;border-radius:9px;background:#0a56e8;color:#fff;text-decoration:none;font-weight:900}.disclaimer{margin-top:52px;padding-top:23px;border-top:1px solid #cad8e5;font-size:13px!important;color:#667b91!important}@media(max-width:900px){.implementationRoadmap{margin:35px 0!important}}@media(max-width:600px){.hsArticle{padding:40px 18px 70px}.standfirst{font-size:18px}.articleBody{margin-top:32px}.articleBody h2{font-size:26px}.implementationRoadmap{grid-template-columns:1fr 1fr}}
      `}</style>
    </PageShell>
  );
}
