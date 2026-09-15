import { notFound } from "next/navigation";
import AssuranceHubLanding from "../../../components/AssuranceHubLanding";
import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import { copy, locales } from "../../../lib/i18n";

export const metadata={title:"Business Continuity Planning Hub | RPG Excellence",description:"ISO 22301 gap analysis, business impact, disruption risk, continuity strategy, plans, exercises and evidence-led improvement."};
export default async function BusinessContinuityHub({params}){const {locale}=await params;if(!locales.includes(locale))notFound();return <><Header locale={locale} nav={copy[locale].nav}/><AssuranceHubLanding hub="continuity" locale={locale}/><Footer locale={locale}/></>}
