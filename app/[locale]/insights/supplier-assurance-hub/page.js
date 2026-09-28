import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Supplier Assurance from Approval to Evidence-Based Review",
  description: "How RPG Excellence connects supplier risk, due diligence, approval, performance, audits, NC/CAPA and controlled quarterly business reviews.",
  alternates: { canonical: "/en/insights/supplier-assurance-hub" },
  openGraph: {
    title: "Supplier Assurance from Approval to Evidence-Based Review",
    description: "One connected supplier assurance position across risk, approval, performance, issues, audits and quarterly business reviews.",
    images: ["/insights/supplier-assurance-management-board.png"],
  },
};

const article = {
  issue: "019",
  slug: "supplier-assurance-hub",
  wide: true,
  title: "Supplier Assurance from Approval to Evidence-Based Review",
  description: metadata.description,
  datePublished: "2026-09-28",
  dateModified: "2026-09-28",
  standfirst: "Supplier approval is a decision, not the end of the process. The expanded RPG Excellence Supplier Assurance Hub connects qualification, risk, approval, performance, audits, nonconformities, actions and quarterly business reviews in one controlled workspace.",
  image: "/insights/supplier-assurance-management-board.png",
  imageAlt: "RPG Excellence supplier assurance management board showing approval risk nonconformity position and review dates",
  opening: "Organisations need to know whether supplier performance remains acceptable, whether risks have changed, whether issues are being controlled and whether continued approval is supported by current evidence. When those records sit in separate spreadsheets and systems, the current assurance position becomes difficult to see and even harder to defend.",
  sections: [
    {
      heading: "One supplier and one assurance position",
      paragraphs: [
        "The Supplier Assurance Hub brings qualification, due diligence, evidence, approval, performance and monitoring together. Its management board provides a portfolio view of approval, risk, nonconformity position and next review dates, while each supplier record presents a single assurance score, applicable controls, blockers and monitoring status.",
        "Decision-makers can move from the portfolio view into the controlled supplier record without losing the context behind the result.",
      ],
      image: "/insights/supplier-assurance-position.png",
      imageAlt: "Individual supplier assurance position showing risk score applicable controls approval blockers and live monitoring indicators",
      imageCaption: "A single supplier assurance position connects risk, evidence, approval and monitoring.",
    },
    {
      heading: "Risk-based approval across applicable requirements",
      paragraphs: [
        "The assurance engine adapts due diligence and monitoring to the supplier’s scope and criticality. It can support controls arising from ISO 9001, AS9100, ISO 14001, ISO 45001, ISO IEC 17024 and ISO IEC 17025 where those requirements are applicable to the organisation and purchased product or service.",
        "A routine service provider and a critical aerospace or laboratory supplier do not create the same exposure. The hub makes that distinction visible and supports proportionate approval, evidence and review decisions.",
      ],
      image: "/insights/supplier-qbr-review-details.png",
      imageAlt: "Controlled supplier quarterly business review with company lead supplier representative approver and decision rationale",
      imageCaption: "The controlled QBR links company users, supplier contacts and the authorised approval decision.",
    },
    {
      heading: "Quarterly business reviews based on evidence",
      paragraphs: [
        "The controlled QBR workspace turns a supplier meeting into an auditable decision process. The buyer or internal QBR lead is selected from the company user list, while the supplier representative is selected from the supplier contact register.",
        "A structured scorecard captures on-time delivery, product or service conformity, quality escapes, corrective-action closure and response to issues. Prior, target and actual values are considered alongside trend and interpretation, allowing the reviewer to explain unavailable data, confidence, commercial impact and required action.",
      ],
      image: "/insights/supplier-qbr-performance-scorecard.png",
      imageAlt: "Supplier QBR performance scorecard covering delivery conformity quality escapes corrective action and issue response",
      imageCaption: "Performance is reviewed against target, prior result, actual result and trend.",
    },
    {
      heading: "Quality risk continuity and commercial performance",
      paragraphs: [
        "A useful supplier review must extend beyond delivery percentage. The QBR evaluates audit outcomes, nonconformities and CAPA, certification and competence, traceability, change control, special processes, capacity, financial or single-source exposure, disruption controls, regulatory matters, HSE, sustainability, demand and value.",
        "Each line records the evidence reviewed, the conclusion and whether requirements are met, partially met or not met. This creates a consistent assessment while preserving the professional judgement behind the result.",
      ],
      image: "/insights/supplier-qbr-risk-continuity-commercial.png",
      imageAlt: "Supplier review covering risk business continuity sustainability and commercial performance",
      imageCaption: "The review extends into resilience, continuity, sustainability and commercial exposure.",
    },
    {
      heading: "Live links to issues actions and audit trail",
      paragraphs: [
        "Supplier issues remain connected to the NC and CAPA workflow. The QBR displays the live issue reference, owner, date raised and controlled status from the underlying record, reducing duplicate entry and conflicting status information.",
        "QBR actions are separately controlled with an action owner, independent reviewer, due date, closure evidence and effectiveness conclusion. Open actions remain visible in QBR history until they are reviewed and closed.",
      ],
      image: "/insights/supplier-qbr-actions-monitoring.png",
      imageAlt: "Supplier QBR showing live NC CAPA status controlled actions owners reviewers due dates and monitoring record",
      imageCaption: "Live NC and CAPA data sits alongside controlled QBR actions and monitoring decisions.",
    },
    {
      heading: "From review to an authorised decision",
      paragraphs: [
        "The final stage records the monitoring level, approval expiry, conditions and next QBR date. The next quarterly review is calculated from the current review date and can be adjusted by an authorised user where the evidence supports a different interval.",
        "The result is a traceable supplier decision supported by current performance, risk, issues, audits, actions and evidence. That gives auditors and leadership a clearer explanation of why a supplier remains approved, requires conditions or needs enhanced oversight.",
      ],
      image: "/insights/supplier-approval-monitoring-gaps.png",
      imageAlt: "Supplier approval and monitoring decision showing assurance gap severity owner due date and review recommendation",
      imageCaption: "Assurance gaps remain visible with severity, ownership, due date and linked evidence.",
    },
  ],
  managementTest: "Can your organisation explain why each critical supplier remains approved using current risk, performance, issue and assurance evidence?",
  managementAnswer: "If the answer relies on several disconnected records, the approval decision may be difficult to maintain or defend. A connected supplier assurance position preserves the evidence, ownership, status and rationale behind the decision.",
  productCopy: "The RPG Excellence Supplier Assurance Hub connects supplier profiles, contacts, standards and scope, risk, due diligence, approval, monitoring, audits, NC/CAPA, Code of Conduct records and controlled quarterly business reviews.",
  productHref: "/portal/suppliers",
  productLabel: "Open the Supplier Assurance Hub",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <HsInsightArticle locale={locale} article={article} />;
}
