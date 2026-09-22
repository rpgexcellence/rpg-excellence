export const SUPPLIER_STANDARDS = [
  { id: "iso9001", label: "ISO 9001:2026", name: "Quality management systems" },
  { id: "iso14001", label: "ISO 14001:2026", name: "Environmental management systems" },
  { id: "iso45001", label: "ISO 45001:2018/Amd 1:2024", name: "Occupational health and safety management systems" },
  { id: "iso17024", label: "ISO/IEC 17024:2026", name: "Certification of persons" },
  { id: "iso17025", label: "ISO/IEC 17025:2017", name: "Testing and calibration laboratories" },
  { id: "as9100", label: "AS9100D / 9100:2016", name: "Aviation, space and defence quality management" },
];

export const SUPPLIER_TYPES = [
  ["general_goods", "General goods or services"],
  ["manufacturer", "Manufacturer / component supplier"],
  ["critical_product", "Critical or safety-related product"],
  ["aerospace", "Aerospace product or service"],
  ["laboratory", "External testing laboratory"],
  ["calibration", "Calibration provider"],
  ["certification", "Certification activity provider"],
  ["examiner", "Examiner, invigilator or examination centre"],
  ["training", "Training provider"],
  ["contractor", "Contractor working on site"],
  ["environmental", "Waste, chemical or environmental service"],
  ["technology", "Technology, data or hosted service"],
  ["logistics", "Transport or logistics provider"],
  ["consultancy", "Consultant or professional service"],
];

const q = (id, category, question, evidence, options = {}) => ({
  id,
  category,
  question,
  evidence,
  weight: 2,
  ...options,
});

