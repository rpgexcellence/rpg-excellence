import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { saveAssessmentAnswers } from "./actions";
import FindingConclusionFields from "./FindingConclusionFields";

import {
  calculateClauseScore,
  calculateSimpleOverallScore,
  calculateWeightedOverallScore,
  calculateProgress,
} from "./scoring";

const ADVANCED_ASSESSMENT_STANDARDS = [
  "ISO 9001:2015/Amd 1:2024",
  "ISO 14001:2026",
  "ISO 45001:2018",
  "ISO/IEC 27001:2022",
  "ISO/IEC 27001:2022/Amd 1:2024",
  "ISO/IEC 17024:2026",
];

const CLAUSE_NUMBERS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

const DEFAULT_CLAUSE_TITLES = {
  "4": "Context of the Organization",
  "5": "Leadership",
  "6": "Planning",
  "7": "Support",
  "8": "Operation",
  "9": "Performance Evaluation",
  "10": "Improvement",
};

const CLAUSE_TITLES_BY_STANDARD = {
  "ISO/IEC 17024:2026": {
    "4": "General Requirements",
    "5": "Structural Requirements",
    "6": "Resource Requirements",
    "7": "Records and Information Requirements",
    "8": "Certification Schemes",
    "9": "Certification Process Requirements",
    "10": "Management System Requirements",
  },
};

function getClauseTitle(standard, clauseNumber) {
  return (
    CLAUSE_TITLES_BY_STANDARD[standard]?.[clauseNumber] ??
    DEFAULT_CLAUSE_TITLES[clauseNumber] ??
    `Clause ${clauseNumber}`
  );
}

