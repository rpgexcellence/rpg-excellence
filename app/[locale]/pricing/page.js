import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import PricingExperience from "./PricingExperience";
import JsonLd from "../../../components/JsonLd";
import { locales } from "../../../lib/i18n";
export const metadata = {
  title: "RPG Excellence Pricing | Business Licences and Training",
  description:
    "Explore RPG Excellence business licences by team size, existing self-service access, practical training and one-off assurance tools.",
  alternates: {
    canonical: "/en/pricing",
  },
};
const courseListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "RPG Excellence online training courses",
  itemListElement: [
    [
      "Workplace Risk Assessment Training",
      "Practical workplace risk-assessment skills.",
      "/en/hs-hub/training#initial-course",
      "19.99",
    ],
    [
      "Workplace Risk Assessment Refresher",
      "Scenario-led risk-assessment refresher.",
      "/en/hs-hub/training#refresher-course",
      "12.99",
    ],
    [
      "Internal Auditor Refresher Training",
      "Practical evidence-led internal-auditor refresher.",
      "/en/internal-audit-training",
      "19.99",
    ],
    [
      "RCA and Corrective Action Practitioner Training",
      "Evidence-led RCA and corrective-action training.",
      "/en/rca-8d-training",
      "49.99",
    ],
  ].map(([name, description, path, price], index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: "https://www.rpgexcellence.com" + path,
    item: {
      "@type": "Course",
      name,
      description,
      url: "https://www.rpgexcellence.com" + path,
      provider: {
        "@id": "https://www.rpgexcellence.com/#organization",
      },
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
      },
    },
  })),
};
export default async function Pricing({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  if (!locales.includes(locale)) notFound();
  const initialTab = query?.upgrade || query?.plan ? "individual" : "business";
  return <PageShell locale={locale}><JsonLd data={courseListSchema} /><PricingExperience locale={locale} initialTab={initialTab} /></PageShell>;
}