export const ASSURANCE_QUESTIONS = [
  q("C01", "Governance", "Are applicable legal, regulatory and contractual requirements identified and controlled?", "Legal register, licences, permits, contract review or compliance records", { common: true, weight: 4, blocker: true }),
  q("C02", "Governance", "Are responsibilities, competent contacts and escalation routes defined for the supplied scope?", "Organisation chart, role descriptions, competence records and escalation matrix", { common: true }),
  q("C03", "Ethics & people", "Are human rights, modern slavery, child labour, discrimination, working hours and fair-treatment expectations controlled?", "Policies, due-diligence records, worker grievance arrangements and supply-chain checks", { common: true, weight: 3 }),
  q("C04", "Ethics & people", "Are bribery, corruption, conflicts of interest, fair competition, whistleblowing and non-retaliation controlled?", "Code of ethics, declarations, training and investigation process", { common: true, weight: 3 }),
  q("C05", "Information & confidentiality", "Are confidential information, personal data, intellectual property and security incidents controlled?", "Security controls, confidentiality agreement, access records and incident process", { common: true, weight: 3 }),
  q("C06", "Business resilience", "Can the supplier maintain or recover the supply following disruption?", "Continuity plan, recovery objectives, exercise results and alternative capacity", { common: true, weight: 2 }),
  q("C07", "Management system", "Are risks, objectives, competence, documented information, audits and corrective actions managed systematically?", "Management-system evidence, objectives, audit programme and improvement records", { common: true }),
  q("Q01", "Quality", "Are externally provided products, services and processes controlled against defined acceptance requirements?", "Purchase controls, inspection plans, acceptance records and release evidence", { standards: ["iso9001", "as9100"], weight: 4, blocker: true }),
  q("Q02", "Quality", "Is supplier performance monitored using conformity, delivery, complaints and corrective-action results?", "Supplier scorecard, trend analysis, reviews and improvement actions", { standards: ["iso9001", "as9100"], weight: 3 }),
  q("Q03", "Quality", "Are customer, statutory, regulatory and technical requirements reviewed and flowed down before work starts?", "Contract review and controlled purchase order or specification", { standards: ["iso9001", "as9100"], weight: 4, blocker: true }),
  q("Q04", "Quality", "Are changes to product, process, location, ownership or sub-tier supply notified and approved before implementation?", "Change-control procedure, notifications and approval records", { standards: ["iso9001", "as9100"], weight: 3 }),
  q("E01", "Environment", "Are significant environmental aspects and compliance obligations associated with the supply identified and controlled?", "Aspect register, permits, compliance evaluations and operational controls", { standards: ["iso14001"], types: ["environmental", "manufacturer", "critical_product", "aerospace", "contractor"], weight: 4, blocker: true }),
  q("E02", "Environment", "Does the supplier consider lifecycle impacts including materials, manufacture, packaging, transport, use and end-of-life?", "Lifecycle review, product data, packaging and disposal information", { standards: ["iso14001"], types: ["manufacturer", "critical_product", "aerospace", "general_goods"] }),
  q("E03", "Environment", "Are energy, water, waste, emissions, pollution and resource-efficiency performance measured and improved?", "Environmental KPIs, objectives, monitoring records and improvement plans", { standards: ["iso14001"], types: ["environmental", "manufacturer", "aerospace", "contractor"] }),
  q("E04", "Green procurement", "Are restricted substances, material composition, recycled content and relevant declarations available?", "REACH/RoHS declarations, safety data, material declarations and recycled-content statement", { standards: ["iso14001", "as9100"], types: ["manufacturer", "critical_product", "aerospace", "general_goods"], weight: 3 }),
  q("E05", "Environment", "Are environmental emergencies, incidents and regulator notifications managed and communicated?", "Emergency plans, exercises, incident records and notification arrangements", { standards: ["iso14001"], types: ["environmental", "manufacturer", "contractor"], weight: 3 }),
  q("H01", "OH&S", "Are hazards and OH&S risks arising from the supplier's work, products or services assessed and controlled?", "Risk assessments, safe systems, SDS, permits and hierarchy-of-control evidence", { standards: ["iso45001"], types: ["contractor", "environmental", "manufacturer", "laboratory", "calibration"], weight: 4, blocker: true }),
  q("H02", "OH&S", "Are workers competent, consulted, appropriately supervised and provided with suitable information and PPE?", "Competence, induction, consultation, supervision and PPE records", { standards: ["iso45001"], types: ["contractor", "environmental", "manufacturer", "laboratory", "calibration"], weight: 3 }),
  q("H03", "OH&S", "Are incidents, near misses, occupational ill health and emergency situations reported, investigated and acted upon?", "Incident statistics, investigation reports, emergency plans and learning actions", { standards: ["iso45001"], types: ["contractor", "environmental", "manufacturer", "laboratory", "calibration"], weight: 3 }),
  q("H04", "OH&S", "Are subcontractors and outsourced OH&S activities subject to equivalent controls?", "Subcontractor approval, flow-down, monitoring and site inspection records", { standards: ["iso45001"], types: ["contractor", "environmental"], weight: 3 }),
  q("P01", "Certification of persons", "Are personnel performing certification activities demonstrably competent and formally authorised for their assigned scope?", "Qualifications, experience, observation, authorisation and ongoing monitoring", { standards: ["iso17024"], types: ["certification", "examiner", "training"], weight: 5, blocker: true }),
  q("P02", "Certification of persons", "Are impartiality threats, conflicts of interest and relationships with training activities identified and treated?", "Conflict declarations, impartiality assessment, safeguards and review records", { standards: ["iso17024"], types: ["certification", "examiner", "training"], weight: 5, blocker: true }),
  q("P03", "Certification of persons", "Are examination materials, candidate information, results and certification decisions kept secure and confidential?", "Access controls, examination-security arrangements, chain of custody and breach records", { standards: ["iso17024"], types: ["certification", "examiner", "training"], weight: 5, blocker: true }),
  q("P04", "Certification of persons", "Are outsourced activities controlled without transferring accountability for certification decisions?", "Agreement, monitoring, competence evidence, decision authority and performance review", { standards: ["iso17024"], types: ["certification", "examiner", "training"], weight: 4 }),
  q("L01", "Laboratory competence", "Does accreditation or objective competence evidence cover the exact test or calibration method and location required?", "Accreditation certificate and schedule, method list and capability evidence", { standards: ["iso17025"], types: ["laboratory", "calibration"], weight: 5, blocker: true }),
  q("L02", "Laboratory competence", "Are measurement traceability, equipment status, reference standards and uncertainty controlled where applicable?", "Calibration chain, equipment records, uncertainty budget and reference-material certificates", { standards: ["iso17025"], types: ["laboratory", "calibration"], weight: 5, blocker: true }),
  q("L03", "Laboratory competence", "Are methods verified or validated and personnel authorised before results are issued?", "Validation or verification, training, observation and authorisation records", { standards: ["iso17025"], types: ["laboratory", "calibration"], weight: 4 }),
  q("L04", "Laboratory competence", "Are validity-of-results activities and nonconforming work effectively managed?", "Proficiency testing, quality-control trends, investigations and customer notification", { standards: ["iso17025"], types: ["laboratory", "calibration"], weight: 4 }),
  q("L05", "Laboratory competence", "Do reports contain required results, methods, uncertainty and decision-rule information?", "Example reports, reporting procedure and statement-of-conformity controls", { standards: ["iso17025"], types: ["laboratory", "calibration"], weight: 3 }),
  q("A01", "Aerospace", "Are product safety, special requirements, critical items and key characteristics identified and controlled?", "Risk records, control plans, key-characteristic and product-safety controls", { standards: ["as9100"], types: ["aerospace", "critical_product", "manufacturer"], weight: 5, blocker: true }),
  q("A02", "Aerospace", "Are counterfeit or suspect unapproved parts prevented, detected, reported and controlled?", "Approved-source controls, traceability, verification, training and reporting process", { standards: ["as9100"], types: ["aerospace", "critical_product", "manufacturer"], weight: 5, blocker: true }),
  q("A03", "Aerospace", "Are configuration, traceability, preservation, FOD and acceptance-authority media controlled?", "Configuration records, traceability, preservation/FOD controls and authorised release records", { standards: ["as9100"], types: ["aerospace", "critical_product", "manufacturer"], weight: 4 }),
  q("A04", "Aerospace", "Are special processes, first article inspection and delegated verification controlled where applicable?", "Special-process approvals, FAI records and delegation controls", { standards: ["as9100"], types: ["aerospace", "critical_product", "manufacturer"], weight: 4 }),
  q("A05", "Aerospace", "Are requirements flowed to sub-tier providers and are work transfers and supplier changes controlled?", "Sub-tier orders, flow-down matrix, work-transfer plan and approvals", { standards: ["as9100"], types: ["aerospace", "critical_product", "manufacturer"], weight: 4 }),
];

