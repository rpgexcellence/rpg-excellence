import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "ISO 22301:2019 Business Continuity Gap Assessment Released",
  description: "RPG Intelligence now provides a complete ISO 22301:2019 evidence-led gap assessment covering context, leadership, BIA, disruption risk, continuity strategies, response, recovery, exercises and improvement.",
  alternates: { canonical: "/en/insights/iso-22301-business-continuity-readiness" },
};

const article = {
  issue: "017",
  slug: "iso-22301-business-continuity-readiness",
  title: "ISO 22301: Turning Business Continuity Plans into Demonstrated Capability",
  description: metadata.description,
  standfirst: "Business continuity cannot be demonstrated by owning a plan. It depends on whether priority activities, resources, decisions and recovery arrangements can work together when normal operations are disrupted.",
  image: "/insights/iso-22301-business-continuity-readiness.png",
  imageAlt: "Cross-functional leadership team coordinating business continuity and operational recovery during severe weather disruption",
  opening: "RPG Intelligence now includes a complete ISO 22301:2019 Business Continuity Management System gap assessment. It converts every auditable requirement in Clauses 4 to 10 into an evidence-led review of governance, business impact, disruption risk, continuity strategy, response, recovery and improvement.",
  sections: [
    {
      heading: "Begin with what the organisation must continue",
      paragraphs: ["A credible BCMS starts with products and services that matter to customers and interested parties. The assessment examines organisational context, legal and contractual duties, dependencies and the boundaries of the continuity system before testing whether the selected scope is defensible."],
      points: ["Identify relevant internal and external disruption issues.", "Determine interested-party, legal and regulatory requirements.", "Define products, services, sites, functions and dependencies within scope.", "Explain exclusions without weakening continuity capability."],
    },
    {
      heading: "Connect BIA and risk assessment to real recovery decisions",
      paragraphs: ["Business impact analysis establishes how disruption affects the organisation over time and when those impacts become unacceptable. Risk assessment considers the scenarios and vulnerabilities capable of disrupting priority activities. Their value lies in the decisions they produce—not in two disconnected reports."],
      points: ["Set justified impact criteria and recovery time objectives.", "Identify prioritised activities and minimum acceptable capacity.", "Map people, premises, technology, information and supplier dependencies.", "Use disruption risk to challenge assumptions and select treatments."],
    },
    {
      heading: "Test strategy, response and recovery as one capability",
      paragraphs: ["The assessment follows continuity requirements into selected strategies, resource commitments, incident response structures, communication arrangements, operational plans and the controlled return to normal activities. Evidence must show that these elements are implemented and can operate together."],
      points: ["Evaluate options using risk, benefit, cost and feasibility.", "Define response authority, activation thresholds and team interfaces.", "Maintain warning, stakeholder and media communication arrangements.", "Plan restoration, data reconciliation, backlog recovery and handback."],
    },
    {
      heading: "Use exercises to expose weak assumptions before disruption does",
      paragraphs: ["An exercise programme should validate different plans and teams over time, using realistic scenarios and clear objectives. Findings must become controlled improvements, with ownership and effectiveness verification. A successful exercise is not one in which everyone follows the script; it is one that produces reliable evidence about capability."],
      points: ["Exercise critical scenarios, dependencies and loss conditions.", "Capture decisions, performance, gaps and lessons objectively.", "Assign corrective actions and verify their effectiveness.", "Feed results into performance evaluation and management review."],
    },
    {
      heading: "Where ISO 22301 fits in RPG Excellence pricing",
      paragraphs: ["ISO 22301 is included as the sixth gap-analysis framework within all active RPG Excellence subscriptions. Organisations that do not require an ongoing platform subscription can purchase one ISO 22301 assessment for £129."],
      points: ["Starter — £20.99 per month: ISO 22301 assessment, evidence, findings and reporting within one organisation workspace.", "Professional — £59 per month: everything in Starter plus internal audit, CAPA-8D, Permit to Work, POWRA, MOC/PSSR and broader assurance workflows.", "Consultant — £159 per month: everything in Professional plus multi-client and portfolio management capability.", "One-off — £129: one controlled ISO 22301 assessment, 30-day completion access, 90-day assessment-linked corrective-action access and retained read-only results."],
    },
  ],
  managementTest: "Could your organisation demonstrate—not merely state—that priority products and services can continue or recover within approved time frames?",
  managementAnswer: "If recovery priorities, dependencies, resource commitments, response authority and exercise evidence cannot be traced to management decisions, the organisation may have plans without demonstrated continuity capability.",
  productCopy: "The RPG Intelligence ISO 22301 assessment contains 56 requirement checks across Clauses 4–10, all 31 Clause 3 definitions, weighted readiness scoring, management-readiness review, evidence prompts, findings, corrective actions and controlled executive reporting.",
  productHref: "/portal?standard=ISO%2022301%3A2019#new-assessment",
  productLabel: "Start the ISO 22301 assessment",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <HsInsightArticle locale={locale} article={article} />;
}

