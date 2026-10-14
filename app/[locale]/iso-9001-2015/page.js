import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
import { getStandardGuide } from "../../../lib/standard-guides";

export const metadata = {
  title: "ISO 9001:2015 at a Glance | Amendment 1:2024",
  description:
    "Executive and auditor-focused overview of ISO 9001:2015 with Amendment 1:2024, its clause structure, practical application and evidence expectations.",
  alternates: { canonical: "/en/iso-9001-2015" },
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <StandardGuide guide={getStandardGuide("iso-9001-2015")} locale={locale} />
    </PageShell>
  );
}
