import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
import { getStandardGuide } from "../../../lib/standard-guides";

export const metadata = { title: "ISO 14001 Practical Guide | RPG Excellence" };

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><StandardGuide guide={getStandardGuide("iso-14001")} locale={locale} /><section style={{maxWidth:1040,margin:"30px auto",padding:24,background:"#f4f8fc",borderRadius:12}}><h2>Decoding ISO 14001:2026 — Practitioner Book</h2><p>24-page practical PDF and seven clause-linked Pocket Guides, £29.99.</p><Link className="button" href={`/${locale}/publications/decoding-iso-14001-2026`}>Explore the book</Link></section></PageShell>;
}

