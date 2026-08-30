"use client";

import { useMemo, useState } from "react";

const PROCESS_CATALOGUES = {
  "ISO 45001": [
    ["ohs-governance", "Leadership & OH&S governance", "OH&S policy, leadership commitment, responsibilities, consultation and resources", "Governance"],
    ["hazard-risk", "Hazard identification & risk assessment", "Hazard identification, risk evaluation, controls and the hierarchy of controls", "High risk"],
    ["legal", "Legal & other requirements", "Applicable legislation, other obligations and compliance evaluation", "Compliance"],
    ["operational-control", "Operational control", "Procedures and controls for significant OH&S risks", "Operations"],
    ["permit-work", "Permit-to-work / high-risk activities", "Hot work, confined spaces, work at height, isolation/LOTO and excavation", "High risk"],
    ["contractors", "Contractor management", "Selection, induction, competence, supervision and monitoring", "Supply chain"],
    ["procurement", "Procurement & purchasing", "OH&S requirements in purchasing and supplier selection", "Supply chain"],
    ["change", "Change management", "OH&S assessment of changes to processes, equipment, people or facilities", "Change"],
    ["competence", "Competence & training", "Training needs, competence records and effectiveness evaluation", "People"],
    ["participation", "Worker consultation & participation", "Worker involvement, safety representatives, communication and feedback", "People"],
    ["emergency", "Emergency preparedness & response", "Scenarios, drills, response arrangements and lessons learned", "Resilience"],
    ["incident", "Incident / nonconformity management", "Reporting, investigation, root cause analysis and corrective action", "Performance"],
    ["monitoring", "Performance monitoring", "OH&S KPIs, inspections, measurements and trend analysis", "Performance"],
    ["internal-audit", "Internal audit", "Audit programme, auditor competence, findings and follow-up", "Assurance"],
    ["management-review", "Management review", "Inputs, decisions, actions and system effectiveness", "Governance"],
    ["documented-information", "Documented information", "Control of procedures, records, revisions and retention", "Control"],
    ["maintenance", "Maintenance / facilities", "Equipment inspection, preventive maintenance and workplace conditions", "High risk"],
    ["occupational-health", "Occupational health", "Exposure monitoring, health surveillance, ergonomics and welfare", "Health"],
    ["safety-culture", "Safety culture / behavioural controls", "Safe practices, observations, leadership behaviours and worker awareness", "People"],
  ],
  "ISO 9001": [
    ["qms-governance", "Leadership & QMS governance", "Quality policy, accountability, objectives and management system direction", "Governance"],
    ["customer-contract", "Customer focus & contract review", "Customer requirements, quotations, orders and changes", "Customer"],
    ["design", "Design & development", "Planning, inputs, controls, outputs, changes and validation", "Delivery"],
    ["production-service", "Production / service provision", "Controlled delivery, acceptance criteria and service performance", "Operations"],
    ["supplier", "Supplier & externally provided processes", "Selection, controls, monitoring and verification", "Supply chain"],
    ["nonconforming-output", "Nonconforming outputs", "Identification, containment, disposition and concession", "Performance"],
    ["measurement", "Monitoring, measurement & data", "KPIs, customer satisfaction, analysis and evaluation", "Performance"],
    ["calibration", "Monitoring and measuring resources", "Suitability, calibration, traceability and protection", "Control"],
    ["competence", "Competence & awareness", "Required competence, training and effectiveness", "People"],
    ["change", "Change management", "Planned changes and control of unintended consequences", "Change"],
    ["documented-information", "Documented information", "Creation, approval, access, revision, retention and disposition", "Control"],
    ["internal-audit", "Internal audit", "Programme, independence, evidence, findings and follow-up", "Assurance"],
    ["management-review", "Management review", "Inputs, outputs, decisions and improvement", "Governance"],
    ["capa", "Improvement & corrective action", "Root cause, action, effectiveness and recurrence prevention", "Improvement"],
  ],
  "ISO 14001": [
    ["ems-governance", "Leadership & EMS governance", "Environmental policy, accountability, resources and strategic integration", "Governance"],
    ["aspects", "Environmental aspects & impacts", "Lifecycle perspective, significance criteria and change", "High risk"],
    ["compliance", "Compliance obligations", "Legal and other requirements and compliance evaluation", "Compliance"],
    ["operational-control", "Operational control", "Controls for significant aspects and outsourced processes", "Operations"],
    ["emergency", "Emergency preparedness & response", "Environmental scenarios, testing, response and learning", "Resilience"],
    ["waste-resources", "Waste, energy, emissions & water", "Resource use, releases, waste controls and performance", "Environment"],
    ["procurement", "Lifecycle, procurement & contractors", "Upstream and downstream controls and communication", "Supply chain"],
    ["monitoring", "Environmental performance monitoring", "Objectives, indicators, measurement and trend analysis", "Performance"],
    ["competence", "Competence, awareness & communication", "Capability, awareness and internal/external communications", "People"],
    ["documented-information", "Documented information", "Operational records, revisions, access and retention", "Control"],
    ["internal-audit", "Internal audit", "Programme, competence, findings and follow-up", "Assurance"],
    ["management-review", "Management review", "Performance, changing context, decisions and resources", "Governance"],
    ["capa", "Nonconformity & corrective action", "Correction, root cause, effectiveness and improvement", "Improvement"],
  ],
  "ISO 22301": [
    ["bcm-governance", "BCM leadership & governance", "Policy, accountability, resources and programme oversight", "Governance"],
    ["bia", "Business impact analysis", "Prioritised activities, impacts, MTPD and recovery objectives", "High risk"],
    ["bc-risk", "Continuity risk assessment", "Disruption threats, vulnerabilities and treatment", "Risk"],
    ["strategies", "Continuity strategies & solutions", "Capability choices, resources and dependencies", "Resilience"],
    ["plans", "Continuity plans & procedures", "Response structure, invocation, communications and recovery", "Resilience"],
    ["exercise", "Exercises & testing", "Scenario design, competence, results and improvement", "Assurance"],
    ["supplier", "Supplier & third-party resilience", "Critical dependencies, assurance and continuity arrangements", "Supply chain"],
    ["crisis-comms", "Crisis communications", "Interested parties, warnings, media and message control", "Communication"],
    ["internal-audit", "Internal audit", "Programme, evidence, findings and follow-up", "Assurance"],
    ["management-review", "Management review", "Performance, capability, decisions and improvement", "Governance"],
    ["capa", "Nonconformity & corrective action", "Root cause, actions and effectiveness", "Improvement"],
  ],
  "ISO/IEC 27001": [
    ["isms-governance", "ISMS leadership & governance", "Information security policy, accountability, roles, resources and strategic alignment", "Governance"],
    ["risk-assessment", "Information security risk assessment", "Risk criteria, identification, analysis, evaluation, ownership and review", "High risk"],
    ["risk-treatment", "Risk treatment & Statement of Applicability", "Treatment decisions, control selection, residual risk acceptance and SoA justification", "High risk"],
    ["asset-management", "Information and asset management", "Asset inventories, ownership, acceptable use, classification, handling and return", "Control"],
    ["access-control", "Identity & access control", "Identity lifecycle, authentication, privileged access, segregation and access review", "High risk"],
    ["people-security", "People security", "Screening, terms, awareness, responsibilities, disciplinary controls and leavers", "People"],
    ["physical-security", "Physical & environmental security", "Secure areas, entry controls, monitoring, equipment protection and environmental threats", "Operations"],
    ["operations-security", "Technology operations security", "Configuration, malware, vulnerabilities, logging, monitoring, backup and network security", "Operations"],
    ["secure-development", "Secure acquisition, development & change", "Security requirements, architecture, coding, testing, release and controlled change", "Delivery"],
    ["supplier", "Supplier, cloud & external service security", "Due diligence, agreements, supply-chain controls, monitoring and service changes", "Supply chain"],
    ["incident", "Information security incident management", "Preparation, reporting, assessment, response, evidence and lessons learned", "Resilience"],
    ["continuity", "ICT readiness & information security continuity", "Disruption requirements, resilience, recovery capability and testing", "Resilience"],
    ["compliance", "Legal, regulatory & contractual compliance", "Applicable obligations, intellectual property, records, privacy and control review", "Compliance"],
    ["monitoring", "ISMS monitoring & performance evaluation", "Objectives, measures, analysis, evaluation and management information", "Performance"],
    ["documented-information", "Documented information", "Creation, approval, access, change, retention and protection of ISMS information", "Control"],
    ["internal-audit", "Internal audit", "Risk-based programme, independence, evidence, findings and follow-up", "Assurance"],
    ["management-review", "Management review", "Required inputs, decisions, resources, changes and ISMS effectiveness", "Governance"],
    ["capa", "Nonconformity & corrective action", "Correction, cause, action, effectiveness and continual improvement", "Improvement"],
  ],
  "ISO/IEC 17024": [
    ["impartiality", "Impartiality & certification integrity", "Threats, safeguards, governance and decision independence", "Governance"],
    ["scheme", "Certification scheme governance", "Scheme design, validation, maintenance and stakeholder input", "Core process"],
    ["personnel", "Personnel competence", "Selection, qualification, monitoring and conflicts", "People"],
    ["application", "Application & candidate management", "Eligibility, information, accessibility and records", "Core process"],
    ["examination", "Assessment / examination development", "Blueprints, items, validation, reliability and security", "Core process"],
    ["delivery", "Examination delivery & security", "Identity, venues, invigilation, accommodations and incidents", "High risk"],
    ["decision", "Certification decision", "Independent review, authority, consistency and records", "High risk"],
    ["surveillance", "Surveillance & recertification", "Continued competence, renewal and suspension controls", "Core process"],
    ["appeals", "Complaints & appeals", "Independence, timeliness, decisions and communication", "Assurance"],
    ["confidentiality", "Confidentiality & information security", "Candidate data, examination content and access control", "Control"],
    ["outsourcing", "Outsourced services", "Competence, contracts, monitoring and accountability", "Supply chain"],
    ["internal-audit", "Internal audit", "Programme, independence, evidence and follow-up", "Assurance"],
    ["management-review", "Management review", "Inputs, decisions, resources and effectiveness", "Governance"],
    ["capa", "Nonconformity & corrective action", "Correction, cause, action and effectiveness", "Improvement"],
  ],
  "ISO/IEC 17025": [
    ["impartiality", "Impartiality & confidentiality", "Risks, safeguards, information protection and disclosure", "Governance"],
    ["personnel", "Personnel competence", "Authorisation, competence monitoring and records", "People"],
    ["facilities", "Facilities & environmental conditions", "Suitability, monitoring, control and segregation", "Operations"],
    ["equipment", "Equipment & calibration", "Selection, verification, maintenance, status and records", "Control"],
    ["traceability", "Metrological traceability", "Calibration chains, reference materials and evidence", "High risk"],
    ["contract-review", "Review of requests, tenders & contracts", "Capability, methods, deviations and communication", "Customer"],
    ["methods", "Methods, validation & uncertainty", "Selection, verification, validation and measurement uncertainty", "Core process"],
    ["sampling", "Sampling & handling of items", "Plans, integrity, transport, receipt, storage and disposal", "Core process"],
    ["validity", "Ensuring validity of results", "QC, proficiency testing, trends and action", "High risk"],
    ["reporting", "Reporting of results", "Review, authorisation, statements, opinions and amendments", "Core process"],
    ["nonconforming-work", "Nonconforming work", "Control, significance, customer notification and resumption", "Performance"],
    ["data", "Data & information management", "Validation, access, transfer, integrity and backups", "Control"],
    ["internal-audit", "Internal audit", "Programme, evidence, findings and follow-up", "Assurance"],
    ["management-review", "Management review", "Inputs, risks, resources and effectiveness", "Governance"],
    ["capa", "Corrective action", "Cause, extent, action and effectiveness", "Improvement"],
  ],
  AS9100: [
    ["qms-governance", "Leadership & aerospace QMS governance", "Policy, accountability, objectives and customer focus", "Governance"],
    ["operational-risk", "Operational risk management", "Risk identification, assessment, mitigation and acceptance", "High risk"],
    ["product-safety", "Product safety", "Hazards, responsibilities, communication and lifecycle controls", "High risk"],
    ["counterfeit", "Counterfeit parts prevention", "Approved sources, verification, reporting and disposition", "High risk"],
    ["configuration", "Configuration management", "Identification, baselines, change control and status accounting", "Control"],
    ["contract-review", "Contract & requirement review", "Special requirements, critical items and operational risks", "Customer"],
    ["design", "Design & development", "Planning, reviews, verification, validation and changes", "Core process"],
    ["supplier", "External provider control", "Approval, flow-down, monitoring and verification", "Supply chain"],
    ["production", "Production & service provision", "Planning, work instructions, validation and release", "Operations"],
    ["special-process", "Special processes", "Qualification, validation, personnel and parameter control", "High risk"],
    ["fod", "Foreign object prevention", "Programme controls, housekeeping, detection and reporting", "High risk"],
    ["traceability", "Identification, traceability & preservation", "Status, serialisation, shelf life and protection", "Control"],
    ["nonconforming-output", "Nonconforming outputs", "Containment, disposition, concession and notification", "Performance"],
    ["internal-audit", "Internal audit", "Programme, process effectiveness, evidence and follow-up", "Assurance"],
    ["management-review", "Management review", "Performance, risk, delivery and decisions", "Governance"],
    ["capa", "Corrective action", "Root cause, escape point, action and effectiveness", "Improvement"],
  ],
};

