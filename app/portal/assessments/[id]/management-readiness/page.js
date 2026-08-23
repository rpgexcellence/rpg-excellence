import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";

import {
  saveManagementReadiness,
} from "./actions";

const ISO_14001_DIMENSIONS = [
  {
    key: "leadership",
    name: "Leadership",
    order: 1,
    guidance:
      "Assess visible top-management accountability, strategic integration, environmental leadership and decision-making.",
  },
  {
    key: "governance",
    name: "Governance",
    order: 2,
    guidance:
      "Assess oversight, roles, escalation, assurance, accountability and the quality of management-system governance.",
  },
  {
    key: "environmental_context",
    name: "Environmental Context",
    order: 3,
    guidance:
      "Assess management understanding of environmental conditions, interested parties, dependencies and business resilience.",
  },
  {
    key: "risk_management",
    name: "Risk Management",
    order: 4,
    guidance:
      "Assess how environmental aspects, compliance obligations, risks, opportunities and change are identified and controlled.",
  },
  {
    key: "operational_control",
    name: "Operational Control",
    order: 5,
    guidance:
      "Assess whether significant environmental activities, contractors, suppliers and emergency arrangements are effectively controlled.",
  },
  {
    key: "compliance_assurance",
    name: "Compliance Assurance",
    order: 6,
    guidance:
      "Assess whether management has reliable evidence of legal and other compliance status and acts on non-compliance.",
  },
  {
    key: "environmental_performance",
    name: "Environmental Performance",
    order: 7,
    guidance:
      "Assess the credibility of environmental data, objectives, indicators, trends and measurable environmental outcomes.",
  },
  {
    key: "internal_assurance",
    name: "Internal Assurance",
    order: 8,
    guidance:
      "Assess internal audit, competence, independence, management review and the reliability of assurance information.",
  },
  {
    key: "improvement_capability",
    name: "Improvement Capability",
    order: 9,
    guidance:
      "Assess root cause, corrective action, learning, recurrence prevention and evidence of continual improvement.",
  },
];

const ISO_45001_DIMENSIONS = [
  {
    key: "ohs_leadership_culture",
    name: "Leadership & OH&S Culture",
    order: 1,
    guidance:
      "Assess visible top-management accountability for preventing work-related injury and ill health, provision of safe and healthy workplaces, integration of OH&S into business decisions and the strength of the organisation's safety culture.",
  },
  {
    key: "ohs_governance",
    name: "Governance & Accountability",
    order: 2,
    guidance:
      "Assess whether OH&S roles, responsibilities, authorities, escalation routes and management oversight are clearly defined, understood and effective.",
  },
  {
    key: "ohs_context",
    name: "OH&S Context & Worker Needs",
    order: 3,
    guidance:
      "Assess management understanding of organisational context, worker needs, interested parties, workplace conditions and external factors that can affect OH&S outcomes.",
  },
  {
    key: "hazard_risk_management",
    name: "Hazard & Risk Management",
    order: 4,
    guidance:
      "Assess whether hazards are proactively identified and OH&S risks and opportunities are evaluated and controlled using effective, current and risk-based methods.",
  },
  {
    key: "worker_participation",
    name: "Worker Consultation & Participation",
    order: 5,
    guidance:
      "Assess whether workers, particularly non-managerial workers, are genuinely consulted and able to participate in OH&S decision-making, hazard identification, investigations and improvement activities.",
  },
  {
    key: "ohs_operational_control",
    name: "Operational & Contractor Control",
    order: 6,
    guidance:
      "Assess application of the hierarchy of controls, operational controls, management of change, procurement, contractor management, outsourcing and emergency preparedness.",
  },
  {
    key: "ohs_compliance_assurance",
    name: "Legal & Compliance Assurance",
    order: 7,
    guidance:
      "Assess whether applicable legal and other OH&S requirements are identified, maintained, understood, implemented and periodically evaluated for compliance.",
  },
  {
    key: "ohs_performance_assurance",
    name: "OH&S Performance & Internal Assurance",
    order: 8,
    guidance:
      "Assess the reliability of OH&S performance monitoring, incident and near-miss data, occupational health indicators, objectives, internal audits and management review information.",
  },
  {
    key: "ohs_improvement_learning",
    name: "Improvement & Organisational Learning",
    order: 9,
    guidance:
      "Assess incident investigation, root cause analysis, corrective action, effectiveness review, organisational learning, recurrence prevention and evidence of continual improvement.",
  },
];


