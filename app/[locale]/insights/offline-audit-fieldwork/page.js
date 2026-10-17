import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "When the Audit Is Almost Finished—and the Connection Drops",
  description:
    "How RPG Excellence mobile fieldwork drafts help auditors protect work in progress when site connectivity is interrupted.",
  alternates: {
    canonical: "/en/insights/offline-audit-fieldwork",
  },
  openGraph: {
    title: "When the Audit Is Almost Finished—and the Connection Drops",
    description:
      "A practical RPG Excellence update on protecting audit fieldwork during temporary loss of connectivity.",
    images: ["/insights/offline-audit-fieldwork-1280.png"],
  },
};

const article = {
  issue: "029",
  slug: "offline-audit-fieldwork",
  title: "When the Audit Is Almost Finished—and the Connection Drops",
  description: metadata.description,
  standfirst:
    "Few things are more frustrating than completing detailed fieldwork notes and then losing them because the connection failed before the information could be submitted. RPG Excellence now helps protect work in progress through controlled mobile fieldwork drafts.",
  image: "/insights/offline-audit-fieldwork-1280.png",
  imageAlt:
    "RPG Excellence auditor using a tablet during fieldwork with protected offline audit notes",
  datePublished: "2026-10-17",
  dateModified: "2026-10-17",
  wide: true,
  opening:
    "Audits do not always happen behind a desk with reliable internet access. Fieldwork takes place in factories, warehouses, laboratories, construction areas and remote operational sites. Connectivity may be weak, restricted or disappear without warning. An auditor should not have to conduct the work again simply because the connection dropped at the wrong moment.",
  sections: [
    {
      heading: "Protecting work in progress",
      paragraphs: [
        "Within the Internal Audit Fieldwork stage, an auditor can save current form entries as a temporary draft on the device being used. The draft provides a practical recovery point before the auditor moves between locations or enters an area with unreliable connectivity.",
        "If entries are changed or interrupted, the saved version can be restored for review. The workspace also shows whether the device is online or offline, helping the auditor understand when controlled server submission is available."
      ],
      points: [
        "Save fieldwork entries as a temporary device draft.",
        "Restore the saved version after an interruption or unwanted change.",
        "See whether the working device is online or offline.",
        "Clear the temporary draft when it is no longer required."
      ]
    },
    {
      heading: "A draft is not the controlled audit record",
      paragraphs: [
        "The device draft is deliberately separated from the approved audit trail. It remains temporary until the auditor reconnects and submits the relevant fieldwork forms through RPG Excellence.",
        "Passwords, authentication information and uploaded file evidence are excluded from the local draft. This protects the distinction between temporary working notes and controlled evidence retained by the organisation."
      ]
    },
    {
      heading: "Designed for real fieldwork conditions",
      paragraphs: [
        "The first release supports an audit page that has already been opened while online. If connectivity is temporarily lost, the auditor can retain the information entered in that session and restore it before controlled submission.",
        "This is not yet a fully installable offline application. Page reloads, offline sign-in and secure background synchronisation of file evidence require additional controls and remain part of the development roadmap."
      ]
    },
    {
      heading: "From recovered notes to accountable action",
      paragraphs: [
        "Once connectivity returns, the auditor submits the relevant records through the established Internal Audit workflow. Evidence and conclusions remain traceable to the applicable criterion, assigned auditor and audit record.",
        "Verified nonconformities and improvement findings can then progress into assigned actions and, where required, the CAPA-8D investigation and effectiveness-verification process."
      ]
    },
    {
      heading: "A small feature that removes a significant frustration",
      paragraphs: [
        "Offline resilience is not only a technical convenience. It supports audit efficiency, protects professional effort and reduces the risk of rushed reconstruction after information is lost.",
        "RPG Excellence is being developed around the way assurance work actually happens—not only when working conditions are ideal."
      ]
    }
  ],
  managementTest:
    "If an auditor loses connectivity near the end of fieldwork, can the organisation recover the work without confusing temporary notes with controlled evidence?",
  managementAnswer:
    "A resilient process should protect work in progress, make its temporary status clear and require deliberate submission before it becomes part of the controlled audit record.",
  productCopy:
    "RPG Excellence Internal Audit provides structured audit planning, evidence-led fieldwork, controlled findings, accountable actions and temporary mobile fieldwork drafts for interruptions in connectivity.",
  productHref: "/portal/internal-audits",
  productLabel: "Explore Internal Audit",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <HsInsightArticle locale={locale} article={article} />;
}
