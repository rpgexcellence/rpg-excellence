import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
import { getStandardGuide } from "../../../lib/standard-guides";

export const metadata = { title: "ISO 22301 Practical Guide | RPG Excellence" };

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><StandardGuide guide={getStandardGuide("iso-22301")} locale={locale} /></PageShell>;
}

