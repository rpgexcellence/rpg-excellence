import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Publications & Practical Guides | RPG Excellence",
  description: "Practical digital reference books and implementation guides for ISO management systems, internal auditors and business leaders.",
};

const books = [
  {
    title: "Decoding ISO 14001:2026",
    subtitle: "A Practical Reference and Pocket Guide",
    description: "Understand Clauses 4–10, challenge your environmental management arrangements and prepare evidence for internal and external audits. Includes worked examples and seven clause-linked Pocket Guides.",
    price: "£29.99",
    href: "decoding-iso-14001-2026",
    detail: "24 pages · Digital PDF · One-off purchase",
  },
];

export default async function PublicationsPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: 1120 }}>
          <span className="kicker">RPG EXCELLENCE · PUBLICATIONS</span>
          <h1>Publications & Practical Guides</h1>
          <p style={{ maxWidth: 780, fontSize: 18, lineHeight: 1.65 }}>
            Practical reference books to help you understand management system requirements,
            prepare for audits and turn findings into measurable improvement.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, margin: "36px 0 50px" }}>
            {books.map((book) => (
              <article key={book.href} style={{ border: "1px solid #d8e2eb", borderRadius: 14, padding: 26, background: "#fff", boxShadow: "0 8px 24px rgba(10,35,66,.05)" }}>
                <div style={{ background: "#102b4a", color: "white", borderRadius: 10, padding: 22, marginBottom: 22, minHeight: 160 }}>
                  <span style={{ fontSize: 11, letterSpacing: 2 }}>RPG EXCELLENCE</span>
                  <h2 style={{ color: "white", margin: "18px 0 8px" }}>{book.title}</h2>
                  <p style={{ margin: 0 }}>{book.subtitle}</p>
                </div>
                <p style={{ lineHeight: 1.65 }}>{book.description}</p>
                <p style={{ fontSize: 13, color: "#506781" }}>{book.detail}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#102b4a" }}>{book.price}</p>
                <Link className="button" href={`/${locale}/publications/${book.href}`}>
                  View book & purchase →
                </Link>
              </article>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "#506781" }}>
            RPG Excellence publications provide independent practical commentary and do not replace the official ISO standards.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
