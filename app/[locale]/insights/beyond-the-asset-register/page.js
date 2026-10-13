import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Beyond the Asset Register: Ownership, Maintenance and Evidence",
  description: "How connected asset ownership, controlled information, PPM, supplier delivery, maintenance evidence and Management of Change create practical operational assurance.",
  alternates: { canonical: "/en/insights/beyond-the-asset-register" },
  openGraph: {
    title: "Beyond the Asset Register",
    description: "Ownership. Maintenance. Evidence. A practical RPG Excellence guide to connected asset assurance.",
    images: ["/insights/beyond-the-asset-register.png"],
  },
};

const article = {
  issue: "027",
  slug: "beyond-the-asset-register",
  title: "Beyond the Asset Register: Ownership, Maintenance and Evidence",
  description: metadata.description,
  standfirst: "An asset list tells you what exists. Operational assurance shows who is accountable, which instructions apply, when maintenance is due, who performs it and where the evidence is retained.",
  image: "/insights/beyond-the-asset-register.png",
  imageAlt: "RPG Excellence Beyond the Asset Register cover showing industrial equipment and a digital maintenance dashboard",
  datePublished: "2026-10-13",
  dateModified: "2026-10-13",
  opening: "Many organisations hold an asset register, a maintenance schedule, supplier records and operating instructions in separate places. Each record may look complete on its own, yet the connections needed for a confident operational decision are missing. That weakness becomes visible when equipment fails, an auditor requests traceability or a site team must decide whether an asset remains safe and available for use.",
  sections: [
    {
      heading: "An asset list is not an asset management system",
      paragraphs: [
        "A useful register must distinguish the correct asset, its current location, operational status and consequence-based criticality. More importantly, it must connect those facts to an accountable person who can act when maintenance is due, evidence is incomplete or the operating condition changes.",
        "Without that accountability, an overdue date becomes a reporting problem rather than a controlled operational decision."
      ],
      points: [
        "Assign every controlled asset to an active Company User.",
        "Keep the unique asset reference stable throughout its lifecycle.",
        "Make out-of-service and retired status visible without erasing history.",
        "Use criticality to determine the level of maintenance and assurance required."
      ]
    },
    {
      heading: "Keep internal accountability when maintenance is outsourced",
      paragraphs: [
        "An approved supplier may perform the service, inspection, calibration or statutory examination, but the organisation still needs an internal owner. That person coordinates access, confirms the correct scope, reviews defects and evidence, and ensures the asset is not returned to service prematurely.",
        "Separating the delivery route from internal accountability makes the control clearer: Internal Facilities or Operations may perform the work, or an approved supplier may deliver it, but a named Company User remains responsible for the result."
      ]
    },
    {
      heading: "Put current instructions beside the asset",
      paragraphs: [
        "Maintenance quality depends on access to the correct information. Work instructions, operating manuals, safe systems of work, inspection standards and manufacturer requirements should be linked from the asset record while remaining controlled through the Documented Information module.",
        "A searchable link is more dependable than repeating uncontrolled text or relying on an individual to know where the latest revision is stored."
      ],
      points: [
        "Search by document number, title or type.",
        "Link only current approved information.",
        "Retain revision and approval control in the source document module.",
        "Remove obsolete or incorrectly linked information promptly."
      ]
    },
    {
      heading: "Make PPM evidence easy to inspect",
      paragraphs: [
        "A PPM indicator should open into the evidence behind it. The detailed view needs to show the maintenance route, internal owner, supplier where applicable, scheduled and completed dates, work scope, status, evidence reference and the retained report or certificate.",
        "This keeps the asset card concise for routine use while allowing leaders, Facilities teams and auditors to inspect the full maintenance trail when needed."
      ]
    },
    {
      heading: "Illustrative case study: a critical extraction unit",
      paragraphs: [
        "A multi-site engineering business recorded an extraction unit as active, but its service report sat in an individual mailbox, the operating instruction had been revised and the supplier responsible for maintenance was not visible to the site team.",
        "The control was strengthened by assigning an internal Facilities owner, linking the approved supplier, connecting the current operating and maintenance instructions, uploading the service report to the PPM record and screening a proposed safeguard modification through Management of Change. The result was not simply a better list; it was a traceable decision path from ownership to evidence."
      ]
    },
    {
      heading: "Connect asset changes to Management of Change",
      paragraphs: [
        "Changes to location, duty, capacity, safeguarding, energy source, software, control logic, maintenance strategy or ownership can invalidate existing assumptions. Editing the asset register records the new information, but it does not approve the change.",
        "A linked Management of Change record should screen the proposal, establish actions and approvals, verify readiness and retain the evidence supporting implementation."
      ]
    }
  ],
  managementTest: "Can a competent reviewer move from the asset to its owner, current instructions, maintenance status, supplier and objective evidence without searching disconnected systems?",
  managementAnswer: "If any part of that trail depends on personal knowledge, an uncontrolled copy or an inaccessible mailbox, the asset may be registered but it is not yet fully controlled.",
  productCopy: "RPG Excellence Asset Management connects Company Users, Business Profile locations, approved suppliers, controlled documented information, PPM schedules, maintenance papers, Permit to Work and Management of Change within one accountable asset record.",
  productHref: "/portal/company/assets",
  productLabel: "Explore Asset Management",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <HsInsightArticle locale={locale} article={article} />;
}
