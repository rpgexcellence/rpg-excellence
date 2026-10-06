import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  "title": "Before the Outage: Turn Hazard Scenarios into Accountable Decisions",
  "description": "RPG Excellence releases BCP Module 5: Risk Assessment \u2013 Hazard Scenarios, connecting credible disruption threats, current controls, accountable treatment and a controlled risk register.",
  "alternates": {
    "canonical": "/en/insights/business-continuity-risk-assessment-hazard-scenarios"
  },
  "openGraph": {
    "title": "Before the Outage: Turn Hazard Scenarios into Accountable Decisions",
    "description": "RPG Excellence releases BCP Module 5: Risk Assessment \u2013 Hazard Scenarios, connecting credible disruption threats, current controls, accountable treatment and a controlled risk register.",
    "images": [
      "/insights/bcp-module5-overview.png"
    ]
  }
};
const article = {
  "issue": "023",
  "slug": "business-continuity-risk-assessment-hazard-scenarios",
  "wide": true,
  "fullWidthFigures": true,
  "datePublished": "2026-10-06",
  "dateModified": "2026-10-06",
  "title": "Before the Outage: Turn Hazard Scenarios into Accountable Decisions",
  "description": "RPG Excellence releases BCP Module 5: Risk Assessment – Hazard Scenarios, connecting credible disruption threats, current controls, accountable treatment and a controlled risk register.",
  "standfirst": "New release: BCP Module 5 – Risk Assessment / Hazard Scenarios. Connect credible threats, inherent and residual risk, Company User ownership and treatment decisions before disruption tests the plan.",
  "image": "/insights/bcp-module5-overview.png",
  "imageAlt": "RPG BCP Module 5 overview and six-stage hazard scenario workflow",
  "opening": "A completed risk register should help a business decide what to protect, what to improve and who must act. RPG Excellence’s new Module 5 connects those decisions in a guided workflow, building on Roles and Responsibilities and preparing the ground for continuity planning.",
  "roadmap": [
    [
      "01",
      "Linked scope",
      "Ground the assessment in the site and its dependencies."
    ],
    [
      "02",
      "Hazard screening",
      "Select credible scenarios and add local threats."
    ],
    [
      "03",
      "Risk analysis",
      "Describe exposure and inherent consequences."
    ],
    [
      "04",
      "Controls",
      "Evaluate measures operating today."
    ],
    [
      "05",
      "Treatment & approval",
      "Assign actions and justify decisions."
    ],
    [
      "06",
      "Risk register",
      "Review positions and changing assumptions."
    ]
  ],
  "sections": [
    {
      "heading": "A power failure rarely stays a power failure",
      "paragraphs": [
        "Consider a hypothetical site outage. Power is lost during production. Equipment stops, ventilation and environmental controls may be affected, staff need a safe response, IT systems become unavailable and customer delivery commitments begin to slip. A supplier delay can make recovery slower still.",
        "The commercial exposure is wider than downtime: lost output, recovery costs, damaged stock, contractual consequences and confidence in the next delivery. The useful question is how the disruption could develop at this location, which controls would still work and who has authority to act."
      ]
    },
    {
      "heading": "1. Link the scope before selecting the threats",
      "paragraphs": [
        "Module 5 begins with linked scope. Start with the site, its activities, affected processes and critical dependencies. A threat catalogue is a starting point; it becomes a credible assessment only when the organisation explains the local exposure.",
        "The hazard screening brings together people and security, technology and infrastructure, supply chain and transport, natural and environmental threats, and integrity and compliance. Select relevant scenarios and add site-specific threats where the catalogue does not cover the situation."
      ],
      "image": "/insights/bcp-module5-hazard-screening.png",
      "imageAlt": "RPG Module 5 hazard screening",
      "imageCaption": "Illustrative RPG interface. Sample entries and ratings are demonstration data, not approved risk judgements."
    },
    {
      "heading": "2. Describe the cause, event and consequence",
      "paragraphs": [
        "An entry such as “utility outage” identifies a hazard but does not explain the risk. A better scenario describes the affected activity, credible cause, disruption event and consequences: loss of mains power disables a critical production process and its support systems, interrupts delivery and creates a need for a controlled shutdown.",
        "The analysis records affected processes and dependencies, management-system applicability, likelihood and impact dimensions. This allows a team to consider quality, environmental, occupational health and safety, continuity and information-security concerns in the same scenario without treating them as interchangeable.",
        "Impact dimensions shown in the interface include people, environmental effects, organisational and customer assets, reputation and legal or contractual consequences. Use N/A only where justified. Severe consequences still deserve competent review when likelihood appears low."
      ],
      "image": "/insights/bcp-module5-inherent-risk.png",
      "imageAlt": "RPG Module 5 inherent risk",
      "imageCaption": "Illustrative RPG interface. Sample entries and ratings are demonstration data, not approved risk judgements."
    },
    {
      "heading": "3. Make the consequences visible across functions",
      "paragraphs": [
        "A continuity discussion can miss exposure when every department looks only at its own loss. During the hypothetical outage, Operations considers lost production; IT considers system availability; the environmental team checks containment, emissions and waste controls; customer-facing teams assess delivery promises.",
        "Module 5 gives these concerns a common assessment record. It supports integrated discussion relevant to ISO 9001 and ISO 14001 alongside the business-continuity assessment. Selecting a standard in the interface is a relevance marker, not evidence that every requirement has been met."
      ],
      "image": "/insights/bcp-module5-impact-dimensions.png",
      "imageAlt": "RPG Module 5 impact dimensions",
      "imageCaption": "Illustrative RPG interface. Sample entries and ratings are demonstration data, not approved risk judgements."
    },
    {
      "heading": "4. Separate working controls from intended controls",
      "paragraphs": [
        "A generator on an action list is not the same as a maintained generator with capacity, fuel, tested changeover and trained operators. The controls stage distinguishes measures already implemented from those still to implement, and records causes, contributing factors and early warning indicators.",
        "The displayed RPG method adjusts residual likelihood using the assessed effectiveness of current controls. It does not erase the inherent consequence. Claims of strong control effectiveness need evidence such as inspection, maintenance, testing, exercises and demonstrated availability during the scenario.",
        "Assign the risk owner from an active Company User with business-continuity access. Ownership should connect the assessment to a person able to coordinate evidence, decisions and follow-up. The previous Roles and Responsibilities module makes that accountability more meaningful."
      ],
      "image": "/insights/bcp-module5-controls.png",
      "imageAlt": "RPG Module 5 controls",
      "imageCaption": "Illustrative RPG interface. Sample entries and ratings are demonstration data, not approved risk judgements."
    },
    {
      "heading": "5. Turn a score into a treatment decision",
      "paragraphs": [
        "The next stage records treatment, target dates, target likelihood and impact, action references, review frequency and the rationale for tolerability. A target risk position is an intended result; it is not proof that actions are complete or effective.",
        "The organisation sets its appetite threshold and approval authority. A 5×5 matrix is the RPG workflow shown here, not a scoring formula mandated by ISO. A value below a threshold should never substitute for legal obligations, credible severe consequences or an authorised decision.",
        "The treatment screen also asks whether to include the scenario in the Incident Management Plan. The interface states that included scenarios flow into Module 9, and that exclusions of High and Critical scenarios should be justified. This is an important handover from assessment to response preparation."
      ],
      "image": "/insights/bcp-module5-treatment-approval.png",
      "imageAlt": "RPG Module 5 treatment approval",
      "imageCaption": "Illustrative RPG interface. Sample entries and ratings are demonstration data, not approved risk judgements."
    },
    {
      "heading": "6. Use the register to direct management attention",
      "paragraphs": [
        "The risk register and interactive heat map let reviewers inspect inherent, residual and target positions, then filter the register by a selected cell. The value is the conversation behind the position: what could happen, what evidence supports the controls, what remains open and when the judgement must be reviewed.",
        "The supplied screenshots contain demonstration entries and scores. They illustrate the interface and are not recommended ratings, verified controls or evidence of risk reduction.",
        "For the outage example, review triggers might include changes to critical equipment, failed generator tests, a new supplier dependency, a near miss or an exercise that reveals a recovery weakness. A controlled assessment needs to change when its assumptions change."
      ],
      "image": "/insights/bcp-module5-risk-register.png",
      "imageAlt": "RPG Module 5 risk register",
      "imageCaption": "Illustrative RPG interface. Sample entries and ratings are demonstration data, not approved risk judgements."
    },
    {
      "heading": "From hazard assessment to recovery priorities",
      "paragraphs": [
        "Module 5 supports the disruption-risk side of the business-continuity programme. Business impact analysis has a complementary role: understanding how disruption impacts develop over time and establishing continuity priorities and requirements. A risk score alone cannot determine recovery objectives.",
        "ISO 22301 provides a business-continuity management-system framework. The module is presented in RPG’s interface against Clause 8.2.3; it supports structured assessment and retained decisions, while organisations remain responsible for competent application and evidence. ISO reference: https://www.iso.org/standard/75106.html"
      ]
    }
  ],
  "managementTest": "If this site lost power tomorrow, which controls could you demonstrate would work?",
  "managementAnswer": "Name the affected activities, the risk owner, the controls with current evidence, the remaining exposure, the action owners and the trigger for escalation. A green cell is useful only when the decision behind it can withstand that challenge.",
  "productCopy": "RPG Excellence helps teams bring disruption scenarios, cross-functional impacts, existing and planned controls, Company User ownership, treatment rationale and review into a consistent workflow. For organisations managing several sites or separate departmental spreadsheets, that structure can make gaps and follow-up easier to see. Explore the Business Continuity programme or request a demonstration using one of your own critical scenarios.",
  "productHref": "/en/business-continuity",
  "productLabel": "Explore RPG Business Continuity"
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <div className="rpgHazardInsight"><HsInsightArticle locale={locale} article={{...article, productHref:`/${locale}/business-continuity`}} /><style>{`.rpgHazardInsight .hsArticle.wideArticle>article,.rpgHazardInsight .hsArticle.wideArticle .articleBody{max-width:1280px;width:100%;min-width:0;box-sizing:border-box}.rpgHazardInsight .hsArticle .hero{height:auto;aspect-ratio:auto;object-fit:contain}.rpgHazardInsight .hsArticle .implementationRoadmap{margin:38px 0!important}.rpgHazardInsight .hsArticle.fullWidthFigures .articleFigure{width:100%;margin:32px 0 8px;transform:none}.rpgHazardInsight .hsArticle p,.rpgHazardInsight .hsArticle li{overflow-wrap:anywhere}.rpgHazardInsight .hsArticle .cta{max-width:100%;box-sizing:border-box}@media(max-width:600px){.rpgHazardInsight .hsArticle h1{font-size:clamp(32px,9vw,48px)}.rpgHazardInsight .hsArticle .decision{padding:22px}.rpgHazardInsight .hsArticle .implementationRoadmap{grid-template-columns:1fr}}`}</style></div>;
}