const ISO_9001_DIMENSIONS = [
  {
    key: "qms_leadership_culture",
    name: "Leadership & Quality Culture",
    order: 1,
    guidance:
      "Assess visible top-management accountability for QMS effectiveness, integration of quality into business decisions, promotion of customer focus, process thinking and a culture of consistent quality performance.",
  },
  {
    key: "qms_governance",
    name: "Governance & Accountability",
    order: 2,
    guidance:
      "Assess whether QMS roles, responsibilities, authorities, escalation routes and management oversight are clearly defined, understood and effective.",
  },
  {
    key: "customer_focus",
    name: "Customer Focus",
    order: 3,
    guidance:
      "Assess whether customer, statutory and regulatory requirements are understood and consistently addressed, and whether customer satisfaction, complaints, changes and related risks drive management decisions.",
  },
  {
    key: "process_management",
    name: "Process Management",
    order: 4,
    guidance:
      "Assess whether the QMS is managed as an effective system of interacting processes with clear inputs, outputs, responsibilities, controls, resources, measures and ownership.",
  },
  {
    key: "qms_risk_change",
    name: "Risk & Change Management",
    order: 5,
    guidance:
      "Assess whether risks and opportunities are integrated into planning and whether QMS, operational and organisational changes are planned and controlled, including relevant climate-related effects where applicable.",
  },
  {
    key: "qms_operational_supplier_control",
    name: "Operational & Supplier Control",
    order: 6,
    guidance:
      "Assess operational planning, customer requirements, design where applicable, production or service controls, supplier and outsourced-process control, release, traceability and nonconforming outputs.",
  },
  {
    key: "quality_performance_data",
    name: "Quality Performance & Data",
    order: 7,
    guidance:
      "Assess whether quality objectives, process measures, customer satisfaction, product or service conformity, supplier performance and trend data are reliable and used for evidence-based decisions.",
  },
  {
    key: "qms_internal_assurance",
    name: "Internal Assurance & Management Review",
    order: 8,
    guidance:
      "Assess the credibility of internal audits, auditor competence and objectivity, follow-up, management review inputs and outputs, and the quality of assurance information provided to top management.",
  },
  {
    key: "qms_improvement_learning",
    name: "Improvement & Organisational Learning",
    order: 9,
    guidance:
      "Assess nonconformity control, root-cause analysis, corrective action, effectiveness review, continual improvement, lessons learned and preservation of organisational knowledge.",
  },
];

const ISO_17024_DIMENSIONS = [
  {
    key: "pcb_leadership_impartiality",
    name: "Leadership, Impartiality & Certification Integrity",
    order: 1,
    guidance:
      "Assess top-management accountability for impartiality, competence, confidentiality, consistent certification decisions and protection of confidence in person-certification activities.",
  },
  {
    key: "pcb_governance_structure",
    name: "Governance, Structure & Impartiality Safeguards",
    order: 2,
    guidance:
      "Assess legal responsibility, organisational structure, authority, oversight, conflict-of-interest controls, stakeholder balance and safeguards against commercial, financial or other pressures.",
  },
  {
    key: "pcb_scheme_governance",
    name: "Certification Scheme Governance",
    order: 3,
    guidance:
      "Assess ownership, development, validation, review and maintenance of certification schemes, including job and task analysis, competence requirements and involvement of appropriate experts and interested parties.",
  },
  {
    key: "pcb_competence_resources",
    name: "Personnel Competence & Resource Control",
    order: 4,
    guidance:
      "Assess competence criteria, selection, training, monitoring and authorisation of employees, examiners, assessors, decision makers, committees, contractors and other external resources.",
  },
  {
    key: "pcb_information_records",
    name: "Confidentiality, Security, Records & Public Information",
    order: 5,
    guidance:
      "Assess confidentiality, information security, certification records, public information, use of certificates and marks, candidate data protection and controls preventing fraudulent practices.",
  },
  {
    key: "pcb_assessment_examination",
    name: "Application, Assessment & Examination Control",
    order: 6,
    guidance:
      "Assess application review, candidate eligibility, reasonable accommodation, assessment methods, examination development, delivery, security, invigilation, scoring, reliability and control of examination irregularities.",
  },
  {
    key: "pcb_certification_lifecycle",
    name: "Certification Decisions & Lifecycle Control",
    order: 7,
    guidance:
      "Assess independent certification decisions, granting and maintaining certification, surveillance where applicable, recertification, scope changes, suspension, withdrawal and reduction of certification.",
  },
  {
    key: "pcb_appeals_complaints",
    name: "Appeals, Complaints & Stakeholder Confidence",
    order: 8,
    guidance:
      "Assess accessible, impartial and timely appeals and complaints processes, independent review, communication, corrective action and protection of appellants and complainants from discriminatory treatment.",
  },
  {
    key: "pcb_internal_assurance_improvement",
    name: "Internal Assurance, Corrective Action & Improvement",
    order: 9,
    guidance:
      "Assess document and record control, internal audit, management review, nonconformity, root-cause analysis, corrective action, effectiveness verification and continual improvement of the person-certification management system.",
  },
];

