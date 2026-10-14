import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Enterprise Integration: Connected Assurance Without Losing Control",
  description:
    "How governed API access connects audits, findings, CAPA-8D, assets, suppliers and Company Users while preserving organisational boundaries, least privilege and traceability.",
  alternates: {
    canonical: "/en/insights/enterprise-integration-controlled-access",
  },
  openGraph: {
    title: "Enterprise Integration: Connected Assurance Without Losing Control",
    description:
      "A practical RPG Excellence guide to connecting assurance data through controlled, organisation-scoped API access.",
    images: ["/insights/enterprise-integration-1280.png"],
  },
};

const article = {
  issue: "028",
  slug: "enterprise-integration-controlled-access",
  title: "Enterprise Integration: Connected Assurance Without Losing Control",
  description: metadata.description,
  standfirst:
    "Enterprise integration should make assurance information easier to use without weakening the controls that make it trustworthy. The objective is not unrestricted access. It is governed access to the right records, for an approved purpose, within a defined organisational boundary.",
  image: "/insights/enterprise-integration-1280.png",
  imageAlt:
    "RPG Excellence Enterprise Integration cover showing a controlled digital network connecting assurance information",
  datePublished: "2026-10-14",
  dateModified: "2026-10-14",
  opening:
    "Assurance data often sits across audit programmes, findings registers, corrective-action workflows, asset records, supplier controls and user directories. Leaders then depend on manual exports or disconnected reports to understand what requires attention. A controlled API changes that relationship: approved systems can read current information directly, while RPG Excellence continues to govern the source record, access boundary and audit trail.",
  sections: [
    {
      heading: "Integration should extend control, not bypass it",
      paragraphs: [
        "A technically successful connection is not automatically a controlled connection. Every integration needs a defined business purpose, an accountable owner, an approved environment and only the permissions needed for that use.",
        "RPG Excellence therefore separates API access from normal portal access. Granting an integration permission does not change a person's application role, subscription entitlement or administrative authority."
      ],
      points: [
        "Keep test and live credentials separate.",
        "Issue credentials for a named purpose and organisation.",
        "Apply least-privilege permissions by information domain.",
        "Review, expire and revoke access when the purpose changes."
      ]
    },
    {
      heading: "One credential does not mean access to everything",
      paragraphs: [
        "The RPG Excellence API uses granular read permissions for findings, internal audits, CAPA-8D cases, assets, suppliers and Company Users. An integration receives only the scopes selected for it and can access records belonging to its authorised organisation.",
        "This makes the boundary explainable to management, auditors and customers: which system can see which information, why it needs that information and how access can be withdrawn."
      ],
      points: [
        "findings:read for controlled finding summaries",
        "audits:read for internal-audit programme and status information",
        "capa:read for CAPA-8D case status and severity",
        "assets:read for asset criticality and PPM status",
        "suppliers:read for approved-supplier and review information",
        "people:read for the controlled Company User directory"
      ]
    },
    {
      heading: "What can now be connected",
      paragraphs: [
        "The first API release is deliberately read only. It supports controlled reporting and analysis without allowing an external system to change the underlying assurance record.",
        "Typical uses include an executive dashboard showing overdue actions, a maintenance view identifying critical assets with overdue PPM, a supplier review report and a consolidated position across findings, audits and CAPA-8D."
      ]
    },
    {
      heading: "A practical management example",
      paragraphs: [
        "An organisation wants its business-intelligence platform to present a weekly assurance overview. The integration is created in the test environment, assigned read access to findings, audits, CAPA-8D and assets, and validated using filtered and paginated requests.",
        "Once the output and organisational boundary are confirmed, a separate live credential can be approved. Leaders receive a current view while the authoritative records, workflow decisions and evidence remain controlled in RPG Excellence."
      ]
    },
    {
      heading: "What the API deliberately does not expose",
      paragraphs: [
        "Controlled integration also requires clear exclusions. The interface is not intended to expose passwords, authentication tokens, invitation-security metadata, unrestricted private evidence, records from another organisation or administrative functions outside the approved scope.",
        "The full API secret is displayed only when created. RPG Excellence retains a protected digest for verification, records integration activity and allows the credential to be revoked without changing the user's portal permissions."
      ]
    },
    {
      heading: "Start read only and prove the boundary",
      paragraphs: [
        "A sensible implementation begins with the health endpoint, then one information domain, narrow filters and a test credential. The organisation should verify the response structure, pagination, permitted records, logging and revocation before expanding the scope.",
        "Write operations should only follow a separate control design covering validation, approval, conflict handling, evidence integrity and rollback. They are not part of the current read-only release."
      ]
    },
    {
      heading: "The next step: controlled notification",
      paragraphs: [
        "A future phase may add governed webhooks so approved systems can be notified when significant assurance events occur. That capability must include signed events, retry controls, delivery history and carefully defined payloads.",
        "Until then, consumers should use proportionate scheduled requests and retain their own evidence of how imported information is used."
      ]
    }
  ],
  managementTest:
    "Can the organisation explain which system receives which assurance records, under whose authority, through which credential, and how that access is reviewed and withdrawn?",
  managementAnswer:
    "If access depends on a shared credential with broad permissions, crosses organisational boundaries or cannot be traced to an approved purpose, the integration may be connected but it is not adequately controlled.",
  productCopy:
    "RPG Excellence Enterprise Integration provides organisation-scoped, read-only API access to findings, internal audits, CAPA-8D, assets, suppliers and Company Users, supported by granular permissions, test and live environments, expiry, activity records and immediate revocation.",
  productHref: "/portal/company/integrations",
  productLabel: "Explore Enterprise Integration",
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <HsInsightArticle locale={locale} article={article} />;
}
