import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Permit to Work: Authority Within Controlled Limits",
  description: "Why a Permit to Work must connect scope, hazards, isolations, competence, validity, suspension and controlled close-out.",
  alternates: { canonical: "/en/insights/permit-to-work-control" },
};

const article = {
  issue: "015", slug: "permit-to-work-control", title: "Permit to Work: Authority Within Controlled Limits", description: metadata.description,
  standfirst: "A permit does not make hazardous work safe. It provides time-limited authority to work only after the defined precautions, interfaces and responsibilities have been checked.",
  image: "/insights/permit-to-work-control.png",
  imageAlt: "Permit issuer and work leader verifying isolations and work controls before industrial maintenance",
  opening: "Permit-to-work systems are used where the consequence of misunderstanding, uncontrolled energy or changing conditions can be serious. Their value comes from disciplined decisions at the worksite—not from producing another document for the file.",
  sections: [
    { heading: "Define the work boundary", paragraphs: ["The permit must describe the exact task, location, plant and time window. Vague scopes create room for assumptions and work beyond the controls that were assessed."], points: ["Identify the equipment, area and task limits.", "Reference the approved risk assessment and method.", "Name the issuer and the person accepting control of the work.", "Set a clear start, expiry and hand-back point."] },
    { heading: "Verify precautions before issue", paragraphs: ["Precautions should be physically checked where relevant. Isolation references, atmospheric conditions, access controls, emergency arrangements and simultaneous operations cannot be confirmed reliably from a desk."], points: ["Confirm isolations and stored-energy control.", "Test the atmosphere and define ongoing monitoring where required.", "Check access, rescue, fire watch and adjacent activities.", "Ensure the work party understands the scope and stop conditions."] },
    { heading: "Treat change as a stop signal", paragraphs: ["A permit is valid only while the conditions on which it was issued remain true. A shift change, altered scope, failed control, alarm, weather change or conflicting activity may require suspension and reassessment."], points: ["Make stop-work authority explicit.", "Record why a permit was suspended.", "Require controlled reissue after conditions are restored.", "Never extend validity by simply changing the time."] },
    { heading: "Close the control loop", paragraphs: ["Close-out confirms that work has ended, people and tools are accounted for, temporary controls are addressed and the plant or area is ready for its next state. Signing off without checking the worksite transfers uncertainty to the next person."], points: ["Inspect the area before hand-back.", "Confirm guards, covers and safety systems are restored.", "Record defects, deviations and incomplete work.", "End the authority to work explicitly."] },
  ],
  managementTest: "Would the permit still be valid if the task, people or conditions changed?",
  managementAnswer: "No. The permit authorises only the defined work under the verified conditions and within the stated validity period. Material change requires stop, review and controlled reissue.",
  productCopy: "The RPG Excellence Permit to Work workflow connects the approved assessment, hazards, verified precautions, responsible people, validity limits, issue, suspension and close-out in a traceable operational record.",
  productHref: "/portal/health-safety/permits", productLabel: "Explore Permit to Work",
};

export default async function Page({ params }) { const { locale } = await params; if (!locales.includes(locale)) notFound(); return <HsInsightArticle locale={locale} article={article} />; }
