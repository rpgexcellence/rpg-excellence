import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import StandardGuide from "../../../components/StandardGuide";
import { locales } from "../../../lib/i18n";
export const metadata = {
  title: "ISO/IEC 17025:2017 at a Glance | RPG Excellence",
  description:
    "Practical laboratory guidance for ISO/IEC 17025:2017: competence, calibration, testing, uncertainty, traceability, valid results, gap analysis and internal audit, with official UKAS resources.",
  alternates: {
    canonical: "/en/iso-17025",
  },
};
const ukasOverview =
  "https://www.ukas.com/accreditation/standards/laboratory-accreditation/";
const ukasPublications =
  "https://www.ukas.com/resources/publications/laboratory-accreditation/";
const support =
  "Use RPG Excellence to assess the laboratory criterion, record objective evidence and assign an accountable Company User. Link a gap to a controlled Finding and proportionate CAPA-8D where needed, then retain implementation and effectiveness evidence. The platform supports preparation and internal assurance; accreditation decisions remain with the accreditation body.";
const clauses = {
  4: {
    intent:
      "Protect impartial technical judgement and the confidentiality of laboratory information.",
    requirements: [
      "4.1 — impartial activities, management commitment and protection from undue pressure",
      "4.1 — ongoing identification and control of impartiality risks",
      "4.2 — enforceable confidentiality commitments, controlled disclosure and protection of third-party sources",
      "4.2 — confidentiality duties for employees, contractors and others acting for the laboratory",
    ],
    application:
      "Review ownership, reporting lines, customer relationships, incentives and shared production resources for risks to objective results. Give staff a usable escalation route and protect confidential information through the whole job lifecycle, including external providers and customer witnessing.",
    evidence:
      "Impartiality reviews and decisions; conflict declarations; reporting and release authorities; confidentiality commitments; disclosure approvals; access controls; interviews and examples of decisions made under commercial pressure.",
    questions: [
      "What happened when a customer challenged an unwelcome result?",
      "How are technicians protected from pressure to change technical conclusions?",
      "Who can see customer data and how are third-party sources protected?",
    ],
    failures:
      "A signed policy without working safeguards; the sales function controlling technical release; unresolved conflicts; shared access to confidential records; complaints revealing a third-party source without permission.",
    output:
      "Demonstrated impartiality safeguards and clear accountability for confidential information and disclosures.",
    focus:
      "Technical integrity, freedom to escalate and reliable information protection across internal and external relationships.",
  },
  5: {
    intent:
      "Define the laboratory's legal responsibility, management, activity range, interfaces and technical authority.",
    requirements: [
      "5.1–5.2 — legal responsibility and identified management with overall laboratory accountability",
      "5.3 — documented range of activities for which conformity is claimed",
      "5.4 — consistent control at permanent, temporary, mobile and customer locations",
      "5.5–5.6 — structure, procedures, responsibilities, resources and authority to act",
      "5.7 — communication and preservation of system integrity during change",
    ],
    application:
      "Map the actual testing, calibration and sampling offered: methods, measurands, ranges, locations and technical interfaces. Align marketed capability, contracts and any accredited scope with what is demonstrated. Do not describe ongoing externally provided laboratory activities as the laboratory's own conforming activity range.",
    evidence:
      "Legal identity; organisation chart; controlled activity scope; methods/ranges and location lists; role and delegation records; stop-work authority; support-service interfaces; management communications and change reviews.",
    questions: [
      "Which activities and locations are inside the declared range?",
      "Who can stop work and authorise technical resumption?",
      "Does the service offered match the capability and any published accreditation schedule?",
    ],
    failures:
      "An ambiguous legal entity; missing site or fieldwork controls; nominal technical authority; scope claims broader than demonstrated capability; organisational change that bypasses laboratory controls.",
    output:
      "A clear, defensible laboratory boundary with accountable management, working authorities and controlled interfaces.",
    focus:
      "Scope accuracy, technical accountability and preservation of competence through organisational or service changes.",
  },
  6: {
    intent:
      "Provide competent people, suitable facilities and dependable equipment backed by valid metrological references.",
    requirements: [
      "6.1 — available personnel, facilities, equipment, systems and support services",
      "6.2 — documented competence criteria, selection, training, supervision, authorisation and monitoring",
      "6.3 — suitable facilities, defined environmental requirements and relevant monitoring",
      "6.4 — equipment fitness, acceptance, calibration, maintenance, status, checks, corrections and history",
      "6.5 — demonstrable metrological traceability to appropriate references",
      "6.6 — technically controlled external products and services",
    ],
    application:
      "Authorise staff for specific methods, ranges and release activities using demonstrated competence. Set conditions appropriate to the method and uncertainty. Technically review reference certificates, apply current corrections, conduct required intermediate checks and investigate suspect equipment. Evaluate providers against the capability actually purchased.",
    evidence:
      "Competence criteria and witnessed assessments; authorisation matrix; environmental data matched to job time; equipment/firmware history; acceptance and calibration records; correction tables; intermediate-check trends; traceability chains; provider evaluation and receipt approval.",
    questions: [
      "Can the technician demonstrate the method and interpret a deviation?",
      "Does the reference equipment support the required range and uncertainty?",
      "How was a supplier's delivered certificate accepted for its intended use?",
      "Which earlier results could be affected by an out-of-tolerance reference?",
    ],
    failures:
      "Training attendance treated as competence; blanket signatory authority; an in-date label mistaken for fitness; missed environmental excursions; wrong or omitted correction factors; unsuitable provider capability; no review of previous results after a reference failure.",
    output:
      "Verified technical capability, controlled environmental influences and a defensible reference chain for the laboratory's work.",
    focus:
      "The people, equipment, facilities and traceability factors highlighted by UKAS, tested against actual methods and reported results.",
  },
  7: {
    intent:
      "Control the complete technical process so every reported result is valid, reconstructable and understandable.",
    requirements: [
      "7.1 — technical review of requests and contracts, including agreed decision rules where conformity is requested",
      "7.2.1–7.2.2 — suitable methods, verified capability and validation when required",
      "7.3–7.4 — sampling where performed and controlled handling/identification of items",
      "7.5 — contemporaneous technical records and traceable amendments",
      "7.6 — suitable uncertainty evaluation, including all calibration activities and in-house calibrations",
      "7.7 — planned validity monitoring, suitable external comparisons and action on adverse results",
      "7.8.1–7.8.2 — clear reporting, common information and authorised review/release",
      "7.8.3–7.8.5 — activity-specific testing, calibration and sampling reporting",
      "7.8.6–7.8.8 — conformity statements, opinions/interpretations and controlled report amendments",
      "7.9–7.10 — complaint handling and risk-based control of nonconforming work",
      "7.11 — validated data functions, information integrity and checked calculations/transfers",
    ],
    application:
      "Follow a customer job from agreed method, range and capability through receipt, work, original readings, corrections, uncertainty and release. Witness a demanding measurement and recalculate a reported result. Use validity monitoring to inform technical decisions. On failure, consider holds, previous-result impact, notification or recall where needed and authorised restart. Validate custom spreadsheets, interfaces and relevant system changes.",
    evidence:
      "Contract and decision-rule agreements; method verification/validation; sampling/receipt records; raw data; equipment and environmental links; uncertainty models; control charts; PT/ILC plans and results; certificates and release records; amendment links; complaint investigations; impact assessments; data-system validation and recovery evidence.",
    questions: [
      "Can this certificate value be reconstructed from the original data?",
      "Which uncertainty contributors matter for this method and range?",
      "What changed after an adverse check or comparison result?",
      "Was the borderline pass/fail decision made using the rule agreed with the customer?",
      "Could an unauthorised user alter a released result or a spreadsheet formula?",
    ],
    failures:
      "Methods adopted without demonstrated capability; generic uncertainty budgets; no plan for suitable external comparisons; incomplete raw data; available as-found failures hidden by as-left reporting; incorrect conformity statements; uncontrolled report replacements; failed references repaired without historical impact review.",
    output:
      "A complete technical evidence trail with valid results, justified uncertainty, controlled reporting and defensible decisions when work goes wrong.",
    focus:
      "Valid methods, relevant sampling, accurate recording/reporting, technical quality assurance and result integrity. Apply testing-only or sampling-only requirements according to the actual activity range.",
  },
  8: {
    intent:
      "Operate a management system that supports laboratory competence, impartiality and consistently valid work.",
    requirements: [
      "8.1.1–8.1.3 — select Option A or Option B while continuing to meet clauses 4–7",
      "8.2–8.4 — system documentation, document control and record control",
      "8.5–8.6 — proportionate risk/opportunity actions, improvement and customer feedback",
      "8.7 — correction, cause/extent evaluation, action and effectiveness review",
      "8.8 — planned internal audits, defined scope/criteria, reporting and timely follow-up",
      "8.9 — management review with complete inputs and recorded decisions on effectiveness, improvement, resources and change",
    ],
    application:
      "Under Option A, address the management requirements directly. Under Option B, demonstrate that the ISO 9001-aligned system consistently supports clauses 4–7 and fulfils the intent of 8.2–8.9. Certification is not a prerequisite to choosing Option B and is not proof of technical competence. Use technical risks, changes and previous results to plan audits and make management review decision-focused.",
    evidence:
      "Documented system route; laboratory-to-corporate system mapping where relevant; controlled documents and retained records; risk actions; feedback and improvement data; cause/extent analysis; effectiveness checks; audit programme, evidence and follow-up; complete management-review inputs, decisions and resourcing actions.",
    questions: [
      "Which route is used and how is it implemented in this laboratory?",
      "Does internal audit witness technical work and test data rather than only review procedures?",
      "Which recent technical trend changed a management decision?",
      "What proves corrective action reduced recurrence rather than merely completing a task?",
    ],
    failures:
      "Marking the entire management system not applicable under Option B; corporate certification treated as laboratory accreditation; audit coverage disconnected from technical risk; repeated failures closed on retraining; management minutes with no decisions or follow-through.",
    output:
      "An implemented system that sustains competence and result validity, supported by effective audit, review, resource decisions and verified improvement.",
    focus:
      "No numerical RPG score or completed checklist can replace competent assessment or override unresolved significant technical gaps.",
  },
};
const enhancedGuide = {
  label: "LABORATORY COMPETENCE AT A GLANCE",
  facts: [
    {
      label: "Structure",
      value: "Clauses 4–8",
      points: [
        "Five normative requirement blocks",
        "Technical and management controls",
        "Annexes A and B are informative",
      ],
    },
    {
      label: "Approach",
      value: "Technical competence",
      points: [
        "Demonstrate staff and method capability",
        "Control equipment and conditions",
        "Corroborate valid results with evidence",
      ],
    },
    {
      label: "Use",
      value: "Testing & calibration",
      points: [
        "Include sampling where performed",
        "Control relevant off-site activities",
        "Keep the activity range explicit",
      ],
    },
    {
      label: "Assurance",
      value: "Accreditation readiness",
      points: [
        "Check applicable UKAS criteria",
        "Use real technical audit trails",
        "A platform score is not accreditation",
      ],
    },
  ],
  milestones: [
    [
      "Published standard",
      "ISO/IEC 17025:2017",
      "Use the licensed 2017 edition as the laboratory requirement baseline.",
    ],
    [
      "Declared capability",
      "Define the activity range",
      "Identify methods, ranges, sites and testing/calibration/sampling actually performed.",
    ],
    [
      "Management route",
      "Option A or Option B",
      "Both routes support consistent fulfilment of the technical requirements in clauses 4–7.",
    ],
    [
      "UKAS preparation",
      "Check applicable publications",
      "Use the current UKAS laboratory publications index and the requirements relevant to the intended scope.",
    ],
  ],
  themes: [
    {
      title: "Competent people and impartial judgement",
      change:
        "Reliable laboratory work needs demonstrated competence and protection from undue pressure.",
      decision:
        "Set method/range-specific authority, supervision, monitoring and technical escalation rights.",
      evidence:
        "Witnessed assessments, authorisation records, impartiality safeguards and examples of decisions under pressure.",
      challenge:
        "Can the assigned person demonstrate the task and recognise when the result may be invalid?",
    },
    {
      title: "Equipment and measurement conditions",
      change:
        "An instrument's calibration status does not alone establish fitness for a particular result.",
      decision:
        "Set technical acceptance criteria, suitable intervals, relevant checks and environmental limits.",
      evidence:
        "Reference certificates, corrections, drift/check trends, maintenance and conditions recorded at the time of work.",
      challenge:
        "What demonstrates that the actual setup could achieve the required range and uncertainty?",
    },
    {
      title: "Methods, sampling and customer commitments",
      change:
        "The laboratory needs suitable procedures and evidence that they work for the intended application.",
      decision:
        "Review capability before accepting work; verify standard methods and validate non-standard or changed use where required.",
      evidence:
        "Contract reviews, verification/validation data, sampling records where relevant and approved method deviations.",
      challenge:
        "Trace one demanding customer requirement into an achievable method, capability and reporting commitment.",
    },
    {
      title: "Uncertainty and traceable results",
      change:
        "The reported result must be supported by an appropriate reference chain and uncertainty evaluation.",
      decision:
        "Assign technical ownership of measurement models, significant contributions, reference selection and correction updates.",
      evidence:
        "Method/range budgets, traceability links, reference competence, current corrections and independent recalculation.",
      challenge:
        "Can the team explain the main uncertainty contributions and trace this result to an appropriate reference?",
    },
    {
      title: "Quality assurance and reporting integrity",
      change:
        "Monitoring and comparisons need to detect weak performance before invalid results reach customers.",
      decision:
        "Plan suitable validity checks and external comparisons; define reporting review, authorisation and response limits.",
      evidence:
        "Control charts, PT/ILC outcomes, raw data, certificate reviews, agreed decision rules and controlled amendments.",
      challenge:
        "What action followed a failed check or comparison, and which results were affected?",
    },
    {
      title: "Scope, failure response and management decisions",
      change:
        "Confidence depends on a controlled activity range and effective action when technical work fails.",
      decision:
        "Protect scope accuracy, investigate previous-result impact and use audit/review evidence to allocate resources.",
      evidence:
        "Activity and accreditation scope comparisons, holds/notifications, restart authority, CAPA effectiveness and management decisions.",
      challenge:
        "Show how management dealt with a technical weakness beyond repairing the immediate problem.",
    },
  ],
  boardQuestions: [
    "Does our declared activity range match the methods, ranges, locations and competence we can demonstrate?",
    "Who is authorised for each critical method and for independent technical review and release?",
    "Can our equipment, conditions and uncertainty evaluation support the results we promise?",
    "Are reference corrections and traceability links current and technically suitable?",
    "What do quality-control trends and external comparisons tell us about result validity?",
    "Could we identify all earlier results affected by a failed reference standard or incorrect calculation?",
    "Are conformity rules, raw data, certificates and report amendments technically controlled?",
    "Which technical issue requires a management decision now, and how will the action's effectiveness be tested?",
  ],
  trails: [
    [
      "Customer request to released result",
      "Trace an agreed job through item identity, authorised work, method, conditions, references, raw data, uncertainty and certificate release.",
    ],
    [
      "Reference standard to traceable measurement",
      "Follow the calibration chain, uncertainty contributions, corrections, intermediate checks and equipment suitability for the measured range.",
    ],
    [
      "Technical failure to controlled restart",
      "Follow a failed check or suspect reference through containment, previous-result impact, necessary customer action, restart approval and effectiveness.",
    ],
    [
      "Method change to demonstrated capability",
      "Test verification or validation, uncertainty, staff authority, data-system checks and monitoring before and after a changed method is released.",
    ],
  ],
  clauses,
  support,
};
const guide = {
  assessmentStandard: "ISO/IEC 17025:2017",
  code: "ISO/IEC 17025:2017",
  title: "Testing & Calibration Laboratories",
  accent: "blue",
  summary:
    "Demonstrate competent laboratory work, impartial technical judgement and consistently valid results through controlled methods, traceable measurements and effective assurance.",
  purpose:
    "A practical framework for testing, calibration and associated sampling that connects capable people and resources with controlled technical work, reliable information and a management system that sustains confidence in results.",
  clauses: Object.entries(clauses).map(([number, detail]) => ({
    number,
    title: {
      4: "General requirements",
      5: "Structural requirements",
      6: "Resource requirements",
      7: "Process requirements",
      8: "Management system requirements",
    }[number],
    focus: detail.intent,
  })),
  enhancedGuide,
  supplementarySections: [
    {
      label: "MANAGEMENT-SYSTEM OPTIONS & INTERPRETATION",
      title: "Apply the right route without weakening technical control.",
      description:
        "Record the chosen system route and explain any activity-specific non-applicability. Informative annexes help interpretation and are not scored as additional requirements.",
      cards: [
        {
          label: "Option A",
          title: "Direct management controls",
          text: "Address 8.2–8.9 through a working laboratory system: documentation, records, risk action, improvement, CAPA, audit and review.",
        },
        {
          label: "Option B",
          title: "Demonstrated ISO 9001 alignment",
          text: "Show how the wider system supports consistent fulfilment of clauses 4–7 and the intent of 8.2–8.9. An ISO 9001 certificate alone is insufficient.",
        },
        {
          label: "Annex A · informative",
          title: "Understand the reference chain",
          text: "Use the explanation of metrological traceability to challenge missing links, unsuitable references or uncertainty contributions. Assess the applicable requirement in 6.5.",
        },
        {
          label: "Annex B · informative",
          title: "Understand the system options",
          text: "Use the explanation of the two routes to assess real implementation. Neither route removes the technical requirements or creates an accreditation decision.",
        },
      ],
    },
    {
      label: "OFFICIAL UKAS RESOURCES",
      title: "Connect preparation to the accreditation criteria.",
      description:
        "UKAS identifies competent staff, suitable equipment and facilities, sound technical procedures, traceability and dependable records/reporting as factors supporting reliable laboratory results. Use its current resources alongside the licensed standard. These links provide independent source guidance; they do not imply UKAS endorsement of RPG Excellence.",
      cards: [
        {
          label: "Laboratory accreditation",
          title: "UKAS overview and preparation",
          text: "Review the laboratory competence factors, the official readiness-tool link and application information. Distinguish preparation from the accreditation decision.",
          href: ukasOverview,
        },
        {
          label: "Calibration laboratories",
          title: "Define the offered capability",
          text: "Use the UKAS calibration overview to consider the relevant measurement disciplines and the capability the laboratory intends to demonstrate.",
          href: "https://www.ukas.com/accreditation/standards/laboratory-accreditation/calibration/",
        },
        {
          label: "Applicable laboratory publications",
          title: "Use the current technical guidance",
          text: "Check LAB 5 for calibration reporting, LAB 48 for conformity decisions, M3003 for uncertainty, TPS 41 for traceability and TPS 47 for proficiency testing. Confirm applicability and current issues through the official index.",
          href: ukasPublications,
        },
        {
          label: "Accreditation decision",
          title: "Separate recommendation from grant",
          text: "UKAS uses an independent decision process following assessment. A recommendation, internal audit or RPG readiness percentage does not itself grant accreditation or extend its scope.",
          href: "https://www.ukas.com/customer-area/the-decision-making-process/",
        },
      ],
    },
  ],
};
export default async function ISO17025Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <StandardGuide guide={guide} locale={locale} />
    </PageShell>
  );
}
