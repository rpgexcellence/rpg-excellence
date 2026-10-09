import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
import { getStandardGuide } from "../../../lib/standard-guides";

export const metadata = {
  title: "ISO 9001:2026 at a Glance | Executive & Auditor Guide",
  description: "Executive and auditor-focused overview of ISO 9001:2026, its clause structure, evidence expectations and RPG Intelligence gap assessment.",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><StandardGuide guide={getStandardGuide("iso-9001")} locale={locale} /></PageShell>;
}

