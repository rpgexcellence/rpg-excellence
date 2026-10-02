"use client";

import { useActionState, useMemo, useState } from "react";
import { HazardIcon } from "./BCPHazardScenarioAssessment";

const arr = (value) => (Array.isArray(value) ? value : []);
const uid = () => crypto.randomUUID();
const steps = [
  "Controlled sources",
  "Response structure",
  "Activation thresholds",
  "Warning & communication",
  "Incident Action Plan",
  "Recovery & approval",
];
const personName = (person) =>
  person ? `${person.first_name} ${person.last_name}` : "";
const controlCentreName = "Emergency Response Control Centre";
const defaultTeamNames = [
  "Incident Management Team",
  controlCentreName,
  "Crisis Communications Team",
  "Business Recovery Team",
];
const alignControlCentreTerms = (value) =>
  String(value || "")
    .replace(/Emergency Operations Cent(?:re|er)/gi, controlCentreName)
    .replace(/\bEOC\b/g, "ERCC");
const alignTeam = (team) => ({
  ...team,
  name: alignControlCentreTerms(team?.name),
  responsibilities: alignControlCentreTerms(team?.responsibilities),
  procedure: alignControlCentreTerms(team?.procedure),
  authority: alignControlCentreTerms(team?.authority),
});
const alignThreshold = (threshold) => ({
  ...threshold,
  eocThreshold: alignControlCentreTerms(threshold?.eocThreshold),
});
const teamAcronyms = {
  "Incident Management Team": "IMT",
  [controlCentreName]: "ERCC",
  "Crisis Communications Team": "CCT",
  "Business Recovery Team": "BRT",
};
const teamGuidance = {
  IMT: {
    title: "Incident Management Team (IMT)",
    text: "The IMT provides tactical control at the affected site or service. It protects life and welfare, assesses and stabilises the incident, accounts for people, coordinates emergency responders, maintains the incident log and escalates verified situation reports to the ERCC.",
  },
  ERCC: {
    title: "Emergency Response Control Centre (ERCC)",
    text: "Establish a physical, virtual or hybrid control point for strategic coordination. The ERCC brings together authorised site leadership, incident management, QHSE/business continuity, affected business functions and communications. It records activation, situation reports, decisions, resource priorities and formal handback.",
  },
  CCT: {
    title: "Crisis Communications Team (CCT)",
    text: "The CCT provides one verified and authorised voice during disruption. It coordinates employee, customer, authority, supplier, community and media communications; protects confidential information; monitors misinformation; and retains the message, approval and release record.",
  },
  BRT: {
    title: "Business Recovery Team (BRT)",
    text: "The BRT activates approved continuity solutions and restores priority activities within agreed recovery objectives. It coordinates people, premises, technology, information and suppliers, tracks dependencies and constraints, validates restored services and manages controlled handback to business owners.",
  },
};
const teamControlOptions = {
  IMT: {
    authority: [
      "Activate the local incident response",
      "Protect life and order evacuation or lockdown",
      "Suspend unsafe or affected operations",
      "Deploy available site resources",
      "Request emergency-service assistance",
      "Escalate activation of the ERCC",
    ],
    responsibilities: [
      "Assess and classify the incident",
      "Protect life, welfare and the environment",
      "Stabilise and contain the incident",
      "Account for affected people",
      "Maintain the incident and decision log",
      "Provide verified situation reports to the ERCC",
    ],
    procedure: [
      "Receive and verify the alert",
      "Appoint the Incident Controller",
      "Establish an incident control point",
      "Complete the initial impact assessment",
      "Set immediate objectives and allocate actions",
      "Issue scheduled situation reports",
      "Escalate, hand over or stand down formally",
    ],
  },
  ERCC: {
    authority: [
      "Declare a major incident or crisis",
      "Approve strategic response priorities",
      "Allocate cross-functional resources",
      "Approve continuity-strategy activation",
      "Authorise executive and external escalation",
      "Approve recovery handback and stand-down",
    ],
    responsibilities: [
      "Maintain strategic command and oversight",
      "Set organisation-wide priorities",
      "Resolve resource and policy conflicts",
      "Assess legal, regulatory and stakeholder impacts",
      "Coordinate executive decisions and governance",
      "Maintain the strategic decision record",
    ],
    procedure: [
      "Activate the physical, virtual or hybrid ERCC",
      "Confirm command roles and meeting rhythm",
      "Review IMT situation reports and assumptions",
      "Approve strategic objectives and resources",
      "Coordinate continuity, communications and assurance",
      "Record decisions, owners and review times",
      "Authorise transition to recovery and closure",
    ],
  },
  CCT: {
    authority: [
      "Control incident-related communications",
      "Approve holding statements and updates",
      "Select authorised communication channels",
      "Correct inaccurate or harmful information",
      "Escalate media and reputation risks",
      "Suspend unauthorised communications",
    ],
    responsibilities: [
      "Verify information before release",
      "Coordinate employee and stakeholder messages",
      "Maintain media and social-media monitoring",
      "Protect confidential and personal information",
      "Keep a communication and approval log",
      "Align messages with the IMT and ERCC",
    ],
    procedure: [
      "Receive verified facts from the IMT or ERCC",
      "Identify audiences and communication priorities",
      "Draft and approve the holding statement",
      "Release through primary and fallback channels",
      "Monitor response, media and misinformation",
      "Issue timed updates and record approvals",
      "Publish closure and recovery communications",
    ],
  },
  BRT: {
    authority: [
      "Activate approved continuity solutions",
      "Prioritise recovery of critical activities",
      "Deploy alternate sites, systems or suppliers",
      "Approve temporary recovery workarounds",
      "Request additional recovery resources",
      "Recommend restoration and operational handback",
    ],
    responsibilities: [
      "Recover activities within approved RTOs",
      "Coordinate people, technology, facilities and suppliers",
      "Track recovery dependencies and constraints",
      "Validate restored services and data",
      "Report residual exposure and overdue recovery",
      "Manage controlled handback to business owners",
    ],
    procedure: [
      "Receive activation and recovery priorities",
      "Confirm RTOs, dependencies and minimum resources",
      "Activate selected continuity solutions",
      "Assign recovery actions and target times",
      "Validate service, safety, quality and information integrity",
      "Report recovery status to the ERCC",
      "Complete controlled handback and retain lessons",
    ],
  },
};
const selectedList = (team, key) => arr(team?.[key]);
function buildTeamProcedure(team) {
  const authorities = selectedList(team, "selectedAuthorities");
  const responsibilities = selectedList(team, "selectedResponsibilities");
  const controls = selectedList(team, "selectedProcedureControls");
  if (!authorities.length && !responsibilities.length && !controls.length)
    return team?.procedure || "";
  const lead = team?.leadPersonId
    ? "The appointed Team Lead"
    : "The authorised Team Lead";
  const parts = [];
  if (authorities.length)
    parts.push(
      `${lead} may ${authorities.map((value) => value.toLowerCase()).join("; ")}.`,
    );
  if (responsibilities.length)
    parts.push(
      `The ${team.name} shall ${responsibilities.map((value) => value.toLowerCase()).join("; ")}.`,
    );
  if (controls.length)
    parts.push(
      `On activation, the controlled procedure requires the team to ${controls.map((value) => value.toLowerCase()).join("; ")}.`,
    );
  parts.push(
    "Decisions, actions, owners, times and changes in status shall be recorded in the controlled incident log.",
  );
  return parts.join(" ");
}
const blankResponseTeam = (name) => ({
  id: `core-${teamAcronyms[name] || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  leadPersonId: "",
  alternatePersonId: "",
  authority: "",
  responsibilities: "",
  procedure: "",
  competenceEvidence: "",
  availability: "",
});
const ensureCoreTeams = (items) =>
  defaultTeamNames.map((name) => {
    const existing = arr(items)
      .map(alignTeam)
      .find((team) => team.name === name);
    return existing || blankResponseTeam(name);
  });
const sourceLabel = (row, fallback) =>
  row
    ? `${row.assessment_title || row.location_name || fallback} · v${row.version || 1} · ${String(row.status || "draft").replaceAll("_", " ")}`
    : fallback;

function PersonSelect({ label, value, people, onChange, exclude = "" }) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select Company User</option>
        {people
          .filter((person) => person.id !== exclude)
          .map((person) => (
            <option key={person.id} value={person.id}>
              {personName(person)}
              {person.position ? ` · ${person.position}` : ""}
            </option>
          ))}
      </select>
    </label>
  );
}
function Field({
  label,
  value,
  onChange,
  area = false,
  wide = false,
  ...props
}) {
  const Tag = area ? "textarea" : "input";
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      <Tag
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}
function Intro({ title, children }) {
  return (
    <div className="imIntro">
      <b>{title}</b>
      <p>{children}</p>
    </div>
  );
}
function ControlChoices({
  label,
  options,
  selected,
  onToggle,
  tone = "authority",
}) {
  return (
    <fieldset className={`imControlChoices ${tone}`}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              className={active ? "selected" : ""}
              aria-pressed={active}
              onClick={() => onToggle(option)}
            >
              {active ? "✓ " : "+ "}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
function sourceVersion(row) {
  return row ? Number(row.version) || 1 : 0;
}

function scenarioGuidance(value = "") {
  const name = String(value).toLowerCase();
  if (/active shooter|armed intruder|weapon|terror|hostile/.test(name))
    return {
      responder: "Police / emergency services",
      controls:
        "Protect life: escape if safe, otherwise secure and conceal. Call emergency services when safe, prevent entry to the affected area, account for people and preserve evidence. Do not confront the attacker.",
      eoc: "Activate the ERCC when police confirm a continuing threat, the site is evacuated or locked down, casualties are reported, or executive and cross-functional coordination is required.",
      authority: "Incident Controller",
    };
  if (/fire|explosion|smoke/.test(name))
    return {
      responder: "Fire and Rescue Service",
      controls:
        "Raise the alarm, evacuate by the approved route, call the fire service, account for people at assembly points and isolate energy only where trained and safe.",
      eoc: "Activate the ERCC for confirmed fire, loss of site access, casualties, prolonged evacuation or disruption beyond the approved activity tolerance.",
      authority: "Incident Controller / Fire Marshal",
    };
  if (/flood|storm|weather|water/.test(name))
    return {
      responder: "Emergency services / Environment Agency / utility provider",
      controls:
        "Protect life, move people away from affected areas, isolate electricity where safe, prevent access, protect critical assets and monitor official warnings.",
      eoc: "Activate the ERCC when evacuation, loss of utilities, multi-area impact or continuity strategy activation is required.",
      authority: "Incident Controller",
    };
  if (/cyber|ransom|data|information security|system outage/.test(name))
    return {
      responder:
        "IT incident response / cyber insurer / regulatory authority as applicable",
      controls:
        "Isolate affected systems without destroying evidence, activate the cyber response process, preserve logs, restrict communications to approved channels and assess reporting duties.",
      eoc: "Activate the ERCC when priority services, regulated data, multiple systems or external reporting obligations are affected.",
      authority: "Incident Controller / Information Security Lead",
    };
  if (/pandemic|epidemic|infectious|health/.test(name))
    return {
      responder: "Public health authority / emergency medical services",
      controls:
        "Protect affected people, obtain medical advice, isolate exposure where appropriate, record affected contacts and apply approved workforce and hygiene controls.",
      eoc: "Activate the ERCC when staffing, site operation, public-health direction or several priority activities are affected.",
      authority: "Incident Controller / Health and Safety Lead",
    };
  if (/power|utility|electric|gas|telecom/.test(name))
    return {
      responder: "Relevant utility provider / emergency services",
      controls:
        "Protect people from unsafe equipment, confirm the extent of loss, isolate affected systems where safe and activate approved backup arrangements.",
      eoc: "Activate the ERCC when the outage exceeds local backup capacity, affects a priority activity or requires relocation or continuity solutions.",
      authority: "Incident Controller / Facilities Lead",
    };
  return {
    responder:
      "Emergency services or competent external authority, as applicable",
    controls:
      "Protect life safety, contain the event, assess impact, account for affected people, preserve evidence and activate the relevant emergency procedure.",
    eoc: "Activate the ERCC when cross-functional coordination, executive decisions, external reporting or continuity strategy activation is required.",
    authority: "Incident Controller",
  };
}

const scoreBand = (score) =>
  Number(score) >= 20
    ? "Critical"
    : Number(score) >= 12
      ? "High"
      : Number(score) >= 6
        ? "Moderate"
        : "Low";
function liveHazardTone(item, hazardAssessment) {
  if (item?.hazardTone && item.hazardTone !== "neutral") return item.hazardTone;
  const linked = arr(hazardAssessment?.scenario_assessments).find(
    (risk) =>
      (item?.sourceId && risk.id === item.sourceId) ||
      String(risk.name || risk.scenario || "").toLowerCase() ===
        String(item?.scenario || "").toLowerCase(),
  );
  if (!linked) return "neutral";
  if (linked.residualBand || linked.riskBand)
    return linked.residualBand || linked.riskBand;
  const recordedScore = Number(
    linked.residualRisk || linked.residualScore || 0,
  );
  if (recordedScore > 0) return scoreBand(recordedScore);
  const impact = Math.max(
    ...Object.values(linked.impact || {})
      .map(Number)
      .filter(Number.isFinite),
    1,
  );
  const likelihood = Math.max(1, Math.min(5, Number(linked.likelihood) || 1));
  const effectiveness = Math.max(
    0,
    Math.min(100, Number(linked.controlEffectiveness) || 0),
  );
  const residualLikelihood = Math.max(
    1,
    Math.ceil(likelihood * (1 - effectiveness / 100)),
  );
  return scoreBand(impact * residualLikelihood);
}

const siteEmergencyContacts = (site) =>
  arr(site?.information_continuity?.emergencyContacts);
const emergencyContactKey = (contact, index = 0) =>
  contact?.id ||
  `${contact?.serviceType || "contact"}-${contact?.serviceName || index}`;
function recommendedEmergencyContact(item, site) {
  const contacts = siteEmergencyContacts(site);
  if (!contacts.length) return null;
  if (item?.responderContactKey) {
    const selected = contacts.find(
      (contact, index) =>
        emergencyContactKey(contact, index) === item.responderContactKey,
    );
    if (selected) return selected;
  }
  const target =
    `${item?.externalResponder || ""} ${item?.scenario || ""}`.toLowerCase();
  const patterns = [
    [/police|shooter|violence|terror|security/, /police/],
    [/fire|explosion|smoke/, /fire/],
    [
      /ambulance|medical|hospital|health|pandemic|illness/,
      /ambulance|medical|hospital|emergency department/,
    ],
  ];
  const match = patterns.find(([trigger]) => trigger.test(target));
  return match
    ? contacts.find((contact) =>
        match[1].test(
          `${contact.serviceType || ""} ${contact.serviceName || ""}`.toLowerCase(),
        ),
      ) || null
    : null;
}
const contactValues = (contact) =>
  contact
    ? {
        responderContactKey: emergencyContactKey(contact),
        responderName: contact.serviceName || contact.serviceType || "",
        responderAddress: contact.address || "",
        responderEmergencyNumber: contact.emergencyNumber || "",
        responderDirectNumber: contact.nonEmergencyNumber || "",
        responderTravelTime: contact.travelTimeMinutes || "",
        responderLastVerified: contact.lastVerified || "",
        responderAccessNotes: contact.accessNotes || "",
      }
    : {};

export default function BCPIncidentManagement({
  action,
  profiles = [],
  contexts = [],
  roles = [],
  hazards = [],
  bias = [],
  strategies = [],
  people = [],
  initial,
  organisationName = "",
  startStep = 0,
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [step, setStep] = useState(
    Math.max(0, Math.min(5, Number(startStep) || 0)),
  );
  const [sourceIds, setSourceIds] = useState({
    site: initial?.site_profile_id || "",
    context: initial?.context_assessment_id || "",
    roles: initial?.role_assessment_id || "",
    hazards: initial?.hazard_assessment_id || "",
    bia: initial?.bia_assessment_id || "",
    strategy: initial?.strategy_assessment_id || "",
  });
  const source = {
    site: profiles.find((item) => item.id === sourceIds.site),
    context: contexts.find((item) => item.id === sourceIds.context),
    roles: roles.find((item) => item.id === sourceIds.roles),
    hazards: hazards.find((item) => item.id === sourceIds.hazards),
    bia: bias.find((item) => item.id === sourceIds.bia),
    strategy: strategies.find((item) => item.id === sourceIds.strategy),
  };
  const [teams, setTeams] = useState(ensureCoreTeams(initial?.response_teams));
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [thresholds, setThresholds] = useState(
    arr(initial?.activation_thresholds).map(alignThreshold),
  );
  const [activeThresholdIndex, setActiveThresholdIndex] = useState(0);
  const [communications, setCommunications] = useState(
    arr(initial?.warning_communications),
  );
  const [actionPlan, setActionPlan] = useState(
    arr(initial?.incident_action_plan),
  );
  const [recovery, setRecovery] = useState({
    ...(initial?.recovery_stand_down || {}),
    eocClosureCriteria: alignControlCentreTerms(
      initial?.recovery_stand_down?.eocClosureCriteria,
    ),
  });
  const [approverPersonId, setApproverPersonId] = useState(
    initial?.approver_person_id || "",
  );

  const changeSource = (key, value) =>
    setSourceIds((current) => ({ ...current, [key]: value }));
  const changeItem = (setter) => (id, key, value) =>
    setter((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    );
  const changeTeam = changeItem(setTeams),
    changeThreshold = changeItem(setThresholds),
    changeCommunication = changeItem(setCommunications),
    changeAction = changeItem(setActionPlan);
  const changeRecovery = (key, value) =>
    setRecovery((current) => ({ ...current, [key]: value }));
  const toggleTeamControl = (id, key, value) =>
    setTeams((current) =>
      current.map((team) => {
        if (team.id !== id) return team;
        const selected = selectedList(team, key);
        const next = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
        let updated = { ...team, [key]: next };
        if (key === "selectedAuthorities") updated.authority = next.join("; ");
        if (key === "selectedResponsibilities")
          updated.responsibilities = next.join("; ");
        updated = { ...updated, procedure: buildTeamProcedure(updated) };
        return updated;
      }),
    );

  const generate = () => {
    const roleRecords = arr(source.roles?.roles);
    const generatedTeams = defaultTeamNames.map((name, index) => {
      const old = teams.find(
        (item) => alignControlCentreTerms(item.name) === name,
      );
      const linked = roleRecords.find((role) =>
        index === 0
          ? /incident|continuity|crisis/i.test(role.title || "")
          : index === 1
            ? /site leader|incident controller|emergency/i.test(
                role.title || "",
              )
            : index === 2
              ? /communication|media/i.test(role.title || "")
              : /recovery|business continuity/i.test(role.title || ""),
      );
      const options = teamControlOptions[teamAcronyms[name]];
      const selectedAuthorities = selectedList(old, "selectedAuthorities")
        .length
        ? selectedList(old, "selectedAuthorities")
        : options.authority;
      const selectedResponsibilities = selectedList(
        old,
        "selectedResponsibilities",
      ).length
        ? selectedList(old, "selectedResponsibilities")
        : options.responsibilities;
      const selectedProcedureControls = selectedList(
        old,
        "selectedProcedureControls",
      ).length
        ? selectedList(old, "selectedProcedureControls")
        : options.procedure;
      const generated = {
        ...blankResponseTeam(name),
        ...old,
        name,
        leadPersonId: old?.leadPersonId || linked?.primaryHolder || "",
        alternatePersonId:
          old?.alternatePersonId || arr(linked?.deputies)[0] || "",
        availability: old?.availability || "24/7 call-out",
        selectedAuthorities,
        selectedResponsibilities,
        selectedProcedureControls,
        authority: selectedAuthorities.join("; "),
        responsibilities: selectedResponsibilities.join("; "),
      };
      return { ...generated, procedure: buildTeamProcedure(generated) };
    });
    setTeams(generatedTeams);

    setThresholds(
      arr(source.hazards?.scenario_assessments).map((risk) => {
        const old = thresholds.find(
          (item) => item.sourceId === risk.id || item.scenario === risk.name,
        );
        const scenario = risk.name || risk.scenario || "Disruption scenario";
        const guidance = scenarioGuidance(scenario);
        const base = {
          id: uid(),
          sourceId: risk.id || "",
          sourceModule: "Module 5 · Hazard Scenarios",
          scenario,
          hazardTone: risk.residualBand || risk.riskBand || "neutral",
          activationCriteria: `Activate when ${scenario} threatens life safety, regulatory compliance or a priority activity beyond its approved tolerance.`,
          responseLevel:
            Number(risk.residualRisk || risk.riskScore || 0) >= 15
              ? "Crisis / executive"
              : "Incident management",
          initialControls: arr(risk.controls).join("; ") || guidance.controls,
          externalResponder: guidance.responder,
          eocThreshold: guidance.eoc,
          authorityToActivate: guidance.authority,
          status: "ready",
        };
        const contact = recommendedEmergencyContact(old || base, source.site);
        return old
          ? {
              ...contactValues(contact),
              ...old,
              externalResponder: old.externalResponder || guidance.responder,
              initialControls: old.initialControls || guidance.controls,
              eocThreshold: old.eocThreshold || guidance.eoc,
              authorityToActivate:
                old.authorityToActivate || guidance.authority,
            }
          : { ...base, ...contactValues(contact) };
      }),
    );
    setActiveThresholdIndex(0);

    const parties = arr(source.context?.interested_parties);
    const generatedCommunications = parties.length
      ? parties.map((party) => {
          const audience = party.party || party.name || "Interested party";
          const old = communications.find((item) => item.audience === audience);
          return (
            old || {
              id: uid(),
              audience,
              what:
                party.expectation ||
                party.requirement ||
                "Incident status, impacts, protective action and recovery information",
              when: "On activation and at agreed intervals",
              primaryMethod: "Email / telephone / approved alert",
              fallbackMethod:
                "Alternate mobile, SMS or nominated contact chain",
              ownerPersonId: party.ownerPersonId || "",
              approvalAuthority: "Incident Controller",
              logMethod: "Incident decision and communication log",
              emergencyResponder:
                /emergency|police|fire|ambulance|authority/i.test(audience),
              media: /media/i.test(audience),
            }
          );
        })
      : [
          {
            id: uid(),
            audience: "Employees and emergency contacts",
            what: "Protective action, site status and working arrangements",
            when: "Immediately on activation and at agreed intervals",
            primaryMethod: "Mass notification and email",
            fallbackMethod: "SMS and manager call tree",
            ownerPersonId: "",
            approvalAuthority: "Incident Controller",
            logMethod: "Incident communication log",
            emergencyResponder: false,
            media: false,
          },
        ];
    setCommunications(generatedCommunications);

    setActionPlan(
      arr(source.strategy?.strategy_assessments).map((activity, index) => {
        const old = actionPlan.find(
          (item) =>
            item.sourceId === activity.id || item.objective === activity.name,
        );
        return (
          old || {
            id: uid(),
            sourceId: activity.id || "",
            objective:
              index === 0
                ? "Protect life safety and stabilise the incident"
                : `Continue or recover ${activity.name || "priority activity"}`,
            action:
              activity.solutionDescription ||
              `Activate the selected continuity solution for ${activity.name || "the priority activity"}.`,
            ownerPersonId: activity.ownerPersonId || "",
            priority:
              index === 0 ? "1 - Life safety" : "3 - Business continuity",
            targetTime: activity.rtoHours
              ? `${activity.rtoHours} hours`
              : "As directed",
            resources: arr(activity.resources).join("; "),
            decisionReference: "",
            status: "open",
          }
        );
      }),
    );
  };

  const checks = useMemo(
    () => [
      Boolean(source.site && source.roles && source.hazards && source.strategy),
      teams.length > 0 &&
        teams.every(
          (item) =>
            item.name &&
            item.leadPersonId &&
            item.alternatePersonId &&
            item.leadPersonId !== item.alternatePersonId &&
            item.authority &&
            item.responsibilities &&
            item.procedure,
        ),
      thresholds.length > 0 &&
        thresholds.every(
          (item) =>
            item.scenario &&
            item.activationCriteria &&
            item.initialControls &&
            item.responseLevel,
        ),
      communications.length > 0 &&
        communications.every(
          (item) =>
            item.audience &&
            item.what &&
            item.when &&
            item.primaryMethod &&
            item.fallbackMethod &&
            item.ownerPersonId &&
            item.logMethod,
        ),
      actionPlan.length > 0 &&
        actionPlan.every(
          (item) =>
            item.objective &&
            item.action &&
            item.ownerPersonId &&
            item.priority &&
            item.status,
        ),
      [
        "normalOperationsCriteria",
        "handbackAuthority",
        "eocClosureCriteria",
        "standDownProcess",
        "employeeSupport",
        "postIncidentReview",
        "planAvailability",
      ].every((key) => recovery[key]) && Boolean(approverPersonId),
    ],
    [
      source.site,
      source.roles,
      source.hazards,
      source.strategy,
      teams,
      thresholds,
      communications,
      actionPlan,
      recovery,
      approverPersonId,
    ],
  );
  const completion = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  const persistedThresholds = thresholds.map((item) => {
    const guidance = scenarioGuidance(item.scenario);
    const completed = {
      ...item,
      externalResponder: item.externalResponder || guidance.responder,
      initialControls: item.initialControls || guidance.controls,
      eocThreshold: item.eocThreshold || guidance.eoc,
      authorityToActivate: item.authorityToActivate || guidance.authority,
    };
    return {
      ...contactValues(recommendedEmergencyContact(completed, source.site)),
      ...completed,
    };
  });

  return (
    <form action={formAction} className="imShell">
      <style>{styles}</style>
      <style>{`.imGrid>.wide{grid-column:1/-1}.imControlChoices{grid-column:1/-1;margin:0;padding:13px;border:1px solid #c7d7e6;border-radius:10px;background:#f8fbfe}.imControlChoices legend{padding:0 6px;color:#0a2342;font-size:11px;font-weight:900}.imControlChoices>div{display:flex;flex-wrap:wrap;gap:7px}.imControlChoices button{padding:8px 10px;border:1px solid #c2d2e2;border-radius:8px;background:#fff;color:#31516f;font-size:10px;font-weight:800;text-align:left}.imControlChoices button.selected{border-color:#315fe6;background:#e8efff;color:#234fb9}.imTeamDetail .imGrid{gap:22px 14px}.imTeamDetail .imGrid>.wide textarea{min-height:230px;padding:16px;border:2px solid #90aeea;border-left:6px solid #315fe6;background:#f7faff;font-size:13px;line-height:1.65}.imControlChoices{padding:18px 16px}.imControlChoices legend{font-size:12px}.imControlChoices button{padding:10px 12px;line-height:1.35}.imControlChoices.authority{border-color:#c9c0f2;background:#f6f4ff}.imControlChoices.authority legend{color:#5740bf}.imControlChoices.authority button{border-color:#c9c0f2;color:#4b399f}.imControlChoices.authority button.selected{border-color:#6047d7;background:#6047d7;color:#fff}.imControlChoices.responsibility{border-color:#9edbd0;background:#f0fbf8}.imControlChoices.responsibility legend{color:#087568}.imControlChoices.responsibility button{border-color:#a6dcd2;color:#096757}.imControlChoices.responsibility button.selected{border-color:#0b8f78;background:#0b8f78;color:#fff}.imControlChoices.procedure{border-color:#ebcb7b;background:#fff9e9}.imControlChoices.procedure legend{color:#8a5b00}.imControlChoices.procedure button{border-color:#e6c66f;color:#795400}.imControlChoices.procedure button.selected{border-color:#d7970b;background:#d7970b;color:#fff}.imTeamSelectors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.imTeamSelectors button{display:grid;grid-template-columns:48px 1fr;grid-template-rows:auto auto;gap:3px 10px;align-items:center;padding:13px;border:1px solid #c7d6e5;border-radius:11px;background:#f8fbfe;color:#173b60;text-align:left}.imTeamSelectors button>b{grid-row:1/3;display:grid;place-items:center;width:48px;height:48px;border-radius:10px;background:#e6edff;color:#315fe6;font-size:15px}.imTeamSelectors button>span{font-weight:900;line-height:1.2}.imTeamSelectors button>small{color:#6a7f94;font-size:9px}.imTeamSelectors button.active{border:2px solid #315fe6;background:#eef3ff;box-shadow:0 6px 16px #315fe620}.imTeamSelectors button.active>b{background:#315fe6;color:#fff}.imFixedTeam{padding:6px 9px;border-radius:999px;background:#e8f6f3;color:#087568;font-size:9px;font-weight:850}.imTeamDetail{margin-top:0}.imTeamDetail input[readonly]{background:#edf3f8;color:#536b82}@media(max-width:1050px){.imTeamSelectors{grid-template-columns:1fr 1fr}}@media(max-width:650px){.imTeamSelectors{grid-template-columns:1fr}}.imTeamGuidance{display:grid;gap:5px;margin-top:13px;padding:13px 15px;border-left:4px solid #20a79a;border-radius:8px;background:#eaf8f6;color:#173b60}.imTeamGuidance b{color:#087568}.imTeamGuidance.imt{border-left-color:#315fe6;background:#eef3ff}.imTeamGuidance.imt b{color:#244fbd}.imTeamGuidance.ercc{border-left-color:#20a79a;background:#eaf8f6}.imTeamGuidance.ercc b{color:#087568}.imTeamGuidance.cct{border-left-color:#7656d8;background:#f4f1ff}.imTeamGuidance.cct b{color:#5b3fc0}.imTeamGuidance.brt{border-left-color:#d7970b;background:#fff8e4}.imTeamGuidance.brt b{color:#855a00}.imTeamGuidance span{font-size:12px;line-height:1.5}.imSource{display:block;margin-top:5px;color:#168068;font-size:10px;font-weight:800}.imScenarioTitle{display:flex;align-items:center;gap:10px}.imCardTools{display:flex;gap:8px;align-items:center}.imRecommendation{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;padding:10px 12px;border-radius:8px;background:#eef4ff;color:#244c99;font-size:10px;font-weight:850}.imRecommendation button{padding:8px 10px;border:1px solid #9eb8ee;border-radius:7px;background:#fff;color:#244c99;font-weight:850}.imScenarioTitle .hazardIcon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:11px;border:1px solid #bdd0e1;background:#edf4ff;color:#2459d6}.imScenarioTitle .hazardIcon svg{width:29px;height:29px}.imScenarioTitle .hazardIcon.tone-Low{background:#dff5e9;color:#087242;border-color:#a8dfc2}.imScenarioTitle .hazardIcon.tone-Moderate{background:#fff2bf;color:#805d00;border-color:#ead377}.imScenarioTitle .hazardIcon.tone-High{background:#ffe1b8;color:#944f00;border-color:#efba78}.imScenarioTitle .hazardIcon.tone-Critical{background:#ffd4d4;color:#a61f1f;border-color:#efa4a4}.imScenarioSelectors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:4px 0 18px}.imScenarioSelectors>button{position:relative;display:grid;grid-template-columns:48px 1fr;grid-template-rows:auto auto auto;gap:3px 10px;min-height:132px;padding:14px;border:2px solid #cfdae6;border-radius:13px;background:#f8fbfe;color:#173b60;text-align:left;cursor:pointer}.imScenarioSelectors .hazardIcon{grid-row:1/4;width:48px;height:48px;display:grid;place-items:center;border-radius:11px;background:#e8efff;color:#315fe6}.imScenarioSelectors .hazardIcon svg{width:31px;height:31px}.imScenarioSelectors span{font-weight:950;line-height:1.2}.imScenarioSelectors small{color:#168068;font-size:9px;font-weight:900}.imScenarioSelectors em{position:absolute;right:10px;top:10px;padding:4px 7px;border-radius:999px;background:#e8efff;color:#315fe6;font-size:8px;font-style:normal;font-weight:900}.imScenarioSelectors b,.imScenarioSelectors i{grid-column:1/-1;font-size:9px;font-style:normal}.imScenarioSelectors b{margin-top:7px;color:#365a7d}.imScenarioSelectors i{color:#6c8094;font-weight:700}.imScenarioSelectors>button.active{border-color:#315fe6;background:#eef3ff;box-shadow:0 7px 18px #315fe626;transform:translateY(-2px)}.imScenarioSelectors>button.tone-Low{border-top-color:#15915f}.imScenarioSelectors>button.tone-Moderate{border-top-color:#d6a800}.imScenarioSelectors>button.tone-High{border-top-color:#df7b11}.imScenarioSelectors>button.tone-Critical{border-top-color:#c83333}.imScenarioSelectors>button.tone-Low em{background:#dff5e9;color:#087242}.imScenarioSelectors>button.tone-Moderate em{background:#fff2bf;color:#805d00}.imScenarioSelectors>button.tone-High em{background:#ffe1b8;color:#944f00}.imScenarioSelectors>button.tone-Critical em{background:#ffd4d4;color:#a61f1f}@media(max-width:1050px){.imScenarioSelectors{grid-template-columns:1fr 1fr}}@media(max-width:650px){.imScenarioSelectors{grid-template-columns:1fr}}`}</style>
      {[
        ["assessment_id", state?.savedId || initial?.id || ""],
        ["site_profile_id", sourceIds.site],
        ["context_assessment_id", sourceIds.context],
        ["role_assessment_id", sourceIds.roles],
        ["hazard_assessment_id", sourceIds.hazards],
        ["bia_assessment_id", sourceIds.bia],
        ["strategy_assessment_id", sourceIds.strategy],
        ["approver_person_id", approverPersonId],
        ["response_teams", JSON.stringify(teams)],
        ["activation_thresholds", JSON.stringify(persistedThresholds)],
        ["warning_communications", JSON.stringify(communications)],
        ["incident_action_plan", JSON.stringify(actionPlan)],
        ["recovery_stand_down", JSON.stringify(recovery)],
        ["next_step", Math.min(5, step + 1)],
      ].map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <aside>
        <div className="imBrand">
          <b>RPG</b> Excellence
        </div>
        <small>BCP MODULE 9</small>
        <section>
          <strong>{completion}%</strong>
          <span>complete</span>
          <i>
            <b style={{ width: `${completion}%` }} />
          </i>
        </section>
        <nav>
          {steps.map((name, index) => (
            <button
              type="button"
              key={name}
              className={step === index ? "active" : ""}
              onClick={() => setStep(index)}
            >
              <b>{checks[index] ? "✓" : index + 1}</b>
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="imLive">
          <b>DYNAMIC ENGINE</b>
          <span>{teams.length} response teams</span>
          <span>{thresholds.length} activation thresholds</span>
          <span>{communications.length} communication routes</span>
          <span>
            {actionPlan.filter((item) => item.status !== "closed").length} open
            IAP actions
          </span>
        </div>
      </aside>
      <main>
        <header className="imTop">
          <div>
            <small>STEP {step + 1} OF 6 · ISO 22301 CLAUSE 8.4</small>
            <h1>{steps[step]}</h1>
            <p>
              {organisationName || "Organisation"} · incident management,
              response and recovery
            </p>
          </div>
          <b>{String(initial?.status || "draft").replaceAll("_", " ")}</b>
        </header>
        <div className="imProgress">
          <i style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>
        {state?.error && (
          <div className={state?.savedId ? "imNotice" : "imError"}>
            <b>
              {state?.savedId
                ? "Draft saved - approval needs attention"
                : "Cannot save Module 9"}
            </b>
            <span>{state.error}</span>
          </div>
        )}

        {step === 0 && (
          <section className="imPanel">
            <Intro title="Connect the controlled evidence that drives the incident-management engine.">
              Module 9 carries forward the operating boundary, response
              authority, disruption scenarios, recovery objectives and selected
              continuity solutions. Source versions are frozen on approval.
            </Intro>
            <div className="imGrid">
              <label>
                <span>Module 1 Site Profile *</span>
                <select
                  value={sourceIds.site}
                  onChange={(e) => changeSource("site", e.target.value)}
                >
                  <option value="">Select controlled Site Profile</option>
                  {profiles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {sourceLabel(item, "Site Profile")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Module 3 Context & Interested Parties</span>
                <select
                  value={sourceIds.context}
                  onChange={(e) => changeSource("context", e.target.value)}
                >
                  <option value="">Optional controlled context</option>
                  {contexts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {sourceLabel(item, "Context")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Module 4 Roles & Responsibilities *</span>
                <select
                  value={sourceIds.roles}
                  onChange={(e) => changeSource("roles", e.target.value)}
                >
                  <option value="">Select controlled role assessment</option>
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {sourceLabel(item, "Roles")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Module 5 Hazard Scenarios *</span>
                <select
                  value={sourceIds.hazards}
                  onChange={(e) => changeSource("hazards", e.target.value)}
                >
                  <option value="">Select controlled hazard assessment</option>
                  {hazards.map((item) => (
                    <option key={item.id} value={item.id}>
                      {sourceLabel(item, "Hazards")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Module 6 Business Impact Analysis</span>
                <select
                  value={sourceIds.bia}
                  onChange={(e) => changeSource("bia", e.target.value)}
                >
                  <option value="">Optional controlled BIA</option>
                  {bias.map((item) => (
                    <option key={item.id} value={item.id}>
                      {sourceLabel(item, "BIA")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Module 8 Strategies & Solutions *</span>
                <select
                  value={sourceIds.strategy}
                  onChange={(e) => changeSource("strategy", e.target.value)}
                >
                  <option value="">
                    Select controlled strategy assessment
                  </option>
                  {strategies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {sourceLabel(item, "Strategies")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="imGenerate"
              type="button"
              onClick={generate}
              disabled={
                !source.site ||
                !source.roles ||
                !source.hazards ||
                !source.strategy
              }
            >
              ✦ Generate connected incident-management controls
            </button>
            <div className="imTrace">
              {Object.entries(source).map(([key, row]) => (
                <span className={row ? "linked" : ""} key={key}>
                  {row ? "✓" : "○"} {key.toUpperCase()}{" "}
                  {row ? `v${sourceVersion(row)}` : "not linked"}
                </span>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="imPanel">
            <Intro title="Define the four response teams, authority and deputies.">
              Select a team card to maintain its controlled structure. Use the
              guided selections to define accountable personnel, authority,
              priorities and the procedural controls that will feed the detailed
              Response Procedures.
            </Intro>
            <div className="imTeamSelectors">
              {teams.map((team, index) => {
                const lead = people.find(
                  (person) => person.id === team.leadPersonId,
                );
                const ready = Boolean(
                  team.leadPersonId &&
                  team.alternatePersonId &&
                  team.authority &&
                  team.responsibilities,
                );
                return (
                  <button
                    type="button"
                    key={team.id || team.name}
                    className={activeTeamIndex === index ? "active" : ""}
                    onClick={() => setActiveTeamIndex(index)}
                  >
                    <b>{teamAcronyms[team.name] || `T${index + 1}`}</b>
                    <span>{team.name}</span>
                    <small>
                      {lead ? personName(lead) : "Lead not assigned"} ·{" "}
                      {ready ? "Structure ready" : "Needs completion"}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className="imList">
              {teams
                .filter((_, index) => index === activeTeamIndex)
                .map((item) => {
                  const acronym = teamAcronyms[item.name] || "IMT";
                  const options = teamControlOptions[acronym] || {
                    authority: [],
                    responsibilities: [],
                    procedure: [],
                  };
                  const guidance = teamGuidance[acronym];
                  return (
                    <article className="imCard imTeamDetail" key={item.id}>
                      <header>
                        <b>
                          {String(activeTeamIndex + 1).padStart(2, "0")}{" "}
                          {item.name}
                        </b>
                        <span className="imFixedTeam">Core response team</span>
                      </header>
                      {guidance && (
                        <div
                          className={`imTeamGuidance ${acronym.toLowerCase()}`}
                        >
                          <b>{guidance.title}</b>
                          <span>{guidance.text}</span>
                        </div>
                      )}
                      <div className="imGrid">
                        <Field
                          label="Team name *"
                          value={item.name}
                          readOnly
                          onChange={() => {}}
                        />
                        <PersonSelect
                          label="Team lead *"
                          value={item.leadPersonId}
                          people={people}
                          exclude={item.alternatePersonId}
                          onChange={(value) =>
                            changeTeam(item.id, "leadPersonId", value)
                          }
                        />
                        <PersonSelect
                          label="Alternate *"
                          value={item.alternatePersonId}
                          people={people}
                          exclude={item.leadPersonId}
                          onChange={(value) =>
                            changeTeam(item.id, "alternatePersonId", value)
                          }
                        />
                        <Field
                          label="Call-out availability"
                          value={item.availability}
                          onChange={(value) =>
                            changeTeam(item.id, "availability", value)
                          }
                        />
                        <ControlChoices
                          tone="authority"
                          label="Decision authority * — select all that apply"
                          options={options.authority}
                          selected={selectedList(item, "selectedAuthorities")}
                          onToggle={(value) =>
                            toggleTeamControl(
                              item.id,
                              "selectedAuthorities",
                              value,
                            )
                          }
                        />
                        <ControlChoices
                          tone="responsibility"
                          label="Responsibilities and priorities * — select all that apply"
                          options={options.responsibilities}
                          selected={selectedList(
                            item,
                            "selectedResponsibilities",
                          )}
                          onToggle={(value) =>
                            toggleTeamControl(
                              item.id,
                              "selectedResponsibilities",
                              value,
                            )
                          }
                        />
                        <ControlChoices
                          tone="procedure"
                          label="Procedure controls * — select all that apply"
                          options={options.procedure}
                          selected={selectedList(
                            item,
                            "selectedProcedureControls",
                          )}
                          onToggle={(value) =>
                            toggleTeamControl(
                              item.id,
                              "selectedProcedureControls",
                              value,
                            )
                          }
                        />
                        <Field
                          wide
                          area
                          label="Generated procedural control *"
                          value={item.procedure}
                          onChange={(value) =>
                            changeTeam(item.id, "procedure", value)
                          }
                        />
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="imPanel">
            <Intro title="Set scenario-specific activation, ERCC and escalation thresholds.">
              Thresholds are generated from Module 5. RPG recommends the
              immediate controls, responder route and escalation trigger for
              each scenario; the plan owner can edit them before approval.
            </Intro>
            <button
              type="button"
              className="imGenerate"
              onClick={() => {
                const manualThreshold = {
                  id: uid(),
                  sourceId: "",
                  sourceModule: "Manual entry",
                  scenario: "",
                  activationCriteria: "",
                  responseLevel: "Incident management",
                  initialControls: "",
                  externalResponder: "",
                  eocThreshold: "",
                  authorityToActivate: "Incident Controller",
                  status: "draft",
                };
                setThresholds([...thresholds, manualThreshold]);
                setActiveThresholdIndex(thresholds.length);
              }}
            >
              + Add manual scenario
            </button>
            <datalist id="incidentResponders">
              <option value="Police / emergency services" />
              <option value="Fire and Rescue Service" />
              <option value="Emergency medical services" />
              <option value="Environment Agency / environmental authority" />
              <option value="Relevant utility provider" />
              <option value="IT incident response / cyber insurer" />
            </datalist>
            <div
              className="imScenarioSelectors"
              role="tablist"
              aria-label="Activation scenarios"
            >
              {thresholds.map((item, index) => {
                const tone = liveHazardTone(item, source.hazards);
                const guidance = scenarioGuidance(item.scenario);
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeThresholdIndex === index}
                    className={`tone-${tone} ${activeThresholdIndex === index ? "active" : ""}`}
                    key={item.id}
                    onClick={() => setActiveThresholdIndex(index)}
                  >
                    <HazardIcon
                      name={item.scenario || "Custom disruption scenario"}
                      tone={tone}
                    />
                    <span>{item.scenario || "New manual scenario"}</span>
                    <small>
                      {item.sourceId ? "Live · Module 5" : "Manual scenario"}
                    </small>
                    <em>
                      {tone !== "neutral" ? `${tone} risk` : "Risk pending"}
                    </em>
                    <b>{item.responseLevel || "Response level pending"}</b>
                    <i>{item.externalResponder || guidance.responder}</i>
                  </button>
                );
              })}
            </div>
            <div className="imList">
              {thresholds
                .filter((_, index) => index === activeThresholdIndex)
                .map((item) => {
                  const index = thresholds.findIndex(
                    (threshold) => threshold.id === item.id,
                  );
                  const recommendation = scenarioGuidance(item.scenario);
                  const tone = liveHazardTone(item, source.hazards);
                  const contacts = siteEmergencyContacts(source.site);
                  const linkedContact = recommendedEmergencyContact(
                    item,
                    source.site,
                  );
                  const selectedContactKey =
                    item.responderContactKey ||
                    (linkedContact
                      ? emergencyContactKey(
                          linkedContact,
                          contacts.indexOf(linkedContact),
                        )
                      : "");
                  return (
                    <article className="imCard" key={item.id}>
                      <header>
                        <div className="imScenarioTitle">
                          <HazardIcon
                            name={item.scenario || "Custom disruption scenario"}
                            tone={tone}
                          />
                          <div>
                            <b>
                              {String(index + 1).padStart(2, "0")}{" "}
                              {item.scenario || "New scenario"}
                            </b>
                            <small className="imSource">
                              {item.sourceId
                                ? "✓ Linked to Module 5"
                                : "Manual threshold"}{" "}
                              ·{" "}
                              {tone !== "neutral"
                                ? `${tone} residual risk · `
                                : ""}
                              {item.status || "draft"}
                            </small>
                          </div>
                        </div>
                        <div className="imCardTools">
                          <select
                            value={item.responseLevel}
                            onChange={(e) =>
                              changeThreshold(
                                item.id,
                                "responseLevel",
                                e.target.value,
                              )
                            }
                          >
                            <option>Local response</option>
                            <option>Incident management</option>
                            <option>Crisis / executive</option>
                          </select>
                          {!item.sourceId && (
                            <button
                              type="button"
                              onClick={() => {
                                setThresholds(
                                  thresholds.filter(
                                    (threshold) => threshold.id !== item.id,
                                  ),
                                );
                                setActiveThresholdIndex(0);
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </header>
                      <div className="imGrid">
                        <Field
                          label="Scenario *"
                          value={item.scenario}
                          readOnly={Boolean(item.sourceId)}
                          onChange={(value) =>
                            changeThreshold(item.id, "scenario", value)
                          }
                        />
                        <Field
                          label="Authority to activate *"
                          value={item.authorityToActivate}
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "authorityToActivate",
                              value,
                            )
                          }
                        />
                        <Field
                          area
                          label="Activation criteria / measurable impact threshold *"
                          value={item.activationCriteria}
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "activationCriteria",
                              value,
                            )
                          }
                        />
                        <Field
                          area
                          label="Immediate life-safety and containment controls *"
                          value={item.initialControls}
                          onChange={(value) =>
                            changeThreshold(item.id, "initialControls", value)
                          }
                        />
                        <Field
                          label="External responder / competent authority"
                          list="incidentResponders"
                          value={
                            item.externalResponder || recommendation.responder
                          }
                          onChange={(value) =>
                            changeThreshold(item.id, "externalResponder", value)
                          }
                        />
                        <label>
                          <span>Verified responder contact · Module 1</span>
                          <select
                            value={selectedContactKey}
                            onChange={(event) => {
                              const key = event.target.value;
                              const contact = contacts.find(
                                (entry, contactIndex) =>
                                  emergencyContactKey(entry, contactIndex) ===
                                  key,
                              );
                              setThresholds((current) =>
                                current.map((threshold) =>
                                  threshold.id === item.id
                                    ? {
                                        ...threshold,
                                        responderContactKey: key,
                                        responderName: "",
                                        responderAddress: "",
                                        responderEmergencyNumber: "",
                                        responderDirectNumber: "",
                                        responderTravelTime: "",
                                        responderLastVerified: "",
                                        responderAccessNotes: "",
                                        ...contactValues(contact),
                                      }
                                    : threshold,
                                ),
                              );
                            }}
                          >
                            <option value="">
                              Select from Site Profile emergency directory
                            </option>
                            {contacts.map((contact, contactIndex) => (
                              <option
                                key={emergencyContactKey(contact, contactIndex)}
                                value={emergencyContactKey(
                                  contact,
                                  contactIndex,
                                )}
                              >
                                {contact.serviceName ||
                                  contact.serviceType ||
                                  "Emergency contact"}
                                {contact.emergencyNumber
                                  ? ` · ${contact.emergencyNumber}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field
                          area
                          label="ERCC activation / executive escalation trigger"
                          value={item.eocThreshold}
                          onChange={(value) =>
                            changeThreshold(item.id, "eocThreshold", value)
                          }
                        />
                        <Field
                          label="Responder / facility name"
                          value={
                            item.responderName ||
                            linkedContact?.serviceName ||
                            linkedContact?.serviceType ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(item.id, "responderName", value)
                          }
                        />
                        <Field
                          area
                          label="Responder address / location"
                          value={
                            item.responderAddress ||
                            linkedContact?.address ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(item.id, "responderAddress", value)
                          }
                        />
                        <Field
                          label="Emergency telephone"
                          type="tel"
                          value={
                            item.responderEmergencyNumber ||
                            linkedContact?.emergencyNumber ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "responderEmergencyNumber",
                              value,
                            )
                          }
                        />
                        <Field
                          label="Direct / non-emergency telephone"
                          type="tel"
                          value={
                            item.responderDirectNumber ||
                            linkedContact?.nonEmergencyNumber ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "responderDirectNumber",
                              value,
                            )
                          }
                        />
                        <Field
                          label="Estimated travel time (minutes)"
                          type="number"
                          min="0"
                          value={
                            item.responderTravelTime ||
                            linkedContact?.travelTimeMinutes ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "responderTravelTime",
                              value,
                            )
                          }
                        />
                        <Field
                          label="Contact last verified"
                          type="date"
                          value={
                            item.responderLastVerified ||
                            linkedContact?.lastVerified ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "responderLastVerified",
                              value,
                            )
                          }
                        />
                        <Field
                          area
                          label="Access, arrival and route instructions"
                          value={
                            item.responderAccessNotes ||
                            linkedContact?.accessNotes ||
                            linkedContact?.directionsReference ||
                            ""
                          }
                          onChange={(value) =>
                            changeThreshold(
                              item.id,
                              "responderAccessNotes",
                              value,
                            )
                          }
                        />
                      </div>
                      <div className="imRecommendation">
                        <span>RPG scenario recommendation</span>
                        <button
                          type="button"
                          onClick={() =>
                            setThresholds((current) =>
                              current.map((threshold) =>
                                threshold.id === item.id
                                  ? {
                                      ...threshold,
                                      initialControls: recommendation.controls,
                                      externalResponder:
                                        recommendation.responder,
                                      eocThreshold: recommendation.eoc,
                                      authorityToActivate:
                                        recommendation.authority,
                                    }
                                  : threshold,
                              ),
                            )
                          }
                        >
                          Apply recommended controls
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="imPanel">
            <Intro title="Control warning, communication, emergency responder and media routes.">
              Record what, when, with whom and how to communicate, including
              fallback channels and the method used to log incoming and outgoing
              information and decisions.
            </Intro>
            <button
              type="button"
              className="imGenerate"
              onClick={() =>
                setCommunications([
                  ...communications,
                  {
                    id: uid(),
                    audience: "",
                    what: "",
                    when: "",
                    primaryMethod: "",
                    fallbackMethod: "",
                    ownerPersonId: "",
                    approvalAuthority: "",
                    logMethod: "",
                    emergencyResponder: false,
                    media: false,
                  },
                ])
              }
            >
              + Add communication route
            </button>
            <div className="imList">
              {communications.map((item, index) => (
                <article className="imCard" key={item.id}>
                  <header>
                    <b>
                      {String(index + 1).padStart(2, "0")}{" "}
                      {item.audience || "New audience"}
                    </b>
                    <div className="imFlags">
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(item.emergencyResponder)}
                          onChange={(e) =>
                            changeCommunication(
                              item.id,
                              "emergencyResponder",
                              e.target.checked,
                            )
                          }
                        />{" "}
                        Emergency responder
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(item.media)}
                          onChange={(e) =>
                            changeCommunication(
                              item.id,
                              "media",
                              e.target.checked,
                            )
                          }
                        />{" "}
                        Media route
                      </label>
                    </div>
                  </header>
                  <div className="imGrid">
                    <Field
                      label="Audience / interested party *"
                      value={item.audience}
                      onChange={(value) =>
                        changeCommunication(item.id, "audience", value)
                      }
                    />
                    <PersonSelect
                      label="Communication owner *"
                      value={item.ownerPersonId}
                      people={people}
                      onChange={(value) =>
                        changeCommunication(item.id, "ownerPersonId", value)
                      }
                    />
                    <Field
                      area
                      label="What will be communicated *"
                      value={item.what}
                      onChange={(value) =>
                        changeCommunication(item.id, "what", value)
                      }
                    />
                    <Field
                      area
                      label="Trigger and frequency *"
                      value={item.when}
                      onChange={(value) =>
                        changeCommunication(item.id, "when", value)
                      }
                    />
                    <Field
                      label="Primary method *"
                      value={item.primaryMethod}
                      onChange={(value) =>
                        changeCommunication(item.id, "primaryMethod", value)
                      }
                    />
                    <Field
                      label="Fallback method *"
                      value={item.fallbackMethod}
                      onChange={(value) =>
                        changeCommunication(item.id, "fallbackMethod", value)
                      }
                    />
                    <Field
                      label="Message approval authority"
                      value={item.approvalAuthority}
                      onChange={(value) =>
                        changeCommunication(item.id, "approvalAuthority", value)
                      }
                    />
                    <Field
                      label="Communication / decision log *"
                      value={item.logMethod}
                      onChange={(value) =>
                        changeCommunication(item.id, "logMethod", value)
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="imPanel">
            <Intro title="Create the controlled Incident Action Plan.">
              Life safety is always the first priority. Add stabilisation,
              environmental protection, security, continuity and recovery
              objectives with accountable owners and live status.
            </Intro>
            <button
              type="button"
              className="imGenerate"
              onClick={() =>
                setActionPlan([
                  ...actionPlan,
                  {
                    id: uid(),
                    objective: "",
                    action: "",
                    ownerPersonId: "",
                    priority: "2 - Stabilisation",
                    targetTime: "",
                    resources: "",
                    decisionReference: "",
                    status: "open",
                  },
                ])
              }
            >
              + Add Incident Action
            </button>
            <div className="imActions">
              <header>
                <b>Objective</b>
                <b>Action</b>
                <b>Owner</b>
                <b>Priority</b>
                <b>Target</b>
                <b>Status</b>
              </header>
              {actionPlan.map((item) => (
                <article key={item.id}>
                  <input
                    value={item.objective}
                    onChange={(e) =>
                      changeAction(item.id, "objective", e.target.value)
                    }
                    placeholder="Incident objective"
                  />
                  <textarea
                    value={item.action}
                    onChange={(e) =>
                      changeAction(item.id, "action", e.target.value)
                    }
                    placeholder="Action and expected result"
                  />
                  <select
                    value={item.ownerPersonId}
                    onChange={(e) =>
                      changeAction(item.id, "ownerPersonId", e.target.value)
                    }
                  >
                    <option value="">Select owner</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {personName(person)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={item.priority}
                    onChange={(e) =>
                      changeAction(item.id, "priority", e.target.value)
                    }
                  >
                    <option>1 - Life safety</option>
                    <option>2 - Stabilisation</option>
                    <option>3 - Business continuity</option>
                    <option>4 - Recovery</option>
                  </select>
                  <input
                    value={item.targetTime}
                    onChange={(e) =>
                      changeAction(item.id, "targetTime", e.target.value)
                    }
                    placeholder="e.g. 2 hours"
                  />
                  <select
                    value={item.status}
                    onChange={(e) =>
                      changeAction(item.id, "status", e.target.value)
                    }
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="closed">Closed</option>
                  </select>
                  <details>
                    <summary>Resources and decision record</summary>
                    <div className="imGrid">
                      <Field
                        area
                        label="Resources / dependencies"
                        value={item.resources}
                        onChange={(value) =>
                          changeAction(item.id, "resources", value)
                        }
                      />
                      <Field
                        area
                        label="Decision / evidence reference"
                        value={item.decisionReference}
                        onChange={(value) =>
                          changeAction(item.id, "decisionReference", value)
                        }
                      />
                    </div>
                  </details>
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="imPanel">
            <Intro title="Control recovery, handback, stand-down and approval.">
              The plan must define how temporary measures end, authority
              returns, outstanding actions are retained and people receive
              post-incident support.
            </Intro>
            <div className="imStats">
              <article>
                <b>{teams.length}</b>
                <span>response teams</span>
              </article>
              <article>
                <b>{thresholds.length}</b>
                <span>thresholds</span>
              </article>
              <article>
                <b>{communications.length}</b>
                <span>communication routes</span>
              </article>
              <article>
                <b>
                  {actionPlan.filter((item) => item.status !== "closed").length}
                </b>
                <span>open actions</span>
              </article>
            </div>
            <div className="imGrid">
              <Field
                area
                label="Criteria for return to normal operations *"
                value={recovery.normalOperationsCriteria || ""}
                onChange={(value) =>
                  changeRecovery("normalOperationsCriteria", value)
                }
              />
              <Field
                area
                label="Authority handback process *"
                value={recovery.handbackAuthority || ""}
                onChange={(value) => changeRecovery("handbackAuthority", value)}
              />
              <Field
                area
                label="ERCC deactivation and closure criteria *"
                value={recovery.eocClosureCriteria || ""}
                onChange={(value) =>
                  changeRecovery("eocClosureCriteria", value)
                }
              />
              <Field
                area
                label="Formal stand-down process *"
                value={recovery.standDownProcess || ""}
                onChange={(value) => changeRecovery("standDownProcess", value)}
              />
              <Field
                area
                label="Post-incident employee assistance *"
                value={recovery.employeeSupport || ""}
                onChange={(value) => changeRecovery("employeeSupport", value)}
              />
              <Field
                area
                label="Post-incident review, actions and lessons *"
                value={recovery.postIncidentReview || ""}
                onChange={(value) =>
                  changeRecovery("postIncidentReview", value)
                }
              />
              <Field
                area
                label="Plan availability during disruption *"
                value={recovery.planAvailability || ""}
                onChange={(value) => changeRecovery("planAvailability", value)}
                placeholder="Offline copy, emergency pack, alternate site, controlled mobile copy"
              />
              <Field
                area
                label="Security during and after the incident"
                value={recovery.securityControls || ""}
                onChange={(value) => changeRecovery("securityControls", value)}
              />
              <label>
                <span>Review frequency</span>
                <select
                  name="review_frequency"
                  defaultValue={initial?.review_frequency || "Every 12 months"}
                >
                  <option>Every 6 months</option>
                  <option>Every 12 months</option>
                  <option>After every exercise</option>
                  <option>After every activation</option>
                  <option>After material change</option>
                </select>
              </label>
              <label>
                <span>Next review date</span>
                <input
                  type="date"
                  name="next_review_date"
                  defaultValue={initial?.next_review_date || ""}
                />
              </label>
              <PersonSelect
                label="Competent approver · Company User *"
                value={approverPersonId}
                people={people}
                onChange={setApproverPersonId}
              />
              <label>
                <span>Decision, limitations and residual exposure</span>
                <textarea
                  name="review_comment"
                  defaultValue={initial?.review_comment || ""}
                />
              </label>
            </div>
          </section>
        )}

        <footer>
          <button
            type="button"
            disabled={!step || pending}
            onClick={() => setStep(step - 1)}
          >
            ← Previous
          </button>
          {initial?.id && (
            <button
              className="danger"
              name="intent"
              value="archive"
              disabled={pending}
            >
              Archive
            </button>
          )}
          <span>
            {pending
              ? "Saving..."
              : "Controlled progress saves to your account"}
          </span>
          {state?.error && (
            <strong className="imFooterNotice">{state.error}</strong>
          )}
          {step < 5 ? (
            <button
              className="primary"
              name="intent"
              value="continue"
              disabled={pending || !source.site}
            >
              Save & continue →
            </button>
          ) : (
            <>
              <button name="intent" value="draft" disabled={pending}>
                Save draft
              </button>
              <button name="intent" value="review" disabled={pending}>
                Submit for review
              </button>
              <button
                className="primary"
                name="intent"
                value="approve"
                disabled={pending}
              >
                Approve Module 9 →
              </button>
            </>
          )}
        </footer>
      </main>
    </form>
  );
}

const styles = `*{box-sizing:border-box}.imShell{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;color:#0a2342;font-family:Arial,sans-serif}.imShell>aside{position:sticky;top:20px;height:calc(100vh - 40px);padding:27px 20px;border-radius:18px;background:#0b2d56;color:#fff;overflow:auto}.imBrand{font-size:21px}.imBrand b{font-weight:950}.imShell>aside>small{display:block;margin:8px 0 20px;color:#55e1d4;font-weight:900;letter-spacing:.14em}.imShell>aside>section{padding:16px;border-radius:12px;background:#ffffff0a}.imShell>aside>section strong{font-size:28px}.imShell>aside>section span{float:right;margin-top:10px;font-size:10px}.imShell>aside>section i{display:block;height:5px;clear:both;margin-top:12px;background:#ffffff20;border-radius:4px;overflow:hidden}.imShell>aside>section i b{display:block;height:100%;background:#55e1d4}.imShell nav{display:grid;gap:6px;margin-top:18px}.imShell nav button{display:flex;gap:10px;align-items:center;padding:11px;border:0;border-radius:9px;background:transparent;color:#dce8f5;text-align:left}.imShell nav button.active{background:#245d97}.imShell nav button>b{display:grid;place-items:center;width:27px;height:27px;border:1px solid #4b779f;border-radius:7px;color:#61dfd3}.imLive{display:grid;gap:7px;margin-top:24px;padding-top:18px;border-top:1px solid #ffffff25;font-size:10px}.imLive b{color:#55e1d4}.imShell main{min-width:0}.imTop{display:flex;justify-content:space-between;gap:20px;align-items:end}.imTop small{color:#285fe1;font-size:11px;font-weight:950;letter-spacing:.12em}.imTop h1{margin:7px 0 4px;font-size:37px}.imTop p{margin:0;color:#607890}.imTop>b{text-transform:capitalize;color:#087c61}.imProgress{height:6px;margin:18px 0;background:#d6e2ee;border-radius:6px;overflow:hidden}.imProgress i{display:block;height:100%;background:linear-gradient(90deg,#315fe6,#21b5a7)}.imPanel{padding:24px;border:1px solid #cddbe7;border-radius:17px;background:#fff}.imIntro{padding:19px;border-radius:12px;background:#eff5fa}.imIntro b{font-size:17px}.imIntro p{margin:7px 0 0;color:#60778e;line-height:1.5}.imGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:15px}.imGrid label{font-size:11px;font-weight:850}.imGrid label>span{display:block}.imGrid input,.imGrid select,.imGrid textarea,.imActions input,.imActions select,.imActions textarea,.imCard header select{width:100%;margin-top:6px;padding:10px;border:1px solid #bfd0df;border-radius:8px;background:#fbfdff;color:#173b60;font:inherit}.imGrid textarea{min-height:92px}.imGenerate{margin:16px 0;padding:11px 14px;border:0;border-radius:8px;background:#315fe6;color:#fff;font-weight:850}.imGenerate:disabled{opacity:.45}.imTrace{display:flex;flex-wrap:wrap;gap:8px}.imTrace span{padding:8px 10px;border-radius:999px;background:#f0f3f6;color:#718396;font-size:10px;font-weight:850}.imTrace span.linked{background:#e5f7f1;color:#08745d}.imList{display:grid;gap:13px}.imCard{padding:17px;border:1px solid #cfdae6;border-left:5px solid #315fe6;border-radius:12px}.imCard>header{display:flex;justify-content:space-between;gap:12px;align-items:center}.imCard>header button{padding:8px;border:0;border-radius:7px;background:#fff0ed;color:#ae2a1c;font-weight:800}.imFlags{display:flex;gap:10px;font-size:10px}.imFlags input{accent-color:#315fe6}.imActions{margin-top:16px;border:1px solid #d0dce7;border-radius:11px;overflow:auto}.imActions>header,.imActions>article{min-width:1100px;display:grid;grid-template-columns:1.2fr 1.7fr 1fr .9fr .7fr .7fr;gap:8px;padding:11px}.imActions>header{background:#0b2d56;color:#fff;font-size:10px}.imActions>article{border-top:1px solid #e0e8ef}.imActions textarea{min-height:48px}.imActions details{grid-column:1/-1}.imStats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:15px}.imStats article{padding:14px;border:1px solid #d3dfeb;border-radius:10px;background:#f8fbfe}.imStats b{display:block;color:#315fe6;font-size:25px}.imStats span{color:#60778e;font-size:10px}.imError,.imNotice{display:grid;gap:4px;margin-bottom:13px;padding:13px;border-radius:10px}.imError{border:1px solid #f0b5ad;background:#fff1ef;color:#9c241a}.imNotice{border:1px solid #e4c65c;background:#fff8dc;color:#725800}.imShell footer{display:flex;gap:9px;align-items:center;margin-top:14px;padding:12px;border:1px solid #cfdae5;border-radius:13px;background:#fff}.imShell footer>span{margin-left:auto;color:#6f8396;font-size:11px}.imShell footer button{padding:11px 14px;border:1px solid #c5d4e2;border-radius:8px;background:#fff;color:#183c61;font-weight:850}.imShell footer .primary{border-color:#315fe6;background:#315fe6;color:#fff}.imShell footer .danger{border-color:#efbcb5;background:#fff3f1;color:#b42318}.imFooterNotice{max-width:420px;padding:7px;background:#fff7d7;color:#765b00;font-size:9px}@media(max-width:1100px){.imShell{grid-template-columns:80px 1fr}.imBrand,.imShell>aside>small,.imShell nav span,.imLive{display:none}.imShell nav button{justify-content:center}.imGrid{grid-template-columns:1fr}}@media(max-width:720px){.imShell{display:block}.imShell>aside{position:static;height:auto;margin-bottom:15px;padding:15px}.imShell nav{display:flex;overflow:auto}.imStats{grid-template-columns:1fr 1fr}.imTop h1{font-size:29px}.imShell footer{flex-wrap:wrap}.imShell footer>span{display:none}}`;
