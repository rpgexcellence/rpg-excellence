import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { saveAssessmentAnswers } from "./actions";

export default async function AssessmentPage({
  params,
  searchParams,
}) {
  const { id } = await params;
  const clause = searchParams?.clause ?? "4";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // Load assessment
  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (assessmentError || !assessment) {
    redirect("/portal");
  }

  // Load questions for the selected clause
  const { data: questions, error: questionsError } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq("standard", assessment.standard)
    .eq("clause", clause)
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  const questionNumbers =
    questions?.map((question) => question.question_number) ?? [];

  // Load saved answers for the selected clause
  let savedAnswers = [];

  if (questionNumbers.length > 0) {
    const { data, error } = await supabase
      .from("assessment_answers")
      .select("*")
      .eq("assessment_id", assessment.id)
      .eq("owner_id", user.id)
      .in("clause", questionNumbers);

    if (error) {
      throw new Error(error.message);
    }

    savedAnswers = data ?? [];
  }

  // Easy lookup by question number
  const answersByClause = {};

  for (const answer of savedAnswers) {
    answersByClause[answer.clause] = answer;
  }

  // Calculate score for the selected clause
  const availableScores = savedAnswers
    .map((answer) => answer.score)
    .filter(
      (score) =>
        score !== null &&
        score !== undefined
    );

  const selectedClauseScore =
    availableScores.length > 0
      ? Math.round(
          (availableScores.reduce(
            (sum, score) => sum + Number(score),
            0
          ) /
            (availableScores.length * 5)) *
            100
        )
      : null;

  const clauseTitles = {
    "4": "Context of the Organization",
    "5": "Leadership",
    "6": "Planning",
    "7": "Support",
    "8": "Operation",
    "9": "Performance Evaluation",
    "10": "Improvement",
  };

  const clauseTitle =
    clauseTitles[clause] ?? `Clause ${clause}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
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
          {assessment.standard} Assessment
        </h1>

        <p
          style={{
            color: "#617087",
            marginBottom: "24px",
          }}
        >
          Status: <strong>{assessment.status}</strong>
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          {[
            ["4", "Context"],
            ["5", "Leadership"],
            ["6", "Planning"],
            ["7", "Support"],
            ["8", "Operation"],
            ["9", "Performance"],
            ["10", "Improvement"],
          ].map(([number, label]) => (
            <a
              key={number}
              href={`/portal/assessments/${assessment.id}?clause=${number}`}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "14px",
                background:
                  clause === number
                    ? "#1459D9"
                    : "#ffffff",
                color:
                  clause === number
                    ? "#ffffff"
                    : "#071A33",
                border:
                  clause === number
                    ? "1px solid #1459D9"
                    : "1px solid #d8e0ea",
              }}
            >
              {number} {label}
            </a>
          ))}
        </div>

        <div
          style={{
            background: "#071A33",
            color: "white",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                opacity: 0.8,
                marginBottom: "6px",
              }}
            >
              {`CLAUSE ${clause} SCORE`}
            </div>

            <strong
              style={{
                fontSize: "18px",
              }}
            >
              {clauseTitle}
            </strong>
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 800,
            }}
          >
            {selectedClauseScore !== null
              ? `${selectedClauseScore}%`
              : "—"}
          </div>
        </div>

        <form action={saveAssessmentAnswers}>
          <input
            type="hidden"
            name="assessment_id"
            value={assessment.id}
          />

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
                borderBottom: "1px solid #e6ebf1",
              }}
            >
              <p
                style={{
                  color: "#1459D9",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                {`CLAUSE ${clause}`}
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
                Complete each question and record the evidence
                supporting your assessment.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "30px",
              }}
            >
              {questions?.length ? (
                questions.map((question, index) => {
                  const savedAnswer =
                    answersByClause[
                      question.question_number
                    ] ?? null;

                  const fieldKey =
                    question.question_number.replaceAll(
                      ".",
                      "_"
                    );

                  return (
                    <div
                      key={question.id}
                      style={{
                        borderTop:
                          index === 0
                            ? "none"
                            : "1px solid #e6ebf1",
                        paddingTop:
                          index === 0 ? "0" : "26px",
                      }}
                    >
                      <h3
                        style={{
                          color: "#071A33",
                          marginBottom: "10px",
                        }}
                      >
                        {question.question_number}
                      </h3>

                      <p
                        style={{
                          color: "#071A33",
                          lineHeight: 1.6,
                          fontWeight: 600,
                          marginBottom: "10px",
                        }}
                      >
                        {question.question}
                      </p>

                      {question.guidance && (
                        <div
                          style={{
                            background: "#f5f8fc",
                            borderLeft:
                              "4px solid #1459D9",
                            padding: "12px 14px",
                            borderRadius: "6px",
                            color: "#617087",
                            lineHeight: 1.55,
                            marginBottom: "16px",
                            fontSize: "14px",
                          }}
                        >
                          <strong
                            style={{
                              color: "#071A33",
                            }}
                          >
                            Guidance:
                          </strong>{" "}
                          {question.guidance}
                        </div>
                      )}

                      <label
                        style={{
                          display: "block",
                          fontWeight: 700,
                          color: "#071A33",
                          marginBottom: "7px",
                        }}
                      >
                        Assessment score
                      </label>

                      <select
                        name={`score_${fieldKey}`}
                        required
                        defaultValue={
                          savedAnswer?.score !== null &&
                          savedAnswer?.score !== undefined
                            ? String(savedAnswer.score)
                            : ""
                        }
                        style={{
                          width: "100%",
                          maxWidth: "360px",
                          padding: "12px",
                          borderRadius: "8px",
                          border:
                            "1px solid #d8e0ea",
                          background: "#fff",
                        }}
                      >
                        <option value="" disabled>
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
                          display: "block",
                          fontWeight: 700,
                          color: "#071A33",
                          marginTop: "18px",
                          marginBottom: "7px",
                        }}
                      >
                        Evidence / notes
                      </label>

                      <textarea
                        name={`evidence_${fieldKey}`}
                        placeholder="Describe supporting evidence, documents, records, observations or gaps..."
                        rows="4"
                        defaultValue={
                          savedAnswer?.evidence ?? ""
                        }
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border:
                            "1px solid #d8e0ea",
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "20px",
                    background: "#fff8e8",
                    borderRadius: "8px",
                    color: "#735c17",
                  }}
                >
                  No questions are currently configured
                  for Clause {clause}.
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "32px",
                paddingTop: "22px",
                borderTop: "1px solid #e6ebf1",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <a
                href="/portal"
                style={{
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border:
                    "1px solid #d8e0ea",
                  color: "#071A33",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Back to Dashboard
              </a>

              <button
                type="submit"
                disabled={!questions?.length}
                style={{
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: questions?.length
                    ? "#1459D9"
                    : "#c8d2df",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: questions?.length
                    ? "pointer"
                    : "not-allowed",
                }}
              >
                Save Answers
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
