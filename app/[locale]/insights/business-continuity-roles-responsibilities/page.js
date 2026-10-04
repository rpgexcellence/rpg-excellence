import { notFound } from "next/navigation";
import HsInsightArticle from "../../../../components/HsInsightArticle";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  "title": "When Disruption Hits, Who Has the Authority to Act? | RPG Excellence",
  "description": "RPG Excellence Business Continuity Module 4 connects process ownership, responsibilities, authority, deputies and a controlled RACI to support decisions during disruption.",
  "alternates": {
    "canonical": "/en/insights/business-continuity-roles-responsibilities"
  },
  "openGraph": {
    "title": "When Disruption Hits, Who Has the Authority to Act?",
    "description": "RPG Excellence Business Continuity Module 4 connects process ownership, responsibilities, authority, deputies and a controlled RACI to support decisions during disruption.",
    "images": [
      "/insights/bcp-module-4-overview.png"
    ]
  }
};

const article = {
  "issue": "022",
  "slug": "business-continuity-roles-responsibilities",
  "wide": true,
  "fullWidthFigures": true,
  "datePublished": "2026-10-04",
  "dateModified": "2026-10-04",
  "title": "When Disruption Hits, Who Has the Authority to Act?",
  "description": "RPG Excellence Business Continuity Module 4 connects process ownership, responsibilities, authority, deputies and a controlled RACI to support decisions during disruption.",
  "standfirst": "Business Continuity Module 4 turns site profiles and organisational context into accountable process ownership, clear responsibilities and controlled decision authority.",
  "image": "/insights/bcp-module-4-overview.png",
  "imageAlt": "RPG Excellence Roles, Responsibilities and Authorities module overview",
  "opening": "A recovery plan can identify the right action and still fail if nobody knows who may authorise it. Roles, responsibilities and authorities determine whether that plan can become a timely, controlled response.",
  "roadmap": [
    [
      "01",
      "Connect",
      "Link the site profile and context assessment"
    ],
    [
      "02",
      "Own",
      "Assign core process responsibilities"
    ],
    [
      "03",
      "Protect",
      "Allocate ownership of critical activities"
    ],
    [
      "04",
      "Support",
      "Cover the services recovery depends on"
    ],
    [
      "05",
      "Authorise",
      "Define BCMS responsibilities and decision rights"
    ],
    [
      "06",
      "Control",
      "Review the responsibility and authority record"
    ]
  ],
  "sections": [
    {
      "heading": "The outage that became a decision bottleneck",
      "paragraphs": [
        "Consider a fictional engineering manufacturer whose critical chemical supplier delivers inconsistent batches. Production is suspended, suspect stock is quarantined and the alternative supplier needs qualification. The recovery plan exists, but the operations director is unavailable.",
        "Purchasing can place an urgent order. Quality can assess product acceptance. Environmental specialists can review the substitution. Yet nobody can demonstrate who may approve exceptional expenditure, authorise the change or decide that the process is ready to restart. Hours pass while colleagues seek permission.",
        "The interruption exposes a governance weakness: people have responsibilities, but their decision authority and escalation arrangements are unclear. The recovery route depends on a person rather than an agreed control."
      ]
    },
    {
      "heading": "Start with the business you actually operate",
      "paragraphs": [
        "Module 4 links the responsibility-assignment record to Module 1 Site Profile and Module 3 Context Assessment. This gives ownership an operational basis: the site boundary, processes and priorities already identified in the continuity programme.",
        "The six-stage workspace covers Record & applicability, Core processes, Critical activities, Support activities, BCMS responsibilities and Controlled record. Users can see their progress and work through the assignment record in a structured sequence."
      ],
      "image": "/insights/bcp-module-4-overview.png",
      "imageAlt": "RPG Excellence Module 4 six-stage Roles, Responsibilities and Authorities workspace",
      "imageCaption": "Module 4 connects source records with six stages of responsibility and authority control."
    },
    {
      "heading": "Assign ownership to processes, not just departments",
      "paragraphs": [
        "An organisation chart shows reporting lines. It does not necessarily establish who owns supplier qualification, continuity training, customer communication or recovery readiness. Those decisions often cross departmental boundaries.",
        "The Core processes stage supports generated assignments and additional processes. Users select the management systems applicable to each process, rather than applying every standard indiscriminately. The example shown selects quality and environmental management for training and awareness.",
        "This allows one operational process to carry the relevant management-system responsibilities without creating separate, conflicting ownership lists. Generated assignments still need review by the people who understand the work."
      ],
      "image": "/insights/bcp-module-4-core-processes.png",
      "imageAlt": "Core processes stage with generate assignments and add process controls",
      "imageCaption": "Process ownership provides the foundation for responsibilities that cross management systems."
    },
    {
      "heading": "Make RACI a decision aid",
      "paragraphs": [
        "RACI distinguishes four forms of involvement: Responsible performs the work; Accountable owns the outcome; Consulted provides input; Informed receives updates. Module 4 presents these assignments through a colour-coded matrix and permits only one Accountable owner for each activity.",
        "For the interrupted manufacturer, qualification of the replacement chemical might be carried out by a technical specialist, owned by the authorised process leader, informed by quality and environmental specialists, and communicated to production and purchasing. The organisation must choose assignments appropriate to its own authority structure.",
        "A RACI entry does not itself grant spending authority, demonstrate competence or approve a restart. It needs to work alongside defined authority limits, operating criteria and escalation routes. The one-owner rule is an RPG workflow control; RACI is an implementation method, not a prescribed ISO template."
      ],
      "image": "/insights/bcp-module-4-raci.png",
      "imageAlt": "Colour-coded Responsible Accountable Consulted Informed assignment matrix and applicable management-system selections",
      "imageCaption": "Colour-coded RACI makes participation visible while distinguishing delivery from accountability."
    },
    {
      "heading": "Include critical and support activities",
      "paragraphs": [
        "Continuity depends on more than the main production process. Transport, IT access, facilities, utilities, purchasing and communication can each constrain recovery. Responsibility should therefore cover critical work and the support activities on which it relies.",
        "Module 4 separates these activities so organisations can assign ownership and select the relevant management systems at activity level. The displayed driving-at-work example illustrates the assignment layout; applicability must be reviewed for the actual task, including occupational health and safety where relevant.",
        "In the outage scenario, transport availability, technical access and customer updates all need owners. Leaving these interfaces unassigned can delay recovery even after replacement stock arrives."
      ],
      "image": "/insights/bcp-module-4-critical-activities.png",
      "imageAlt": "Critical activity responsibility card with applicable systems and RACI assignments",
      "imageCaption": "Critical activities use the same assignment structure; system selections should reflect the actual activity."
    },
    {
      "heading": "Responsibility must come with usable authority",
      "paragraphs": [
        "An accountable person needs to understand what they can decide, which limits apply and when they must escalate. The module supports authority and competence controls alongside primary holders and deputies. Its controlled outputs include responsibility assignments, a BCMS authority register and assignment assurance.",
        "For this fictional manufacturer, the authority review should establish who can approve emergency procurement, who controls technical acceptance, who reviews environmental implications and who authorises restart. Deputies need appropriate authority and competence; adding a name alone does not establish either.",
        "After approval, the organisation should communicate the arrangements and test them through a realistic exercise. Can the deputy act? Can the specialists be reached? Can decisions be made within the recovery window? Completion of a record is the starting point for that verification."
      ]
    },
    {
      "heading": "The commercial return is faster, better-supported decisions",
      "paragraphs": [
        "Clear ownership can reduce time spent searching for permission, duplicating work and reconciling competing instructions. Defined consultation helps bring technical, customer and environmental considerations into the decision before expenditure or restart is authorised.",
        "These are potential benefits, not guaranteed software outcomes. They depend on suitable assignments, current personnel, understood authority limits and exercised arrangements. Measure the difference through decision time, unresolved ownership gaps and exercise performance.",
        "For audit purposes, follow a sample decision from the source process through the assigned owner, authority limit, consultation and resulting record. That is a more useful assurance trail than asking only whether a responsibility matrix exists."
      ]
    },
    {
      "heading": "Where Module 4 fits in the implementation programme",
      "paragraphs": [
        "Module 1 establishes the site and process profile. Module 3 establishes organisational context and interested-party needs. Module 4 turns that foundation into responsibility and authority arrangements. These arrangements support subsequent risk assessment, business impact analysis, strategies and incident response.",
        "The module is positioned against ISO 22301:2019 Clause 5.3. ISO 22301 provides the business continuity management-system framework; the six-stage workflow, colour-coded RACI and generated assignments are RPG implementation features. Using the module does not by itself establish conformity or certification."
      ],
      "points": [
        "Review one critical process and identify its accountable owner.",
        "Confirm who performs the work, provides input and receives updates.",
        "Define authority limits, deputies and escalation arrangements.",
        "Communicate the assignments and exercise a decision under realistic constraints."
      ]
    }
  ],
  "managementTest": "If your usual decision-maker is unavailable, who can authorise the next critical recovery action?",
  "managementAnswer": "The answer should identify an authorised, competent person, their decision limits and the required consultation. Review the arrangement against a realistic disruption before the business depends on it.",
  "productCopy": "RPG Excellence Module 4 brings source-linked process ownership, management-system applicability, a colour-coded RACI and authority controls into one structured workspace. Use it to expose ownership gaps and establish reviewable responsibility arrangements before disruption tests them.",
  "productHref": "/portal/business-continuity/roles",
  "productLabel": "Explore Module 4 Roles & Responsibilities"
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <div className="rpgRolesInsight">
      <HsInsightArticle locale={locale} article={article} />
      <style>{`
.rpgRolesInsight .hsArticle.wideArticle > article { max-width: 1280px; min-width: 0; }
.rpgRolesInsight .hsArticle.wideArticle .articleBody { max-width: 1280px; width: 100%; }
.rpgRolesInsight .hsArticle .hero { height: auto; aspect-ratio: auto; object-fit: contain; }
.rpgRolesInsight .hsArticle .implementationRoadmap { margin: 38px 0 !important; }
.rpgRolesInsight .hsArticle.fullWidthFigures .articleFigure { width: 100%; margin: 32px 0 8px; transform: none; }
.rpgRolesInsight .hsArticle .cta { max-width: 100%; box-sizing: border-box; white-space: normal; }
@media (max-width: 600px) {
  .rpgRolesInsight .hsArticle h1 { font-size: clamp(32px, 8vw, 44px); overflow-wrap: break-word; }
  .rpgRolesInsight .hsArticle .decision { padding: 22px 18px; }
}
      `}</style>
    </div>
  );
}