const READINESS_RATINGS = [
  "Not Ready",
  "Developing",
  "Established",
  "Ready",
];

const CONFIDENCE_LEVELS = [
  "Low",
  "Medium",
  "High",
];

function readinessValue(rating) {
  switch (rating) {
    case "Not Ready":
      return 25;

    case "Developing":
      return 50;

    case "Established":
      return 75;

    case "Ready":
      return 100;

    default:
      return null;
  }
}

function overallReadinessLabel(
  score
) {
  if (score === null) {
    return "Not assessed";
  }

  if (score < 40) {
    return "Not Ready";
  }

  if (score < 65) {
    return "Developing";
  }

  if (score < 85) {
    return "Established";
  }

  return "Ready";
}

function getDimensions(
  standard
) {
  switch (standard) {
    case "ISO 9001:2015/Amd 1:2024":
      return ISO_9001_DIMENSIONS;

    case "ISO 14001:2026":
      return ISO_14001_DIMENSIONS;

    case "ISO 45001:2018":
      return ISO_45001_DIMENSIONS;

    case "ISO/IEC 17024:2026":
      return ISO_17024_DIMENSIONS;

    default:
      throw new Error(
        `Management readiness is not configured for ${standard}.`
      );
  }
}

function getReadinessDescription(
  standard
) {
  switch (standard) {
    case "ISO 9001:2015/Amd 1:2024":
      return "Management readiness is separate from clause conformity. It evaluates whether leadership, customer focus, process governance, risk and change control, operational assurance, quality performance information and organisational capability can sustain an effective quality management system.";

    case "ISO 14001:2026":
      return "Management readiness is separate from clause conformity. It evaluates whether leadership, governance, assurance and organisational capability can sustain an effective environmental management system.";

    case "ISO 45001:2018":
      return "Management readiness is separate from clause conformity. It evaluates whether leadership, worker participation, governance, risk control, operational assurance and organisational capability can sustain an effective OH&S management system.";

    case "ISO/IEC 17024:2026":
      return "Management readiness is separate from clause conformity. It evaluates whether leadership, impartiality safeguards, scheme governance, personnel competence, examination security, certification controls and organisational capability can sustain credible certification of persons.";

    default:
      throw new Error(
        `Management readiness is not configured for ${standard}.`
      );
  }
}

