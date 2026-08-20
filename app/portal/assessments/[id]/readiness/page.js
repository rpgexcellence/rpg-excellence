import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

import {
  calculateSimpleOverallScore,
  calculateWeightedOverallScore,
  calculateProgress,
} from "../scoring";

const CLAUSE_NUMBERS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];


function managementReadinessValue(rating) {
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

function managementReadinessLabel(score, completed) {
  if (completed < 9 || score === null) {
    return "Not assessed";
  }

  if (score < 40) return "Not Ready";
  if (score < 65) return "Developing";
  if (score < 85) return "Established";
  return "Ready";
}

function decisionStyle(decision) {
  if (decision === "Potentially ready") {
    return {
      background: "#edf8f3",
      border: "#c8e8d8",
      color: "#205c43",
    };
  }

  if (
    decision === "Not ready" ||
    decision ===
      "Significant improvement required"
  ) {
    return {
      background: "#fff1f0",
      border: "#f3c7c2",
      color: "#9f2d20",
    };
  }

  if (
    decision ===
    "Readiness review recommended"
  ) {
    return {
      background: "#fff8e8",
      border: "#f1dfad",
      color: "#735c17",
    };
  }

  return {
    background: "#eef4ff",
    border: "#d6e4ff",
    color: "#405574",
  };
}

export default async function CertificationReadinessPage({
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
    .select("*")
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
    data: questionsData,
    error: questionsError,
  } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq(
      "standard",
      assessment.standard
    )
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    });

  if (questionsError) {
    throw new Error(
      questionsError.message
    );
  }

  const questions =
    questionsData ?? [];

  const questionNumbers =
    questions.map(
      (question) =>
        question.question_number
    );

  let answers = [];

  if (questionNumbers.length) {
    const {
      data,
      error,
    } = await supabase
      .from("assessment_answers")
      .select("*")
      .eq(
        "assessment_id",
        assessment.id
      )
      .eq(
        "owner_id",
        user.id
      )
      .in(
        "clause",
        questionNumbers
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    answers = data ?? [];
  }

  const {
    data: scoringProfile,
    error: scoringProfileError,
  } = await supabase
    .from("scoring_profiles")
    .select(
      "id, profile_name, version_label"
    )
    .eq(
      "standard",
      assessment.standard
    )
    .eq("active", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (scoringProfileError) {
    throw new Error(
      scoringProfileError.message
    );
  }

  let weights = {};

  if (scoringProfile) {
    const {
      data: clauseWeights,
      error: clauseWeightsError,
    } = await supabase
      .from(
        "scoring_profile_clauses"
      )
      .select(
        "clause, weight"
      )
      .eq(
        "scoring_profile_id",
        scoringProfile.id
      );

    if (clauseWeightsError) {
      throw new Error(
        clauseWeightsError.message
      );
    }

    weights =
      Object.fromEntries(
        (
          clauseWeights ?? []
        ).map((row) => [
          row.clause,
          Number(row.weight),
        ])
      );
  }

  const progress =
    calculateProgress(
      questions,
      answers
    );

  const overallScore =
    Object.keys(weights).length
      ? calculateWeightedOverallScore(
          {
            clauseNumbers:
              CLAUSE_NUMBERS,
            questions,
            answers,
            weights,
          }
        )
      : calculateSimpleOverallScore(
          answers
        );

  const admin =
    createAdminClient();

  const {
    data: findingsData,
    error: findingsError,
  } = await admin
    .from("assessment_findings")
    .select("*")
    .eq(
      "assessment_id",
      assessment.id
    )
    .eq(
      "owner_id",
      user.id
    )
    .neq(
      "finding_type",
      "conformity"
    );

  if (findingsError) {
    throw new Error(
      findingsError.message
    );
  }

  const findings =
    findingsData ?? [];

  const openFindings =
    findings.filter(
      (finding) =>
        finding.status !==
        "closed"
    );

  const openMajor =
    openFindings.filter(
      (finding) =>
        finding.finding_type ===
        "major_nc"
    );

  const openMinor =
    openFindings.filter(
      (finding) =>
        finding.finding_type ===
        "minor_nc"
    );

  const highRisk =
    openFindings.filter(
      (finding) =>
        finding.risk_impact ===
        "High"
    );

  const mediumRisk =
    openFindings.filter(
      (finding) =>
        finding.risk_impact ===
        "Medium"
    );

  const lowRisk =
    openFindings.filter(
      (finding) =>
        finding.risk_impact ===
        "Low"
    );

  const findingIds =
    findings.map(
      (finding) => finding.id
    );

  let correctiveActions = [];
  let managementActions = [];

  if (findingIds.length) {
    const {
      data,
      error,
    } = await admin
      .from("corrective_actions")
      .select("*")
      .eq(
        "assessment_id",
        assessment.id
      )
      .eq(
        "owner_id",
        user.id
      )
      .in(
        "finding_id",
        findingIds
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    correctiveActions =
      data ?? [];
  }

  const {
    data: managementData,
    error: managementError,
  } = await admin
    .from(
      "management_action_plan"
    )
    .select("*")
    .eq(
      "assessment_id",
      assessment.id
    )
    .eq(
      "owner_id",
      user.id
    );

  if (managementError) {
    throw new Error(
      managementError.message
    );
  }

  managementActions =
    managementData ?? [];

  const correctiveByFinding =
    Object.fromEntries(
      correctiveActions.map(
        (action) => [
          action.finding_id,
          action,
        ]
      )
    );

  const managementByFinding =
    Object.fromEntries(
      managementActions
        .filter(
          (action) =>
            action.finding_id
        )
        .map((action) => [
          action.finding_id,
          action,
        ])
    );

  const {
    data: managementReadinessRows,
    error: managementReadinessError,
  } = await supabase
    .from("management_readiness")
    .select(
      "dimension_key, readiness_rating, evidence_confidence"
    )
    .eq("assessment_id", assessment.id)
    .eq("owner_id", user.id)
    .order("display_order", { ascending: true });

  if (managementReadinessError) {
    throw new Error(
      managementReadinessError.message
    );
  }

  const managementRows =
    managementReadinessRows ?? [];

  const managementValues =
    managementRows
      .map((row) =>
        managementReadinessValue(
          row.readiness_rating
        )
      )
      .filter(
        (value) =>
          value !== null
      );

  const managementDimensionsCompleted =
    managementValues.length;

  const managementReadinessScore =
    managementValues.length > 0
      ? Math.round(
          managementValues.reduce(
            (total, value) =>
              total + value,
            0
          ) /
            managementValues.length
        )
      : null;

  const managementReadiness =
    managementReadinessLabel(
      managementReadinessScore,
      managementDimensionsCompleted
    );

  const today =
    new Date();

  const overdueActions =
    openFindings.filter(
      (finding) => {
        const managementAction =
          managementByFinding[
            finding.id
          ];

        const correctiveAction =
          correctiveByFinding[
            finding.id
          ];

        const targetDate =
          managementAction
            ?.target_date ??
          correctiveAction
            ?.target_date;

        const status =
          managementAction
            ?.status ??
          correctiveAction
            ?.status ??
          finding.status;

        return Boolean(
          targetDate &&
          ![
            "closed",
            "completed",
            "effective",
          ].includes(status) &&
          new Date(
            `${targetDate}T23:59:59`
          ) < today
        );
      }
    );

  const completedActions =
    managementActions.filter(
      (action) =>
        action.status ===
        "completed"
    ).length;

  const openMandatoryActions =
    openFindings.filter(
      (finding) =>
        [
          "major_nc",
          "minor_nc",
        ].includes(
          finding.finding_type
        )
    );

  let decision =
    "Assessment incomplete";

  if (
    progress.percentage ===
    100
  ) {
    if (
      managementDimensionsCompleted < 9
    ) {
      decision =
        "Management readiness incomplete";
    } else if (
      managementReadiness ===
        "Not Ready" ||
      openMajor.length > 0
    ) {
      decision =
        "Not ready";
    } else if (
      managementReadiness ===
        "Developing" ||
      highRisk.length > 0 ||
      overdueActions.length > 0
    ) {
      decision =
        "Significant improvement required";
    } else if (
      openMinor.length > 0 ||
      openMandatoryActions.length >
        0 ||
      managementReadiness ===
        "Established"
    ) {
      decision =
        "Readiness review recommended";
    } else if (
      managementReadiness ===
        "Ready" &&
      overallScore !== null &&
      overallScore >= 80
    ) {
      decision =
        "Potentially ready";
    } else if (
      overallScore !== null &&
      overallScore >= 60
    ) {
      decision =
        "Progressing";
    } else {
      decision =
        "Significant improvement required";
    }
  }

  const style =
    decisionStyle(
      decision
    );

  const checks = [
    {
      label:
        "Management readiness completed",
      pass:
        managementDimensionsCompleted === 9,
      detail:
        `${managementDimensionsCompleted} of 9 dimensions assessed${
          managementReadinessScore !== null
            ? ` — ${managementReadiness} (${managementReadinessScore}%)`
            : ""
        }`,
    },
    {
      label:
        "Assessment completed",
      pass:
        progress.percentage ===
        100,
      detail:
        `${progress.answered} of ${progress.total} controls answered`,
    },
    {
      label:
        "No open Major NC",
      pass:
        openMajor.length === 0,
      detail:
        `${openMajor.length} open Major NC`,
    },
    {
      label:
        "No open High-risk finding",
      pass:
        highRisk.length === 0,
      detail:
        `${highRisk.length} open High-risk finding(s)`,
    },
    {
      label:
        "No overdue action",
      pass:
        overdueActions.length ===
        0,
      detail:
        `${overdueActions.length} overdue action(s)`,
    },
    {
      label:
        "Minor NC position controlled",
      pass:
        openMinor.length === 0,
      detail:
        `${openMinor.length} open Minor NC`,
    },
    {
      label:
        "Readiness score established",
      pass:
        overallScore !== null,
      detail:
        overallScore !== null
          ? `${overallScore}%`
          : "Not yet established",
    },
  ];

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
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "20px",
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
                  ".8px",
              }}
            >
              RPG INTELLIGENCE
            </div>

            <h1
              style={{
                color: "#071A33",
                marginBottom: "6px",
              }}
            >
              Certification Readiness
              Decision
            </h1>

            <p
              style={{
                color: "#617087",
                margin: 0,
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
              href={`/portal/assessments/${assessment.id}/management-readiness`}
              style={{
                padding:
                  "11px 16px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #1459D9",
                background:
                  "#ffffff",
                color:
                  "#1459D9",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              Management Readiness
            </Link>

            <Link
              href={`/portal/assessments/${assessment.id}/actions-plan`}
              style={{
                padding:
                  "11px 16px",
                borderRadius:
                  "8px",
                background:
                  "#1459D9",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              Management Action Plan
            </Link>
          </div>
        </div>

        <section
          style={{
            background:
              style.background,
            border:
              `1px solid ${style.border}`,
            color:
              style.color,
            borderRadius:
              "14px",
            padding: "26px",
            marginBottom:
              "24px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            CURRENT RPG READINESS
            RECOMMENDATION
          </div>

          <div
            style={{
              fontSize: "30px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            {decision}
          </div>

          <div
            style={{
              lineHeight: 1.6,
            }}
          >
            This is an RPG readiness
            recommendation based on the
            available assessment evidence.
            It is not an accredited
            certification decision.
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom:
              "24px",
          }}
        >
          {[
            [
              "READINESS SCORE",
              overallScore !== null
                ? `${overallScore}%`
                : "—",
            ],
            [
              "MANAGEMENT READINESS",
              managementReadinessScore !== null
                ? `${managementReadinessScore}%`
                : "—",
            ],
            [
              "OPEN MAJOR NC",
              openMajor.length,
            ],
            [
              "OPEN MINOR NC",
              openMinor.length,
            ],
            [
              "HIGH RISK",
              highRisk.length,
            ],
            [
              "MEDIUM RISK",
              mediumRisk.length,
            ],
            [
              "LOW RISK",
              lowRisk.length,
            ],
            [
              "OVERDUE",
              overdueActions.length,
            ],
            [
              "COMPLETED ACTIONS",
              completedActions,
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
                    "10px",
                  padding:
                    "16px",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "10px",
                    fontWeight:
                      800,
                    marginBottom:
                      "6px",
                  }}
                >
                  {label}
                </div>

                <strong
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "24px",
                  }}
                >
                  {value}
                </strong>
              </div>
            )
          )}
        </section>

        <section
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #dfe6ee",
            borderRadius:
              "14px",
            padding: "26px",
            marginBottom:
              "24px",
          }}
        >
          <h2
            style={{
              color: "#071A33",
              marginTop: 0,
            }}
          >
            Readiness Gate Checks
          </h2>

          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {checks.map(
              (check) => (
                <div
                  key={
                    check.label
                  }
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    gap: "18px",
                    alignItems:
                      "center",
                    padding:
                      "14px 16px",
                    borderRadius:
                      "9px",
                    background:
                      "#f7f9fc",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color:
                          "#071A33",
                      }}
                    >
                      {check.label}
                    </strong>

                    <div
                      style={{
                        color:
                          "#617087",
                        fontSize:
                          "13px",
                        marginTop:
                          "4px",
                      }}
                    >
                      {check.detail}
                    </div>
                  </div>

                  <strong
                    style={{
                      color:
                        check.pass
                          ? "#16794b"
                          : "#b42318",
                    }}
                  >
                    {check.pass
                      ? "PASS"
                      : "OPEN"}
                  </strong>
                </div>
              )
            )}
          </div>
        </section>

        <section
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #dfe6ee",
            borderRadius:
              "14px",
            padding: "26px",
          }}
        >
          <h2
            style={{
              color: "#071A33",
              marginTop: 0,
            }}
          >
            Decision Guide
          </h2>

          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {[
              [
                "Management readiness incomplete",
                "The clause assessment is complete, but all nine management-readiness dimensions have not yet been assessed.",
              ],
              [
                "Not ready",
                "Open Major NC or other systemic barrier prevents progression.",
              ],
              [
                "Significant improvement required",
                "High-risk or overdue material actions remain, or the overall readiness position is materially weak.",
              ],
              [
                "Progressing",
                "The EMS is established and developing, but further evidence or implementation is required.",
              ],
              [
                "Readiness review recommended",
                "No Major NC remains, but open Minor NC or other conditions should be verified before progression.",
              ],
              [
                "Potentially ready",
                "The assessment is complete, no significant open barrier is known, and the readiness score is sufficiently strong.",
              ],
            ].map(
              ([level, meaning]) => (
                <div
                  key={level}
                  style={{
                    padding:
                      "14px 16px",
                    borderRadius:
                      "9px",
                    background:
                      level ===
                      decision
                        ? "#eef4ff"
                        : "#f7f9fc",
                    border:
                      level ===
                      decision
                        ? "1px solid #b7cffc"
                        : "1px solid transparent",
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#071A33",
                    }}
                  >
                    {level}
                  </strong>

                  <div
                    style={{
                      color:
                        "#617087",
                      lineHeight:
                        1.55,
                      marginTop:
                        "5px",
                    }}
                  >
                    {meaning}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