export default async function AssessmentPage({
  params,
  searchParams,
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const requestedClause = Array.isArray(
    resolvedSearchParams?.clause
  )
    ? resolvedSearchParams.clause[0]
    : resolvedSearchParams?.clause;

  const clause = CLAUSE_NUMBERS.includes(
    requestedClause
  )
    ? requestedClause
    : "4";

  const currentClauseIndex =
    CLAUSE_NUMBERS.indexOf(clause);

  const previousClause =
    currentClauseIndex > 0
      ? CLAUSE_NUMBERS[
          currentClauseIndex - 1
        ]
      : null;

  const nextClause =
    currentClauseIndex <
    CLAUSE_NUMBERS.length - 1
      ? CLAUSE_NUMBERS[
          currentClauseIndex + 1
        ]
      : null;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // Load assessment
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

  if (assessment.workspace_type === "soa_only") {
    redirect(`/portal/assessments/${assessment.id}/soa`);
  }

  // Load all questions
  const {
    data: allQuestions,
    error: allQuestionsError,
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

  if (allQuestionsError) {
    throw new Error(
      allQuestionsError.message
    );
  }

  const questions = (
    allQuestions ?? []
  ).filter(
    (question) =>
      question.clause === clause
  );

  // Load formal findings and corrective actions for advanced assessments.
  let assessmentFindings = [];
  let correctiveActions = [];

  if (
    ADVANCED_ASSESSMENT_STANDARDS.includes(
      assessment.standard
    )
  ) {
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
      .order("created_at", {
        ascending: true,
      });

    if (findingsError) {
      throw new Error(
        findingsError.message
      );
    }

    assessmentFindings =
      findingsData ?? [];

    const findingIds =
      assessmentFindings.map(
        (finding) => finding.id
      );

    if (findingIds.length > 0) {
      const {
        data: actionsData,
        error: actionsError,
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
        )
        .order("created_at", {
          ascending: true,
        });

      if (actionsError) {
        throw new Error(
          actionsError.message
        );
      }

      correctiveActions =
        actionsData ?? [];
    }
  }

  const findingsByQuestion =
    Object.fromEntries(
      assessmentFindings.map(
        (finding) => [
          finding.question_number,
          finding,
        ]
      )
    );

  const actionsByFindingId =
    Object.fromEntries(
      correctiveActions.map(
        (action) => [
          action.finding_id,
          action,
        ]
      )
    );

  const allQuestionNumbers = (
    allQuestions ?? []
  ).map(
    (question) =>
      question.question_number
  );

  // Load all saved answers
  let allSavedAnswers = [];

  if (
    allQuestionNumbers.length > 0
  ) {
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
      .eq("owner_id", user.id)
      .in(
        "clause",
        allQuestionNumbers
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    allSavedAnswers =
      data ?? [];
  }

  // Load active scoring profile
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

  // Saved answer lookup
  const answersByClause = {};

  for (
    const answer of allSavedAnswers
  ) {
    answersByClause[
      answer.clause
    ] = answer;
  }

  // Progress
  const progress =
    calculateProgress(
      allQuestions,
      allSavedAnswers
    );

  // Overall weighted score
  const hasWeightedProfile =
    Object.keys(weights).length >
    0;

  const overallScore =
    hasWeightedProfile
      ? calculateWeightedOverallScore(
          {
            clauseNumbers:
              CLAUSE_NUMBERS,
            questions:
              allQuestions,
            answers:
              allSavedAnswers,
            weights,
          }
        )
      : calculateSimpleOverallScore(
          allSavedAnswers
        );

  // Current clause score
  const currentClauseScore =
    calculateClauseScore(
      clause,
      allQuestions,
      allSavedAnswers
    );

  const clauseTitle =
    getClauseTitle(
      assessment.standard,
      clause
    );

  const isAdvancedAssessment =
    ADVANCED_ASSESSMENT_STANDARDS.includes(
      assessment.standard
    );

  const isIso27001Assessment = [
    "ISO/IEC 27001:2022",
    "ISO/IEC 27001:2022/Amd 1:2024",
  ].includes(assessment.standard);

  async function saveCurrentClause(
    formData
  ) {
    "use server";

    // Draft saves are intentionally partial. Remove unanswered score
    // controls so the action saves only responses the assessor completed.
    for (const [key, value] of formData.entries()) {
      if (
        key.startsWith("score_") &&
        String(value).trim() === ""
      ) {
        formData.delete(key);
      }
    }

    formData.set(
      "next_clause",
      clause
    );

    await saveAssessmentAnswers(
      formData
    );
  }

  // Maturity
  let maturityLevel =
    "Not assessed";

  if (overallScore !== null) {
    if (overallScore <= 20) {
      maturityLevel =
        "Initial";
    } else if (
      overallScore <= 40
    ) {
      maturityLevel =
        "Developing";
    } else if (
      overallScore <= 60
    ) {
      maturityLevel =
        "Managed";
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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "36px 20px 70px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      {isIso27001Assessment && (
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", userSelect: "none", opacity: .07, transform: "rotate(-10deg)", zIndex: 0 }}>
          <div style={{ width: "720px", textAlign: "center" }}>
            <img src="/rpg-excellence-logo.png" alt="" style={{ width: "100%", height: "auto" }} />
            <div style={{ color: "#1459D9", fontSize: "42px", fontWeight: 900, letterSpacing: ".14em", marginTop: "-18px" }}>ISO/IEC 27001 ASSESSMENT</div>
          </div>
        </div>
      )}
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
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
            marginBottom: "8px",
          }}
        >
          {assessment.standard}{" "}
          Assessment
        </h1>

        <p
          style={{
            color: "#617087",
            marginBottom: "24px",
          }}
        >
          Status:{" "}
          <strong>
            {assessment.status}
          </strong>
        </p>

        {isAdvancedAssessment && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            {isIso27001Assessment && (
              <Link
                href={`/portal/assessments/${assessment.id}/soa`}
                style={{
                  padding: "11px 16px",
                  borderRadius: "8px",
                  background: "#087A72",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Statement of Applicability
              </Link>
            )}

            <Link
              href={`/portal/assessments/${assessment.id}/evidence`}
              style={{
                padding: "11px 16px",
                borderRadius: "8px",
                background: "#1459D9",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Evidence Sampling
            </Link>

            <Link
              href={`/portal/assessments/${assessment.id}/findings`}
              style={{
                padding: "11px 16px",
                borderRadius: "8px",
                background: "#071A33",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Findings & Corrective Actions ({assessmentFindings.filter((finding) => finding.finding_type !== "conformity").length})
            </Link>
          </div>
        )}

        {/* Weighted score */}
        <section
          style={{
            background: "#071A33",
            color: "#ffffff",
            borderRadius: "16px",
            padding: "28px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.75,
                  letterSpacing:
                    "1px",
                  marginBottom: "7px",
                }}
              >
                RPG WEIGHTED
                READINESS
              </div>

              <strong
                style={{
                  fontSize: "21px",
                }}
              >
                {
                  assessment.standard
                }
              </strong>

              <p
                style={{
                  opacity: 0.75,
                  marginBottom: "4px",
                }}
              >
                {hasWeightedProfile
                  ? `${
                      scoringProfile
                        ?.profile_name
                    } ${
                      scoringProfile
                        ?.version_label ??
                      ""
                    }`
                  : "Standard readiness model"}
              </p>

              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#D6A539",
                }}
              >
                {maturityLevel}
              </div>
            </div>

            <div
              style={{
                fontSize: "48px",
                fontWeight: 800,
              }}
            >
              {overallScore !== null
                ? `${overallScore}%`
                : "—"}
            </div>
          </div>
        </section>

        {/* Progress */}
        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #dfe6ee",
            borderRadius: "14px",
            padding: "20px 24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            <strong
              style={{
                color: "#071A33",
              }}
            >
              Assessment Progress
            </strong>

            <strong
              style={{
                color: "#1459D9",
              }}
            >
              {progress.percentage}%
            </strong>
          </div>

          <div
            style={{
              height: "10px",
              background: "#e7edf4",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${
                  progress.percentage
                }%`,
                background: "#1459D9",
                borderRadius: "999px",
              }}
            />
          </div>

          <p
            style={{
              color: "#617087",
              fontSize: "13px",
              marginTop: "10px",
              marginBottom: 0,
            }}
          >
            {progress.answered} of{" "}
            {progress.total} questions
            answered
          </p>
        </section>

        {/* Clause navigation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(135px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {CLAUSE_NUMBERS.map(
            (number) => {
              const score =
                calculateClauseScore(
                  number,
                  allQuestions,
                  allSavedAnswers
                );

              const weight =
                weights[number];

              return (
                <a
                  key={number}
                  href={`/portal/assessments/${assessment.id}?clause=${number}`}
                  style={{
                    background:
                      clause === number
                        ? "#1459D9"
                        : "#ffffff",
                    color:
                      clause === number
                        ? "#ffffff"
                        : "#071A33",
                    borderRadius: "12px",
                    padding: "16px",
                    border:
                      clause === number
                        ? "1px solid #1459D9"
                        : "1px solid #dfe6ee",
                    textDecoration:
                      "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      opacity: 0.75,
                      marginBottom:
                        "7px",
                    }}
                  >
                    CLAUSE {number}
                  </div>

                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                    }}
                  >
                    {score !== null
                      ? `${score}%`
                      : "—"}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      marginTop: "6px",
                      lineHeight: 1.35,
                    }}
                  >
                    {getClauseTitle(
                      assessment.standard,
                      number
                    )}
                  </div>

                  {weight && (
                    <div
                      style={{
                        fontSize: "10px",
                        marginTop: "8px",
                        opacity: 0.7,
                      }}
                    >
                      Weight: {weight}%
                    </div>
                  )}
                </a>
              );
            }
          )}
        </div>

        {/* Current clause */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px 24px",
            marginBottom: "24px",
            border:
              "1px solid #dfe6ee",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#1459D9",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "6px",
              }}
            >
              CLAUSE {clause}
            </div>

            <strong
              style={{
                color: "#071A33",
                fontSize: "18px",
              }}
            >
              {clauseTitle}
            </strong>
          </div>

          <div
            style={{
              color: "#071A33",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            {currentClauseScore !==
            null
              ? `${currentClauseScore}%`
              : "—"}
          </div>
        </div>

        {/* Assessment form */}
        <form
          action={
            saveAssessmentAnswers
          }
        >
          <input
            type="hidden"
            name="assessment_id"
            value={assessment.id}
          />

          <input
            type="hidden"
            name="current_clause"
            value={clause}
          />

          {nextClause && (
            <input
              type="hidden"
              name="next_clause"
              value={nextClause}
            />
          )}

          <section
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "14px",
              boxShadow:
                "0 10px 30px rgba(7, 26, 51, 0.06)",
            }}
          >
            <div
              style={{
                marginBottom: "28px",
                paddingBottom: "18px",
                borderBottom:
                  "1px solid #e6ebf1",
              }}
            >
              <p
                style={{
                  color: "#1459D9",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                CLAUSE {clause}
              </p>

              <h2
                style={{
                  color: "#071A33",
                  margin: 0,
                }}
              >
                {clauseTitle}
              </h2>

              <p
                style={{
                  color: "#617087",
                  marginTop: "10px",
                  lineHeight: 1.6,
                }}
              >
                Complete each question
                and record the evidence
                supporting your
                assessment.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "30px",
              }}
            >
              {questions.length ? (
                questions.map(
                  (
                    question,
                    index
                  ) => {
                    const savedAnswer =
                      answersByClause[
                        question
                          .question_number
                      ] ?? null;

                    const fieldKey =
                      question.question_number
                        .replaceAll(
                          ".",
                          "_"
                        )
                        .replaceAll(
                          "-",
                          "_"
                        );

                    const savedFinding =
                      findingsByQuestion[
                        question.question_number
                      ] ?? null;

                    const savedAction =
                      savedFinding
                        ? actionsByFindingId[
                            savedFinding.id
                          ] ?? null
                        : null;

                    return (
                      <div
                        key={question.id}
                        style={{
                          borderTop:
                            index === 0
                              ? "none"
                              : "1px solid #e6ebf1",
                          paddingTop:
                            index === 0
                              ? "0"
                              : "26px",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {isIso27001Assessment && (
                          <div aria-hidden="true" style={{ position: "absolute", right: "18px", top: "44px", width: "330px", opacity: .055, pointerEvents: "none", userSelect: "none", textAlign: "center", transform: "rotate(-7deg)" }}>
                            <img src="/rpg-excellence-logo.png" alt="" style={{ width: "100%", height: "auto" }} />
                            <div style={{ color: "#1459D9", fontSize: "21px", fontWeight: 900, letterSpacing: ".1em", marginTop: "-9px" }}>ISO/IEC 27001</div>
                          </div>
                        )}
                        <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",marginBottom:"10px"}}>
                          <h3 style={{color:"#071A33",margin:0}}>
                            Clause {question.clause_reference ?? question.question_number}
                          </h3>
                          {question.control_id && <span style={{padding:"5px 8px",borderRadius:"999px",background:"#edf3ff",color:"#1459D9",fontSize:"12px",fontWeight:800}}>
                            RPG control {question.control_id}
                          </span>}
                        </div>

                        <p
                          style={{
                            color:
                              "#071A33",
                            lineHeight: 1.6,
                            fontWeight: 600,
                            marginBottom:
                              "10px",
                          }}
                        >
                          {
                            question.question
                          }
                        </p>

                        {isAdvancedAssessment ? (
                          <details
                            style={{
                              border: "1px solid #dfe6ee",
                              borderRadius: "9px",
                              background: "#fbfcfe",
                              marginBottom:
                                "18px",
                              overflow: "hidden",
                            }}
                          >
                            <summary style={{ cursor: "pointer", padding: "12px 14px", color: "#071A33", fontWeight: 800, background: "#f5f8fc" }}>
                              Assessment guidance, evidence and conformity criteria
                            </summary>
                            <div style={{ display: "grid", gap: "12px", padding: "12px" }}>
                            {question.requirement_summary && (
                              <div
                                style={{
                                  background:
                                    "#eef4ff",
                                  borderLeft:
                                    "4px solid #1459D9",
                                  padding:
                                    "12px 14px",
                                  borderRadius:
                                    "6px",
                                  color:
                                    "#617087",
                                  lineHeight: 1.55,
                                  fontSize: "14px",
                                }}
                              >
                                <strong
                                  style={{
                                    color:
