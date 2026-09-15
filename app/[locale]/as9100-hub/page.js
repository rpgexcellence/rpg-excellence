import { notFound } from "next/navigation";
import AssuranceHubLanding from "../../../components/AssuranceHubLanding";
import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import { copy, locales } from "../../../lib/i18n";

export const metadata={title:"AS9100 Aerospace and Defence Hub | RPG Excellence",description:"A future assurance hub for aerospace, aviation, military and defence quality, product safety, configuration and operational risk."};
export default async function AS9100Hub({params}){const {locale}=await params;if(!locales.includes(locale))notFound();return <><Header locale={locale} nav={copy[locale].nav}/><AssuranceHubLanding hub="aerospace" locale={locale}/><Footer locale={locale}/></>}
