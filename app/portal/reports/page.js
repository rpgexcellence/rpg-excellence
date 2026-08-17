import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";

import {
  calculateSimpleOverallScore,
  calculateWeightedOverallScore,
} from "../assessments/[id]/scoring";

const CLAUSE_NUMBERS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // --------------------------------------------------
  // LOAD COMPLETED ASSESSMENTS
  // --------------------------------------------------

  const {
    data: assessments,
    error: assessmentsError,
  } = await supabase
    .from("assessments")
    .select("*")
    .eq("owner_id", user.id)
    .eq("status", "completed")
    .order("updated_at", {
      ascending: false,
    });

  if (assessmentsError) {
    throw new Error(
      assessmentsError.message
    );
  }

  const completedAssessments =
    assessments ?? [];

  // --------------------------------------------------
  // BUILD REPORT DATA
  // --------------------------------------------------

  const reports = [];

  for (const assessment of completedAssessments) {
    const {
      data: questions,
      error: questionsError,
    } = await supabase
      .from("assessment_questions")
      .select(
        "question_number, clause"
      )
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

    const allQuestions =
      questions ?? [];

    const questionNumbers =
      allQuestions.map(
        (question) =>
          question.question_number
      );

    let answers = [];

    if (
      questionNumbers.length > 0
    ) {
      const {
        data,
        error: answersError,
      } = await supabase
        .from("assessment_answers")
        .select("clause, score")
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

    // -----------------------------------------------
    // LOAD SCORING PROFILE
    // -----------------------------------------------

    const {
      data: scoringProfile,
      error: scoringProfileError,
    } = await supabase
      .from("scoring_profiles")
      .select("id")
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
        error:
          clauseWeightsError,
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
              answers,
              weights,
            }
          )
        : calculateSimpleOverallScore(
            answers
          );

    reports.push({
      id: assessment.id,
      standard:
        assessment.standard,
      status:
        assessment.status,
      score:
        overallScore,
      completedAt:
        assessment.updated_at ??
        assessment.created_at,
    });
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
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
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
                fontSize: "38px",
                marginTop: 0,
                marginBottom: "8px",
              }}
            >
              Reports
            </h1>

            <p
              style={{
                color: "#617087",
                margin: 0,
              }}
            >
              Completed Business
              Assurance assessments
              and executive reports.
            </p>
          </div>

          <Link
            href="/portal"
            style={{
              padding:
                "12px 18px",
              borderRadius: "8px",
              border:
                "1px solid #d8e0ea",
              background:
                "#ffffff",
              color: "#071A33",
              textDecoration:
                "none",
              fontWeight: 700,
            }}
          >
            Dashboard
          </Link>
        </div>

        {/* KPI CARDS */}

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
              background:
                "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius:
                "14px",
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
              COMPLETED REPORTS
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "34px",
                fontWeight: 800,
                marginTop: "8px",
              }}
            >
              {reports.length}
            </div>
          </div>

          <div
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius:
                "14px",
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
              AVERAGE SCORE
            </div>

            <div
              style={{
                color: "#071A33",
                fontSize: "34px",
                fontWeight: 800,
                marginTop: "8px",
              }}
            >
              {reports.length > 0
                ? `${
                    Math.round(
                      reports
                        .filter(
                          (report) =>
                            report.score !==
                            null
                        )
                        .reduce(
                          (
                            total,
                            report
                          ) =>
                            total +
                            report.score,
                          0
                        ) /
                        Math.max(
                          reports.filter(
                            (report) =>
                              report.score !==
                              null
                          ).length,
                          1
                        )
                    )
                  }%`
                : "—"}
            </div>
          </div>
        </div>

        {/* REPORT LIST */}

        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #dfe6ee",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "22px 24px",
              borderBottom:
                "1px solid #e6ebf1",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#071A33",
              }}
            >
              Executive Reports
            </h2>
          </div>

          {reports.length === 0 ? (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  color: "#071A33",
                  marginBottom:
                    "8px",
                }}
              >
                No completed reports yet
              </h3>

              <p
                style={{
                  color: "#617087",
                  marginBottom:
                    "20px",
                }}
              >
                Complete an assessment
                to generate your first
                Executive Report.
              </p>

              <Link
                href="/portal"
                style={{
                  display:
                    "inline-block",
                  padding:
                    "12px 18px",
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
                Start Assessment
              </Link>
            </div>
          ) : (
            <div>
              {reports.map(
                (
                  report,
                  index
                ) => (
                  <div
                    key={report.id}
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "minmax(180px, 1.4fr) minmax(100px, 0.6fr) minmax(130px, 0.8fr) auto",
                      gap: "18px",
                      alignItems:
                        "center",
                      padding:
                        "20px 24px",
                      borderBottom:
                        index ===
                        reports.length -
                          1
                          ? "none"
                          : "1px solid #e6ebf1",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight:
                            800,
                          color:
                            "#071A33",
                          fontSize:
                            "17px",
                        }}
                      >
                        {
                          report.standard
                        }
                      </div>

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
                        Executive
                        Assessment Report
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color:
                            "#617087",
                          fontSize:
                            "12px",
                          marginBottom:
                            "4px",
                        }}
                      >
                        SCORE
                      </div>

                      <strong
                        style={{
                          color:
                            "#071A33",
                          fontSize:
                            "24px",
                        }}
                      >
                        {report.score !==
                        null
                          ? `${report.score}%`
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          color:
                            "#617087",
                          fontSize:
                            "12px",
                          marginBottom:
                            "4px",
                        }}
                      >
                        COMPLETED
                      </div>

                      <div
                        style={{
                          color:
                            "#071A33",
                          fontWeight:
                            700,
                        }}
                      >
                        {formatDate(
                          report.completedAt
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        href={`/portal/assessments/${report.id}/summary`}
                        style={{
                          padding:
                            "10px 14px",
                          borderRadius:
                            "8px",
                          border:
                            "1px solid #d8e0ea",
                          color:
                            "#071A33",
                          textDecoration:
                            "none",
                          fontWeight:
                            700,
                          fontSize:
                            "13px",
                          background:
                            "#ffffff",
                        }}
                      >
                        View Report
                      </Link>

                      <a
                        href={`/portal/assessments/${report.id}/report`}
                        style={{
                          padding:
                            "10px 14px",
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
                          fontSize:
                            "13px",
                        }}
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
