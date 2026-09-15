import { notFound } from "next/navigation";
import AssuranceHubLanding from "../../../components/AssuranceHubLanding";
import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import { copy, locales } from "../../../lib/i18n";

export const metadata={title:"Information Security Hub | RPG Excellence",description:"Connect ISO/IEC 27001 gap analysis, information-security risk, treatment, evidence and the Statement of Applicability."};
export default async function InformationSecurityHub({params}){const {locale}=await params;if(!locales.includes(locale))notFound();return <><Header locale={locale} nav={copy[locale].nav}/><AssuranceHubLanding hub="security" locale={locale}/><Footer locale={locale}/></>}
