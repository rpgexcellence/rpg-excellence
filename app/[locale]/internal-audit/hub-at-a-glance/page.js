import { notFound } from "next/navigation";
import InternalAuditGlance from "../../../../components/InternalAuditGlance";
import Header from "../../../../components/Header";
import Footer from "../../../../components/Footer";
import { copy, locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Internal Audit Hub at a Glance | RPG Excellence",
  description: "Explore risk-based programmes, auditor competence, objective evidence, controlled findings and independent effectiveness review through an interactive Internal Audit product tour.",
  alternates: { canonical: "/en/internal-audit/hub-at-a-glance" },
  openGraph: {
    title: "Internal Audit Hub at a Glance | RPG Excellence",
    description: "See the evidence behind each audit decision.",
    images: ["/internal-audit-glance/command-centre.png"]
  }
};

export default async function InternalAuditGlancePage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <>
    <Header locale={locale} nav={copy[locale].nav} />
    <InternalAuditGlance locale={locale} />
    <Footer locale={locale} />
  </>;
}
