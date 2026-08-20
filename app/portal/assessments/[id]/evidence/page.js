import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import {
  createEvidenceSample,
  updateEvidenceSample,
  deleteEvidenceSample,
} from "./actions";

const EVIDENCE_TYPES = [
  "Document",
  "Record",
  "Interview",
  "Observation",
  "Data",
  "Measurement",
  "Other",
];

const CONFIDENCE_LEVELS = [
  "Low",
  "Medium",
  "High",
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

function findingLabel(type) {
  switch (type) {
    case "major_nc":
      return "Major NC";
    case "minor_nc":
      return "Minor NC";
    case "observation":
      return "Observation";
    case "ofi":
      return "OFI";
    default:
      return type || "Finding";
  }
}

export default async function EvidenceSamplingPage({
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
    data: questionsData,
    error: questionsError,
  } = await supabase
    .from("assessment_questions")
    .select(
      "question_number, clause, question"
    )
    .eq(
      "standard",
      assessment.standard
    )
    .eq("active", true)
    .order(
      "display_order",
      {
        ascending: true,
      }
    );

  if (questionsError) {
    throw new Error(
      questionsError.message
    );
  }

  const questions =
    questionsData ?? [];

  const {
    data: samplesData,
    error: samplesError,
  } = await supabase
    .from(
      "assessment_evidence_samples"
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
    .order("created_at", {
      ascending: false,
    });

  if (samplesError) {
    throw new Error(
      samplesError.message
    );
  }

  const samples =
    samplesData ?? [];

  const admin =
    createAdminClient();

  const {
    data: findingsData,
    error: findingsError,
  } = await admin
    .from("assessment_findings")
    .select(
      "id, question_number, finding_type, finding_statement, status"
    )
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

  const findings =
    findingsData ?? [];

  const highConfidence =
    samples.filter(
      (sample) =>
        sample.evidence_confidence ===
        "High"
    ).length;

  const withExceptions =
    samples.filter(
      (sample) =>
        sample.exception_gap &&
        sample.exception_gap.trim() !==
          ""
    ).length;

  const linkedToFinding =
    samples.filter(
      (sample) =>
        sample.finding_id
    ).length;

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #d8e0ea",
    boxSizing: "border-box",
    background: "#ffffff",
  };

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
            alignItems:
              "flex-start",
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
              Evidence Sampling
              Worksheet
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
              href={`/portal/assessments/${assessment.id}`}
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
              ← Assessment
            </Link>

            <Link
              href={`/portal/assessments/${assessment.id}/findings`}
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
              Findings
            </Link>

            <Link
              href={`/portal/assessments/${assessment.id}/summary`}
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
              Executive Summary
            </Link>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {[
            [
              "SAMPLES RECORDED",
              samples.length,
            ],
            [
              "HIGH CONFIDENCE",
              highConfidence,
            ],
            [
              "EXCEPTIONS / GAPS",
              withExceptions,
            ],
            [
              "LINKED TO FINDING",
              linkedToFinding,
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
          Record representative,
          traceable evidence samples.
          Sampling should be risk-based
          and sufficient to support the
          assessor's conclusion. Evidence
          confidence is controlled as
          Low, Medium or High.
        </div>

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
          <h2
            style={{
              color: "#071A33",
              marginTop: 0,
              marginBottom:
                "6px",
            }}
          >
            Add Evidence Sample
          </h2>

          <p
            style={{
              color: "#617087",
              marginTop: 0,
              lineHeight: 1.55,
            }}
          >
            Link the sample to a
            specific assessment control
            wherever possible.
          </p>

          <form
            action={
              createEvidenceSample
            }
            style={{
              display: "grid",
              gap: "12px",
            }}
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
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <select
                name="question_number"
                defaultValue=""
                style={
                  inputStyle
                }
              >
                <option value="">
                  Select assessment control
                </option>

                {questions.map(
                  (question) => (
                    <option
                      key={
                        question.question_number
                      }
                      value={
                        question.question_number
                      }
                    >
                      {
                        question.question_number
                      }{" "}
                      —{" "}
                      {
                        question.question
                      }
                    </option>
                  )
                )}
              </select>

              <input
                name="process_activity"
                placeholder="Process / activity"
                style={
                  inputStyle
                }
              />

              <input
                name="location"
                placeholder="Location / site"
                style={
                  inputStyle
                }
              />

              <select
                name="evidence_type"
                defaultValue=""
                style={
                  inputStyle
                }
              >
                <option value="">
                  Evidence type
                </option>

                {EVIDENCE_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <input
                name="evidence_reference"
                placeholder="Reference / record ID"
                style={
                  inputStyle
                }
              />

              <input
                name="evidence_period"
                placeholder="Date / period"
                style={
                  inputStyle
                }
              />

              <input
                name="sample_size"
                placeholder="Sample size / population basis"
                style={
                  inputStyle
                }
              />

              <select
                name="evidence_confidence"
                defaultValue=""
                style={
                  inputStyle
                }
              >
                <option value="">
                  Evidence confidence
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

            <textarea
              name="sample_result"
              rows="3"
              placeholder="What did this sample demonstrate?"
              style={
                inputStyle
              }
            />

            <textarea
              name="exception_gap"
              rows="3"
              placeholder="Exception / gap / anomaly identified"
              style={
                inputStyle
              }
            />

            <textarea
              name="assessor_notes"
              rows="3"
              placeholder="Assessor notes / follow-up"
              style={
                inputStyle
              }
            />

            <select
              name="finding_id"
              defaultValue=""
              style={
                inputStyle
              }
            >
              <option value="">
                No linked finding
              </option>

              {findings.map(
                (finding) => (
                  <option
                    key={
                      finding.id
                    }
                    value={
                      finding.id
                    }
                  >
                    {
                      finding.question_number
                    }{" "}
                    —{" "}
                    {findingLabel(
                      finding.finding_type
                    )}
                    {finding.status
                      ? ` — ${finding.status}`
                      : ""}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              style={{
                justifySelf:
                  "start",
                padding:
                  "11px 17px",
                border:
                  "none",
                borderRadius:
                  "8px",
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
              Add Evidence Sample
            </button>
          </form>
        </section>

        {samples.length === 0 ? (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius:
                "14px",
              padding: "28px",
              color: "#617087",
            }}
          >
            No evidence samples have
            been recorded yet.
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {samples.map(
              (sample) => (
                <section
                  key={
                    sample.id
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
                      gap: "12px",
                      alignItems:
                        "center",
                      flexWrap:
                        "wrap",
                      marginBottom:
                        "16px",
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
                        {sample.question_number
                          ? `Control ${sample.question_number}`
                          : "Unlinked evidence sample"}
                      </strong>

                      <div
                        style={{
                          color:
                            "#617087",
                          fontSize:
                            "12px",
                          marginTop:
                            "4px",
                        }}
                      >
                        Recorded{" "}
                        {formatDate(
                          sample.created_at
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        padding:
                          "6px 10px",
                        borderRadius:
                          "999px",
                        background:
                          "#f3f6f9",
                        color:
                          "#475467",
                        fontWeight:
                          800,
                        fontSize:
                          "12px",
                      }}
                    >
                      {
                        sample.evidence_confidence ??
                        "Confidence not set"
                      }
                    </span>
                  </div>

                  <form
                    action={
                      updateEvidenceSample
                    }
                    style={{
                      display:
                        "grid",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="hidden"
                      name="assessment_id"
                      value={
                        assessment.id
                      }
                    />

                    <input
                      type="hidden"
                      name="sample_id"
                      value={
                        sample.id
                      }
                    />

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <select
                        name="question_number"
                        defaultValue={
                          sample.question_number ??
                          ""
                        }
                        style={
                          inputStyle
                        }
                      >
                        <option value="">
                          Select assessment control
                        </option>

                        {questions.map(
                          (question) => (
                            <option
                              key={
                                question.question_number
                              }
                              value={
                                question.question_number
                              }
                            >
                              {
                                question.question_number
                              }{" "}
                              —{" "}
                              {
                                question.question
                              }
                            </option>
                          )
                        )}
                      </select>

                      <input
                        name="process_activity"
                        defaultValue={
                          sample.process_activity ??
                          ""
                        }
                        placeholder="Process / activity"
                        style={
                          inputStyle
                        }
                      />

                      <input
                        name="location"
                        defaultValue={
                          sample.location ??
                          ""
                        }
                        placeholder="Location / site"
                        style={
                          inputStyle
                        }
                      />

                      <select
                        name="evidence_type"
                        defaultValue={
                          sample.evidence_type ??
                          ""
                        }
                        style={
                          inputStyle
                        }
                      >
                        <option value="">
                          Evidence type
                        </option>

                        {EVIDENCE_TYPES.map(
                          (type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {type}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <input
                        name="evidence_reference"
                        defaultValue={
                          sample.evidence_reference ??
                          ""
                        }
                        placeholder="Reference / record ID"
                        style={
                          inputStyle
                        }
                      />

                      <input
                        name="evidence_period"
                        defaultValue={
                          sample.evidence_period ??
                          ""
                        }
                        placeholder="Date / period"
                        style={
                          inputStyle
                        }
                      />

                      <input
                        name="sample_size"
                        defaultValue={
                          sample.sample_size ??
                          ""
                        }
                        placeholder="Sample size / population basis"
                        style={
                          inputStyle
                        }
                      />

                      <select
                        name="evidence_confidence"
                        defaultValue={
                          sample.evidence_confidence ??
                          ""
                        }
                        style={
                          inputStyle
                        }
                      >
                        <option value="">
                          Evidence confidence
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

                    <textarea
                      name="sample_result"
                      rows="3"
                      defaultValue={
                        sample.sample_result ??
                        ""
                      }
                      placeholder="What did this sample demonstrate?"
                      style={
                        inputStyle
                      }
                    />

                    <textarea
                      name="exception_gap"
                      rows="3"
                      defaultValue={
                        sample.exception_gap ??
                        ""
                      }
                      placeholder="Exception / gap / anomaly identified"
                      style={
                        inputStyle
                      }
                    />

                    <textarea
                      name="assessor_notes"
                      rows="3"
                      defaultValue={
                        sample.assessor_notes ??
                        ""
                      }
                      placeholder="Assessor notes / follow-up"
                      style={
                        inputStyle
                      }
                    />

                    <select
                      name="finding_id"
                      defaultValue={
                        sample.finding_id ??
                        ""
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option value="">
                        No linked finding
                      </option>

                      {findings.map(
                        (finding) => (
                          <option
                            key={
                              finding.id
                            }
                            value={
                              finding.id
                            }
                          >
                            {
                              finding.question_number
                            }{" "}
                            —{" "}
                            {findingLabel(
                              finding.finding_type
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: "10px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="submit"
                        style={{
                          padding:
                            "10px 15px",
                          border:
                            "none",
                          borderRadius:
                            "8px",
                          background:
                            "#071A33",
                          color:
                            "#ffffff",
                          fontWeight:
                            700,
                          cursor:
                            "pointer",
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>

                  <form
                    action={
                      deleteEvidenceSample
                    }
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    <input
                      type="hidden"
                      name="assessment_id"
                      value={
                        assessment.id
                      }
                    />

                    <input
                      type="hidden"
                      name="sample_id"
                      value={
                        sample.id
                      }
                    />

                    <button
                      type="submit"
                      style={{
                        padding:
                          "9px 13px",
                        borderRadius:
                          "8px",
                        border:
                          "1px solid #f0b6b0",
                        background:
                          "#fff8f7",
                        color:
                          "#b42318",
                        fontWeight:
                          700,
                        cursor:
                          "pointer",
                      }}
                    >
                      Delete Sample
                    </button>
                  </form>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
