import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
import { getStandardGuide } from "../../../lib/standard-guides";

export const metadata = {
  title: "ISO/IEC 27001 Practical Guide | RPG Excellence",
  description: "Practical ISO/IEC 27001 guidance for information security risk, gap analysis, controls and Statement of Applicability decisions.",
  alternates: { canonical: "/en/iso-27001" },
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><StandardGuide guide={getStandardGuide("iso-27001")} locale={locale} /></PageShell>;
}
