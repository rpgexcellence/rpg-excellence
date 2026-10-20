import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Decoding ISO/IEC 17025:2017 — Technical Guide | RPG Insights",
  description: "Introducing the RPG Excellence 52-page laboratory competence guide: practical controls, worked examples, audit evidence and technical decisions.",
  alternates: { canonical: "/en/insights/decoding-iso-17025-2017-publication" },
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><main className="simplePage"><article className="simpleInner" style={{maxWidth:880}}>
    <span className="kicker">RPG INSIGHTS · ISSUE 030 · PUBLICATIONS</span>
    <h1>Decoding ISO/IEC 17025:2017: From Requirements to Reliable Laboratory Results</h1>
    <p style={{fontSize:20}}>New from RPG Excellence: a technical guide for testing and calibration laboratory managers, quality professionals and internal auditors.</p>
    <p>Laboratory competence cannot be demonstrated through a collection of procedures alone. It depends on sound technical decisions, competent people, fit-for-purpose methods and records that explain why reported results can be trusted.</p>
    <h2>What is different about this guide?</h2>
    <p>Our 52-page publication translates ISO/IEC 17025:2017 into implementation practices, worked cases, example records, audit questions and practical posters. The emphasis is on how systems work, not simply what their headings say.</p>
    <h2>Take impartiality beyond a declaration</h2>
    <p>Consider a laboratory employee who has a personal relationship with a representative of a customer whose work they test or approve. The laboratory should identify the potential threat, assess whether the relationship could influence technical judgement, determine appropriate safeguards, assign decision authority and retain proportionate records of the assessment. The guide explains this as an ongoing risk-management activity, not just a once-a-year signature exercise.</p>
    <h2>Other practical applications</h2>
    <p>The guide covers personnel competence and authorisation, equipment status, traceability chains, method verification and validation, measurement uncertainty, proficiency testing, validity monitoring, statements of conformity and decision rules, technical records, LIMS controls and nonconforming work.</p>
    <h2>Who should read it?</h2>
    <p>Laboratory directors, technical managers, quality managers, method owners, calibration specialists, testing personnel, internal auditors and consultants supporting accreditation preparation or surveillance.</p>
    <h2>Publication details</h2>
    <p><strong>Decoding ISO/IEC 17025:2017</strong><br/>52 pages · Digital PDF · £29.99 one-off purchase</p>
    <p><Link className="button" href={`/${locale}/publications/decoding-iso-17025-2017`}>Explore the book</Link></p>
    <p style={{fontSize:13}}>This is an independent RPG Excellence publication. It is not the ISO/IEC standard or an official accreditation-body document.</p>
  </article></main></PageShell>;
}
