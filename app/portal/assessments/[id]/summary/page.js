import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

import {
  calculateClauseScore,
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

const CLAUSE_TITLES = {
  "4": "Context of the Organization",
  "5": "Leadership",
  "6": "Planning",
  "7": "Support",
  "8": "Operation",
  "9": "Performance Evaluation",
  "10": "Improvement",
};


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

export default async function AssessmentSummaryPage({
  params,
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // --------------------------------------------------
  // LOAD ASSESSMENT
  // --------------------------------------------------

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (assessmentError || !assessment) {
    redirect("/portal");
  }

  // --------------------------------------------------
  // LOAD QUESTION BANK
  // --------------------------------------------------

  const {
    data: questions,
    error: questionsError,
  } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq("standard", assessment.standard)
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    });

  if (questionsError) {
    throw new Error(
      questionsError.message
    );
  }

  const allQuestions =
    questions ?? [];

  const questionNumbers =
    allQuestions.map(
      (question) =>
        question.question_number
    );

  // --------------------------------------------------
  // LOAD SAVED ANSWERS
  // --------------------------------------------------

  let answers = [];

  if (questionNumbers.length > 0) {
    const {
      data,
      error: answersError,
    } = await supabase
      .from("assessment_answers")
      .select("*")
      .eq(
        "assessment_id",
        assessment.id
      )
      .eq("owner_id", user.id)
      .in(
        "clause",
        questionNumbers
      );

    if (answersError) {
      throw new Error(
        answersError.message
      );
    }

    answers = data ?? [];
  }

  // --------------------------------------------------
  // LOAD ACTIVE SCORING PROFILE
  // --------------------------------------------------

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

  // --------------------------------------------------
  // LOAD CLAUSE WEIGHTS
  // --------------------------------------------------

  let weights = {};

  if (scoringProfile) {
    const {
      data: clauseWeights,
      error: clauseWeightsError,
    } = await supabase
      .from(
        "scoring_profile_clauses"
      )
      .select("clause, weight")
      .eq(
        "scoring_profile_id",
        scoringProfile.id
      );

    if (clauseWeightsError) {
      throw new Error(
        clauseWeightsError.message
      );
    }

    weights = Object.fromEntries(
      (clauseWeights ?? []).map(
        (row) => [
          row.clause,
          Number(row.weight),
        ]
      )
    );
  }

  // --------------------------------------------------
  // CALCULATE PROGRESS
  // --------------------------------------------------

  const progress =
    calculateProgress(
      allQuestions,
      answers
    );

  // --------------------------------------------------
  // CALCULATE OVERALL SCORE
  // --------------------------------------------------

  const hasWeightedProfile =
    Object.keys(weights).length > 0;

  const overallScore =
    hasWeightedProfile
      ? calculateWeightedOverallScore({
          clauseNumbers:
            CLAUSE_NUMBERS,
          questions:
            allQuestions,
          answers,
          weights,
        })
      : calculateSimpleOverallScore(
          answers
        );

  // --------------------------------------------------
  // MATURITY LEVEL
  // --------------------------------------------------

  let maturityLevel =
    "Not assessed";

  if (overallScore !== null) {
    if (overallScore <= 20) {
      maturityLevel = "Initial";
    } else if (
      overallScore <= 40
    ) {
      maturityLevel =
        "Developing";
    } else if (
      overallScore <= 60
    ) {
      maturityLevel = "Managed";
    } else if (
      overallScore <= 80
    ) {
      maturityLevel =
        "Controlled";
    } else {
      maturityLevel =
        "Optimized";
    }
  }

  // --------------------------------------------------
  // CLAUSE RESULTS
  // --------------------------------------------------

  const clauseResults =
    CLAUSE_NUMBERS.map(
      (number) => {
        const clauseQuestions =
          allQuestions.filter(
            (question) =>
              question.clause ===
              number
          );

        const clauseQuestionNumbers =
          new Set(
            clauseQuestions.map(
              (question) =>
                question.question_number
            )
          );

        const answeredCount =
          answers.filter(
            (answer) =>
              clauseQuestionNumbers.has(
                answer.clause
              ) &&
              answer.score !== null &&
              answer.score !==
                undefined
          ).length;

        return {
          number,
          title:
            CLAUSE_TITLES[
              number
            ],
          score:
            calculateClauseScore(
              number,
              allQuestions,
              answers
            ),
          weight:
            weights[number] ??
            null,
          answered:
            answeredCount,
          total:
            clauseQuestions.length,
        };
      }
    );

  const scoredClauses =
    clauseResults.filter(
      (result) =>
        result.score !== null
    );

  const strongestClause =
    scoredClauses.length > 0
      ? scoredClauses.reduce(
          (best, current) =>
            current.score >
            best.score
              ? current
              : best
        )
      : null;

  const weakestClause =
    scoredClauses.length > 0
      ? scoredClauses.reduce(
          (worst, current) =>
            current.score <
            worst.score
              ? current
              : worst
        )
      : null;


  // --------------------------------------------------
  // ISO 14001:2026 FINDINGS / MANAGEMENT ACTIONS
  // --------------------------------------------------

  const isIso14001_2026 =
    assessment.standard ===
    "ISO 14001:2026";

  const admin =
    createAdminClient();

  let findings = [];
  let correctiveActions = [];
  let managementActions = [];
  let evidenceSamples = [];

  if (isIso14001_2026) {
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
      )
      .order("created_at", {
        ascending: true,
      });

    if (findingsError) {
      throw new Error(
        findingsError.message
      );
    }

    findings =
      findingsData ?? [];

    const findingIds =
      findings.map(
        (finding) => finding.id
      );

    if (
      findingIds.length > 0
    ) {
      const {
        data: correctiveData,
        error: correctiveError,
      } = await admin
        .from(
          "corrective_actions"
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
        .in(
          "finding_id",
          findingIds
        );

      if (correctiveError) {
        throw new Error(
          correctiveError.message
        );
      }

      correctiveActions =
        correctiveData ?? [];
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

    const {
      data: evidenceSamplesData,
      error: evidenceSamplesError,
    } = await supabase
      .from("assessment_evidence_samples")
      .select(
        "id, question_number, evidence_confidence, exception_gap, finding_id"
      )
      .eq(
        "assessment_id",
        assessment.id
      )
      .eq(
        "owner_id",
        user.id
      );

    if (evidenceSamplesError) {
      throw new Error(
        evidenceSamplesError.message
      );
    }

    evidenceSamples =
      evidenceSamplesData ?? [];
  }

  const openFindings =
    findings.filter(
      (finding) =>
        finding.status !==
        "closed"
    );

  const openMajorCount =
    openFindings.filter(
      (finding) =>
        finding.finding_type ===
        "major_nc"
    ).length;

  const openMinorCount =
    openFindings.filter(
      (finding) =>
        finding.finding_type ===
        "minor_nc"
    ).length;

  const highRiskCount =
    openFindings.filter(
      (finding) =>
        finding.risk_impact ===
        "High"
    ).length;

  const mediumRiskCount =
    openFindings.filter(
      (finding) =>
        finding.risk_impact ===
        "Medium"
    ).length;

  const lowRiskCount =
    openFindings.filter(
      (finding) =>
        finding.risk_impact ===
        "Low"
    ).length;

  const correctiveByFindingId =
    Object.fromEntries(
      correctiveActions.map(
        (action) => [
          action.finding_id,
          action,
        ]
      )
    );

  const managementByFindingId =
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

  const today =
    new Date();

  const overdueActionCount =
    openFindings.filter(
      (finding) => {
        const managementAction =
          managementByFindingId[
            finding.id
          ];

        const correctiveAction =
          correctiveByFindingId[
            finding.id
          ];

        const targetDate =
          managementAction
            ?.target_date ??
          correctiveAction
            ?.target_date;

        const actionStatus =
          managementAction
            ?.status ??
          correctiveAction
            ?.status ??
          finding.status;

        if (
          !targetDate ||
          [
            "closed",
            "completed",
            "effective",
          ].includes(
            actionStatus
          )
        ) {
          return false;
        }

        return (
          new Date(
            `${targetDate}T23:59:59`
          ) < today
        );
      }
    ).length;

  const totalEvidenceSamples =
    evidenceSamples.length;

  const evidenceSamplesWithExceptions =
    evidenceSamples.filter(
      (sample) =>
        typeof sample.exception_gap ===
          "string" &&
        sample.exception_gap.trim() !==
          ""
    ).length;

  const highConfidenceEvidenceSamples =
    evidenceSamples.filter(
      (sample) =>
        sample.evidence_confidence ===
        "High"
    ).length;

  const evidenceSamplesLinkedToFindings =
    evidenceSamples.filter(
      (sample) =>
        Boolean(sample.finding_id)
    ).length;

  const evidenceTraceabilityPercentage =
    totalEvidenceSamples > 0
      ? Math.round(
          (
            evidenceSamplesLinkedToFindings /
            totalEvidenceSamples
          ) * 100
        )
      : null;

  const {
    data: managementReadinessRows,
    error: managementReadinessError,
  } = await supabase
    .from("management_readiness")
    .select(
      "dimension_key, readiness_rating, evidence_confidence, management_action, target_date"
    )
    .eq("assessment_id", assessment.id)
    .eq("owner_id", user.id)
    .order("display_order", { ascending: true });

  if (managementReadinessError) {
    throw new Error(managementReadinessError.message);
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
        (value) => value !== null
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

  let readinessDecision =
    "Assessment incomplete";

  if (
    progress.percentage ===
    100
  ) {
    if (
      openMajorCount > 0
    ) {
      readinessDecision =
        "Not ready";
    } else if (
      highRiskCount > 0 ||
      overdueActionCount > 0
    ) {
      readinessDecision =
        "Significant improvement required";
    } else if (
      openMinorCount > 0
    ) {
      readinessDecision =
        "Readiness review recommended";
    } else if (
      overallScore !== null &&
      overallScore >= 80
    ) {
      readinessDecision =
        "Potentially ready";
    } else if (
      overallScore !== null &&
      overallScore >= 60
    ) {
      readinessDecision =
        "Progressing";
    } else {
      readinessDecision =
        "Significant improvement required";
    }
  }

  const priorityActionItems =
    openFindings
      .map((finding) => {
        const managementAction =
          managementByFindingId[
            finding.id
          ];

        const correctiveAction =
          correctiveByFindingId[
            finding.id
          ];

        return {
          id: finding.id,
          questionNumber:
            finding.question_number,
          findingType:
            finding.finding_type,
          risk:
            finding.risk_impact ??
            "—",
          statement:
            finding.finding_statement ??
            finding.requirement_summary ??
            "—",
          action:
            managementAction
              ?.action_required ??
            correctiveAction
              ?.corrective_action ??
            "Action not yet defined",
          owner:
            managementAction
              ?.action_owner ??
            correctiveAction
              ?.action_owner ??
            "Unassigned",
          targetDate:
            managementAction
              ?.target_date ??
            correctiveAction
              ?.target_date ??
            null,
        };
      })
      .sort((a, b) => {
        const riskOrder = {
          High: 0,
          Medium: 1,
          Low: 2,
          "—": 3,
        };

        return (
          riskOrder[a.risk] -
          riskOrder[b.risk]
        );
      })
      .slice(0, 5);

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
        {/* HEADER */}

        <p
          style={{
            color: "#1459D9",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          RPG Intelligence
        </p>

        <h1
          style={{
            color: "#071A33",
            fontSize: "40px",
            marginTop: 0,
            marginBottom: "8px",
          }}
        >
          Executive Summary
        </h1>

        <p
          style={{
            color: "#617087",
            fontSize: "18px",
            marginBottom: "6px",
          }}
        >
          {assessment.standard}{" "}
          Assessment
        </p>

        <p
          style={{
            color: "#617087",
            marginTop: 0,
            marginBottom: "28px",
          }}
        >
          Status:{" "}
          <strong
            style={{
              color: "#071A33",
            }}
          >
            {assessment.status}
          </strong>
        </p>

        {/* BUSINESS ASSURANCE SCORE */}

        <section
          style={{
            background: "#071A33",
            color: "#ffffff",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "1px",
                  opacity: 0.75,
                  marginBottom: "8px",
                }}
              >
                BUSINESS ASSURANCE
                SCORE
              </div>

              <strong
                style={{
                  fontSize: "26px",
                }}
              >
                {maturityLevel}
              </strong>

              <p
                style={{
                  opacity: 0.75,
                  marginTop: "8px",
                  marginBottom: 0,
                }}
              >
                {scoringProfile
                  ? `${scoringProfile.profile_name} ${
                      scoringProfile.version_label ??
                      ""
                    }`
                  : `${assessment.standard} readiness model`}
              </p>
            </div>

            <div
              style={{
                fontSize: "58px",
                fontWeight: 800,
              }}
            >
              {overallScore !== null
                ? `${overallScore}%`
                : "—"}
            </div>
          </div>
        </section>

        {/* SUMMARY CARDS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* PROGRESS */}

          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <div
              style={{
                color: "#617087",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              ASSESSMENT PROGRESS
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "32px",
                fontWeight: 800,
                marginTop: "8px",
              }}
            >
              {progress.percentage}%
            </div>

            <div
              style={{
                color: "#617087",
                marginTop: "6px",
              }}
            >
              {progress.answered} of{" "}
              {progress.total} questions
              answered
            </div>
          </div>

          {/* STRONGEST */}

          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <div
              style={{
                color: "#617087",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              STRONGEST CLAUSE
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "32px",
                fontWeight: 800,
                marginTop: "8px",
              }}
            >
              {strongestClause
                ? `${strongestClause.score}%`
                : "—"}
            </div>

            <div
              style={{
                color: "#617087",
                marginTop: "6px",
                lineHeight: 1.4,
              }}
            >
              {strongestClause
                ? `Clause ${strongestClause.number} — ${strongestClause.title}`
                : "Not assessed"}
            </div>
          </div>

          {/* WEAKEST */}

          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <div
              style={{
                color: "#617087",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              PRIORITY CLAUSE
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "32px",
                fontWeight: 800,
                marginTop: "8px",
              }}
            >
              {weakestClause
                ? `${weakestClause.score}%`
                : "—"}
            </div>

            <div
              style={{
                color: "#617087",
                marginTop: "6px",
                lineHeight: 1.4,
              }}
            >
              {weakestClause
                ? `Clause ${weakestClause.number} — ${weakestClause.title}`
                : "Not assessed"}
            </div>
          </div>
        </div>

        {isIso14001_2026 && (
          <>
            {/* READINESS DECISION */}

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
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom:
                    "22px",
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        "#1459D9",
                      fontWeight:
                        800,
                      fontSize:
                        "12px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    MANAGEMENT & CERTIFICATION READINESS
                  </div>

                  <h2
                    style={{
                      color:
                        "#071A33",
                      margin: 0,
                    }}
                  >
                    {readinessDecision}
                  </h2>

                  <p
                    style={{
                      color:
                        "#617087",
                      maxWidth:
                        "720px",
                      lineHeight:
                        1.6,
                      marginBottom:
                        0,
                    }}
                  >
                    The readiness decision
                    considers the assessment
                    score together with open
                    nonconformities, controlled
                    High / Medium / Low risk,
                    overdue actions and
                    management-system evidence.
                    A percentage score does not
                    override significant open
                    findings.
                  </p>
                </div>

                <div
                  style={{
                    minWidth:
                      "220px",
                    padding:
                      "16px",
                    borderRadius:
                      "10px",
                    background:
                      "#f5f8fc",
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
                        "6px",
                    }}
                  >
                    MANAGEMENT READINESS
                  </div>

                  <strong
                    style={{
                      color:
                        "#071A33",
                      fontSize:
                        "20px",
                    }}
                  >
                    {managementReadiness}
                  </strong>

                  <div
                    style={{
                      color:
                        "#617087",
                      fontSize:
                        "12px",
                      marginTop:
                        "6px",
                    }}
                  >
                    Stored 9-dimension management assessment:
                    {" "}
                    {managementReadinessScore !==
                    null
                      ? `${managementReadinessScore}%`
                      : "—"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  [
                    "OPEN MAJOR NC",
                    openMajorCount,
                  ],
                  [
                    "OPEN MINOR NC",
                    openMinorCount,
                  ],
                  [
                    "HIGH RISK",
                    highRiskCount,
                  ],
                  [
                    "MEDIUM RISK",
                    mediumRiskCount,
                  ],
                  [
                    "LOW RISK",
                    lowRiskCount,
                  ],
                  [
                    "OVERDUE ACTIONS",
                    overdueActionCount,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background:
                          "#f7f9fc",
                        borderRadius:
                          "10px",
                        padding:
                          "15px",
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
                            "25px",
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop:
                    "18px",
                }}
              >
                <a
                  href={`/portal/assessments/${assessment.id}/findings`}
                  style={{
                    padding:
                      "11px 15px",
                    borderRadius:
                      "8px",
                    background:
                      "#071A33",
                    color:
                      "#ffffff",
                    textDecoration:
                      "none",
                    fontWeight:
                      700,
                  }}
                >
                  Findings & Corrective Actions
                </a>

                <a
                  href={`/portal/assessments/${assessment.id}/actions-plan`}
                  style={{
                    padding:
                      "11px 15px",
                    borderRadius:
                      "8px",
                    background:
                      "#1459D9",
                    color:
                      "#ffffff",
                    textDecoration:
                      "none",
                    fontWeight:
                      700,
                  }}
                >
                  Management Action Plan
                </a>

                <a
                  href={`/portal/assessments/${assessment.id}/management-readiness`}
                  style={{
                    padding:
                      "11px 15px",
                    borderRadius:
                      "8px",
                    background:
                      "#ffffff",
                    color:
                      "#1459D9",
                    border:
                      "1px solid #1459D9",
                    textDecoration:
                      "none",
                    fontWeight:
                      700,
                  }}
                >
                  Management Readiness
                </a>

                <a
                  href={`/portal/assessments/${assessment.id}/readiness`}
                  style={{
                    padding:
                      "11px 15px",
                    borderRadius:
                      "8px",
                    background:
                      "#167C80",
                    color:
                      "#ffffff",
                    textDecoration:
                      "none",
                    fontWeight:
                      700,
                  }}
                >
                  Certification Readiness Decision
                </a>
              </div>
            </section>

            {/* EVIDENCE ASSURANCE */}

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
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom:
                    "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        "#1459D9",
                      fontWeight:
                        800,
                      fontSize:
                        "12px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    EVIDENCE ASSURANCE
                  </div>

                  <h2
                    style={{
                      color:
                        "#071A33",
                      margin:
                        "0 0 6px",
                    }}
                  >
                    Assessment Evidence Traceability
                  </h2>

                  <p
                    style={{
                      color:
                        "#617087",
                      maxWidth:
                        "760px",
                      lineHeight:
                        1.6,
                      margin:
                        0,
                    }}
                  >
                    Evidence sampling provides
                    traceability between the
                    assessment conclusion,
                    identified exceptions and
                    formal findings. The counts
                    below reflect the live
                    Evidence Sampling workspace.
                  </p>
                </div>

                <a
                  href={`/portal/assessments/${assessment.id}/evidence`}
                  style={{
                    padding:
                      "10px 14px",
                    borderRadius:
                      "8px",
                    background:
                      "#1459D9",
                    color:
                      "#ffffff",
                    textDecoration:
                      "none",
                    fontWeight:
                      700,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Open Evidence Sampling
                </a>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                  gap:
                    "12px",
                }}
              >
                {[
                  [
                    "EVIDENCE SAMPLES",
                    totalEvidenceSamples,
                  ],
                  [
                    "EXCEPTIONS / GAPS",
                    evidenceSamplesWithExceptions,
                  ],
                  [
                    "HIGH CONFIDENCE",
                    highConfidenceEvidenceSamples,
                  ],
                  [
                    "LINKED TO FINDINGS",
                    evidenceSamplesLinkedToFindings,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background:
                          "#f7f9fc",
                        borderRadius:
                          "10px",
                        padding:
                          "15px",
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
                            "25px",
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  marginTop:
                    "14px",
                  padding:
                    "13px 15px",
                  borderRadius:
                    "9px",
                  background:
                    totalEvidenceSamples > 0
                      ? "#eef4ff"
                      : "#fff8e8",
                  border:
                    totalEvidenceSamples > 0
                      ? "1px solid #d6e4ff"
                      : "1px solid #f1dfad",
                  color:
                    totalEvidenceSamples > 0
                      ? "#405574"
                      : "#735c17",
                  lineHeight:
                    1.5,
                  fontSize:
                    "13px",
                }}
              >
                {totalEvidenceSamples > 0
                  ? `Evidence-to-finding traceability: ${
                      evidenceTraceabilityPercentage ??
                      0
                    }% of recorded samples are linked to formal findings where applicable.`
                  : "No detailed evidence samples have been recorded yet. Assessment conclusions should be supported by traceable sampled evidence before the final readiness decision."}
              </div>
            </section>

            {/* PRIORITY MANAGEMENT ACTIONS */}

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
                  color:
                    "#071A33",
                  marginTop: 0,
                  marginBottom:
                    "6px",
                }}
              >
                Priority Management Actions
              </h2>

              <p
                style={{
                  color:
                    "#617087",
                  marginTop: 0,
                  lineHeight:
                    1.55,
                }}
              >
                Highest-priority open
                findings are shown first,
                using the controlled
                High / Medium / Low risk
                assessment.
              </p>

              {priorityActionItems.length ===
              0 ? (
                <div
                  style={{
                    background:
                      "#edf8f3",
                    border:
                      "1px solid #c8e8d8",
                    color:
                      "#205c43",
                    padding:
                      "16px",
                    borderRadius:
                      "9px",
                  }}
                >
                  No open findings currently
                  require management action.
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gap: "10px",
                  }}
                >
                  {priorityActionItems.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        style={{
                          background:
                            "#f7f9fc",
                          borderRadius:
                            "10px",
                          padding:
                            "16px",
                          display:
                            "grid",
                          gridTemplateColumns:
                            "minmax(100px, .4fr) minmax(110px, .5fr) minmax(220px, 1.5fr) minmax(180px, 1fr)",
                          gap: "14px",
                          alignItems:
                            "start",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color:
                                "#071A33",
                            }}
                          >
                            {
                              item.questionNumber
                            }
                          </strong>
                        </div>

                        <div
                          style={{
                            fontWeight:
                              800,
                            color:
                              item.risk ===
                              "High"
                                ? "#b42318"
                                : item.risk ===
                                  "Medium"
                                ? "#8a6116"
                                : "#475467",
                          }}
                        >
                          {item.risk}
                        </div>

                        <div
                          style={{
                            color:
                              "#617087",
                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            item.action
                          }
                        </div>

                        <div
                          style={{
                            color:
                              "#617087",
                            fontSize:
                              "13px",
                            lineHeight:
                              1.5,
                          }}
                        >
                          <strong
                            style={{
                              color:
                                "#071A33",
                            }}
                          >
                            Owner:
                          </strong>{" "}
                          {item.owner}
                          <br />
                          <strong
                            style={{
                              color:
                                "#071A33",
                            }}
                          >
                            Target:
                          </strong>{" "}
                          {item.targetDate
                            ? new Intl.DateTimeFormat(
                                "en-GB",
                                {
                                  day:
                                    "2-digit",
                                  month:
                                    "short",
                                  year:
                                    "numeric",
                                }
                              ).format(
                                new Date(
                                  item.targetDate
                                )
                              )
                            : "—"}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* CLAUSE RESULTS */}

        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #dfe6ee",
            borderRadius: "14px",
            padding: "28px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              color: "#071A33",
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            Clause Results
          </h2>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {clauseResults.map(
              (result) => (
                <a
                  key={result.number}
                  href={`/portal/assessments/${assessment.id}?clause=${result.number}`}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "20px",
                    padding:
                      "17px 18px",
                    background:
                      "#f7f9fc",
                    borderRadius:
                      "10px",
                    textDecoration:
                      "none",
                    color: "#071A33",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize:
                          "16px",
                      }}
                    >
                      Clause{" "}
                      {result.number}
                    </strong>

                    <div
                      style={{
                        color:
                          "#617087",
                        fontSize:
                          "13px",
                        marginTop:
                          "5px",
                      }}
                    >
                      {result.title}
                    </div>

                    <div
                      style={{
                        color:
                          "#8390a2",
                        fontSize:
                          "12px",
                        marginTop:
                          "5px",
                      }}
                    >
                      {result.answered} of{" "}
                      {result.total} answered

                      {result.weight !==
                      null
                        ? ` · Weight ${result.weight}%`
                        : ""}
                    </div>
                  </div>

                  <strong
                    style={{
                      fontSize: "24px",
                    }}
                  >
                    {result.score !==
                    null
                      ? `${result.score}%`
                      : "—"}
                  </strong>
                </a>
              )
            )}
          </div>
        </section>

        {/* COMPLETION MESSAGE */}

        {progress.percentage ===
        100 ? (
          <div
            style={{
              background: "#edf8f3",
              border:
                "1px solid #c8e8d8",
              color: "#205c43",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "24px",
            }}
          >
            Assessment complete. All{" "}
            {progress.total} questions
            have been answered.
          </div>
        ) : (
          <div
            style={{
              background: "#fff8e8",
              border:
                "1px solid #f1dfad",
              color: "#735c17",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "24px",
            }}
          >
            This assessment is not yet
            complete.{" "}
            {progress.total -
              progress.answered}{" "}
            question(s) still require
            an answer.
          </div>
        )}

        {/* NAVIGATION */}

        <div
           style={{
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  }}
>
  <a
    href={`/portal/assessments/${assessment.id}?clause=10`}
    style={{
      padding: "12px 18px",
      borderRadius: "8px",
      border: "1px solid #d8e0ea",
      color: "#071A33",
      textDecoration: "none",
      fontWeight: 700,
      background: "#ffffff",
    }}
  >
    ← Return to Assessment
  </a>

  {isIso14001_2026 && (
    <>
      <a
        href={`/portal/assessments/${assessment.id}/findings`}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          background: "#ffffff",
          border: "1px solid #d8e0ea",
          color: "#071A33",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        Findings
      </a>

      <a
        href={`/portal/assessments/${assessment.id}/actions-plan`}
        style={{
          padding: "12px 18px",
          borderRadius: "8px",
          background: "#1459D9",
          color: "#ffffff",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        Management Action Plan
      </a>
    </>
  )}

  <a
    href={`/portal/assessments/${assessment.id}/report`}
    style={{
      padding: "12px 18px",
      borderRadius: "8px",
      background: "#071A33",
      color: "#ffffff",
      textDecoration: "none",
      fontWeight: 700,
    }}
  >
    Download PDF Report
  </a>

  <a
    href="/portal"
    style={{
      padding: "12px 18px",
      borderRadius: "8px",
      background: "#1459D9",
      color: "#ffffff",
      textDecoration: "none",
      fontWeight: 700,
    }}
  >
    Dashboard
  </a>
        </div>
      </div>
    </main>
  );
}