export function applicableQuestions(standards = [], types = []) {
  const selectedStandards = new Set(standards);
  const selectedTypes = new Set(types);
  return ASSURANCE_QUESTIONS.filter((item) => {
    if (item.common) return true;
    const standardMatch = !item.standards || item.standards.some((value) => selectedStandards.has(value));
    const typeMatch = !item.types || item.types.some((value) => selectedTypes.has(value));
    return standardMatch && typeMatch;
  });
}

export function calculateSupplierAssurance({
  standards = [],
  types = [],
  answers = {},
  riskInputs = {},
  criticality = "medium",
}) {
  const questions = applicableQuestions(standards, types);
  let earned = 0;
  let available = 0;
  const blockers = [];
  const gaps = [];

  for (const item of questions) {
    const response = answers[item.id]?.response || "unanswered";
    if (response === "na") continue;
    available += item.weight;
    if (response === "yes") earned += item.weight;
    if (response === "partial") earned += item.weight * 0.5;
    if (["no", "partial", "unanswered"].includes(response)) gaps.push(item.id);
    if (item.blocker && ["no", "unanswered"].includes(response)) blockers.push(item.id);
  }

  const assuranceScore = available
    ? Math.round((earned / available) * 100)
    : 0;

  const likelihood = Math.max(1, Math.min(5, Number(riskInputs.likelihood) || 3));
  const consequence = Math.max(1, Math.min(5, Number(riskInputs.consequence) || 3));
  const dependency = Math.max(1, Math.min(5, Number(riskInputs.dependency) || 3));
  const detectability = Math.max(1, Math.min(5, Number(riskInputs.detectability) || 3));
  const criticalityFactor = { low: 0, medium: 2, high: 5, critical: 8 }[criticality] || 2;
  const gapFactor = Math.min(8, Math.ceil(gaps.length / 2));
  const raw = likelihood * consequence
    + Math.ceil((dependency + detectability) / 2)
    + criticalityFactor
    + gapFactor
    + blockers.length * 2;
  const riskScore = Math.min(40, raw);
  const riskBand = riskScore >= 30
    ? "Critical"
    : riskScore >= 21
      ? "High"
      : riskScore >= 12
        ? "Medium"
        : "Low";

  const recommendation = blockers.length
    ? "Do not approve until mandatory control gaps are resolved"
    : riskBand === "Critical"
      ? "Enhanced due diligence, technical approval and on-site audit required"
      : riskBand === "High"
        ? "Formal approval with enhanced monitoring and annual review"
        : riskBand === "Medium"
          ? "Approve subject to documented controls and periodic review"
          : "Simplified approval and routine monitoring";

  const reviewMonths = riskBand === "Critical"
    ? 6
    : riskBand === "High"
      ? 12
      : riskBand === "Medium"
        ? 24
        : 36;

  return {
    assuranceScore,
    riskScore,
    riskBand,
    blockers,
    gaps,
    applicableCount: questions.length,
    recommendation,
    reviewMonths,
  };
}

