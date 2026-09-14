import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Management of Change: Approval Is Not the Finish Line",
  description: "How controlled MOC connects screening, risk review, approvals, PSSR, implementation evidence and post-change verification.",
  alternates: { canonical: "/en/insights/management-of-change-assurance" },
};

const article = {
  issue: "016", slug: "management-of-change-assurance",
  title: "Management of Change: Approval Is Not the Finish Line",
  description: metadata.description,
  standfirst: "A change is not controlled because a form was approved. It is controlled when risks are understood, readiness is demonstrated and the implemented change is verified as effective.",
  image: "/insights/management-of-change-assurance.png",
  imageAlt: "Cross-functional engineering team reviewing an industrial equipment change before implementation",
  opening: "Organisations change equipment, materials, software, layouts, responsibilities, contractors and operating parameters every day. Most changes are introduced to improve performance. The risk appears when the decision moves faster than the controls needed to make it safe, compliant and sustainable.",
  sections: [
    { heading: "Start with screening, not paperwork", paragraphs: ["The first decision is whether the proposal is genuinely like-for-like or whether it changes an assumption on which existing controls depend. A useful screening step considers people, process, plant, substances, environment, competence, documentation, emergency arrangements and regulatory permissions."], points: ["Define exactly what is changing and why.", "Identify affected operations, equipment and people.", "Select a proportionate pathway based on credible impact.", "Escalate specialist review where the change crosses technical or legal boundaries."] },
    { heading: "Connect risk review to implementation", paragraphs: ["An MOC risk review must influence the implementation plan. If the assessment identifies new safeguards, revised procedures, training or monitoring, those requirements need owners, dates and evidence. Treating the risk review as a separate attachment allows important controls to disappear between approval and start-up."], points: ["Link the controlled risk assessment or hazard study.", "Assign actions to named accountable owners.", "Define objective evidence required before completion.", "Prevent implementation while mandatory readiness checks remain open."] },
    { heading: "Use the PSSR as a real gate", paragraphs: ["Where plant, equipment, process chemistry, safety systems or operating limits change, a pre-startup safety review should confirm that the physical installation and supporting controls match the approved design. It is a readiness decision, not a retrospective signature."], points: ["Safeguards and isolations are installed and tested.", "Operating, maintenance and emergency instructions are current.", "Affected people are trained and briefed.", "Outstanding actions have been resolved or formally controlled."] },
    { heading: "Verify what actually changed", paragraphs: ["Completion evidence proves that work was carried out. Effectiveness verification asks a different question: did the change achieve its intended outcome without introducing uncontrolled risk? That judgement should be recorded after sufficient operational evidence exists and, where practicable, reviewed independently."], points: ["Compare the implemented condition with the approved scope.", "Review early performance, deviations and unintended consequences.", "Reject weak evidence and return actions when necessary.", "Capture lessons before formally closing the MOC."] },
  ],
  managementTest: "Could another competent person see why this change was approved—and verify that it worked?",
  managementAnswer: "If the reasoning, ownership, readiness evidence and post-change conclusion are not traceable, the change may be complete operationally but it is not yet controlled.",
  productCopy: "The RPG Excellence MOC workflow connects dynamic screening, HSE gate review, risk assessment, functional approvals, action ownership, PSSR, implementation evidence and post-implementation verification in one controlled record.",
  productHref: "/portal/health-safety/moc", productLabel: "Explore Management of Change",
};

export default async function Page({ params }) { const { locale } = await params; if (!locales.includes(locale)) notFound(); return <HsInsightArticle locale={locale} article={article} />; }
