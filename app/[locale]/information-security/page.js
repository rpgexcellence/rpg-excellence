import { notFound } from "next/navigation";
import InformationSecurityLanding from "../../../components/InformationSecurityLanding";
import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import { copy, locales } from "../../../lib/i18n";

export const metadata={title:"Information Security Hub | RPG Excellence",description:"Make security decisions you can defend. Connect risk assessment, control decisions, accountable treatment and evidence in one ISMS workspace."};
export default async function InformationSecurityHub({params}){const {locale}=await params;if(!locales.includes(locale))notFound();return <><Header locale={locale} nav={copy[locale].nav}/><InformationSecurityLanding locale={locale}/><Footer locale={locale}/></>}
