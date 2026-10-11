import { notFound } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import HealthSafetyLanding from "../../../components/HealthSafetyLanding";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "Health & Safety Hub | RPG Excellence",
  description: "Create, control and review workplace risk assessments and build competent risk assessors through interactive training.",
};

export function generateStaticParams() { return locales.map(locale => ({ locale })); }

export default async function HealthSafetyHubPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <><Header locale={locale} nav={copy[locale].nav} /><HealthSafetyLanding locale={locale}/><Footer locale={locale}/></>;
}
