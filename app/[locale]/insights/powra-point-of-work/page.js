import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "POWRA: The Last Risk Decision Before Work Starts",
  description: "How a point-of-work risk assessment tests real conditions, triggers stop-work decisions and captures end-of-job learning.",
  alternates: { canonical: "/en/insights/powra-point-of-work" },
};

const article = {
  issue: "014", slug: "powra-point-of-work", title: "POWRA: The Last Risk Decision Before Work Starts", description: metadata.description,
  standfirst: "The task risk assessment describes how work should be controlled. A POWRA asks whether those controls still make sense at the exact place and time the job is about to begin.",
  image: "/insights/powra-point-of-work.png",
  imageAlt: "Engineering team identifying a changed condition during a point-of-work risk assessment",
  opening: "Workplaces do not remain static. Access routes become obstructed, nearby activities begin, equipment conditions change and the people doing the work may be different from those anticipated. A short point-of-work assessment creates a final deliberate pause before exposure begins.",
  sections: [
    { heading: "Use POWRA to test reality", paragraphs: ["A POWRA does not replace the approved risk assessment. It checks the live worksite against it. The team should understand the task, recognise the important hazards and confirm that the planned precautions are present and usable."], points: ["Is the task and location exactly as expected?", "Are the correct people, tools and instructions available?", "Are isolations, access and environmental conditions acceptable?", "Has another activity created a new interface or exposure?"] },
    { heading: "Make the decision explicit", paragraphs: ["The outcome should be more meaningful than a completed checklist. The person doing the work needs a clear decision: safe to start, supervisor review required or stop work. Any concern must lead to action before the task begins."], points: ["Safe to start only when required controls are confirmed.", "Escalate uncertainty rather than guessing.", "Stop when a critical control is missing or conditions are unsafe.", "Record the reason and additional precautions."] },
    { heading: "Keep it proportionate", paragraphs: ["A useful POWRA is focused enough to complete at the point of work and strong enough to change the decision. Excessive questions encourage automatic answers; vague questions fail to expose what matters. Checks should reflect the type of work and its credible hazards."], points: ["Use plain questions that can be verified onsite.", "Focus on critical controls and changed conditions.", "Allow hazards and precautions to be added immediately.", "Avoid turning the process into a memory test."] },
    { heading: "Learn when the job ends", paragraphs: ["The end-of-job review is often overlooked. It can reveal changed conditions, new hazards, ineffective controls, incidents or near misses. Capturing that learning provides evidence for improving the underlying risk assessment, permit or method."], points: ["Confirm whether conditions changed during the task.", "Record new hazards or control weaknesses.", "Escalate incidents and near misses through the proper process.", "Feed useful learning back into future planning."] },
  ],
  managementTest: "Can a worker stop the job without having to defend the decision first?",
  managementAnswer: "A credible POWRA depends on real stop-work authority. If production pressure makes escalation unsafe or difficult, the form may exist while the control does not.",
  productCopy: "The RPG Excellence POWRA workflow supports pre-start checks, live hazard and precaution recording, safe-to-start, supervisor-review or stop-work decisions, and an end-of-job learning record linked to controlled assessments.",
  productHref: "/portal/health-safety/powra", productLabel: "Explore POWRA",
};

export default async function Page({ params }) { const { locale } = await params; if (!locales.includes(locale)) notFound(); return <HsInsightArticle locale={locale} article={article} />; }
