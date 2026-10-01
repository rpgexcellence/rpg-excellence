import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "ISO 22301 Context and Interested Parties | RPG Excellence",
  description:
    "How RPG Excellence Module 3 turns organisational context, interested-party requirements, obligations, scope and priorities into controlled ISO 22301 Clause 4 outputs.",
  alternates: {
    canonical:
      "/en/insights/business-continuity-context-interested-parties",
  },
  openGraph: {
    title: "Business Continuity Decisions Begin with Context",
    description:
      "See how RPG Excellence connects external and internal context, interested parties, obligations, scope, objectives and risk priorities.",
    images: ["/insights/bcp-module-3-external-context.png"],
  },
};

const article = {
  issue: "020",
  slug: "business-continuity-context-interested-parties",
  wide: true,
  fullWidthFigures: true,
  datePublished: "2026-10-01",
  dateModified: "2026-10-01",
  title: "Business Continuity Decisions Begin with Context",
  description: metadata.description,
  standfirst:
    "RPG Excellence Business Continuity Module 3 converts ISO 22301 Clause 4 from a static narrative into connected, prioritised and auditable registers covering context, interested parties, obligations, direction, scope and continuity priorities.",
  image: "/insights/bcp-module-3-external-context.png",
  imageAlt:
    "RPG Excellence Business Continuity Module 3 external context assessment",
  opening:
    "A continuity programme cannot make proportionate recovery decisions until it understands the environment in which the organisation operates, the internal conditions that shape capability and the parties whose needs create legal, contractual, operational or reputational obligations.",
  roadmap: [
    ["01", "Connect", "Reuse the controlled site and service boundary"],
    ["02", "Scan", "Evaluate external and internal continuity context"],
    ["03", "Engage", "Identify interested parties and their expectations"],
    ["04", "Translate", "Convert requirements into obligations and communication"],
    ["05", "Direct", "Set appetite objectives boundaries and scope"],
    ["06", "Prioritise", "Generate Clause 4 registers and risk visibility"],
  ],
  sections: [
    {
      heading: "Turn external change into continuity decisions",
      paragraphs: [
        "Module 3 prompts the organisation to consider political and regulatory change, economic conditions, technology and cyber change, social and workforce trends, natural hazards, market pressure, utilities, energy security and supply-chain disruption.",
        "Each selected issue is assessed for continuity relevance, management-system applicability and priority. The engine generates an editable summary while retaining the evidence and management judgement behind the decision.",
      ],
      image: "/insights/bcp-module-3-external-context.png",
      imageAlt:
        "External continuity context assessment with predefined issues and prioritisation",
      imageCaption:
        "External context is converted into prioritised records rather than left as an unstructured PESTLE narrative.",
    },
    {
      heading: "Expose internal conditions that influence resilience",
      paragraphs: [
        "Governance, decision rights, leadership availability, competence, capacity, technology, culture, contractual relationships, facilities and financial resources can all determine whether a response works under pressure.",
        "The workspace connects each internal issue to the management systems it affects and creates a reviewable continuity summary. This makes unclear authority, fragmented governance and single points of dependency visible before an incident tests them.",
      ],
      image: "/insights/bcp-module-3-internal-context.png",
      imageAlt:
        "Internal continuity context assessment covering governance roles and management-system applicability",
      imageCaption:
        "Internal context connects governance and capability issues to applicable management systems and accountable decisions.",
    },
    {
      heading: "Connect interested parties to accountable owners",
      paragraphs: [
        "Customers, employees, emergency responders, regulators, insurers, critical suppliers, landlords, technology providers, utilities, banks and local communities can each shape continuity requirements.",
        "For every party, the user records the expectation, relationship, legal or contractual significance, affected services and accountable Company User. The result is a controlled interested-party register rather than a generic stakeholder list.",
      ],
      image: "/insights/bcp-module-3-interested-parties.png",
      imageAlt:
        "Interested-party assessment linking customer expectations obligations processes and accountable Company Users",
      imageCaption:
        "Interested-party needs are linked to obligations, affected services and accountable Company Users.",
    },
    {
      heading: "Define communication before disruption",
      paragraphs: [
        "Continuity communication should not be improvised during an incident. Module 3 records what must be communicated, the trigger or frequency and the processes and services affected.",
        "Customer disruption notices, recovery updates, employee welfare information, working arrangements and closure communications remain connected to the relevant interested party and obligation.",
      ],
      image: "/insights/bcp-module-3-communication-plan.png",
      imageAlt:
        "Continuity communication plan with notification triggers frequency and stakeholder expectations",
      imageCaption:
        "Communication requirements are established before disruption and retained alongside the originating stakeholder need.",
    },
    {
      heading: "Generate direction, objectives and scope from evidence",
      paragraphs: [
        "The direction-and-scope stage builds from the site profile, context issues and interested-party requirements. It recommends a continuity risk appetite and supports measurable objectives linked to the applicable management systems.",
        "Users remain in control: generated text can be reviewed and amended, while the source data and relationships remain traceable. This creates a defensible route from organisational context to BCMS scope and objectives.",
      ],
      image: "/insights/bcp-module-3-direction-scope.png",
      imageAlt:
        "Business continuity direction and scope with risk appetite objectives and management-system links",
      imageCaption:
        "Risk appetite, objectives and scope are generated from connected operational and stakeholder evidence.",
    },
    {
      heading: "Create controlled Clause 4 outputs",
      paragraphs: [
        "The final stage produces a context-priority register, interested-party register, obligations register, objectives register, risk-and-opportunity register and BCMS scope statement.",
        "A live heat map makes the distribution of risks and opportunities visible. The outputs then become controlled inputs to disruption-risk assessment and business impact analysis, preserving the chain from context to recovery decision.",
      ],
      image: "/insights/bcp-module-3-priority-registers.png",
      imageAlt:
        "Generated ISO 22301 Clause 4 registers with risk and opportunity heat map",
      imageCaption:
        "Module 3 converts Clause 4 analysis into controlled registers that feed risk assessment and BIA.",
    },
  ],
  managementTest:
    "Can your organisation trace each continuity priority back to a context issue, interested-party requirement, accountable owner and scope decision?",
  managementAnswer:
    "If those connections cannot be demonstrated, the BCMS may contain recovery arrangements without a defensible basis for why they were selected. Module 3 retains the evidence chain and turns Clause 4 into a practical management control.",
  productCopy:
    "RPG Excellence Business Continuity Module 3 provides a six-stage ISO 22301 Clause 4 workflow with dynamic prompts, editable generated summaries, Company User ownership, prioritisation, communication planning and controlled registers.",
  productHref: "/portal/business-continuity/context",
  productLabel: "Open Module 3 Context & Interested Parties",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <HsInsightArticle locale={locale} article={article} />;
}
