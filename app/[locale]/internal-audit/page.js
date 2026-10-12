import { notFound } from "next/navigation";
import InternalAuditLanding from "../../../components/InternalAuditLanding";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "Internal Audit Management Software | RPG Excellence",
  description: "Connect risk-based programmes, auditor competence, objective evidence, findings and independent effectiveness review in one Internal Audit Hub. Start a 14-day free trial.",
  alternates: { canonical: "/en/internal-audit" },
  openGraph: {
    title: "Internal Audit Hub | RPG Excellence",
    description: "Find the weakness. Own the action. Verify the improvement.",
    images: ["/audit-journey/fieldwork.png"]
  }
};

export default async function InternalAuditHubPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <>
    <Header locale={locale} nav={copy[locale].nav} />
    <InternalAuditLanding locale={locale} />
    <Footer locale={locale} />
  </>;
}
