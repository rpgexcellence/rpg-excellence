import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";
export const metadata = { title: "Digital Publications | RPG Excellence", description: "Practical independent ISO management system publications, £29.99 per PDF." };
const books = [
  { title: "Decoding ISO 9001:2026", subtitle: "Quality Management", desc: "Understand requirements, test evidence and make stronger quality decisions. Clause-by-clause guidance, practical examples and Annex A interpretation.", pages: 33, slug: "decoding-iso-9001-2026" },
  { title: "Decoding ISO 14001:2026", subtitle: "Environmental Management", desc: "Translate environmental management requirements into practical controls, audit trails and measurable improvement. Includes seven Pocket Guides.", pages: 24, slug: "decoding-iso-14001-2026" },
];
export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><main className="simplePage"><div className="simpleInner" style={{maxWidth:1100}}>
    <span className="kicker">RPG EXCELLENCE · DIGITAL PUBLICATIONS</span>
    <h1>Practical ISO publications</h1>
    <p style={{fontSize:19}}>Independent practitioner guides designed to help you interpret requirements, make sound decisions and demonstrate objective evidence.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,margin:"32px 0"}}>
      {books.map(book => <article key={book.slug} style={{border:"1px solid #d8e2eb",borderRadius:14,overflow:"hidden",background:"#fff"}}>
        <div style={{padding:26,background:"#102b4a",color:"white",minHeight:170}}><small style={{letterSpacing:2}}>RPG EXCELLENCE</small><h2 style={{color:"white",margin:"18px 0 8px"}}>{book.title}</h2><p>{book.subtitle}</p></div>
        <div style={{padding:26}}><p>{book.desc}</p><p><strong>£29.99</strong> · {book.pages} pages · PDF</p><Link className="button" href={`/${locale}/publications/${book.slug}`}>View &amp; purchase</Link></div>
      </article>)}
    </div>
    <p style={{fontSize:13}}>Independent commentary, not an ISO or BSI publication. An authorised copy of the relevant standard is required.</p>
  </div></main></PageShell>;
}
