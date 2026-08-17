import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "../../lib/supabase/server";
import {
  createOrganization,
  createAssessment,
} from "./actions";

import {
  calculateSimpleOverallScore,
  calculateWeightedOverallScore,
  calculateProgress,
} from "./assessments/[id]/scoring";

export const metadata = {
  title: "RPG Intelligence Dashboard",
};

const CLAUSE_NUMBERS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

function getMaturityLevel(score) {
  if (score === null) {
    return "Not assessed";
  }

  if (score <= 20) {
    return "Initial";
  }

  if (score <= 40) {
    return "Developing";
  }

  if (score <= 60) {
    return "Managed";
  }

  if (score <= 80) {
    return "Controlled";
  }

  return "Optimized";
}

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

export default async function PortalPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // --------------------------------------------------
  // ORGANISATION
  // --------------------------------------------------

  const {
    data: organizations,
    error: organizationsError,
  } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  if (organizationsError) {
    throw new Error(
      organizationsError.message
    );
  }

  const organization =
    organizations?.[0] ?? null;

  // --------------------------------------------------
  // ASSESSMENTS
  // --------------------------------------------------

  const {
    data: assessments,
    error: assessmentsError,
  } = await supabase
    .from("assessments")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (assessmentsError) {
    throw new Error(
      assessmentsError.message
    );
  }

  const allAssessments =
    assessments ?? [];

  const completedAssessments =
    allAssessments.filter(
      (assessment) =>
        assessment.status ===
        "completed"
    );

  const activeAssessments =
    allAssessments.filter(
      (assessment) =>
        assessment.status !==
        "completed"
    );

  // --------------------------------------------------
  // BUILD DASHBOARD ASSESSMENT DATA
  // --------------------------------------------------

  const assessmentResults = [];

  for (const assessment of allAssessments) {
    const {
      data: questions,
      error: questionsError,
    } = await supabase
      .from(
        "assessment_questions"
      )
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
      questionNumbers.length >
      0
    ) {
      const {
        data,
        error: answersError,
      } = await supabase
        .from(
          "assessment_answers"
        )
        .select(
          "clause, score"
        )
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

      if (answersError) {
        throw new Error(
          answersError.message
        );
      }

      answers = data ?? [];
    }

    // -----------------------------------------------
    // SCORING PROFILE
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

    const score =
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

    const progress =
      calculateProgress(
        allQuestions,
        answers
      );

    assessmentResults.push({
      ...assessment,
      score,
      progress,
      maturity:
        getMaturityLevel(score),
    });
  }

  // --------------------------------------------------
  // PORTFOLIO SCORE
  // --------------------------------------------------

  const scoredAssessments =
    assessmentResults.filter(
      (assessment) =>
        assessment.score !==
        null
    );

  const businessAssuranceScore =
    scoredAssessments.length > 0
      ? Math.round(
          scoredAssessments.reduce(
            (
              total,
              assessment
            ) =>
              total +
              assessment.score,
            0
          ) /
            scoredAssessments.length
        )
      : null;

 const portfolioMaturity =
  getMaturityLevel(
    businessAssuranceScore
  );

const recentAssessments =
  assessmentResults.slice(
    0,
    5
  );

