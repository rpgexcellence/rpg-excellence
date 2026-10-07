import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  "title": "When Disruption Hits, What Must Recover First?",
  "description": "RPG Excellence releases BCP Module 6: Business Impact Analysis, connecting impacts over time, accountable activity owners, recovery objectives and resource dependencies.",
  "alternates": {
    "canonical": "/en/insights/business-continuity-business-impact-analysis"
  },
  "openGraph": {
    "title": "When Disruption Hits, What Must Recover First?",
    "description": "RPG Excellence releases BCP Module 6: Business Impact Analysis, connecting impacts over time, accountable activity owners, recovery objectives and resource dependencies.",
    "images": [
      "/insights/bcp-module6-impacts-over-time.png"
    ]
  }
};
const article = {
  "issue": "024",
  "slug": "business-continuity-business-impact-analysis",
  "wide": true,
  "fullWidthFigures": true,
  "datePublished": "2026-10-07",
  "dateModified": "2026-10-07",
  "title": "When Disruption Hits, What Must Recover First?",
  "description": "RPG Excellence releases BCP Module 6: Business Impact Analysis, connecting impacts over time, accountable activity owners, recovery objectives and resource dependencies.",
  "standfirst": "New release: BCP Module 6 – Business Impact Analysis. Turn the consequences of disruption into controlled recovery priorities, minimum operating capacity and resource requirements.",
  "image": "/insights/bcp-module6-impacts-over-time.png",
  "imageAlt": "RPG Business Impact Analysis overview and impacts over time",
  "opening": "A continuity plan needs a defensible answer to three questions: what must recover first, by when, and at what minimum capacity? RPG Excellence’s Module 6 connects those decisions to activities, Company User ownership and the resources needed to deliver them.",
  "roadmap": [
    [
      "01",
      "Linked scope",
      "Connect the operating boundary."
    ],
    [
      "02",
      "Activities",
      "Identify services and accountable owners."
    ],
    [
      "03",
      "Impacts over time",
      "Assess when consequences become unacceptable."
    ],
    [
      "04",
      "Recovery objectives",
      "Set resumption, capacity and data requirements."
    ],
    [
      "05",
      "Resources & dependencies",
      "Define what recovery needs."
    ],
    [
      "06",
      "BIA register",
      "Review priorities and their justification."
    ]
  ],
  "sections": [
    {
      "heading": "When everything stops, everything cannot restart first",
      "paragraphs": [
        "Consider a hypothetical outage at an engineering and services business. The site is unavailable and systems are disrupted. Customer enquiries continue, delivery dates approach, contract decisions wait and operational teams compete for limited people and technology.",
        "The urgent question is which activities must resume first and what level of service is needed to prevent unacceptable consequences. Restoring every activity at once may be unrealistic. Restoring the easiest system first may not protect the most time-sensitive commitment. Business Impact Analysis gives management a basis for those choices."
      ]
    },
    {
      "heading": "1. Connect the scope and give activities an accountable owner",
      "paragraphs": [
        "Module 6 follows the hazard assessment in Module 5. Risk assessment considers credible disruption threats and controls; BIA examines the consequences of interrupted activities over time and the requirements for their resumption.",
        "The six-stage workflow moves through linked scope, activities, impacts over time, recovery objectives, resources and dependencies, and the BIA register. The Activities screen offers linked starting points from Module 1 and asks teams to include the value-chain and supporting activities that could affect products and services.",
        "Each included activity needs an accountable owner linked to an active Company People profile with Business Continuity access. In the supplied example, the completion explanation identifies missing valid Company User owners. This makes the remaining work visible rather than leaving users to interpret a percentage."
      ],
      "image": "/insights/bcp-module6-activities.png",
      "imageAlt": "RPG Module 6 activities",
      "imageCaption": "Illustrative product screenshot. Sample entries, recovery timings and status labels are demonstration data, not verified recovery capability."
    },
    {
      "heading": "2. Understand how the impact changes with time",
      "paragraphs": [
        "A four-hour interruption and a two-week interruption can have very different consequences. Module 6 lets teams assess impacts across time horizons from 0–4 hours through to more than two weeks, with rationale alongside the ratings. Financial, customer/service, legal/regulatory and reputational impacts are visible in the supplied view.",
        "The displayed engine identifies an indicative Maximum Tolerable Period of Disruption (MTPD) from the first assessed time horizon at which an impact reaches the organisation’s selected unacceptable-impact threshold. This is a starting point for management confirmation, not an independently proven tolerance.",
        "Confirm that timing against contracts, operating conditions, customer commitments and other relevant evidence. Broad time bands can conceal an earlier deadline: if a consequence becomes unacceptable at hour six, a 4–24-hour band does not justify waiting until hour 24. Record the actual constraint and reasoning."
      ],
      "image": "/insights/bcp-module6-impacts-over-time.png",
      "imageAlt": "RPG Module 6 impacts over time",
      "imageCaption": "Illustrative product screenshot. Sample entries, recovery timings and status labels are demonstration data, not verified recovery capability."
    },
    {
      "heading": "3. Set recovery objectives that mean something operationally",
      "paragraphs": [
        "The recovery screen separates the outer tolerance, the target for resumption, minimum operating capacity, full recovery and tolerable data loss. These are different decisions and need different evidence.",
        "MTPD is the maximum disruption period before impacts become unacceptable. RTO, the Recovery Time Objective, sets the target for resuming an activity and must sit inside that tolerance in the RPG workflow. MBCO, the Minimum Business Continuity Objective, specifies the minimum acceptable service or output capacity at resumption.",
        "The interface also records TRO for full recovery and RPO, the Recovery Point Objective, for maximum tolerable data loss expressed as time. TRO is the full-recovery field label used in RPG; it should not be presented as a universally prescribed ISO acronym.",
        "The module captures minimum operating arrangements, maximum workaround duration, alternate locations or workload shifting, and whether an activity can operate remotely. A percentage should translate into a practical service commitment: which customers, which transactions, which output and for how long?"
      ],
      "image": "/insights/bcp-module6-recovery-objectives.png",
      "imageAlt": "RPG Module 6 recovery objectives",
      "imageCaption": "Illustrative product screenshot. Sample entries, recovery timings and status labels are demonstration data, not verified recovery capability."
    },
    {
      "heading": "4. Test the target against the resources it needs",
      "paragraphs": [
        "A one-hour recovery objective is credible only when the required people, competence, premises, technology, data, equipment, utilities and suppliers can support it. Module 6 records the minimum people and skills required at MBCO, resource categories and linked Module 1 dependencies.",
        "The screen connects Module 5 disruption scenarios to the activity’s dependencies. That linkage prompts a useful challenge: could the same event remove both the primary resource and the proposed workaround?",
        "Recovery strategy requirements and evidence references help explain how each requirement will be met. A saved document reference is useful when it demonstrates the relevant capability; it is not, by itself, proof that recovery will meet the target. Supplier lead times, restoration tests, alternate-site capacity and exercises may expose gaps that need treatment."
      ],
      "image": "/insights/bcp-module6-resources-dependencies.png",
      "imageAlt": "RPG Module 6 resources dependencies",
      "imageCaption": "Illustrative product screenshot. Sample entries, recovery timings and status labels are demonstration data, not verified recovery capability."
    },
    {
      "heading": "5. Make the BIA register a management decision record",
      "paragraphs": [
        "The final register brings together activity, owner, products and services, recovery priority, RTO, MTPD, MBCO and RPO. Summary indicators show activities, same-day recovery targets, timing conflicts and dependencies in the demonstration view.",
        "The screen asks teams to approve only when impact evidence, timing logic, minimum capacity, resources and dependencies are complete and defensible. Completion, “objectives valid” and “assured” are workflow indicators; they do not replace an exercise or prove that the business can recover.",
        "The supplied screenshots contain demonstration entries, timings and status labels. They illustrate product functionality and should not be copied as recommended recovery objectives for another organisation."
      ],
      "image": "/insights/bcp-module6-bia-register.png",
      "imageAlt": "RPG Module 6 bia register",
      "imageCaption": "Illustrative product screenshot. Sample entries, recovery timings and status labels are demonstration data, not verified recovery capability."
    },
    {
      "heading": "The commercial value: invest around the recovery requirement",
      "paragraphs": [
        "BIA helps a business explain why one capability needs earlier restoration or more resilient resources than another. It gives a clearer basis for decisions about backup capacity, supplier arrangements, staffing, data protection and continuity investment.",
        "In the outage example, management may prioritise a limited customer-response service, a critical delivery activity and the systems each depends on. Those priorities must come from the organisation’s actual impact evidence. The exercise is to protect commitments within tolerable limits, then restore normal operations in a controlled sequence.",
        "ISO/TS 22317 describes BIA guidance consistent with ISO 22301, including impacts over time and continuity priorities and requirements. RPG presents Module 6 against ISO 22301 Clause 8.2.2 in its interface. The module supports the assessment process; competent application and demonstrated recovery remain the organisation’s responsibility. Reference: https://www.iso.org/standard/79000.html"
      ]
    }
  ],
  "managementTest": "Could you explain your first recovery priority without pointing to a score?",
  "managementAnswer": "Name the commitment at risk, when its impact becomes unacceptable, the minimum service required, the accountable owner and the resources that must be available. Then show how the recovery arrangement has been challenged or tested.",
  "productCopy": "RPG Excellence brings activities, impact evidence, recovery timing, Company User ownership and dependencies into a connected BIA workflow. For teams coordinating several departments or sites, it provides a common basis for reviewing competing priorities and targeting continuity investment. Request a demonstration using one of your own time-sensitive activities.",
  "productHref": "/en/business-continuity",
  "productLabel": "Explore RPG Business Continuity"
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <div className="rpgHazardInsight"><HsInsightArticle locale={locale} article={{...article, productHref:`/${locale}/business-continuity`}} /><style>{`.rpgHazardInsight .hsArticle.wideArticle>article,.rpgHazardInsight .hsArticle.wideArticle .articleBody{max-width:1280px;width:100%;min-width:0;box-sizing:border-box}.rpgHazardInsight .hsArticle .hero{height:auto;aspect-ratio:auto;object-fit:contain}.rpgHazardInsight .hsArticle .implementationRoadmap{margin:38px 0!important}.rpgHazardInsight .hsArticle.fullWidthFigures .articleFigure{width:100%;margin:32px 0 8px;transform:none}.rpgHazardInsight .hsArticle p,.rpgHazardInsight .hsArticle li{overflow-wrap:anywhere}.rpgHazardInsight .hsArticle .cta{max-width:100%;box-sizing:border-box}@media(max-width:600px){.rpgHazardInsight .hsArticle h1{font-size:clamp(32px,9vw,48px)}.rpgHazardInsight .hsArticle .decision{padding:22px}.rpgHazardInsight .hsArticle .implementationRoadmap{grid-template-columns:1fr}}`}</style></div>;
}
