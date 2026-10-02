"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

const catalogue = {
  "People & security": [
    "Active shooter",
    "Contagious illness",
    "Pandemic",
    "Terrorism",
    "Workplace violence",
    "Sabotage",
  ],
  "Technology & infrastructure": [
    "Cyber attack",
    "IT-related failure",
    "Mechanical breakdown",
    "Utility outage",
    "Electric power supply failure",
    "Facility / physical security failure",
  ],
  "Supply chain & transport": [
    "Customs / border crossing issue",
    "Import or export issue",
    "Supplier failure",
    "Transportation failure / vehicle collision",
    "Plane crash",
  ],
  "Natural & environmental": [
    "Earthquake",
    "Explosion",
    "Fire",
    "Flooding / dam or levee failure",
    "Foodborne illness",
    "Hazardous-material spill or release",
    "Hurricane",
    "Landslide",
    "Radiation / electromagnetic pulse",
    "Radiation / thermal",
    "Subsidence / sinkhole",
    "Severe thunderstorm",
    "Tornado",
    "Tropical storm",
    "Tsunami",
    "Volcano",
    "Windstorm",
    "Winter storm",
  ],
  "Integrity & compliance": ["Bribery and corruption", "Insider trading"],
};
const steps = [
  "Linked scope",
  "Hazard screening",
  "Risk analysis",
  "Controls",
  "Treatment & approval",
  "Risk register",
];
const uid = () => crypto.randomUUID();
const arr = (value) => (Array.isArray(value) ? value : []);
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));
const band = (score) =>
  score >= 20
    ? "Critical"
    : score >= 12
      ? "High"
      : score >= 6
        ? "Moderate"
        : "Low";
const impactLabels = [
  "",
  "Insignificant",
  "Minor",
  "Moderate",
  "Major",
  "Severe",
];
const likelihoodLabels = [
  "",
  "Rare",
  "Unlikely",
  "Possible",
  "Likely",
  "Almost certain",
];
const systems = {
  Q: "Quality · ISO 9001",
  E: "Environment · ISO 14001",
  S: "OH&S · ISO 45001",
  B: "Business continuity · ISO 22301",
  IS: "Information security · ISO 27001",
};
const hazardCategories = [
  "Work organisation and social factors",
  "Infrastructure, equipment, materials and workplace conditions",
  "Design, production, delivery, maintenance and disposal",
  "Human factors",
  "How work is performed",
  "Past incidents, emergencies and their causes",
  "Potential emergency situations",
  "Employees, contractors, visitors and others",
  "People in the vicinity who may be affected",
  "People working at locations outside direct control",
  "Design or adaptation of the work environment",
  "Nearby situations caused by controlled activities",
  "External nearby situations outside organisational control",
  "Actual or proposed organisational, operational or process change",
  "Changes in hazard knowledge or information",
];
const impactKeys = {
  injury: "Injury / people",
  collision: "Collision",
  environment: "Environment · soil, water or air",
  energy: "Environment · energy use",
  assets: "Organisation assets",
  customerAssets: "Customer assets",
  reputation: "Reputation",
  legal: "Legal / contractual",
};
const starter = {
  Fire: {
    systems: ["E", "S", "B"],
    hazards: [1, 2, 3, 5, 6, 7, 13],
    controls: [
      "Fire-risk assessment is current and approved",
      "Detection, alarm and suppression systems are inspected",
      "Extinguishers and evacuation routes are maintained",
      "Fire wardens and periodic evacuation drills are recorded",
      "Flammable materials and batteries are safely controlled",
    ],
  },
  Pandemic: {
    systems: ["Q", "S", "B"],
    hazards: [0, 3, 6, 7, 8, 9, 13],
    controls: [
      "Remote-working and workforce-separation arrangements are tested",
      "Critical-role succession and cross-training are maintained",
      "Health guidance, absence monitoring and escalation triggers are defined",
    ],
  },
  "Cyber attack": {
    systems: ["Q", "B", "IS"],
    hazards: [1, 3, 5, 6, 13, 14],
    controls: [
      "Phishing-resistant access controls and privileged-account reviews operate",
      "Backups are isolated and recovery is tested",
      "Security monitoring, incident response and supplier escalation are exercised",
    ],
  },
  "IT-related failure": {
    systems: ["Q", "B", "IS"],
    hazards: [1, 2, 3, 5, 6, 13],
    controls: [
      "Resilient infrastructure and monitored failover are maintained",
      "Backup and restoration tests are evidenced",
      "Incident escalation and manual workarounds are documented",
    ],
  },
  "Mechanical breakdown": {
    systems: ["Q", "E", "S", "B"],
    hazards: [1, 2, 3, 5, 6, 13],
    controls: [
      "Preventive maintenance and statutory inspections are current",
      "Critical spares and competent maintenance cover are available",
      "Isolation, shutdown and recovery procedures are tested",
    ],
  },
  "Utility outage": {
    systems: ["Q", "E", "S", "B", "IS"],
    hazards: [1, 3, 5, 6, 13],
    controls: [
      "Critical utilities and single points of failure are documented",
      "Backup power and safe shutdown arrangements are tested",
      "Utility-provider escalation and recovery priorities are agreed",
    ],
  },
  "Supplier failure": {
    systems: ["Q", "E", "S", "B", "IS"],
    hazards: [2, 5, 6, 7, 13],
    controls: [
      "Critical suppliers are tiered and reviewed",
      "Alternative sources and minimum stock levels are defined",
      "Contractual notification and continuity requirements are monitored",
    ],
  },
  Sabotage: {
    systems: ["Q", "S", "B", "IS"],
    hazards: [3, 5, 6, 7, 8, 13],
    controls: [
      "Physical and logical access is role-controlled",
      "Security incidents and suspicious activity are escalated",
      "Critical areas, assets and changes are monitored",
    ],
  },
  Terrorism: {
    systems: ["S", "B"],
    hazards: [5, 6, 7, 8, 9, 11, 12],
    controls: [
      "Threat levels and official guidance are monitored",
      "Lockdown, evacuation and communications plans are exercised",
      "Critical staff and alternate operating locations are identified",
    ],
  },
  "Transportation failure / vehicle collision": {
    systems: ["Q", "E", "S", "B"],
    hazards: [1, 2, 3, 5, 6, 8, 13],
    controls: [
      "Journey, driver and vehicle controls are defined",
      "Alternative carriers and routes are available",
      "Incident notification and cargo recovery arrangements are tested",
    ],
  },
  "Hazardous-material spill or release": {
    systems: ["E", "S", "B"],
    hazards: [1, 2, 3, 5, 6, 7, 8, 11],
    controls: [
      "Substance inventories and safety data are current",
      "Secondary containment and spill response equipment are inspected",
      "Trained responders, isolation and notification arrangements are tested",
    ],
  },
  "Insider trading": {
    systems: ["Q", "IS"],
    hazards: [0, 3, 5, 7, 13],
    controls: [
      "Restricted information and dealing windows are controlled",
      "Conflicts, attestations and surveillance are reviewed",
      "Suspected breaches are independently investigated",
    ],
  },
};
const emptyImpact = () =>
  Object.fromEntries(Object.keys(impactKeys).map((k) => [k, 0]));
