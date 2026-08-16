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

  if (assessmentError || !assessment) {
    redirect("/portal");
  }

  // Load questions
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

  const questionNumbers = (
    questions ?? []
  ).map(
    (question) =>
      question.question_number
  );

  // Load answers
  let answers = [];

  if (questionNumbers.length > 0) {
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
        questionNumbers
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    answers = data ?? [];
  }

  // Load scoring profile
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

  const progress =
    calculateProgress(
      questions,
      answers
    );

  const hasWeightedProfile =
    Object.keys(weights).length > 0;

  const overallScore =
    hasWeightedProfile
      ? calculateWeightedOverallScore({
          clauseNumbers:
            CLAUSE_NUMBERS,
          questions,
          answers,
          weights,
        })
      : calculateSimpleOverallScore(
          answers
        );

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

  const clauseResults =
    CLAUSE_NUMBERS.map(
      (number) => ({
        number,
        title:
          CLAUSE_TITLES[number],
        score:
          calculateClauseScore(
            number,
            questions,
            answers
          ),
        weight:
          weights[number] ?? null,
      })
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
          Executive Summary
        </h1>

        <p
          style={{
            color: "#617087",
            marginBottom: "28px",
          }}
        >
          {assessment.standard}{" "}
          Assessment
        </p>

        <section
          style={{
            background: "#071A33",
            color: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "24px",
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
                letterSpacing: "1px",
                marginBottom: "8px",
              }}
            >
              BUSINESS ASSURANCE
              SCORE
            </div>

            <strong
              style={{
                fontSize: "24px",
              }}
            >
              {maturityLevel}
            </strong>

            <p
              style={{
                opacity: 0.75,
                marginBottom: 0,
              }}
            >
              {scoringProfile
                ? `${scoringProfile.profile_name} ${scoringProfile.version_label ?? ""}`
                : assessment.standard}
            </p>
          </div>

          <div
            style={{
              fontSize: "54px",
              fontWeight: 800,
            }}
          >
            {overallScore !== null
              ? `${overallScore}%`
              : "—"}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "22px",
              borderRadius: "14px",
              border:
                "1px solid #dfe6ee",
            }}
          >
            <div
              style={{
                color: "#617087",
                fontSize: "13px",
              }}
            >
              Assessment Progress
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "30px",
                fontWeight: 800,
                marginTop: "8px",
              }}
            >
              {progress.percentage}%
            </div>

            <div
              style={{
                color: "#617087",
                marginTop: "5px",
              }}
            >
              {progress.answered} of{" "}
              {progress.total} questions
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: "22px",
              borderRadius: "14px",
              border:
                "1px solid #dfe6ee",
            }}
          >
            <div
              style={{
                color: "#617087",
                fontSize: "13px",
              }}
            >
              Strongest Clause
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "30px",
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
                marginTop: "5px",
              }}
            >
              {strongestClause
                ? `Clause ${strongestClause.number} — ${strongestClause.title}`
                : "Not assessed"}
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: "22px",
              borderRadius: "14px",
              border:
                "1px solid #dfe6ee",
            }}
          >
            <div
              style={{
                color: "#617087",
                fontSize: "13px",
              }}
            >
              Weakest Clause
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "30px",
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
                marginTop: "5px",
              }}
            >
              {weakestClause
                ? `Clause ${weakestClause.number} — ${weakestClause.title}`
                : "Not assessed"}
            </div>
          </div>
        </div>

        <section
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "28px",
            border:
              "1px solid #dfe6ee",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              color: "#071A33",
              marginTop: 0,
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
                    alignItems:
                      "center",
                    gap: "18px",
                    padding:
                      "16px 18px",
                    borderRadius:
                      "10px",
                    background:
                      "#f7f9fc",
                    textDecoration:
                      "none",
                    color:
                      "#071A33",
                  }}
                >
                  <div>
                    <strong>
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
                          "4px",
                      }}
                    >
                      {result.title}

                      {result.weight
                        ? ` · Weight ${result.weight}%`
                        : ""}
                    </div>
                  </div>

                  <strong
                    style={{
                      fontSize:
                        "22px",
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

        {progress.percentage <
          100 && (
          <div
            style={{
              background:
                "#fff8e8",
              color: "#735c17",
              padding: "18px",
              borderRadius:
                "10px",
              marginBottom:
                "24px",
            }}
          >
            This assessment is not
            yet complete.{" "}
            {progress.total -
              progress.answered}{" "}
            question(s) still need
            an answer.
          </div>
        )}

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
              padding:
                "12px 18px",
              borderRadius: "8px",
              border:
                "1px solid #d8e0ea",
              color: "#071A33",
              textDecoration:
                "none",
              fontWeight: 700,
            }}
          >
            ← Return to Assessment
          </a>

          <a
            href="/portal"
            style={{
              padding:
                "12px 18px",
              borderRadius: "8px",
              background:
                "#1459D9",
              color: "white",
              textDecoration:
                "none",
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