return (
  <main
    style={{
      minHeight: "100vh",
      background: "#f3f6f9",
      fontFamily: "Arial, sans-serif",
    }}
  >
    {/* HEADER */}

    <header
      style={{
        background: "#071A33",
        color: "#ffffff",
        padding: "20px 30px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
            }}
          >
            RPG Intelligence
          </h2>

          <p
            style={{
              marginTop: "6px",
              marginBottom: 0,
              opacity: 0.75,
            }}
          >
            {user.email}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/portal"
            style={{
              padding: "10px 14px",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Dashboard
          </Link>

          <Link
            href="/portal/history"
            style={{
              padding: "10px 14px",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            History
          </Link>

          <Link
            href="/portal/reports"
            style={{
              padding: "10px 14px",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Reports
          </Link>

          <form
            action="/auth/signout"
            method="post"
            style={{
              margin: 0,
            }}
          >
            <button
              type="submit"
              style={{
                padding: "10px 16px",
                background: "#d32f2f",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px",
        }}
      >
        {/* PAGE HEADING */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
            <p
              style={{
                color: "#1459D9",
                fontWeight: 700,
                marginBottom:
                  "8px",
              }}
            >
              BUSINESS ASSURANCE
            </p>

            <h1
              style={{
                color: "#071A33",
                fontSize: "38px",
                marginTop: 0,
                marginBottom:
                  "8px",
              }}
            >
              Dashboard
            </h1>

            {organization && (
              <div
                style={{
                  color:
                    "#617087",
                }}
              >
                <strong
                  style={{
                    color:
                      "#071A33",
                  }}
                >
                  {
                    organization.name
                  }
                </strong>

                {organization.industry && (
                  <span>
                    {" "}
                    ·{" "}
                    {
                      organization.industry
                    }
                  </span>
                )}

                {organization.country && (
                  <span>
                    {" "}
                    ·{" "}
                    {
                      organization.country
                    }
                  </span>
                )}
              </div>
            )}
          </div>

          {organization && (
            <Link
              href="/portal/reports"
              style={{
                padding:
                  "12px 18px",
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
              View Reports
            </Link>
          )}
        </div>

        {/* CREATE ORGANISATION */}

        {!organization && (
          <form
            action={
              createOrganization
            }
            style={{
              background:
                "#ffffff",
              padding: "26px",
              borderRadius:
                "14px",
              marginBottom:
                "30px",
              display: "grid",
              gap: "14px",
              maxWidth:
                "600px",
              border:
                "1px solid #dfe6ee",
            }}
          >
            <h2
              style={{
                color:
                  "#071A33",
                marginTop: 0,
              }}
            >
              Create your
              organisation
            </h2>

            <input
              name="name"
              type="text"
              placeholder="Organisation name"
              required
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
              name="industry"
              type="text"
              placeholder="Industry"
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
              name="country"
              type="text"
              placeholder="Country"
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
              name="employees"
              type="number"
              placeholder="Number of employees"
              min="1"
              style={{
                padding:
                  "12px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #d8e0ea",
              }}
            />

            <button
              type="submit"
              style={{
                padding:
                  "12px",
                background:
                  "#1459D9",
                color:
                  "#ffffff",
                border: "none",
                borderRadius:
                  "8px",
                cursor:
                  "pointer",
                fontWeight: 700,
              }}
            >
              Save Organisation
            </button>
          </form>
        )}

        {organization && (
          <>
            {/* BUSINESS ASSURANCE HERO */}

            <section
              style={{
                background:
                  "#071A33",
                color:
                  "#ffffff",
                borderRadius:
                  "16px",
                padding: "30px",
                marginBottom:
                  "22px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "24px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "12px",
                      letterSpacing:
                        "1px",
                      opacity: 0.75,
                      marginBottom:
                        "8px",
                    }}
                  >
                    BUSINESS ASSURANCE
                    SCORE
                  </div>

                  <strong
                    style={{
                      fontSize:
                        "26px",
                    }}
                  >
                    {
                      portfolioMaturity
                    }
                  </strong>

                  <p
                    style={{
                      opacity: 0.75,
                      marginTop:
                        "8px",
                      marginBottom:
                        0,
                    }}
                  >
                    Overall portfolio
                    readiness
                  </p>
                </div>

                <div
                  style={{
                    fontSize:
                      "58px",
                    fontWeight: 800,
                  }}
                >
                  {businessAssuranceScore !==
                  null
                    ? `${businessAssuranceScore}%`
                    : "—"}
                </div>
              </div>
            </section>

            {/* KPI CARDS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom:
                  "24px",
              }}
            >
              <div
                style={{
                  background:
                    "#ffffff",
                  padding:
                    "22px",
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #dfe6ee",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  ASSESSMENTS
                </div>

                <div
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "34px",
                    fontWeight:
                      800,
                    marginTop:
                      "8px",
                  }}
                >
                  {
                    allAssessments.length
                  }
                </div>
              </div>

              <div
                style={{
                  background:
                    "#ffffff",
                  padding:
                    "22px",
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #dfe6ee",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  COMPLETED
                </div>

                <div
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "34px",
                    fontWeight:
                      800,
                    marginTop:
                      "8px",
                  }}
                >
                  {
                    completedAssessments.length
                  }
                </div>
              </div>

              <div
                style={{
                  background:
                    "#ffffff",
                  padding:
                    "22px",
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #dfe6ee",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  ACTIVE
                </div>

                <div
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "34px",
                    fontWeight:
                      800,
                    marginTop:
                      "8px",
                  }}
                >
                  {
                    activeAssessments.length
                  }
                </div>
              </div>

              <Link
                href="/portal/reports"
                style={{
                  background:
                    "#ffffff",
                  padding:
                    "22px",
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #dfe6ee",
                  textDecoration:
                    "none",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  REPORTS
                </div>

                <div
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "34px",
                    fontWeight:
                      800,
                    marginTop:
                      "8px",
                  }}
                >
                  {
                    completedAssessments.length
                  }
                </div>
              </Link>
            </div>

            {/* START ASSESSMENT */}

            <section
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #dfe6ee",
                borderRadius:
                  "14px",
                padding: "24px",
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
                    "center",
                  gap: "20px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      color:
                        "#071A33",
                      marginTop:
                        0,
                      marginBottom:
                        "6px",
                    }}
                  >
                    Start a new
                    assessment
                  </h2>

                  <p
                    style={{
                      color:
                        "#617087",
                      margin: 0,
                    }}
                  >
                    Measure your
                    management system
                    readiness and
                    generate an
                    Executive Report.
                  </p>
                </div>

                <form
                  action={
                    createAssessment
                  }
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <input
                    type="hidden"
                    name="organization_id"
                    value={
                      organization.id
                    }
                  />

                  <select
                    name="standard"
                    required
                    defaultValue=""
                    style={{
                      minWidth:
                        "210px",
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
                    <option
                      value=""
                      disabled
                    >
                      Select ISO
                      standard
                    </option>

                    <option value="ISO 9001">
                      ISO 9001
                    </option>

                    <option value="ISO 14001">
                      ISO 14001
                    </option>

                    <option value="ISO 45001">
                      ISO 45001
                    </option>

                    <option value="ISO 22301">
                      ISO 22301
                    </option>

                    <option value="ISO 27001">
                      ISO 27001
                    </option>
                  </select>

                  <button
                    type="submit"
                    style={{
                      padding:
                        "12px 18px",
                      background:
                        "#1459D9",
                      color:
                        "#ffffff",
                      border:
                        "none",
                      borderRadius:
                        "8px",
                      cursor:
                        "pointer",
                      fontWeight:
                        700,
                    }}
                  >
                    Start Assessment
                  </button>
                </form>
              </div>
            </section>

            {/* RECENT ASSESSMENTS */}

            <section
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #dfe6ee",
                borderRadius:
                  "14px",
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  padding:
                    "22px 24px",
                  borderBottom:
                    "1px solid #e6ebf1",
                }}
              >
                <h2
                  style={{
                    color:
                      "#071A33",
                    margin: 0,
                  }}
                >
                  Recent Assessments
                </h2>
              </div>

              {recentAssessments.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "34px 24px",
                    color:
                      "#617087",
                  }}
                >
                  No assessments yet.
                  Start your first
                  assessment above.
                </div>
              ) : (
                recentAssessments.map(
                  (
                    assessment,
                    index
                  ) => (
                    <div
                      key={
                        assessment.id
                      }
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "minmax(170px, 1.4fr) minmax(90px, 0.5fr) minmax(140px, 0.8fr) minmax(110px, 0.7fr) auto",
                        gap: "18px",
                        alignItems:
                          "center",
                        padding:
                          "20px 24px",
                        borderBottom:
                          index ===
                          recentAssessments.length -
                            1
                            ? "none"
                            : "1px solid #e6ebf1",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color:
                              "#071A33",
                            fontSize:
                              "17px",
                          }}
                        >
                          {
                            assessment.standard
                          }
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
                          {
                            assessment.maturity
                          }
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color:
                              "#617087",
                            fontSize:
                              "11px",
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
                              "22px",
                          }}
                        >
                          {assessment.score !==
                          null
                            ? `${assessment.score}%`
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color:
                              "#617087",
                            fontSize:
                              "11px",
                            marginBottom:
                              "4px",
                          }}
                        >
                          PROGRESS
                        </div>

                        <strong
                          style={{
                            color:
                              "#071A33",
                          }}
                        >
                          {
                            assessment
                              .progress
                              .percentage
                          }
                          %
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color:
                              "#617087",
                            fontSize:
                              "11px",
                            marginBottom:
                              "4px",
                          }}
                        >
                          UPDATED
                        </div>

                        <div
                          style={{
                            color:
                              "#071A33",
                            fontWeight:
                              700,
                            fontSize:
                              "13px",
                          }}
                        >
                          {formatDate(
                            assessment.updated_at ??
                              assessment.created_at
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        {assessment.status ===
                        "completed" ? (
                          <>
                            <Link
                              href={`/portal/assessments/${assessment.id}/summary`}
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
                                fontSize:
                                  "13px",
                              }}
                            >
                              View Report
                            </Link>

                            <a
                              href={`/portal/assessments/${assessment.id}/report`}
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
                              PDF
                            </a>
                          </>
                        ) : (
                          <Link
                            href={`/portal/assessments/${assessment.id}`}
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
                              fontSize:
                                "13px",
                            }}
                          >
                            Continue
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                )
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