const emptyRisk = (name = "") => {
  const preset = starter[name] || {};
  return {
    id: uid(),
    recordNumber: "",
    assessmentDate: "",
    name,
    category:
      Object.entries(catalogue).find(([, v]) => v.includes(name))?.[0] ||
      "Site-specific",
    applicableSystems: preset.systems || ["B"],
    description: "",
    opportunityDescription: "",
    hazardCategories: (preset.hazards || []).map((i) => hazardCategories[i]),
    causes: [],
    warningIndicators: [],
    affectedProcesses: [],
    affectedDependencies: [],
    impact: emptyImpact(),
    likelihood: 1,
    existingControls: preset.controls || [],
    plannedControls: [],
    controlEffectiveness: 0,
    owner: "",
    treatment: "Reduce",
    actions: [],
    correctiveActionReference: "",
    targetDate: "",
    targetLikelihood: 1,
    targetImpact: 1,
    reviewFrequency: "Semi-annually",
    decisionRationale: "",
    includeInIncidentPlan: true,
    incidentPlanExclusionRationale: "",
    revisionHistory: [],
  };
};
const normalise = (r) => {
  const legacy = r?.impact || {},
    mapped = { ...emptyImpact(), ...legacy };
  if (mapped.injury === 0 && legacy.people) mapped.injury = legacy.people;
  if (mapped.assets === 0 && legacy.operations)
    mapped.assets = legacy.operations;
  if (mapped.customerAssets === 0 && legacy.supply)
    mapped.customerAssets = legacy.supply;
  return {
    ...emptyRisk(r?.name),
    ...r,
    applicableSystems: arr(r?.applicableSystems).length
      ? arr(r.applicableSystems)
      : ["B"],
    hazardCategories: arr(r?.hazardCategories),
    impact: mapped,
    causes: arr(r?.causes),
    warningIndicators: arr(r?.warningIndicators),
    affectedProcesses: arr(r?.affectedProcesses),
    affectedDependencies: arr(r?.affectedDependencies),
    existingControls: arr(r?.existingControls),
    plannedControls: arr(r?.plannedControls),
    includeInIncidentPlan: r?.includeInIncidentPlan !== false,
    incidentPlanExclusionRationale: r?.incidentPlanExclusionRationale || "",
    actions: arr(r?.actions),
    revisionHistory: arr(r?.revisionHistory),
  };
};
const metrics = (r) => {
  const impact = Math.max(...Object.values(r.impact || {}).map(Number), 1),
    likelihood = clamp(r.likelihood, 1, 5),
    inherent = impact * likelihood,
    residualLikelihood = Math.max(
      1,
      Math.ceil(likelihood * (1 - clamp(r.controlEffectiveness, 0, 100) / 100)),
    ),
    residual = impact * residualLikelihood,
    targetLikelihood = clamp(r.targetLikelihood, 1, 5),
    targetImpact = clamp(r.targetImpact, 1, 5),
    target = targetLikelihood * targetImpact;
  return {
    impact,
    likelihood,
    inherent,
    residualLikelihood,
    residual,
    targetLikelihood,
    targetImpact,
    target,
    inherentBand: band(inherent),
    residualBand: band(residual),
    targetBand: band(target),
  };
};
const toggle = (list, value) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
const profileItems = (profile, key) =>
  arr(profile?.[key])
    .map((x) =>
      typeof x === "string"
        ? x
        : x?.name || x?.title || x?.role || x?.fullName || "",
    )
    .map(String)
    .filter((x) => x && x !== "[object Object]");
const personName = (value) =>
  typeof value === "string"
    ? value
    : value?.name ||
      value?.fullName ||
      `${value?.first_name || ""} ${value?.last_name || ""}`.trim() ||
      value?.title ||
      value?.role ||
      value?.email ||
      "";
