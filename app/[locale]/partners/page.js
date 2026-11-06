import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import PartnersLanding from "../../../components/PartnersLanding";
import { locales } from "../../../lib/i18n";

export const metadata = {
 title: "Partner with RPG Excellence",
 description: "Explore referral, consultancy and training partnerships with RPG Excellence. Bring your expertise and help clients turn findings into verified improvement.",
};

export default async function Partners({ params }) {
 const { locale } = await params;
 if (!locales.includes(locale)) notFound();
 return <PageShell locale={locale}><PartnersLanding locale={locale} /></PageShell>;
}
