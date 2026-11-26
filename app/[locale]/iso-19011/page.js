import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
import { iso19011Guide } from "../../../lib/iso-19011-guide";

export const metadata = {
  title: "ISO 19011:2026 at a Glance | RPG Excellence",
  description: "A global audit manager’s guide to the fourth edition of ISO 19011, risk-based audit programmes, evidence, reporting and auditor competence.",
  alternates: { canonical: "/en/iso-19011" },
};

export default async function Iso19011Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <StandardGuide guide={iso19011Guide} locale={locale} />
    </PageShell>
  );
}
