import { CLAUSE_PUBLICATIONS } from "../../../lib/iso9001-clause-publications.mjs";
import QualityPerformancePublicationCard from "../../../components/QualityPerformancePublicationCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";
import { EIGHT_D_PUBLICATION as workbook } from "../../../lib/eight-d-publication.mjs";
import styles from "./publications.module.css";

export const metadata = {
  title: "Digital Publications | RPG Excellence",
  description: "Practical workbooks, ISO guides and printable field guides from RPG Excellence.",
};

const books = [
  { title: "Decoding Environmental Aspects", subtitle: "Climate, biodiversity and life cycle decisions", desc: "A practical environmental workbook with five reusable worksheets, a worked water-and-waste case and four guidance posters. Includes a separate printable poster PDF.", pages: 30, price: "£7.99", format: "PDF bundle", image: "/images/publications/environmental-aspects.png", slug: "decoding-environmental-aspects" },
  { title: "ISO 9001:2026 Technical Insights & Poster Collection", subtitle: "Collected published series · Clauses 4–10", desc: "Seven complete technical articles, seven chapter covers and 21 supporting posters. Reviewed collected edition with all articles and posters inside one PDF.", pages: 53, price: "£9.99", format: "PDF", slug: "iso-9001-2026-technical-insights" },
  { title: "Decoding ISO/IEC 17025:2017", subtitle: "Testing & Calibration Laboratories", desc: "Translate technical laboratory requirements into practical implementation: impartiality, competence, traceability, uncertainty, decision rules, result validity and audit evidence. Includes technical examples, templates and posters.", pages: 52, slug: "decoding-iso-17025-2017" },
  { title: "Decoding ISO 9001:2026", subtitle: "Quality Management", desc: "Understand requirements, test evidence and make stronger quality decisions. Clause-by-clause guidance, practical examples and Annex A interpretation.", pages: 33, slug: "decoding-iso-9001-2026" },
  { title: "Decoding ISO 14001:2026", subtitle: "Environmental Management", desc: "Translate environmental management requirements into practical controls, audit trails and measurable improvement. Includes seven Pocket Guides.", pages: 24, slug: "decoding-iso-14001-2026" },
];

const categories = [
  { id: "quality-improvement", title: "Quality improvement", description: "Workbooks for problem solving, corrective action and performance improvement." },
  { id: "clause-guides", title: "ISO 9001:2026 clause guides", description: "Seven standalone guides at £4.99 each, with scenarios, worksheets and two poster annexes per guide." },
  { id: "iso-quality-management", title: "ISO 9001 guides and collections", books: ["decoding-iso-9001-2026", "iso-9001-2026-technical-insights"] },
  { id: "environmental-management", title: "Environmental management", books: ["decoding-environmental-aspects", "decoding-iso-14001-2026"] },
  { id: "laboratory-competence", title: "Laboratory competence", books: ["decoding-iso-17025-2017"] },
];

function BookCard({ locale, book }) {
  return <article className={styles.card}>
    {book.image && <img className={book.portrait ? styles.cardCover : styles.cardImage} src={book.image} alt={book.title + " cover"} />}
    <div className={styles.cardText}>
      <h3>{book.title}</h3>
      {book.subtitle && <p>{book.subtitle}</p>}
      <p>{book.desc}</p>
      <p className={styles.cardPrice}><strong>{book.price || "£29.99"}</strong> · {book.pages} pages · {book.format || "PDF"}</p>
      <Link className="button" href={`/${locale}/publications/${book.slug}`}>View &amp; purchase</Link>
    </div>
  </article>;
}

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><main className="simplePage"><div className={`simpleInner ${styles.shell}`}>
    <nav className={styles.sidebar} aria-label="Publication categories">
      <h2>Publication categories</h2>
      <ul>{categories.map(({ id, title }) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}</ul>
    </nav>
    <div className={styles.content}>
      <span className="kicker">RPG EXCELLENCE · DIGITAL PUBLICATIONS</span>
      <h1>Practical publications</h1>
      <p style={{fontSize:19}}>Practitioner workbooks and independent ISO guides for quality, environmental and laboratory teams.</p>
      {categories.map(({ id, title, description, books: slugs }) => <section key={id} className={styles.section} aria-labelledby={id}>
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
        <div className={styles.grid}>
          {id === "quality-improvement" && <>
            <BookCard locale={locale} book={{
              ...workbook, title: workbook.name, desc: workbook.description, pages: 32, portrait: true,
              price: "£" + (workbook.unitAmount / 100).toFixed(2), format: "PDF workbook and colour posters",
            }} />
            <QualityPerformancePublicationCard locale={locale} />
          </>}
          {id === "clause-guides" && CLAUSE_PUBLICATIONS.map(publication => <BookCard key={publication.code} locale={locale} book={{
            title: publication.topic, subtitle: "ISO 9001:2026 · Clause " + publication.clause, desc: publication.promise,
            pages: publication.pages, image: publication.image, slug: publication.slug,
            price: "£" + (publication.unitAmount / 100).toFixed(2), format: "PDF and printable posters",
          }} />)}
          {slugs?.map(slug => <BookCard key={slug} locale={locale} book={books.find(book => book.slug === slug)} />)}
        </div>
      </section>)}
      <p style={{fontSize:13}}>The ISO guides are independent commentary. Use an authorised copy of the relevant standard.</p>
    </div>
  </div></main></PageShell>;
}
