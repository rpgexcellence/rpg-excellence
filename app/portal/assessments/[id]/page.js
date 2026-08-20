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
  "ISO 14001:2026",
  "ISO 45001:2018",
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

const CLAUSE_TITLES = {
  "4": "Context of the Organization",
  "5": "Leadership",
  "6": "Planning",
  "7": "Support",
  "8": "Operation",
  "9": "Performance Evaluation",
  "10": "Improvement",
};

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

  // Load formal ISO 14001:2026 findings and corrective actions.
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
    CLAUSE_TITLES[
      clause
    ] ??
    `Clause ${clause}`;

  const isAdvancedAssessment =
    ADVANCED_ASSESSMENT_STANDARDS.includes(
      assessment.standard
    );

  async function saveCurrentClause(
    formData
  ) {
    "use server";

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
              marginBottom: "18px",
            }}
          >
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
              Findings & Corrective Actions
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
                    {
                      CLAUSE_TITLES[
                        number
                      ]
                    }
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
                        }}
                      >
                        <h3
                          style={{
                            color:
                              "#071A33",
                            marginBottom:
                              "10px",
                          }}
                        >
                          {
                            question.question_number
                          }
                        </h3>

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
                          <div
                            style={{
                              display: "grid",
                              gap: "12px",
                              marginBottom:
                                "18px",
                            }}
                          >
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
                                      "#071A33",
                                  }}
                                >
                                  Requirement summary:
                                </strong>{" "}
                                {question.requirement_summary}
                              </div>
                            )}

                            {question.assessor_guidance && (
                              <div
                                style={{
                                  background:
                                    "#f5f8fc",
                                  padding:
                                    "12px 14px",
                                  borderRadius:
                                    "8px",
                                  color:
                                    "#617087",
                                  lineHeight: 1.55,
                                  fontSize: "14px",
                                }}
                              >
                                <strong
                                  style={{
                                    color:
                                      "#071A33",
                                  }}
                                >
                                  Assessor guidance:
                                </strong>{" "}
                                {question.assessor_guidance}
                              </div>
                            )}

                            {question.interview_questions && (
                              <div
                                style={{
                                  background:
                                    "#f8fafc",
                                  padding:
                                    "12px 14px",
                                  borderRadius:
                                    "8px",
                                  color:
                                    "#617087",
                                  lineHeight: 1.55,
                                  fontSize: "14px",
                                }}
                              >
                                <strong
                                  style={{
                                    color:
                                      "#071A33",
                                  }}
                                >
                                  Interview questions
                                </strong>
                                <ul
                                  style={{
                                    margin:
                                      "8px 0 0 18px",
                                    padding: 0,
                                  }}
                                >
                                  {String(
                                    question.interview_questions
                                  )
                                    .split("|")
                                    .map((item) => item.trim())
                                    .filter(Boolean)
                                    .map((item, itemIndex) => (
                                      <li
                                        key={itemIndex}
                                        style={{
                                          marginBottom:
                                            "5px",
                                        }}
                                      >
                                        {item}
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}

                            {question.objective_evidence && (
                              <div
                                style={{
                                  background:
                                    "#f3fbf8",
                                  borderLeft:
                                    "4px solid #167C80",
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
                                      "#071A33",
                                  }}
                                >
                                  Objective evidence to seek:
                                </strong>{" "}
                                {question.objective_evidence}
                              </div>
                            )}

                            {question.sampling_guidance && (
                              <div
                                style={{
                                  background:
                                    "#fff8e8",
                                  padding:
                                    "12px 14px",
                                  borderRadius:
                                    "8px",
                                  color:
                                    "#735c17",
                                  lineHeight: 1.55,
                                  fontSize: "14px",
                                }}
                              >
                                <strong>
                                  Sampling guidance:
                                </strong>{" "}
                                {question.sampling_guidance}
                              </div>
                            )}

                            {question.conformity_criteria && (
                              <div
                                style={{
                                  background:
                                    "#f6f8fb",
                                  padding:
                                    "12px 14px",
                                  borderRadius:
                                    "8px",
                                  color:
                                    "#617087",
                                  lineHeight: 1.55,
                                  fontSize: "14px",
                                }}
                              >
                                <strong
                                  style={{
                                    color:
                                      "#071A33",
                                  }}
                                >
                                  Conformity criteria:
                                </strong>{" "}
                                {question.conformity_criteria}
                              </div>
                            )}

                            {(question.minor_nc_guidance ||
                              question.major_nc_guidance) && (
                              <div
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(260px, 1fr))",
                                  gap: "10px",
                                }}
                              >
                                {question.minor_nc_guidance && (
                                  <div
                                    style={{
                                      background:
                                        "#fffaf0",
                                      padding:
                                        "12px 14px",
                                      borderRadius:
                                        "8px",
                                      color:
                                        "#735c17",
                                      lineHeight:
                                        1.55,
                                      fontSize:
                                        "14px",
                                    }}
                                  >
                                    <strong>
                                      Minor NC guidance:
                                    </strong>{" "}
                                    {question.minor_nc_guidance}
                                  </div>
                                )}

                                {question.major_nc_guidance && (
                                  <div
                                    style={{
                                      background:
                                        "#fff4f2",
                                      padding:
                                        "12px 14px",
                                      borderRadius:
                                        "8px",
                                      color:
                                        "#8a2c20",
                                      lineHeight:
                                        1.55,
                                      fontSize:
                                        "14px",
                                    }}
                                  >
                                    <strong>
                                      Major NC guidance:
                                    </strong>{" "}
                                    {question.major_nc_guidance}
                                  </div>
                                )}
                              </div>
                            )}

                            {question.management_focus && (
                              <div
                                style={{
                                  background:
                                    "#f7f5ff",
                                  padding:
                                    "12px 14px",
                                  borderRadius:
                                    "8px",
                                  color:
                                    "#5d4a86",
                                  lineHeight: 1.55,
                                  fontSize: "14px",
                                }}
                              >
                                <strong>
                                  Management focus:
                                </strong>{" "}
                                {question.management_focus}
                              </div>
                            )}
                          </div>
                        ) : (
                          question.guidance && (
                            <div
                              style={{
                                background:
                                  "#f5f8fc",
                                borderLeft:
                                  "4px solid #1459D9",
                                padding:
                                  "12px 14px",
                                borderRadius:
                                  "6px",
                                color:
                                  "#617087",
                                lineHeight: 1.55,
                                marginBottom:
                                  "16px",
                                fontSize: "14px",
                              }}
                            >
                              <strong
                                style={{
                                  color:
                                    "#071A33",
                                }}
                              >
                                Guidance:
                              </strong>{" "}
                              {question.guidance}
                            </div>
                          )
                        )}

                        <label
                          style={{
                            display:
                              "block",
                            fontWeight: 700,
                            color:
                              "#071A33",
                            marginBottom:
                              "7px",
                          }}
                        >
                          Assessment score
                        </label>

                        <select
                          name={`score_${fieldKey}`}
                          required
                          defaultValue={
                            savedAnswer
                              ?.score !==
                              null &&
                            savedAnswer
                              ?.score !==
                              undefined
                              ? String(
                                  savedAnswer.score
                                )
                              : ""
                          }
                          style={{
                            width: "100%",
                            maxWidth:
                              "360px",
                            padding: "12px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d8e0ea",
                            background:
                              "#fff",
                          }}
                        >
                          <option
                            value=""
                            disabled
                          >
                            Select score
                          </option>

                          <option value="0">
                            0 — Not addressed
                          </option>

                          <option value="1">
                            1 — Initial
                          </option>

                          <option value="2">
                            2 — Partially implemented
                          </option>

                          <option value="3">
                            3 — Implemented
                          </option>

                          <option value="4">
                            4 — Effective
                          </option>

                          <option value="5">
                            5 — Best practice
                          </option>
                        </select>

                        <label
                          style={{
                            display:
                              "block",
                            fontWeight: 700,
                            color:
                              "#071A33",
                            marginTop:
                              "18px",
                            marginBottom:
                              "7px",
                          }}
                        >
                          {isAdvancedAssessment
                            ? "Objective evidence / assessor notes"
                            : "Evidence / notes"}
                        </label>

                        <textarea
                          name={`evidence_${fieldKey}`}
                          placeholder={
                            isAdvancedAssessment
                              ? "Record sampled documents, records, interviews, observations, data, references and any identified gaps..."
                              : "Describe supporting evidence, documents, records, observations or gaps..."
                          }
                          rows="4"
                          defaultValue={
                            savedAnswer
                              ?.evidence ??
                            ""
                          }
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #d8e0ea",
                            resize:
                              "vertical",
                            boxSizing:
                              "border-box",
                          }}
                        />

                        {isAdvancedAssessment && (
                          <FindingConclusionFields
                            fieldKey={fieldKey}
                            savedFinding={savedFinding}
                            savedAction={savedAction}
                            savedEvidence={
                              savedAnswer
                                ?.evidence ??
                              ""
                            }
                          />
                        )}
                      </div>
                    );
                  }
                )
              ) : (
                <div
                  style={{
                    padding: "20px",
                    background:
                      "#fff8e8",
                    borderRadius: "8px",
                    color: "#735c17",
                  }}
                >
                  No questions are
                  currently configured
                  for Clause {clause}.
                </div>
              )}
            </div>

            {/* Navigation */}
            <div
              style={{
                marginTop: "32px",
                paddingTop: "22px",
                borderTop:
                  "1px solid #e6ebf1",
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="/portal"
                  style={{
                    padding:
                      "12px 18px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #d8e0ea",
                    color:
                      "#071A33",
                    textDecoration:
                      "none",
                    fontWeight: 700,
                  }}
                >
                  Dashboard
                </a>

                {previousClause && (
                  <a
                    href={`/portal/assessments/${assessment.id}?clause=${previousClause}`}
                    style={{
                      padding:
                        "12px 18px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #d8e0ea",
                      color:
                        "#071A33",
                      textDecoration:
                        "none",
                      fontWeight: 700,
                    }}
                  >
                    ← Clause{" "}
                    {previousClause}
                  </a>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  formAction={
                    saveCurrentClause
                  }
                  disabled={
                    !questions.length
                  }
                  style={{
                    padding:
                      "12px 20px",
                    borderRadius: "8px",
                    border:
                      "1px solid #1459D9",
                    background:
                      "#ffffff",
                    color:
                      "#1459D9",
                    fontWeight: 700,
                    cursor:
                      questions.length
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  Save Answers
                </button>

              <button
                type="submit"
                disabled={
                  !questions.length
                }
                style={{
                  padding:
                    "12px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    questions.length
                      ? "#1459D9"
                      : "#c8d2df",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor:
                    questions.length
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {nextClause
                  ? `Save & Continue → Clause ${nextClause}`
                  : "Complete Assessment →"}
              </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