function catalogueKey(standardCode = "") {
  const code = standardCode.toUpperCase().replace(/\s+/g, " ").trim();
  return Object.keys(PROCESS_CATALOGUES).find((key) => code.startsWith(key.toUpperCase())) ?? null;
}

export default function ProcessScopeSelector({ standards }) {
  const [selectedStandards, setSelectedStandards] = useState([]);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [query, setQuery] = useState("");
  const [includeOther, setIncludeOther] = useState(false);
  const [otherProcess, setOtherProcess] = useState("");

  const processes = useMemo(() => {
    const merged = new Map();
    for (const standardId of selectedStandards) {
      const standard = standards.find((item) => item.id === standardId);
      const key = catalogueKey(standard?.standard_code);
      for (const process of PROCESS_CATALOGUES[key] ?? []) {
        const stableKey = process[0];
        const existing = merged.get(stableKey);
        if (existing) {
          existing.standards.add(standard.display_name);
        } else {
          merged.set(stableKey, {
            key: stableKey,
            name: process[1],
            description: process[2],
            focus: process[3],
            standards: new Set([standard.display_name]),
          });
        }
      }
    }
    return [...merged.values()].map((item) => ({ ...item, standards: [...item.standards] }));
  }, [selectedStandards, standards]);

  const visibleProcesses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return processes;
    return processes.filter((item) => `${item.name} ${item.description} ${item.focus}`.toLowerCase().includes(term));
  }, [processes, query]);

  const selectedNames = selectedProcesses
    .map((key) => processes.find((process) => process.key === key)?.name)
    .filter(Boolean);
  if (includeOther && otherProcess.trim()) selectedNames.push(`Other: ${otherProcess.trim()}`);

  const selectedScopeEntries = useMemo(() => {
    const entries = [];

    for (const standardId of selectedStandards) {
      const standard = standards.find((item) => item.id === standardId);
      const key = catalogueKey(standard?.standard_code);

      for (const process of PROCESS_CATALOGUES[key] ?? []) {
        if (!selectedProcesses.includes(process[0])) continue;

        entries.push({
          standard_id: standardId,
          scope_key: process[0],
          process_name: process[1],
        });
      }
    }

    if (includeOther && otherProcess.trim()) {
      for (const standardId of selectedStandards) {
        entries.push({
          standard_id: standardId,
          scope_key: "other",
          process_name: `Other: ${otherProcess.trim()}`,
        });
      }
    }

    return entries;
  }, [includeOther, otherProcess, selectedProcesses, selectedStandards, standards]);

  function toggleStandard(id) {
    setSelectedStandards((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleProcess(key) {
    setSelectedProcesses((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  }

  return (
    <section className="processBuilder">
      <style>{`
        .processBuilder{margin-top:2px}.processIntro{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:18px}.processIntro p{max-width:780px;margin:5px 0 0;color:#61738b;font-size:14px;line-height:1.55}.processCount{padding:9px 13px;border-radius:999px;background:#eaf1ff;color:#1556c9;font-size:12px;font-weight:900;white-space:nowrap}
        .processTools{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;margin:20px 0 14px}.processSearch{min-height:48px;padding:12px 14px;border:1px solid #cbd7e5;border-radius:11px;background:#fff;color:#102944;font:inherit;font-size:15px;outline:0}.processSearch:focus{border-color:#1761e8;box-shadow:0 0 0 4px #1761e81c}.processToolButton{padding:0 15px;border:1px solid #c9d6e5;border-radius:11px;background:#fff;color:#173451;font:inherit;font-size:13px;font-weight:850;cursor:pointer}.processToolButton:hover{border-color:#1761e8;color:#1455c8}
        .processGuidance{display:grid;grid-template-columns:auto 1fr;gap:13px;margin:17px 0;padding:16px 18px;border:1px solid #b8d9d5;border-radius:14px;background:#eefaf8;color:#174b4b}.processGuidance b{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:50%;background:#16b8b0;color:#fff}.processGuidance strong,.processGuidance span{display:block}.processGuidance span{margin-top:3px;font-size:13px;line-height:1.5}
        .processGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;max-height:610px;overflow:auto;padding:2px 5px 5px 2px}.processCard{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:13px;align-items:start;padding:16px;border:1px solid #d5e0ec;border-radius:14px;background:#f8fafd;cursor:pointer;transition:.16s}.processCard:hover{transform:translateY(-1px);border-color:#9fb9e7;background:#fff;box-shadow:0 9px 22px #11478e10}.processCard:has(input:checked){border-color:#1761e8;background:#eef4ff;box-shadow:inset 0 0 0 1px #1761e8}.processCard input{width:19px;height:19px;margin:2px 0 0;accent-color:#1761e8}.processCard strong,.processCard small{display:block}.processCard strong{font-size:14px;line-height:1.35}.processCard small{margin-top:5px;color:#61738b;font-size:12px;line-height:1.45}.processFocus{padding:5px 8px;border-radius:999px;background:#fff;color:#49617d;font-size:10px;font-weight:900;white-space:nowrap}.processEmpty{padding:28px;border:1px dashed #b9c8d9;border-radius:14px;background:#fbfcfe;color:#61738b;text-align:center}.otherProcess{margin-top:13px;padding:16px;border:1px solid #d5e0ec;border-radius:14px;background:#f8fafd}.otherChoice{display:flex;align-items:center;gap:11px;color:#102944;font-weight:850;cursor:pointer}.otherChoice input{width:19px;height:19px;accent-color:#1761e8}.otherInput{width:100%;min-height:48px;margin-top:13px;padding:12px 14px;border:1px solid #cbd7e5;border-radius:11px;background:#fff;color:#102944;font:inherit;font-size:15px;outline:0}.otherInput:focus{border-color:#1761e8;box-shadow:0 0 0 4px #1761e81c}.selectionSummary{margin-top:15px;padding:14px 16px;border-radius:12px;background:#071d39;color:#dce8f6;font-size:13px;line-height:1.5}.selectionSummary strong{color:#fff}
        @media(max-width:780px){.processIntro{align-items:flex-start;flex-direction:column}.processTools{grid-template-columns:1fr 1fr}.processSearch{grid-column:1/-1}.processGrid{grid-template-columns:1fr;max-height:none}.processCard{grid-template-columns:auto minmax(0,1fr)}.processFocus{grid-column:2}}
      `}</style>

      <fieldset className="iaStandards">
        <legend><div className="iaSectionTitle"><b>3</b>Audit standards and criteria</div></legend>
        <div className="iaStandardGrid">
          {standards.map((standard) => (
            <label className="iaStandard" key={standard.id}>
              <input type="checkbox" name="standard_ids" value={standard.id} checked={selectedStandards.includes(standard.id)} onChange={() => toggleStandard(standard.id)} />
              <span><strong>{standard.display_name}</strong><small>{standard.discipline}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="iaDivider" />
      <div className="processIntro">
        <div><div className="iaSectionTitle" style={{marginBottom: 0}}><b>4</b>Processes and operational areas</div><p>Select one or several processes. The catalogue adapts to the standards above and combines processes for integrated audits.</p></div>
        <span className="processCount">{selectedNames.length} selected</span>
      </div>

      <input type="hidden" name="processes" value={selectedNames.join("\n")} />
      <input type="hidden" name="process_scope_json" value={JSON.stringify(selectedScopeEntries)} />

      {selectedStandards.length === 0 ? (
        <div className="processEmpty">Select at least one audit standard to load its process-based audit catalogue.</div>
      ) : (
        <>
          <div className="processGuidance"><b>!</b><div><strong>Risk-based process selection</strong><span>Prioritise high-risk activities, significant hazards, recent change, incidents, previous nonconformities and areas showing weak or deteriorating performance.</span></div></div>
          <div className="processTools">
            <input className="processSearch" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search processes, controls or risk themes…" />
            <button className="processToolButton" type="button" onClick={() => setSelectedProcesses((current) => [...new Set([...current, ...visibleProcesses.map((item) => item.key)])])}>Select visible</button>
            <button className="processToolButton" type="button" onClick={() => setSelectedProcesses([])}>Clear</button>
          </div>
          <div className="processGrid">
            {visibleProcesses.map((process) => (
              <label className="processCard" key={process.key}>
                <input type="checkbox" checked={selectedProcesses.includes(process.key)} onChange={() => toggleProcess(process.key)} />
                <span><strong>{process.name}</strong><small>{process.description}</small></span>
                <span className="processFocus">{process.focus}</span>
              </label>
            ))}
          </div>
          <div className="otherProcess">
            <label className="otherChoice"><input type="checkbox" checked={includeOther} onChange={(event) => setIncludeOther(event.target.checked)} /><span>Other process or operational area</span></label>
            {includeOther ? <input className="otherInput" value={otherProcess} onChange={(event) => setOtherProcess(event.target.value)} placeholder="Enter the process, activity, project, location or specialist area…" required /> : null}
          </div>
          {selectedNames.length > 0 ? <div className="selectionSummary"><strong>Scope selection:</strong> {selectedNames.join(" · ")}</div> : null}
        </>
      )}
    </section>
  );
}
