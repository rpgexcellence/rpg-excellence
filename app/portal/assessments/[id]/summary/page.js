import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

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