const scenarioGuidance = (name = "") => {
  const value = name.toLowerCase();
  if (/shooter|violence|terror|sabotage/.test(value))
    return {
      causes: [
        "Unauthorised access",
        "Threat escalation",
        "Security intelligence not acted upon",
      ],
      warnings: [
        "Threatening behaviour or communication",
        "Access-control alert",
        "Change in official threat level",
      ],
    };
  if (/cyber|it-related|identity|software/.test(value))
    return {
      causes: [
        "Unpatched vulnerability",
        "Credential compromise",
        "Third-party service failure",
      ],
      warnings: [
        "Repeated failed sign-ins",
        "Security monitoring alert",
        "Unexpected system degradation",
      ],
    };
  if (/fire|explosion|spill|radiation/.test(value))
    return {
      causes: [
        "Equipment or containment failure",
        "Unsafe condition or activity",
        "Inspection defect not corrected",
      ],
      warnings: [
        "Alarm or detector activation",
        "Abnormal heat, pressure, odour or reading",
        "Inspection or maintenance exception",
      ],
    };
  if (/flood|storm|weather|earthquake|landslide|tsunami|volcano/.test(value))
    return {
      causes: [
        "Severe-weather or natural-hazard event",
        "Site exposure or drainage weakness",
        "Critical utility disruption",
      ],
      warnings: [
        "Official weather or hazard warning",
        "Rising water or abnormal site condition",
        "Utility-provider alert",
      ],
    };
  if (/supplier|transport|customs|export|import/.test(value))
    return {
      causes: [
        "Single-source dependency",
        "Supplier capacity or financial failure",
        "Route, border or logistics disruption",
      ],
      warnings: [
        "Late or missed delivery",
        "Supplier performance deterioration",
        "Carrier, customs or border alert",
      ],
    };
  return {
    causes: [
      "Equipment, people or process failure",
      "External dependency disruption",
      "Control not implemented or ineffective",
    ],
    warnings: [
      "Performance outside agreed limits",
      "Repeated incident or near miss",
      "Supplier, system or regulatory alert",
    ],
  };
};
const treatmentGuidance = (name = "") => {
  const value = name.toLowerCase();
  if (/shooter|violence|terror|sabotage/.test(value))
    return [
      "Test lockdown, evacuation and emergency communication arrangements",
      "Review access-control coverage and out-of-hours escalation",
      "Exercise the incident command team with police liaison assumptions",
    ];
  if (/cyber|it-related|identity|software/.test(value))
    return [
      "Test recovery from an isolated and verified backup",
      "Close critical vulnerabilities and verify detection coverage",
      "Exercise the cyber incident and alternative-access procedure",
    ];
  if (/fire|explosion|spill|radiation/.test(value))
    return [
      "Close inspection, containment or alarm-system deficiencies",
      "Exercise isolation, evacuation and emergency response arrangements",
      "Verify competent responder coverage and emergency equipment",
    ];
  if (/flood|storm|weather|earthquake|landslide|tsunami|volcano/.test(value))
    return [
      "Protect or relocate continuity-critical equipment and records",
      "Test site closure, remote-working and alternative-location arrangements",
      "Verify alert thresholds and severe-weather escalation contacts",
    ];
  if (/supplier|transport|customs|export|import/.test(value))
    return [
      "Qualify an alternative supplier, carrier or route",
      "Agree continuity, notification and recovery requirements with the supplier",
      "Review minimum stock, lead time and single-source exposure",
    ];
  return [
    "Implement and verify an additional preventive control",
    "Test the response and recovery procedure",
    "Assign an owner and confirm effectiveness by the target date",
  ];
};
const revisionSuggestions = [
  "Initial assessment completed",
  "Impact rating reviewed",
  "Likelihood rating updated",
  "Controls reviewed or amended",
  "Residual risk recalculated",
  "Treatment decision changed",
];
const iconKey = (name) => {
  const n = String(name || "").toLowerCase();
  if (/active shooter|workplace violence|terrorism/.test(n)) return "security";
  if (/pandemic|illness|foodborne/.test(n)) return "bio";
  if (/cyber|it-related/.test(n)) return "cyber";
  if (/fire|thermal/.test(n)) return "fire";
  if (/flood|tsunami|dam|levee/.test(n)) return "flood";
  if (/storm|hurricane|tornado|wind|snow|ice|lightning/.test(n))
    return "weather";
  if (/earthquake|landslide|subsidence|sinkhole|volcano/.test(n))
    return "ground";
  if (/power|utility/.test(n)) return "power";
  if (/supplier|import|export|customs|border/.test(n)) return "supply";
  if (/transport|vehicle|plane/.test(n)) return "transport";
  if (/mechanical|facility|physical/.test(n)) return "machine";
  if (/radiation|electromagnetic/.test(n)) return "radiation";
  if (/hazardous|spill|release|explosion/.test(n)) return "hazmat";
  if (/bribery|corruption|insider/.test(n)) return "integrity";
  if (/sabotage/.test(n)) return "sabotage";
  return "custom";
};
export function HazardIcon({ name, tone = "neutral", small = false }) {
  const type = iconKey(name),
    common = {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
  return (
    <span
      className={`hazardIcon tone-${tone} ${small ? "small" : ""}`}
      title={name}
      aria-label={`${name} hazard icon`}
    >
      <svg viewBox="0 0 48 48" role="img">
        {type === "security" && (
          <>
            <path
              {...common}
              d="M24 5 39 11v11c0 10-6.2 17-15 21-8.8-4-15-11-15-21V11z"
            />
            <circle {...common} cx="24" cy="18" r="4" />
            <path
              {...common}
              d="M16 31c1.7-5 4.4-7 8-7s6.3 2 8 7M36 8l5-4M39 12h5"
            />
          </>
        )}
        {type === "bio" && (
          <>
            <circle {...common} cx="24" cy="24" r="10" />
            <path
              {...common}
              d="M24 5v7M24 36v7M5 24h7M36 24h7M10.5 10.5l5 5M32.5 32.5l5 5M37.5 10.5l-5 5M15.5 32.5l-5 5"
            />
            <circle cx="20" cy="21" r="2" fill="currentColor" />
            <circle cx="28" cy="26" r="2" fill="currentColor" />
          </>
        )}
        {type === "cyber" && (
          <>
            <rect {...common} x="7" y="8" width="34" height="25" rx="3" />
            <path {...common} d="M4 39h40M18 39l2-6h8l2 6M24 14v7" />
            <circle cx="24" cy="26" r="2" fill="currentColor" />
            <path {...common} d="M18 18a6 6 0 0 1 12 0" />
          </>
        )}
        {type === "fire" && (
          <>
            <path
              {...common}
              d="M27 5c2 9-5 10-1 17 2-4 5-5 7-8 5 7 7 13 4 20-2.5 6-8 9-14 9-8 0-14-5-14-13 0-7 5-12 11-19 0 7 3 9 7 12 2-6-1-10 0-18z"
            />
            <path
              {...common}
              d="M25 28c4 4 3 10-2 12-5-2-6-8-2-12 1.5-1.5 2.5-3 3-5 .5 2 0 3 1 5z"
            />
          </>
        )}
        {type === "flood" && (
          <>
            <path
              {...common}
              d="M8 24V10h25v14M13 24v-8h7v8M6 30c4-4 8 4 12 0s8 4 12 0 8 4 12 0M6 38c4-4 8 4 12 0s8 4 12 0 8 4 12 0"
            />
            <path {...common} d="m31 10 7 6v9" />
          </>
        )}
        {type === "weather" && (
          <>
            <path
              {...common}
              d="M14 30H10a7 7 0 0 1 0-14c2-7 13-9 18-3 7-2 13 3 13 9 0 5-4 8-9 8"
            />
            <path
              {...common}
              d="m24 26-5 9h6l-3 8 9-12h-6l3-5M8 37h7M34 37h8"
            />
          </>
        )}
        {type === "ground" && (
          <>
            <path
              {...common}
              d="m5 32 10-16 7 9 7-13 14 20M5 39h13l4-7 5 5 4-5h12"
            />
            <path {...common} d="m23 5-3 7 5 3-4 7" />
          </>
        )}
        {type === "power" && (
          <>
            <path {...common} d="M18 5 8 27h13l-2 16 20-27H26l5-11z" />
            <path {...common} d="M5 39h9M34 39h9" />
          </>
        )}
        {type === "supply" && (
          <>
            <path {...common} d="M6 15h15v13H6zM27 20h9l6 7v8H27zM21 35h6" />
            <circle {...common} cx="14" cy="36" r="4" />
            <circle {...common} cx="35" cy="36" r="4" />
            <path {...common} d="M11 10h17M30 10h8M32 7l-4 3 4 3" />
          </>
        )}
        {type === "transport" && (
          <>
            <path
              {...common}
              d="M8 29 12 17h24l5 12v9H7v-9zM13 29h22M16 22h16"
            />
            <circle {...common} cx="14" cy="38" r="4" />
            <circle {...common} cx="34" cy="38" r="4" />
          </>
        )}
        {type === "machine" && (
          <>
            <path
              {...common}
              d="M19 7h10l2 6 6 2 5-3 5 8-5 4v6l5 4-5 8-5-3-6 2-2 6H19l-2-6-6-2-5 3-5-8 5-4v-6l-5-4 5-8 5 3 6-2z"
              transform="scale(.82) translate(5 5)"
            />
            <circle {...common} cx="24" cy="24" r="7" />
          </>
        )}
        {type === "radiation" && (
          <>
            <circle {...common} cx="24" cy="24" r="5" />
            <path
              {...common}
              d="M21 17 15 7a20 20 0 0 1 18 0l-6 10M31 25l12 1a20 20 0 0 1-9 15l-5-11M17 25 5 26a20 20 0 0 0 9 15l5-11"
            />
          </>
        )}
        {type === "hazmat" && (
          <>
            <path
              {...common}
              d="M17 5h14M20 5v12L8 38c-1 2 1 5 4 5h24c3 0 5-3 4-5L28 17V5"
            />
            <path {...common} d="M15 32h18M18 26c4 3 8-3 12 0" />
            <circle cx="24" cy="36" r="2" fill="currentColor" />
          </>
        )}
        {type === "integrity" && (
          <>
            <path
              {...common}
              d="M7 20h34M12 20v17M20 20v17M28 20v17M36 20v17M7 38h34M5 43h38M24 5 6 15h36z"
            />
            <path {...common} d="m31 8 6 6" />
          </>
        )}
        {type === "sabotage" && (
          <>
            <path
              {...common}
              d="M18 7h12l2 7 7 3v12l-7 3-2 8H18l-2-8-7-3V17l7-3z"
            />
            <path {...common} d="m17 17 14 14M31 17 17 31" />
          </>
        )}
        {type === "custom" && (
          <>
            <path {...common} d="M24 5 44 41H4z" />
            <path {...common} d="M24 17v12" />
            <circle cx="24" cy="35" r="2" fill="currentColor" />
          </>
        )}
      </svg>
    </span>
  );
}
const iconCss = `.hazardIcon{width:58px;height:58px;flex:0 0 58px;display:grid;place-items:center;border-radius:14px;border:1px solid #bdd0e1;background:#edf4ff;color:#2459d6;box-shadow:0 5px 14px #143a6420}.hazardIcon svg{width:38px;height:38px}.hazardIcon.small{width:25px;height:25px;flex-basis:25px;border-radius:7px;box-shadow:none}.hazardIcon.small svg{width:17px;height:17px}.hazardIcon.tone-Low{background:#dff5e9;color:#087242;border-color:#a8dfc2}.hazardIcon.tone-Moderate{background:#fff2bf;color:#805d00;border-color:#ead377}.hazardIcon.tone-High{background:#ffe1b8;color:#944f00;border-color:#efba78}.hazardIcon.tone-Critical{background:#ffd4d4;color:#a61f1f;border-color:#efa4a4}.riskIdentity{display:flex;align-items:center;gap:13px}.registerCopy{flex:1;min-width:0}.catalogue button{display:inline-flex;align-items:center;gap:6px}.custom{align-items:center;gap:7px}.register article>.hazardIcon{margin-right:13px}@media(max-width:900px){.hazardIcon{width:48px;height:48px;flex-basis:48px}.hazardIcon svg{width:32px;height:32px}.register article>.hazardIcon{margin:0 0 8px}}`;
const heatCss = `.appetite{display:flex;justify-content:space-between;gap:20px;align-items:center;background:#eef5ff;border:1px solid #c9daee;border-radius:10px;padding:13px;margin-bottom:14px}.appetite label{min-width:320px}.appetite span{color:#607890}.heatHead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.heatHead h3{margin:4px 0}.heatHead p{margin:0;color:#607890}.heatHead>div:last-child{display:flex;background:#eef3f7;padding:4px;border-radius:9px}.heatHead button{border:0;background:transparent;padding:8px 11px;border-radius:7px;font-weight:800;color:#49637b}.heatHead button.active{background:#fff;color:#0b3155;box-shadow:0 1px 5px #16365220}.heat{max-width:760px}.heat .row,.heat footer{grid-template-columns:70px repeat(5,1fr)}.heat .row>label{align-content:center;text-align:right;padding-right:7px}.heat .row>label small,.heat footer small{display:block}.heat .row>button{height:65px;border:0;display:grid;place-items:center;position:relative;border-radius:7px;cursor:pointer}.heat .row>button.selected{outline:4px solid #112f50;outline-offset:1px}.heat .row i{position:absolute;left:7px;top:5px;font-style:normal;font-size:10px}.heat .row strong{font-size:22px}.heat .row em{position:absolute;right:5px;top:5px;font-size:8px;font-style:normal}@media(max-width:900px){.appetite,.heatHead{display:block}.appetite label{min-width:0}.heat{overflow:auto}}`;
const riskCoreCss = `.risk>header{display:grid!important;grid-template-columns:minmax(240px,1fr) minmax(220px,280px) auto;align-items:center}.riskCore{display:grid;justify-self:start;padding:8px 13px;border:1px solid #cedce8;border-left:4px solid #2d60e6;border-radius:9px;background:#f1f6fb}.riskCore small{color:#285de4!important;font-size:9px;font-weight:950;letter-spacing:.1em}.riskCore b{font-size:17px;line-height:1.2}.riskCore span{font-size:9px;color:#607890}@media(max-width:1150px){.risk>header{grid-template-columns:1fr auto!important}.riskCore{grid-column:1/-1;width:100%}}@media(max-width:900px){.risk>header{display:flex!important}.riskCore{width:100%}}`;
const completionCss = `.hz nav button b{flex:0 0 27px;width:27px;height:27px;border-radius:8px}.hz nav button>span{display:grid;gap:2px}.hz nav button>span strong{font-size:13px}.hz nav button>span small{color:#91aac1;font-size:9px;font-weight:600}.hz nav button.complete b{background:#0b8068;color:#fff}.hz nav button.complete>span small{color:#6ee7cf}.stepRequirements{margin:16px 20px 0;padding:14px 18px;border:1px solid #efc66e;border-left:5px solid #e49a16;border-radius:10px;background:#fff8e8;color:#65450b}.stepRequirements>b{display:block;margin-bottom:6px}.stepRequirements ul{margin:0;padding-left:20px}.stepRequirements li{margin:4px 0;font-size:13px}.controlGrid,.treatmentSupportGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px;align-items:start}.controlGrid .list,.treatmentSupportGrid .list{margin:0;padding:13px;border:1px solid #d6e2ec;border-radius:10px;background:#f8fbfd}.controlGrid label{padding:13px;border:1px solid #d6e2ec;border-radius:10px;background:#f8fbfd}.treatmentSupportGrid{margin:14px 0}.listGuide{display:block;margin:-3px 0 8px;color:#687e92;font-weight:500;line-height:1.35}.list .listSuggestions{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 9px}.list .listSuggestions button{width:auto;border:1px solid #bcd0e2;border-radius:999px;background:#eef4ff;color:#174da8;padding:6px 8px;font-size:10px;text-align:left}.list .listSuggestions:empty{display:none}.controlScale small{line-height:1.35}@media(max-width:900px){.stepRequirements{margin:10px 10px 0}.controlGrid,.treatmentSupportGrid{grid-template-columns:1fr}}`;

export default function BCPHazardScenarioAssessment({
  action,
  profiles = [],
  contexts = [],
  roles = [],
  companyPeople = [],
  initial,
  organisationName = "",
  startStep = 0,
}) {
  const formRef = useRef(null);
  const [formTick, setFormTick] = useState(0);
  const [formState, formAction, isPending] = useActionState(action, {
      error: "",
    }),
    [step, setStep] = useState(clamp(startStep, 0, 5));
  const [profileId, setProfileId] = useState(initial?.site_profile_id || ""),
    [contextId, setContextId] = useState(initial?.context_assessment_id || ""),
    [roleId, setRoleId] = useState(initial?.role_assessment_id || "");
  const profile = profiles.find((x) => x.id === profileId),
    context = contexts.find((x) => x.id === contextId),
    role = roles.find((x) => x.id === roleId);
  const people = useMemo(
    () =>
      companyPeople
        .map((person) => ({
          name: personName(person),
          email: person.email || "",
          position: person.position || "",
        }))
        .filter((person) => person.name),
    [companyPeople],
  );
  const processes = [
      ...profileItems(profile, "value_chain_processes"),
      ...profileItems(profile, "support_processes"),
    ],
    dependencies = [
      ...profileItems(profile, "dependency_records"),
      ...profileItems(profile, "site_dependencies"),
    ];
  const [participants, setParticipants] = useState(
      arr(initial?.participants).length ? arr(initial.participants) : [],
    ),
    [risks, setRisks] = useState(
      arr(initial?.scenario_assessments).map(normalise),
    );
  const [appetite, setAppetite] = useState(
    clamp(initial?.methodology?.appetiteScore || 9, 1, 25),
  );
  const selected = risks.map((x) => x.name);
  const completion = useMemo(() => {
    const form = formRef.current;
    const get = (name, fallback = "") => {
      const field = form?.elements?.namedItem(name);
      return field
        ? String(field.value ?? "").trim()
        : String(fallback ?? "").trim();
    };
    const requirements = [
      [
        Boolean(profile),
        participants.length > 0,
        Boolean(get("assessment_title", initial?.assessment_title)),
        Boolean(
          get(
            "operational_description",
            initial?.operational_description ||
              profile?.operational_description,
          ),
        ),
        Boolean(get("next_review_date", initial?.next_review_date)),
      ],
      [risks.length > 0, risks.every((risk) => risk.name.trim())],
      [
        risks.length > 0,
        risks.every((risk) => risk.description.trim()),
        risks.every((risk) => risk.affectedProcesses.length > 0),
        risks.every((risk) => risk.applicableSystems.length > 0),
      ],
      [
        risks.length > 0,
        risks.every((risk) => risk.existingControls.length > 0),
        risks.every((risk) => risk.owner),
      ],
      [
        risks.length > 0,
        risks.every((risk) => risk.treatment),
        risks.every((risk) => risk.decisionRationale.trim()),
        risks.every(
          (risk) =>
            metrics(risk).residualBand === "Low" || risk.actions.length > 0,
        ),
        risks.every(
          (risk) =>
            risk.includeInIncidentPlan !== false ||
            !["High", "Critical"].includes(metrics(risk).residualBand) ||
            risk.incidentPlanExclusionRationale.trim(),
        ),
        Boolean(get("reviewer_name", initial?.reviewed_by)),
      ],
      [
        risks.length > 0,
        risks.every(
          (risk) =>
            risk.description &&
            risk.affectedProcesses.length &&
            risk.existingControls.length &&
            risk.owner &&
            risk.treatment &&
            risk.decisionRationale &&
            (metrics(risk).residualBand === "Low" || risk.actions.length) &&
            (risk.includeInIncidentPlan !== false ||
              !["High", "Critical"].includes(metrics(risk).residualBand) ||
              risk.incidentPlanExclusionRationale.trim()),
        ),
      ],
    ];
    const complete = requirements.map((items) => items.every(Boolean));
    const countMissing = (test) => risks.filter((risk) => !test(risk)).length;
    const plural = (count, singular, multiple = `${singular}s`) =>
      `${count} ${count === 1 ? singular : multiple}`;
    const details = [
      [
        !profile && "Select a Module 1 Site Profile",
        !participants.length && "Select at least one assessment participant",
        !get("assessment_title", initial?.assessment_title) &&
          "Enter the assessment title",
        !get(
          "operational_description",
          initial?.operational_description || profile?.operational_description,
        ) && "Describe the operational activities and local scope",
        !get("next_review_date", initial?.next_review_date) &&
          "Select the next review date",
      ],
      [!risks.length && "Select at least one credible hazard scenario"],
      [
        !risks.length && "Select at least one credible hazard scenario",
        countMissing((risk) => risk.description.trim()) > 0 &&
          `${plural(
            countMissing((risk) => risk.description.trim()),
            "scenario",
          )} need a detailed risk / hazard description`,
        countMissing((risk) => risk.affectedProcesses.length > 0) > 0 &&
          `${plural(
            countMissing((risk) => risk.affectedProcesses.length > 0),
            "scenario",
          )} need at least one affected process`,
        countMissing((risk) => risk.applicableSystems.length > 0) > 0 &&
          `${plural(
            countMissing((risk) => risk.applicableSystems.length > 0),
            "scenario",
          )} need management-system applicability`,
      ],
      [
        !risks.length && "Select at least one credible hazard scenario",
        countMissing((risk) => risk.existingControls.length > 0) > 0 &&
          `${plural(
            countMissing((risk) => risk.existingControls.length > 0),
            "scenario",
          )} need an existing control`,
        countMissing((risk) => risk.owner) > 0 &&
          `${plural(
            countMissing((risk) => risk.owner),
            "scenario",
          )} need a risk owner`,
      ],
      [
        !risks.length && "Select at least one credible hazard scenario",
        countMissing((risk) => risk.treatment) > 0 &&
          `${plural(
            countMissing((risk) => risk.treatment),
            "scenario",
          )} need a treatment decision`,
        countMissing((risk) => risk.decisionRationale.trim()) > 0 &&
          `${plural(
            countMissing((risk) => risk.decisionRationale.trim()),
            "scenario",
          )} need a decision and tolerability rationale`,
        countMissing(
          (risk) =>
            metrics(risk).residualBand === "Low" || risk.actions.length > 0,
        ) > 0 &&
          `${plural(
            countMissing(
              (risk) =>
                metrics(risk).residualBand === "Low" || risk.actions.length > 0,
            ),
            "elevated scenario",
          )} need a treatment action`,
        countMissing(
          (risk) =>
            risk.includeInIncidentPlan !== false ||
            !["High", "Critical"].includes(metrics(risk).residualBand) ||
            risk.incidentPlanExclusionRationale.trim(),
        ) > 0 &&
          "High or Critical scenarios excluded from Module 9 require a rationale",
        !get("reviewer_name", initial?.reviewed_by) &&
          "Select a reviewer or approver from Company Users",
      ],
      [
        !requirements[5][0] && "Select at least one credible hazard scenario",
        requirements[5][0] &&
          !requirements[5][1] &&
          "Complete the analysis, controls and treatment requirements for every scenario",
      ],
    ].map((items) => items.filter(Boolean));
    return {
      complete,
      details,
      remaining: requirements.map(
        (items) => items.filter((item) => !item).length,
      ),
      percent: Math.round(
        (complete.filter(Boolean).length / steps.length) * 100,
      ),
    };
  }, [formTick, profile, participants, risks, initial]);
  useEffect(() => {
    const failedStep = Number(formState?.validation?.step);
    if (
      Number.isInteger(failedStep) &&
      failedStep >= 0 &&
      failedStep < steps.length
    )
      setStep(failedStep);
  }, [formState?.validation?.step]);
  const update = (id, changes) =>
    setRisks(risks.map((x) => (x.id === id ? { ...x, ...changes } : x)));
  const choose = (name) =>
    setRisks(
      selected.includes(name)
        ? risks.filter((x) => x.name !== name)
        : [...risks, emptyRisk(name)],
    );
  const addCustom = () =>
    setRisks([...risks, emptyRisk("Site-specific scenario")]);
  const generate = () =>
    setRisks(
      risks.map((r) => ({
        ...r,
        description:
          r.description ||
          `${r.name} may disrupt ${processes.slice(0, 3).join(", ") || "priority operations"}, causing loss of service, safety, compliance or recovery capability.`,
        affectedProcesses: r.affectedProcesses.length
          ? r.affectedProcesses
          : processes.slice(0, 3),
        affectedDependencies: r.affectedDependencies.length
          ? r.affectedDependencies
          : dependencies.slice(0, 2),
      })),
    );
  return (
    <form ref={formRef} action={formAction} className="hz">
      <style>{css}</style>
      <style>{iconCss}</style>
      <style>{heatCss}</style>
      <style>{riskCoreCss}</style>
      <style>{completionCss}</style>
      {[
        ["assessment_id", initial?.id || ""],
        ["site_profile_id", profileId],
        ["context_assessment_id", contextId],
        ["role_assessment_id", roleId],
        ["participants", JSON.stringify(participants)],
        ["scenario_assessments", JSON.stringify(risks)],
        ["risk_appetite_score", appetite],
        ["next_step", Math.min(5, step + 1)],
      ].map(([name, value]) => (
        <input type="hidden" name={name} value={value} key={name} />
      ))}
      {formState?.error && (
        <div className="error" role="alert">
          <b>Cannot save Module 5</b>
          <span>{formState.error}</span>
          {formState?.validation?.items?.length > 0 && (
            <ul>
              {formState.validation.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <aside>
        <div className="brand">
          RPG <span>Excellence</span>
        </div>
        <small>BCP MODULE 5</small>
        <section>
          <strong>{completion.percent}%</strong>
          <span>complete</span>
          <i>
            <b style={{ width: `${completion.percent}%` }} />
          </i>
        </section>
        <nav>
          {steps.map((x, i) => (
            <button
              type="button"
              className={`${step === i ? "active" : ""} ${completion.complete[i] ? "complete" : "incomplete"}`}
              onClick={() => setStep(i)}
              key={x}
            >
              <b>{completion.complete[i] ? "✓" : i + 1}</b>
              <span>
                <strong>{x}</strong>
                <small>
                  {completion.complete[i]
                    ? "Complete"
                    : `${completion.remaining[i]} requirement${completion.remaining[i] === 1 ? "" : "s"} remaining`}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <div className="outputs">
          <b>Live engine</b>
          <span>{risks.length} scenarios selected</span>
          <span>
            {
              risks.filter((x) =>
                ["High", "Critical"].includes(metrics(x).residualBand),
              ).length
            }{" "}
            elevated residual risks
          </span>
          <span>
            {risks.reduce((n, x) => n + x.actions.length, 0)} treatment actions
          </span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <small>
              STEP {step + 1} OF 6 · {completion.percent}% COMPLETE · ISO 22301
              CLAUSE 8.2.3
            </small>
            <h1>{steps[step]}</h1>
            <p>
              Identify disruption threats, evaluate controls and maintain a
              current, evidence-led continuity risk register.
            </p>
          </div>
          <b>{initial?.status?.replaceAll("_", " ") || "draft"}</b>
        </header>
        <div className="progress">
          <i style={{ width: `${completion.percent}%` }} />
        </div>
        {!completion.complete[step] && completion.details[step]?.length > 0 && (
          <section className="stepRequirements" aria-live="polite">
            <b>To complete {steps[step]}</b>
            <ul>
              {completion.details[step].map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </section>
        )}
        {step === 0 && (
          <Panel
            title="Connect the controlled source records"
            text="Module 5 inherits the operating boundary, processes, dependencies, context and accountable people. Source versions are frozen on approval."
          >
            <div className="grid">
              <label>
                Module 1 Site Profile *
                <select
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                >
                  <option value="">Select profile</option>
                  {profiles.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.location_name} · v{x.version} · {x.status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Module 3 Context Assessment
                <select
                  value={contextId}
                  onChange={(e) => setContextId(e.target.value)}
                >
                  <option value="">Optional</option>
                  {contexts
                    .filter(
                      (x) => !profileId || x.site_profile_id === profileId,
                    )
                    .map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.assessment_reference} · v{x.version}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Module 4 Roles Assessment
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="">Optional</option>
                  {roles
                    .filter(
                      (x) => !profileId || x.site_profile_id === profileId,
                    )
                    .map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.assessment_reference} · v{x.version}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Assessment title
                <input
                  name="assessment_title"
                  onInput={() => setFormTick((value) => value + 1)}
                  defaultValue={
                    initial?.assessment_title ||
                    `${organisationName || "Organisation"} disruption hazard assessment`
                  }
                />
              </label>
              <label>
                Review frequency
                <select
                  name="review_frequency"
                  defaultValue={initial?.review_frequency || "Semi-annually"}
                >
                  <option>Quarterly</option>
                  <option>Semi-annually</option>
                  <option>Annually</option>
                  <option>After material change or incident</option>
                </select>
              </label>
              <label>
                Next review date
                <input
                  type="date"
                  name="next_review_date"
                  onInput={() => setFormTick((value) => value + 1)}
                  defaultValue={initial?.next_review_date || ""}
                />
              </label>
            </div>
            <label className="wide">
              Operational activities and local scope
              <textarea
                name="operational_description"
                onInput={() => setFormTick((value) => value + 1)}
                rows="5"
                defaultValue={
                  initial?.operational_description ||
                  profile?.operational_description ||
                  ""
                }
              />
            </label>
            <Multi
              title="Assessment participants"
              values={participants}
              options={people}
              onChange={setParticipants}
            />
            {profile && (
              <div className="source">
                <article>
                  <small>Location</small>
                  <b>{profile.location_name}</b>
                  <span>{profile.country}</span>
                </article>
                <article>
                  <small>Processes</small>
                  <b>{processes.length}</b>
                  <span>from Module 1</span>
                </article>
                <article>
                  <small>Dependencies</small>
                  <b>{dependencies.length}</b>
                  <span>available to link</span>
                </article>
                <article>
                  <small>Context risks</small>
                  <b>{arr(context?.risks_opportunities).length}</b>
                  <span>from Module 3</span>
                </article>
              </div>
            )}
          </Panel>
        )}
        {step === 1 && (
          <Panel
            title="Screen credible disruption scenarios"
            text="Select every scenario that could interrupt this location. Add local threats where the catalogue is not sufficient."
          >
            <div className="catalogue">
              {Object.entries(catalogue).map(([category, items]) => (
                <fieldset key={category}>
                  <legend>{category}</legend>
                  {items.map((name) => (
                    <button
                      type="button"
                      className={selected.includes(name) ? "selected" : ""}
                      onClick={() => choose(name)}
                      key={name}
                    >
                      <HazardIcon name={name} small />
                      {selected.includes(name) ? "✓" : "+"} {name}
                    </button>
                  ))}
                </fieldset>
              ))}
            </div>
            <button type="button" className="add" onClick={addCustom}>
              + Add site-specific scenario
            </button>
            {risks
              .filter((x) => x.category === "Site-specific")
              .map((r) => (
                <div className="custom" key={r.id}>
                  <HazardIcon name={r.name} small />
                  <input
                    value={r.name}
                    onChange={(e) => update(r.id, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setRisks(risks.filter((x) => x.id !== r.id))}
                  >
                    Remove
                  </button>
                </div>
              ))}
          </Panel>
        )}
        {step === 2 && (
          <Panel
            title="Assess inherent risk before controls"
            text="Describe the activity, hazard, opportunity and credible cause-event-consequence pathway. N/A is available for impact dimensions that do not apply."
          >
            <div className="appetite">
              <label>
                Risk appetite threshold <b>{appetite}/25</b>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={appetite}
                  onChange={(e) => setAppetite(+e.target.value)}
                />
              </label>
              <span>
                Scores above this threshold require treatment or authorised
                acceptance.
              </span>
            </div>
            <button type="button" className="generate" onClick={generate}>
              Generate linked starting points
            </button>
            {risks.map((r) => (
              <RiskCard
                r={r}
                key={r.id}
                processes={processes}
                dependencies={dependencies}
                update={update}
                stage="analysis"
              />
            ))}
          </Panel>
        )}
        {step === 3 && (
          <Panel
            title="Evaluate prevention, detection and response controls"
            text="Record the controls that genuinely operate today. Control effectiveness adjusts residual likelihood; it never hides the inherent consequence."
          >
            {risks.map((r) => (
              <RiskCard
                r={r}
                key={r.id}
                people={people}
                update={update}
                stage="controls"
              />
            ))}
          </Panel>
        )}
        {step === 4 && (
          <Panel
            title="Choose treatment and secure accountable approval"
            text="Treat elevated residual risks, assign actions and record why the selected decision is tolerable."
          >
            {risks.map((r) => (
              <RiskCard
                r={r}
                key={r.id}
                people={people}
                update={update}
                stage="treatment"
              />
            ))}
            <div className="approval">
              <label>
                Reviewer / approver
                <select
                  name="reviewer_name"
                  onChange={() => setFormTick((value) => value + 1)}
                  defaultValue={initial?.reviewed_by || ""}
                >
                  <option value="">Select reviewer from Company Users</option>
                  {people.map((person) => (
                    <option
                      key={`${person.name}-${person.email}`}
                      value={person.name}
                    >
                      {person.name}
                      {person.position ? ` — ${person.position}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                Review comment / approval rationale
                <textarea
                  name="review_comment"
                  defaultValue={initial?.review_comment || ""}
                />
              </label>
            </div>
          </Panel>
        )}
        {step === 5 && (
          <Panel
            title="Current hazard-scenario risk register"
            text="Switch between inherent, residual and target positions. Select a cell to filter the controlled register."
          >
            <Heat risks={risks} appetite={appetite} />
            <div className="register">
              {risks.map((r) => {
                const m = metrics(r);
                return (
                  <article key={r.id}>
                    <HazardIcon name={r.name} tone={m.residualBand} />
                    <div className="registerCopy">
                      <small>
                        {r.recordNumber || "Record pending"} · {r.category} ·{" "}
                        {r.applicableSystems.join(", ")}
                      </small>
                      <h3>{r.name}</h3>
                      <p>{r.description}</p>
                      <span>
                        {r.owner || "Owner not assigned"}
                        {r.correctiveActionReference
                          ? ` · ${r.correctiveActionReference}`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <em className={m.inherentBand}>I {m.inherent}</em>
                      <b>→</b>
                      <em className={m.residualBand}>R {m.residual}</em>
                      <b>→</b>
                      <em className={m.targetBand}>T {m.target}</em>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        )}
        <footer>
          <button
            type="button"
            disabled={!step || isPending}
            onClick={() => setStep(step - 1)}
          >
            ← Previous
          </button>
          {initial?.id && (
            <button
              name="intent"
              value="archive"
              className="danger"
              disabled={isPending}
            >
              Archive
            </button>
          )}
          <span>
            {isPending
              ? "Saving…"
              : "Controlled progress saves to your account"}
          </span>
          {step < 5 ? (
            <button
              name="intent"
              value="continue"
              className="primary"
              disabled={isPending}
            >
              Save &amp; continue →
            </button>
          ) : (
            <>
              <button name="intent" value="draft" disabled={isPending}>
                Save draft
              </button>
              <button name="intent" value="review" disabled={isPending}>
                Submit for review
              </button>
              <button
                name="intent"
                value="approve"
                className="primary"
                disabled={isPending}
              >
                Approve controlled version →
              </button>
            </>
          )}
        </footer>
      </main>
    </form>
  );
}

function Panel({ title, text, children }) {
  return (
    <section className="panel">
      <div className="intro">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {children}
    </section>
  );
}
function Multi({ title, values, options, onChange }) {
  const [selected, setSelected] = useState("");
  const available = options.filter((person) => !values.includes(person.name));
  const validNames = new Set(options.map((person) => person.name));
  const legacyValues = values.filter((value) => !validNames.has(value));
  return (
    <div className="multi">
      <b>{title}</b>
      <small>
        Select active Company Users with Business Continuity access.
      </small>
      <span>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">
            {available.length
              ? "Select participant from Company Users"
              : "No additional Company Users available"}
          </option>
          {available.map((person) => (
            <option key={`${person.name}-${person.email}`} value={person.name}>
              {person.name}
              {person.position ? ` — ${person.position}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (selected && !values.includes(selected))
              onChange([...values, selected]);
            setSelected("");
          }}
          disabled={!selected}
        >
          Add participant
        </button>
      </span>
      <div>
        {values.map((value) => (
          <button
            type="button"
            className={
              legacyValues.includes(value) ? "chip legacy" : "selected"
            }
            onClick={() => onChange(values.filter((item) => item !== value))}
            key={value}
            title={
              legacyValues.includes(value)
                ? "Invalid legacy entry — click to remove"
                : "Click to remove"
            }
          >
            {legacyValues.includes(value) ? "⚠ " : "✓ "}
            {value} ×
          </button>
        ))}
      </div>
      {legacyValues.length > 0 && (
        <em>Remove the highlighted legacy entry before saving.</em>
      )}
      {!options.length && (
        <em>
          No active Company Users with Business Continuity access are available.
        </em>
      )}
    </div>
  );
}
function Choices({ label, values, options, onChange, display = {} }) {
  return (
    <div className="choices">
      <b>{label}</b>
      <div>
        {options.map((x) => (
          <button
            type="button"
            className={values.includes(x) ? "selected" : ""}
            onClick={() => onChange(toggle(values, x))}
            key={x}
          >
            {values.includes(x) ? "✓ " : "+ "}
            {display[x] || x}
          </button>
        ))}
      </div>
    </div>
  );
}
function RiskCard({
  r,
  processes = [],
  dependencies = [],
  people = [],
  update,
  stage,
}) {
  const m = metrics(r);
  return (
    <article className="risk">
      <header>
        <div className="riskIdentity">
          <HazardIcon name={r.name} tone={m.residualBand} />
          <div>
            <small>{r.category}</small>
            <h3>{r.name}</h3>
          </div>
        </div>
        <div className="riskCore" aria-label="Risk score calculation">
          <small>RISK SCORE</small>
          <b>
            {m.impact} × {m.likelihood} = {m.inherent}
          </b>
          <span>Impact × likelihood · heat-map position</span>
        </div>
        <div>
          <em className={m.inherentBand}>Inherent {m.inherent}</em>
          <span>→</span>
          <em className={m.residualBand}>Residual {m.residual}</em>
          <span>→</span>
          <em className={m.targetBand}>Target {m.target}</em>
        </div>
      </header>
      {stage === "analysis" && (
        <>
          <div className="grid">
            <label>
              Record number
              <input
                value={r.recordNumber}
                onChange={(e) => update(r.id, { recordNumber: e.target.value })}
                placeholder="Controlled reference"
              />
            </label>
            <label>
              Assessment date
              <input
                type="date"
                value={r.assessmentDate}
                onChange={(e) =>
                  update(r.id, { assessmentDate: e.target.value })
                }
              />
            </label>
          </div>
          <Choices
            label="Management-system applicability"
            values={r.applicableSystems}
            options={Object.keys(systems)}
            display={systems}
            onChange={(v) => update(r.id, { applicableSystems: v })}
          />
          <label>
            Activity, aspect or scenario under analysis *
            <input
              value={r.name}
              onChange={(e) => update(r.id, { name: e.target.value })}
            />
          </label>
          <label>
            Detailed risk / hazard description *
            <textarea
              value={r.description}
              onChange={(e) => update(r.id, { description: e.target.value })}
              placeholder={`Because of a credible cause, ${r.name.toLowerCase()} may occur, resulting in disruption to priority activities.`}
            />
          </label>
          <label>
            Opportunity created by stronger controls
            <textarea
              value={r.opportunityDescription}
              onChange={(e) =>
                update(r.id, { opportunityDescription: e.target.value })
              }
              placeholder="Resilience, safer work, improved service, compliance or efficiency opportunity"
            />
          </label>
          <Choices
            label="OH&S hazard-identification categories"
            values={r.hazardCategories}
            options={hazardCategories}
            onChange={(v) => update(r.id, { hazardCategories: v })}
          />
          <Choices
            label="Affected processes *"
            values={r.affectedProcesses}
            options={processes}
            onChange={(v) => update(r.id, { affectedProcesses: v })}
          />
          <Choices
            label="Affected dependencies"
            values={r.affectedDependencies}
            options={dependencies}
            onChange={(v) => update(r.id, { affectedDependencies: v })}
          />
          <div className="impact">
            {Object.entries(impactKeys).map(([k, label]) => (
              <label key={k}>
                <span>
                  {label}
                  <b>
                    {r.impact[k] === 0
                      ? "N/A"
                      : `${r.impact[k]} · ${impactLabels[r.impact[k]]}`}
                  </b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={r.impact[k] || 0}
                  onChange={(e) =>
                    update(r.id, {
                      impact: { ...r.impact, [k]: +e.target.value },
                    })
                  }
                />
                <small>
                  0 N/A · 1 Insignificant · 2 Minor · 3 Moderate · 4 Major · 5
                  Severe
                </small>
              </label>
            ))}
          </div>
          <label>
            Likelihood / exposure before controls{" "}
            <b>
              {r.likelihood} · {likelihoodLabels[r.likelihood]}
            </b>
            <input
              type="range"
              min="1"
              max="5"
              value={r.likelihood}
              onChange={(e) => update(r.id, { likelihood: +e.target.value })}
            />
            <small>
              1 Rare · 2 Unlikely · 3 Possible · 4 Likely · 5 Almost certain
            </small>
          </label>
        </>
      )}
      {stage === "controls" && (
        <>
          <div className="controlGrid">
            <ListEditor
              label="Controls already implemented *"
              guide="Select only controls that currently operate and can be evidenced."
              suggestions={starter[r.name]?.controls || []}
              items={r.existingControls}
              onChange={(v) => update(r.id, { existingControls: v })}
            />
            <ListEditor
              label="Controls to be implemented"
              guide="Record additional prevention, detection or response controls required."
              suggestions={(starter[r.name]?.controls || []).filter(
                (item) => !r.existingControls.includes(item),
              )}
              items={r.plannedControls}
              onChange={(v) => update(r.id, { plannedControls: v })}
            />
            <label className="controlScale">
              Control effectiveness <b>{r.controlEffectiveness}%</b>
              <input
                type="range"
                min="0"
                max="80"
                step="10"
                value={r.controlEffectiveness}
                onChange={(e) =>
                  update(r.id, { controlEffectiveness: +e.target.value })
                }
              />
              <small>
                0 None · 20 Weak · 40 Partial · 60 Substantial · 80 Strong and
                evidenced
              </small>
            </label>
            <label>
              Risk owner *
              <select
                value={r.owner}
                onChange={(e) => update(r.id, { owner: e.target.value })}
              >
                <option value="">Select accountable owner</option>
                {people.map((person) => (
                  <option
                    key={`${person.name}-${person.email}`}
                    value={person.name}
                  >
                    {person.name}
                    {person.position ? ` — ${person.position}` : ""}
                  </option>
                ))}
              </select>
              <small>
                Select an active Company User with Business Continuity access.
              </small>
            </label>
            <ListEditor
              label="Causes and contributing factors"
              guide="Choose credible initiating causes, then add any site-specific cause."
              suggestions={scenarioGuidance(r.name).causes}
              items={r.causes}
              onChange={(v) => update(r.id, { causes: v })}
            />
            <ListEditor
              label="Early-warning indicators"
              guide="Choose observable signals that would trigger escalation or preparation."
              suggestions={scenarioGuidance(r.name).warnings}
              items={r.warningIndicators}
              onChange={(v) => update(r.id, { warningIndicators: v })}
            />
          </div>
        </>
      )}
      {stage === "treatment" && (
        <>
          <div className="grid">
            <label>
              Treatment decision
              <select
                value={r.treatment}
                onChange={(e) => update(r.id, { treatment: e.target.value })}
              >
                <option>Reduce</option>
                <option>Avoid</option>
                <option>Transfer / share</option>
                <option>Accept</option>
                <option>Prepare and monitor</option>
              </select>
            </label>
            <label>
              Target completion
              <input
                type="date"
                value={r.targetDate}
                onChange={(e) => update(r.id, { targetDate: e.target.value })}
              />
            </label>
            <label>
              Target likelihood
              <select
                value={r.targetLikelihood}
                onChange={(e) =>
                  update(r.id, { targetLikelihood: +e.target.value })
                }
              >
                {likelihoodLabels.slice(1).map((x, i) => (
                  <option value={i + 1} key={x}>
                    {i + 1} · {x}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target impact
              <select
                value={r.targetImpact}
                onChange={(e) =>
                  update(r.id, { targetImpact: +e.target.value })
                }
              >
                {impactLabels.slice(1).map((x, i) => (
                  <option value={i + 1} key={x}>
                    {i + 1} · {x}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Corrective-action reference
              <input
                value={r.correctiveActionReference}
                onChange={(e) =>
                  update(r.id, { correctiveActionReference: e.target.value })
                }
                placeholder="PRIR / CI / CAPA / local action reference"
              />
            </label>
            <label>
              Review frequency
              <select
                value={r.reviewFrequency}
                onChange={(e) =>
                  update(r.id, { reviewFrequency: e.target.value })
                }
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Semi-annually</option>
                <option>Annually</option>
                <option>After trigger or change</option>
              </select>
            </label>
            <label>
              Include in Incident Management Plan
              <select
                value={r.includeInIncidentPlan === false ? "no" : "yes"}
                onChange={(e) =>
                  update(r.id, {
                    includeInIncidentPlan: e.target.value === "yes",
                  })
                }
              >
                <option value="yes">
                  Yes — create activation and recovery controls
                </option>
                <option value="no">No — retain in risk register only</option>
              </select>
              <small>
                Only included scenarios flow into BCP Module 9. High and
                Critical exclusions should be justified below.
              </small>
            </label>
            {r.includeInIncidentPlan === false && (
              <label>
                Incident-plan exclusion rationale
                <input
                  value={r.incidentPlanExclusionRationale}
                  onChange={(e) =>
                    update(r.id, {
                      incidentPlanExclusionRationale: e.target.value,
                    })
                  }
                  placeholder="Why this assessed scenario does not require an incident response plan"
                />
              </label>
            )}
          </div>
          <div className="treatmentSupportGrid">
            <ListEditor
              label="Risk-treatment actions"
              guide="Select one or more proportionate actions, then add any site-specific action. Each action should later have an owner, evidence and target date."
              suggestions={treatmentGuidance(r.name)}
              items={r.actions}
              onChange={(v) => update(r.id, { actions: v })}
            />
            <ListEditor
              label="Revision history / changes to impacts, rating or controls"
              guide="Record what changed and why so the controlled risk decision remains traceable."
              suggestions={revisionSuggestions}
              items={r.revisionHistory}
              onChange={(v) => update(r.id, { revisionHistory: v })}
            />
          </div>
          <label>
            Decision and tolerability rationale *
            <textarea
              value={r.decisionRationale}
              onChange={(e) =>
                update(r.id, { decisionRationale: e.target.value })
              }
              placeholder={`Explain why ${r.treatment.toLowerCase()} is appropriate, whether residual risk ${metrics(r).residual}/${metrics(r).residualBand} is tolerable, and who authorised the decision.`}
            />
            <small>
              State the decision basis, expected risk reduction, remaining
              exposure, dependencies, approval authority and review trigger. Do
              not enter only “acceptable” or “reviewed”.
            </small>
          </label>
        </>
      )}
    </article>
  );
}
function ListEditor({ label, guide = "", suggestions = [], items, onChange }) {
  const [value, setValue] = useState("");
  return (
    <div className="list">
      <b>{label}</b>
      {guide && <small className="listGuide">{guide}</small>}
      {suggestions.length > 0 && (
        <div className="listSuggestions">
          {suggestions
            .filter((suggestion) => !items.includes(suggestion))
            .map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => onChange([...items, suggestion])}
              >
                + {suggestion}
              </button>
            ))}
        </div>
      )}
      {items.map((x, i) => (
        <span key={`${x}-${i}`}>
          {x}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </span>
      ))}
      <div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a specific, verifiable item"
        />
        <button
          type="button"
          onClick={() => {
            if (value.trim()) onChange([...items, value.trim()]);
            setValue("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
function Heat({ risks, appetite }) {
  const [mode, setMode] = useState("residual"),
    [selected, setSelected] = useState("");
  const position = (r) => {
    const m = metrics(r);
    return mode === "inherent"
      ? [m.likelihood, m.impact]
      : mode === "target"
        ? [m.targetLikelihood, m.targetImpact]
        : [m.residualLikelihood, m.impact];
  };
  const visible = selected
    ? risks.filter((r) => position(r).join("-") === selected)
    : risks;
  return (
    <>
      <div className="heatHead">
        <div>
          <small>INTERACTIVE RISK POSITION</small>
          <h3>Risk heat map</h3>
          <p>
            {visible.length} of {risks.length} scenarios · appetite {appetite}
            /25
          </p>
        </div>
        <div>
          {["inherent", "residual", "target"].map((x) => (
            <button
              type="button"
              className={mode === x ? "active" : ""}
              onClick={() => {
                setMode(x);
                setSelected("");
              }}
              key={x}
            >
              {x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="heat">
        <div className="axis">IMPACT ↑</div>
        {[5, 4, 3, 2, 1].map((i) => (
          <div className="row" key={i}>
            <label>
              <b>{i}</b>
              <small>{impactLabels[i]}</small>
            </label>
            {[1, 2, 3, 4, 5].map((l) => {
              const here = risks.filter((r) => {
                  const p = position(r);
                  return p[0] === l && p[1] === i;
                }),
                score = i * l,
                key = `${l}-${i}`;
              return (
                <button
                  type="button"
                  className={`${band(score)} ${selected === key ? "selected" : ""}`}
                  key={key}
                  onClick={() => setSelected(selected === key ? "" : key)}
                >
                  <i>{score}</i>
                  <strong>{here.length}</strong>
                  <small>{band(score)}</small>
                  {score > appetite && <em>Above appetite</em>}
                </button>
              );
            })}
          </div>
        ))}
        <footer>
          <span />
          <b>
            1<small>Rare</small>
          </b>
          <b>
            2<small>Unlikely</small>
          </b>
          <b>
            3<small>Possible</small>
          </b>
          <b>
            4<small>Likely</small>
          </b>
          <b>
            5<small>Almost certain</small>
          </b>
        </footer>
        <strong>LIKELIHOOD →</strong>
      </div>
    </>
  );
}
const css = `*{box-sizing:border-box}.hz{display:grid;grid-template-columns:265px minmax(0,1fr);max-width:1780px;margin:auto;background:#eef4fa;color:#0a2342;border:1px solid #ccdae7;border-radius:16px;overflow:hidden;min-height:850px}.hz>aside{background:#09264b;color:#fff;padding:26px 20px}.brand{font-size:22px;font-weight:950}.brand span{font-weight:400}.hz>aside>small{display:block;color:#55ddd0;font-weight:900;letter-spacing:.13em;margin:22px 0}.hz>aside section{background:#143860;border:1px solid #33577c;border-radius:12px;padding:16px}.hz>aside section strong{font-size:30px}.hz>aside section span{display:block;font-size:12px}.hz>aside section i,.progress{display:block;height:7px;background:#d9e4ef;border-radius:9px;overflow:hidden;margin-top:10px}.hz>aside section i b,.progress i{display:block;height:100%;background:linear-gradient(90deg,#2e64ef,#23b8a8)}.hz nav{display:grid;gap:5px;margin:20px -8px}.hz nav button{display:flex;gap:10px;align-items:center;text-align:left;background:transparent;color:#cbd9e8;border:0;padding:11px;border-radius:8px;font-weight:800}.hz nav button b{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#254a72}.hz nav button.active{background:#1d518b;color:#fff}.outputs{border-top:1px solid #315071;padding-top:17px;display:grid;gap:8px;font-size:12px}.outputs b{color:#55ddd0;text-transform:uppercase}.hz>main{min-width:0}.hz>main>header{display:flex;justify-content:space-between;gap:20px;padding:26px 30px 20px;background:#fff}.hz>main>header small,.intro small{color:#285de4;font-weight:900;letter-spacing:.1em}.hz h1{margin:5px 0;font-size:36px}.hz>main>header p{margin:0;color:#607890}.hz>main>header>b{height:max-content;background:#eaf0ff;color:#214fcf;padding:7px 11px;border-radius:20px}.progress{margin:0;height:5px}.panel{margin:20px;padding:0 22px 24px;background:#fff;border:1px solid #d1dfec;border-radius:13px}.intro{margin:0 -22px 20px;padding:20px 22px;border-bottom:1px solid #dce6ef}.intro h2{margin:0 0 5px}.intro p{margin:0;color:#607890}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.hz label{display:grid;gap:6px;font-size:13px;font-weight:850}.hz input,.hz select,.hz textarea{width:100%;border:1px solid #bfd0df;border-radius:8px;padding:11px;background:#fff;color:#102d4d;font:inherit}.wide{display:grid!important;margin-top:15px}.source{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.source article{background:#f2f6fa;border-left:4px solid #2e64ef;padding:13px;border-radius:8px;display:grid}.source small{color:#6a7f94}.source b{font-size:20px}.multi,.choices{margin-top:18px}.multi>b,.choices>b,.list>b{display:block;margin-bottom:9px}.multi>div,.choices>div{display:flex;gap:7px;flex-wrap:wrap}.multi button,.choices button,.catalogue button,.add,.custom button{border:1px solid #bfd0df;background:#f7fafc;color:#153c62;padding:8px 10px;border-radius:20px;font-weight:750}.multi button.selected,.choices button.selected,.catalogue button.selected{background:#e1f8f3;border-color:#1da791;color:#066456}.multi>span,.list>div{display:flex;margin-top:9px}.multi>span input,.list>div input{border-radius:8px 0 0 8px}.multi>span button,.list>div button{border-radius:0 8px 8px 0;background:#2d60e6;color:#fff}.multi .chip{margin-top:8px;background:#eaf0ff;color:#214fcf}.catalogue{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.catalogue fieldset{border:1px solid #d0dfec;border-radius:10px;padding:12px;display:flex;gap:7px;flex-wrap:wrap}.catalogue legend{font-weight:900;padding:0 7px}.add{margin:15px 0;background:#2d60e6;color:#fff;border-radius:8px}.custom{display:flex;margin:8px 0}.custom input{border-radius:8px 0 0 8px}.custom button{border-radius:0 8px 8px 0}.generate{border:0;background:#2d60e6;color:#fff;border-radius:8px;padding:11px 14px;font-weight:900;margin-bottom:15px}.risk{border:1px solid #ccdae7;border-radius:12px;margin:0 0 17px;padding:16px;background:#fbfdff}.risk>header{display:flex;justify-content:space-between;gap:15px;margin-bottom:14px}.risk h3{margin:3px 0}.risk small{color:#667e94}.risk>header>div:last-child{display:flex;align-items:center;gap:8px}.risk em,.register em{font-style:normal;padding:6px 9px;border-radius:18px;font-size:12px;font-weight:900}.Low{background:#dff5e9!important;color:#087242}.Moderate{background:#fff2bf!important;color:#805d00}.High{background:#ffe1b8!important;color:#944f00}.Critical{background:#ffd4d4!important;color:#a61f1f}.impact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:15px 0}.impact label{background:#f0f5f9;padding:10px;border-radius:8px}.impact label span{display:flex;justify-content:space-between}.impact input,.risk input[type=range]{padding:0;accent-color:#2d60e6}.list{margin:13px 0}.list>span{display:flex;justify-content:space-between;background:#edf3f8;padding:8px 10px;margin:5px 0;border-radius:6px}.list>span button{border:0;background:transparent;color:#b22727;font-weight:950}.approval{display:grid;grid-template-columns:1fr 2fr;gap:12px;background:#edf4ff;padding:15px;border-radius:10px}.heat{max-width:640px;margin:10px auto 25px;position:relative}.heat .row,.heat footer{display:grid;grid-template-columns:35px repeat(5,1fr);gap:4px;margin-bottom:4px}.heat .row>div{height:50px;display:grid;place-items:center;position:relative;border-radius:5px}.heat .row span{position:absolute;right:5px;top:5px;background:#09264b;color:#fff;border-radius:50%;width:19px;height:19px;display:grid;place-items:center;font-size:10px}.heat footer{text-align:center}.heat>strong{display:block;text-align:center;font-size:11px}.axis{font-size:11px;font-weight:900}.register{display:grid;gap:9px}.register article{display:flex;justify-content:space-between;align-items:center;border:1px solid #d1deea;border-radius:9px;padding:13px}.register h3{margin:3px 0}.register p{margin:4px 0;color:#617990}.register article>div:last-child{display:flex;align-items:center;gap:8px}.hz>main>footer{position:sticky;bottom:0;display:flex;gap:8px;align-items:center;padding:14px 20px;background:#fff;border-top:1px solid #cbd9e5;z-index:3}.hz>main>footer span{margin-right:auto;color:#607890}.hz>main>footer button{padding:10px 13px;border:1px solid #bfd0df;border-radius:7px;background:#fff;font-weight:850}.hz>main>footer .primary{background:#2d60e6;color:#fff;border-color:#2d60e6}.hz>main>footer .danger{color:#aa2424}.error{position:fixed;z-index:20;left:50%;top:20px;transform:translateX(-50%);background:#fff0f0;border:1px solid #efaaaa;color:#9c1d1d;padding:12px 18px;border-radius:8px;display:grid}@media(max-width:900px){.hz{display:block;border-radius:0}.hz>aside{padding:16px}.hz nav{grid-template-columns:repeat(3,1fr)}.hz nav button{display:grid}.outputs{display:none}.grid,.catalogue,.impact,.source,.approval{grid-template-columns:1fr}.panel{margin:10px;padding:0 14px 20px}.intro{margin:0 -14px 16px}.hz>main>header{padding:18px}.hz h1{font-size:28px}.hz>main>footer{flex-wrap:wrap}.hz>main>footer span{width:100%;order:-1}.risk>header,.register article{align-items:flex-start;flex-direction:column}}`;