const section = (id, title, applicability, paragraphs, requirements) => ({
  id,
  title,
  applicability,
  paragraphs,
  requirements,
});

export function buildCodeOfConductSections({
  standards = [],
  types = [],
  supplierName = "the Supplier",
}) {
  const hasStandard = (...ids) => ids.some((id) => standards.includes(id));
  const hasType = (...ids) => ids.some((id) => types.includes(id));

  const sections = [
    section(
      "purpose",
      "Purpose, application and precedence",
      "All suppliers",
      [
        `This Code defines the responsible-business and assurance expectations applicable to ${supplierName}, its personnel and relevant sub-tier providers when supplying products or services.`,
        "Applicable law, regulation, contract, purchase order and technical specification remain binding. Where requirements differ, the more stringent lawful requirement shall be applied and any conflict promptly notified.",
      ],
      [
        "Maintain controls proportionate to the nature and risk of the supply.",
        "Provide objective evidence on reasonable request.",
        "Notify material breaches or circumstances affecting conformity without delay.",
      ]
    ),
    section(
      "people",
      "Employment practices and human rights",
      "All suppliers",
      [
        "Workers shall be treated lawfully, fairly and with dignity. Forced labour, modern slavery, child labour, discrimination, harassment, retaliation and abusive practices are prohibited.",
      ],
      [
        "Control working hours, wages and benefits in accordance with applicable law.",
        "Provide accessible grievance and whistleblowing arrangements.",
        "Apply equivalent expectations to labour agencies and relevant sub-tier providers.",
      ]
    ),
    section(
      "ethics",
      "Ethics and responsible business",
      "All suppliers",
      [
        "Business shall be conducted with integrity, transparency and fair competition. Bribery, corruption, facilitation payments, fraud and improper advantage are prohibited.",
      ],
      [
        "Declare actual or potential conflicts of interest.",
        "Protect intellectual property and confidential information.",
        "Maintain accurate business, financial and compliance records.",
        "Support responsible sourcing and provide origin information where requested.",
      ]
    ),
    section(
      "security",
      "Information security, privacy and confidentiality",
      "All suppliers handling information",
      [
        "Appropriate organisational and technical measures shall protect information, personal data, systems and intellectual property against unauthorised access, loss, alteration or disclosure.",
      ],
      [
        "Restrict access to authorised persons with a legitimate need.",
        "Train personnel and manage access throughout the engagement lifecycle.",
        "Report actual or suspected security or privacy incidents without undue delay.",
        "Maintain proportionate continuity and recovery arrangements.",
      ]
    ),
    section(
      "management",
      "Management system and assurance",
      "All suppliers",
      [
        "The Supplier shall operate a proportionate management system that supports compliance, risk control, competence, performance evaluation and continual improvement.",
      ],
      [
        "Assign accountable management responsibility.",
        "Maintain competent people and controlled documented information.",
        "Evaluate risks, legal obligations and customer requirements.",
        "Audit relevant controls and correct nonconformities effectively.",
        "Permit proportionate customer, regulator or authorised-party access for assurance activities.",
      ]
    ),
  ];

  if (
    hasStandard("iso45001")
    || hasType("contractor", "environmental", "manufacturer", "laboratory", "calibration")
  ) {
    sections.push(section(
      "safety",
      "Health, safety and contractor control",
      "Suppliers whose work, products or services can affect health and safety",
      [
        "Work shall be planned and performed to provide safe and healthy conditions, eliminate hazards where practicable and reduce OH&S risks using effective controls.",
      ],
      [
        "Provide suitable risk assessments, safe systems of work, competence, supervision and equipment.",
        "Consult workers and communicate relevant hazards and controls.",
        "Coordinate site rules, permits, emergency arrangements and incident reporting.",
        "Investigate incidents and implement effective corrective action.",
        "Control subcontractors to equivalent standards.",
      ]
    ));
  }

  if (
    hasStandard("iso14001")
    || hasType("environmental", "manufacturer", "critical_product", "aerospace")
  ) {
    sections.push(section(
      "environment",
      "Environmental protection and green procurement",
      "Environmentally significant supplies and product suppliers",
      [
        "Products and operations shall be managed to prevent pollution, fulfil environmental compliance obligations and improve environmental performance, taking a lifecycle perspective.",
      ],
      [
        "Control energy, water, waste, emissions and hazardous materials.",
        "Maintain required permits and report significant incidents.",
        "Provide material, restricted-substance, recycled-content and disposal information when requested.",
        "Consider packaging, transport, use and end-of-life impacts.",
        "Provide relevant greenhouse-gas and environmental-performance information.",
      ]
    ));
  }

  if (hasStandard("iso9001") || hasStandard("as9100")) {
    sections.push(section(
      "quality",
      "Quality and external-provider controls",
      "Suppliers affecting product or service conformity",
      [
        "Products, services and outsourced processes shall conform to communicated customer, technical, statutory and regulatory requirements.",
      ],
      [
        "Review requirements before acceptance and resolve ambiguity.",
        "Use competent personnel, suitable resources and controlled processes.",
        "Inspect, test and release outputs against defined acceptance criteria.",
        "Control nonconforming outputs and notify escapes promptly.",
        "Monitor conformity, delivery and corrective-action performance.",
        "Notify and obtain approval for relevant changes before implementation.",
      ]
    ));
  }

  if (
    hasStandard("iso17024")
    || hasType("certification", "examiner", "training")
  ) {
    sections.push(section(
      "person-certification",
      "Certification-of-persons activities",
      "Providers supporting certification, examination or assessment",
      [
        "Outsourced certification activities shall be performed competently, impartially, consistently and confidentially. Accountability for certification decisions remains with the certification body.",
      ],
      [
        "Use only competent and authorised personnel.",
        "Declare and treat impartiality threats and conflicts of interest.",
        "Protect examination materials, candidate information and results.",
        "Separate incompatible training and certification activities using effective safeguards.",
        "Permit monitoring, witness assessment and performance review.",
      ]
    ));
  }

  if (
    hasStandard("iso17025")
    || hasType("laboratory", "calibration")
  ) {
    sections.push(section(
      "laboratory",
      "External testing and calibration",
      "Laboratories and calibration providers",
      [
        "Testing and calibration shall be performed using competent personnel, suitable methods, controlled equipment and facilities, with results supported by appropriate validity and traceability arrangements.",
      ],
      [
        "Maintain evidence that the required activity and location are within the approved competence scope.",
        "Control methods, equipment, metrological traceability and uncertainty where relevant.",
        "Participate in appropriate validity-of-results activities.",
        "Control nonconforming work and notify affected customers.",
        "Issue complete, accurate and authorised reports.",
      ]
    ));
  }

  if (hasStandard("as9100") || hasType("aerospace")) {
    sections.push(section(
      "aerospace",
      "Aviation, space and defence requirements",
      "Aerospace and safety-critical suppliers",
      [
        "Aerospace supplies shall be controlled to protect product conformity, product safety, authenticity, configuration and traceability throughout the supply chain.",
      ],
      [
        "Identify and control special requirements, critical items and key characteristics.",
        "Prevent counterfeit and suspect unapproved parts using approved sources and traceability.",
        "Control special processes, first article inspection and delegated verification where applicable.",
        "Flow applicable requirements to sub-tier providers.",
        "Control work transfer, configuration, preservation, FOD and acceptance authority.",
        "Notify product-safety concerns, escapes and significant changes immediately.",
      ]
    ));
  }

  sections.push(section(
    "monitoring",
    "Monitoring, access and consequences",
    "All suppliers",
    [
      "Compliance may be evaluated through questionnaires, evidence review, performance monitoring, audits, inspections or other proportionate assurance activities.",
    ],
    [
      "Cooperate with reasonable assurance requests.",
      "Provide timely containment, root-cause analysis and corrective action.",
      "Notify material changes to ownership, location, process, accreditation, certification or sub-tier supply.",
      "Understand that serious or repeated breach may result in restricted approval, suspension, removal or contractual remedies.",
    ]
  ));

  return sections;
}
