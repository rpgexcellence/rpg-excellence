import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";
import {
  saveManagementReadiness,
} from "./actions";

const DIMENSIONS = [
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

function overallReadinessLabel(score) {
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

export default async function ManagementReadinessPage({
  params,
}) {
  const { id } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select(
      "id, standard, status"
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (
    assessmentError ||
    !assessment
  ) {
    redirect("/portal");
  }

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
    DIMENSIONS.map(
      (dimension) =>
        readinessValue(
          readinessByKey[
            dimension.key
          ]?.readiness_rating
        )
    ).filter(
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
    readinessRows.filter(
      (row) =>
        row.readiness_rating
    ).length;

  const highConfidenceCount =
    readinessRows.filter(
      (row) =>
        row.evidence_confidence ===
        "High"
    ).length;

  const openManagementActions =
    readinessRows.filter(
      (row) =>
        row.management_action &&
        row.target_date
    ).length;

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
              flexWrap: "wrap",
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
                {DIMENSIONS.length} dimensions
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
              `${completedDimensions}/${DIMENSIONS.length}`,
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
          Management readiness is separate
          from clause conformity. It evaluates
          whether leadership, governance,
          assurance and organisational
          capability can sustain an effective
          environmental management system.
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
            {DIMENSIONS.map(
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
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "16px",
                        alignItems:
                          "flex-start",
                        flexWrap:
                          "wrap",
                        marginBottom:
                          "16px",
                      }}
                    >
                      <div>
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
                              "760px",
                          }}
                        >
                          {
                            dimension.guidance
                          }
                        </p>
                      </div>
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
                            saved
                              ?.readiness_rating ??
                            ""
                          }
                          style={{
                            width:
                              "100%",
                            padding:
                              "12px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d8e0ea",
                            background:
                              "#ffffff",
                          }}
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
                            saved
                              ?.evidence_confidence ??
                            ""
                          }
                          style={{
                            width:
                              "100%",
                            padding:
                              "12px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d8e0ea",
                            background:
                              "#ffffff",
                          }}
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
                          saved
                            ?.objective_evidence ??
                          ""
                        }
                        placeholder="Objective evidence supporting this management-readiness conclusion..."
                        style={{
                          width:
                            "100%",
                          padding:
                            "12px",
                          borderRadius:
                            "8px",
                          border:
                            "1px solid #d8e0ea",
                          boxSizing:
                            "border-box",
                          resize:
                            "vertical",
                        }}
                      />

                      <textarea
                        name={`assessor_commentary_${dimension.key}`}
                        rows="3"
                        defaultValue={
                          saved
                            ?.assessor_commentary ??
                          ""
                        }
                        placeholder="Assessor commentary / management-readiness rationale..."
                        style={{
                          width:
                            "100%",
                          padding:
                            "12px",
                          borderRadius:
                            "8px",
                          border:
                            "1px solid #d8e0ea",
                          boxSizing:
                            "border-box",
                          resize:
                            "vertical",
                        }}
                      />

                      <textarea
                        name={`management_concern_${dimension.key}`}
                        rows="2"
                        defaultValue={
                          saved
                            ?.management_concern ??
                          ""
                        }
                        placeholder="Management concern / issue requiring attention..."
                        style={{
                          width:
                            "100%",
                          padding:
                            "12px",
                          borderRadius:
                            "8px",
                          border:
                            "1px solid #d8e0ea",
                          boxSizing:
                            "border-box",
                          resize:
                            "vertical",
                        }}
                      />

                      <textarea
                        name={`management_action_${dimension.key}`}
                        rows="3"
                        defaultValue={
                          saved
                            ?.management_action ??
                          ""
                        }
                        placeholder="Management action required..."
                        style={{
                          width:
                            "100%",
                          padding:
                            "12px",
                          borderRadius:
                            "8px",
                          border:
                            "1px solid #d8e0ea",
                          boxSizing:
                            "border-box",
                          resize:
                            "vertical",
                        }}
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
                            saved
                              ?.action_owner ??
                            ""
                          }
                          placeholder="Management action owner"
                          style={{
                            padding:
                              "12px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d8e0ea",
                          }}
                        />

                        <input
                          name={`target_date_${dimension.key}`}
                          type="date"
                          defaultValue={
                            saved
                              ?.target_date ??
                            ""
                          }
                          style={{
                            padding:
                              "12px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d8e0ea",
                          }}
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