export default async function ManagementReadinessPage({
  params,
}) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login"
    );
  }

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select(
      "id, standard, status"
    )
    .eq(
      "id",
      id
    )
    .eq(
      "owner_id",
      user.id
    )
    .single();

  if (
    assessmentError ||
    !assessment
  ) {
    redirect(
      "/portal"
    );
  }

  const dimensions =
    getDimensions(
      assessment.standard
    );

  const {
    data: readinessData,
    error: readinessError,
  } = await supabase
    .from(
      "management_readiness"
    )
    .select("*")
    .eq(
      "assessment_id",
      assessment.id
    )
    .eq(
      "owner_id",
      user.id
    )
    .order(
      "display_order",
      {
        ascending: true,
      }
    );

  if (readinessError) {
    throw new Error(
      readinessError.message
    );
  }

  const readinessRows =
    readinessData ?? [];

  const readinessByKey =
    Object.fromEntries(
      readinessRows.map(
        (row) => [
          row.dimension_key,
          row,
        ]
      )
    );

  const scoredValues =
    dimensions
      .map(
        (dimension) =>
          readinessValue(
            readinessByKey[
              dimension.key
            ]?.readiness_rating
          )
      )
      .filter(
        (value) =>
          value !== null
      );

  const overallScore =
    scoredValues.length > 0
      ? Math.round(
          scoredValues.reduce(
            (
              total,
              value
            ) =>
              total + value,
            0
          ) /
            scoredValues.length
        )
      : null;

  const overallLabel =
    overallReadinessLabel(
      overallScore
    );

  const completedDimensions =
    dimensions.filter(
      (dimension) =>
        Boolean(
          readinessByKey[
            dimension.key
          ]?.readiness_rating
        )
    ).length;

  const highConfidenceCount =
    dimensions.filter(
      (dimension) =>
        readinessByKey[
          dimension.key
        ]?.evidence_confidence ===
        "High"
    ).length;

  const openManagementActions =
    dimensions.filter(
      (dimension) => {
        const row =
          readinessByKey[
            dimension.key
          ];

        return Boolean(
          row?.management_action
        );
      }
    ).length;

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #d8e0ea",
    background: "#ffffff",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "40px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "20px",
            alignItems:
              "flex-start",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <div
              style={{
                color: "#1459D9",
                fontWeight: 800,
                fontSize: "12px",
                letterSpacing:
                  "0.8px",
                marginBottom: "8px",
              }}
            >
              RPG INTELLIGENCE
            </div>

            <h1
              style={{
                color: "#071A33",
                margin: 0,
              }}
            >
              Management Readiness
              Assessment
            </h1>

            <p
              style={{
                color: "#617087",
                marginBottom: 0,
              }}
            >
              {assessment.standard}{" "}
              Assessment
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/portal/assessments/${assessment.id}/summary`}
              style={{
                padding:
                  "11px 16px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #d8e0ea",
                background:
                  "#ffffff",
                color:
                  "#071A33",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              ← Executive Summary
            </Link>

            <Link
              href={`/portal/assessments/${assessment.id}/readiness`}
              style={{
                padding:
                  "11px 16px",
                borderRadius:
                  "8px",
                background:
                  "#071A33",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              Certification Readiness
            </Link>
          </div>
        </div>

        <section
          style={{
            background:
              "#071A33",
            color:
              "#ffffff",
            borderRadius:
              "16px",
            padding: "28px",
            marginBottom:
              "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "20px",
              alignItems:
                "center",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing:
                    "1px",
                  opacity: 0.75,
                  marginBottom:
                    "8px",
                }}
              >
                MANAGEMENT READINESS
              </div>

              <strong
                style={{
                  fontSize: "26px",
                }}
              >
                {overallLabel}
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  opacity: 0.75,
                }}
              >
                {completedDimensions} of{" "}
                {dimensions.length} dimensions
                assessed
              </p>
            </div>

            <div
              style={{
                fontSize: "52px",
                fontWeight: 800,
              }}
            >
              {overallScore !== null
                ? `${overallScore}%`
                : "—"}
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "14px",
            marginBottom:
              "24px",
          }}
        >
          {[
            [
              "DIMENSIONS ASSESSED",
              `${completedDimensions}/${dimensions.length}`,
            ],
            [
              "HIGH CONFIDENCE",
              highConfidenceCount,
            ],
            [
              "MANAGEMENT ACTIONS",
              openManagementActions,
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                style={{
                  background:
                    "#ffffff",
                  border:
                    "1px solid #dfe6ee",
                  borderRadius:
                    "12px",
                  padding:
                    "18px",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                    marginBottom:
                      "7px",
                  }}
                >
                  {label}
                </div>

                <strong
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "28px",
                  }}
                >
                  {value}
                </strong>
              </div>
            )
          )}
        </section>

        <div
          style={{
            background:
              "#eef4ff",
            border:
              "1px solid #d6e4ff",
            color:
              "#405574",
            borderRadius:
              "10px",
            padding:
              "16px 18px",
            lineHeight: 1.55,
            marginBottom:
              "24px",
          }}
        >
          {getReadinessDescription(
            assessment.standard
          )}
        </div>

        <form
          action={
            saveManagementReadiness
          }
        >
          <input
            type="hidden"
            name="assessment_id"
            value={
              assessment.id
            }
          />

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {dimensions.map(
              (dimension) => {
                const saved =
                  readinessByKey[
                    dimension.key
                  ] ?? null;

                return (
                  <section
                    key={
                      dimension.key
                    }
                    style={{
                      background:
                        "#ffffff",
                      border:
                        "1px solid #dfe6ee",
                      borderRadius:
                        "14px",
                      padding:
                        "22px",
                    }}
                  >
                    <div
                      style={{
                        marginBottom:
                          "16px",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#1459D9",
                          fontSize:
                            "11px",
                          fontWeight:
                            800,
                          marginBottom:
                            "5px",
                        }}
                      >
                        DIMENSION{" "}
                        {dimension.order}
                      </div>

                      <h2
                        style={{
                          color:
                            "#071A33",
                          margin:
                            "0 0 6px",
                        }}
                      >
                        {
                          dimension.name
                        }
                      </h2>

                      <p
                        style={{
                          color:
                            "#617087",
                          margin: 0,
                          lineHeight:
                            1.55,
                          maxWidth:
                            "820px",
                        }}
                      >
                        {
                          dimension.guidance
                        }
                      </p>
                    </div>

                    <input
                      type="hidden"
                      name={`dimension_name_${dimension.key}`}
                      value={
                        dimension.name
                      }
                    />

                    <input
                      type="hidden"
                      name={`display_order_${dimension.key}`}
                      value={
                        dimension.order
                      }
                    />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: "12px",
                        marginBottom:
                          "12px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display:
                              "block",
                            color:
                              "#071A33",
                            fontWeight:
                              700,
                            marginBottom:
                              "7px",
                          }}
                        >
                          Readiness rating
                        </label>

                        <select
                          name={`readiness_rating_${dimension.key}`}
                          defaultValue={
                            saved?.readiness_rating ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        >
                          <option value="">
                            Not assessed
                          </option>

                          {READINESS_RATINGS.map(
                            (rating) => (
                              <option
                                key={
                                  rating
                                }
                                value={
                                  rating
                                }
                              >
                                {
                                  rating
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            display:
                              "block",
                            color:
                              "#071A33",
                            fontWeight:
                              700,
                            marginBottom:
                              "7px",
                          }}
                        >
                          Evidence confidence
                        </label>

                        <select
                          name={`evidence_confidence_${dimension.key}`}
                          defaultValue={
                            saved?.evidence_confidence ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        >
                          <option value="">
                            Select confidence
                          </option>

                          {CONFIDENCE_LEVELS.map(
                            (level) => (
                              <option
                                key={
                                  level
                                }
                                value={
                                  level
                                }
                              >
                                {
                                  level
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "12px",
                      }}
                    >
                      <textarea
                        name={`objective_evidence_${dimension.key}`}
                        rows="3"
                        defaultValue={
                          saved?.objective_evidence ??
                          ""
                        }
                        placeholder="Objective evidence supporting this management-readiness conclusion..."
                        style={
                          inputStyle
                        }
                      />

                      <textarea
                        name={`assessor_commentary_${dimension.key}`}
                        rows="3"
                        defaultValue={
                          saved?.assessor_commentary ??
                          ""
                        }
                        placeholder="Assessor commentary / management-readiness rationale..."
                        style={
                          inputStyle
                        }
                      />

                      <textarea
                        name={`management_concern_${dimension.key}`}
                        rows="2"
                        defaultValue={
                          saved?.management_concern ??
                          ""
                        }
                        placeholder="Management concern / issue requiring attention..."
                        style={
                          inputStyle
                        }
                      />

                      <textarea
                        name={`management_action_${dimension.key}`}
                        rows="3"
                        defaultValue={
                          saved?.management_action ??
                          ""
                        }
                        placeholder="Management action required..."
                        style={
                          inputStyle
                        }
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <input
                          name={`action_owner_${dimension.key}`}
                          type="text"
                          defaultValue={
                            saved?.action_owner ??
                            ""
                          }
                          placeholder="Management action owner"
                          style={
                            inputStyle
                          }
                        />

                        <input
                          name={`target_date_${dimension.key}`}
                          type="date"
                          defaultValue={
                            saved?.target_date ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        />
                      </div>
                    </div>
                  </section>
                );
              }
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "12px",
              flexWrap: "wrap",
              marginTop:
                "24px",
            }}
          >
            <Link
              href={`/portal/assessments/${assessment.id}/summary`}
              style={{
                padding:
                  "12px 18px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #d8e0ea",
                color:
                  "#071A33",
                background:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              style={{
                padding:
                  "12px 20px",
                borderRadius:
                  "8px",
                border:
                  "none",
                background:
                  "#1459D9",
                color:
                  "#ffffff",
                fontWeight:
                  700,
                cursor:
                  "pointer",
              }}
            >
              Save Management
              Readiness
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
