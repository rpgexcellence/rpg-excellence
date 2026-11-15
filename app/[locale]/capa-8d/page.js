import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import CapaEightDLanding from "../../../components/CapaEightDLanding";
import { locales } from "../../../lib/i18n";
export const metadata = {
 title: "CAPA–8D Hub | Root Cause & Verified Improvement | RPG Excellence",
 description: "Explore the practical corrective-action journey: triage, containment, verified causes, accountable action and independent effectiveness review.",
 alternates: {canonical:"/en/capa-8d"},
 openGraph: {title:"Find the cause. Verify the change. | RPG Excellence", images:["/images/how-it-works/operations.webp"]},
};
export default async function CapaEightDHubPage({params}) {
 const {locale}=await params;
 if(!locales.includes(locale)) notFound();
 return <PageShell locale={locale}><CapaEightDLanding locale={locale}/></PageShell>;
}
