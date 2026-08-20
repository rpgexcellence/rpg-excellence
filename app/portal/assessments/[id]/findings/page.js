import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import {
  updateFindingStatus,
  updateCorrectiveAction,
} from "./actions";

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
    case "conformity":
      return "Conformity";
    default:
      return type || "Finding";
  }
}

function findingStyle(type) {
  switch (type) {
    case "major_nc":
      return {
        background: "#fff1f0",
        color: "#b42318",
      };
    case "minor_nc":
      return {
        background: "#fff8e8",
        color: "#8a6116",
      };
    case "observation":
      return {
        background: "#f3f6f9",
        color: "#475467",
      };
    case "ofi":
      return {
        background: "#eef4ff",
        color: "#1459D9",
      };
    case "conformity":
      return {
        background: "#edf8f3",
        color: "#16794b",
      };
    default:
      return {
        background: "#f3f6f9",
        color: "#475467",
      };
  }
}

function statusLabel(status) {
  switch (status) {
    case "action_in_progress":
      return "Action in progress";
    case "verification":
      return "Verification";
    case "closed":
      return "Closed";
    case "open":
      return "Open";
    default:
      return status || "Open";
  }
}

export default async function FindingsPage({
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
      "id, standard, status, organization_id, created_at"
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
    .order("created_at", {
      ascending: true,
    });

  if (findingsError) {
    throw new Error(
      findingsError.message
    );
  }

  const findings =
    (findingsData ?? []).filter(
      (finding) =>
        finding.finding_type !==
        "conformity"
    );

  const findingIds =
    findings.map(
      (finding) => finding.id
    );

  let actions = [];

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

    actions =
      actionsData ?? [];
  }

  const actionByFindingId =
    Object.fromEntries(
      actions.map((action) => [
        action.finding_id,
        action,
      ])
    );

  const openFindings =
    findings.filter(
      (finding) =>
        finding.status !==
        "closed"
    );

  const majorCount =
    findings.filter(
      (finding) =>
        finding.finding_type ===
        "major_nc"
    ).length;

  const minorCount =
    findings.filter(
      (finding) =>
        finding.finding_type ===
        "minor_nc"
    ).length;

  const ofiCount =
    findings.filter(
      (finding) =>
        finding.finding_type ===
        "ofi"
    ).length;

  const observationCount =
    findings.filter(
      (finding) =>
        finding.finding_type ===
        "observation"
    ).length;

  const today =
    new Date();

  const overdueCount =
    actions.filter((action) => {
      if (
        !action.target_date ||
        action.status ===
          "closed" ||
        action.status ===
          "effective"
      ) {
        return false;
      }

      return (
        new Date(
          `${action.target_date}T23:59:59`
        ) < today
      );
    }).length;

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
            gap: "20px",
            alignItems:
              "flex-start",
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
              Findings & Corrective
              Actions
            </h1>

            <p
              style={{
                color: "#617087",
                marginBottom: 0,
              }}
            >
              {assessment.standard}{" "}
              assessment
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
                color: "#071A33",
                background:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              ← Assessment
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

            <Link
              href="/portal"
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
              Dashboard
            </Link>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {[
            [
              "OPEN",
              openFindings.length,
            ],
            [
              "MAJOR NC",
              majorCount,
            ],
            [
              "MINOR NC",
              minorCount,
            ],
            [
              "OBSERVATIONS",
              observationCount,
            ],
            ["OFIs", ofiCount],
            [
              "OVERDUE ACTIONS",
              overdueCount,
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

        {findings.length === 0 ? (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius:
                "14px",
              padding: "30px",
              color: "#617087",
            }}
          >
            No nonconformities,
            observations or opportunities
            for improvement have been
            raised for this assessment.
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {findings.map(
              (finding) => {
                const action =
                  actionByFindingId[
                    finding.id
                  ] ?? null;

                const badge =
                  findingStyle(
                    finding.finding_type
                  );

                const isOverdue =
                  Boolean(
                    action?.target_date &&
                      ![
                        "closed",
                        "effective",
                      ].includes(
                        action.status
                      ) &&
                      new Date(
                        `${action.target_date}T23:59:59`
                      ) < today
                  );

                return (
                  <section
                    key={finding.id}
                    style={{
                      background:
                        "#ffffff",
                      border:
                        finding.finding_type ===
                        "major_nc"
                          ? "2px solid #f5b7b1"
                          : "1px solid #dfe6ee",
                      borderRadius:
                        "14px",
                      overflow:
                        "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "18px 22px",
                        borderBottom:
                          "1px solid #e6ebf1",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: "12px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "9px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "6px 10px",
                              borderRadius:
                                "999px",
                              background:
                                badge.background,
                              color:
                                badge.color,
                              fontSize:
                                "12px",
                              fontWeight:
                                800,
                            }}
                          >
                            {findingLabel(
                              finding.finding_type
                            )}
                          </span>

                          <strong
                            style={{
                              color:
                                "#071A33",
                            }}
                          >
                            {finding.question_number}
                          </strong>
                        </div>

                        <div
                          style={{
                            color:
                              "#617087",
                            fontSize:
                              "13px",
                            marginTop:
                              "8px",
                          }}
                        >
                          Raised{" "}
                          {formatDate(
                            finding.created_at
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          color:
                            finding.status ===
                            "closed"
                              ? "#16794b"
                              : "#8a6116",
                          fontWeight:
                            800,
                          fontSize:
                            "13px",
                        }}
                      >
                        {statusLabel(
                          finding.status
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding:
                          "22px",
                        display:
                          "grid",
                        gap: "18px",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color:
                              "#071A33",
                          }}
                        >
                          Criterion /
                          requirement
                        </strong>
                        <p
                          style={{
                            color:
                              "#617087",
                            lineHeight:
                              1.6,
                            marginBottom:
                              0,
                          }}
                        >
                          {finding.requirement_summary ||
                            "—"}
                        </p>
                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(260px, 1fr))",
                          gap: "14px",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color:
                                "#071A33",
                            }}
                          >
                            Objective
                            evidence
                          </strong>
                          <p
                            style={{
                              color:
                                "#617087",
                              lineHeight:
                                1.6,
                            }}
                          >
                            {finding.objective_evidence ||
                              "—"}
                          </p>
                        </div>

                        <div>
                          <strong
                            style={{
                              color:
                                "#071A33",
                            }}
                          >
                            Finding
                            statement
                          </strong>
                          <p
                            style={{
                              color:
                                "#617087",
                              lineHeight:
                                1.6,
                            }}
                          >
                            {finding.finding_statement ||
                              "—"}
                          </p>
                        </div>
                      </div>

                      {(finding.risk_impact ||
                        finding.assessor_rationale) && (
                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: "14px",
                          }}
                        >
                          <div>
                            <strong
                              style={{
                                color:
                                  "#071A33",
                              }}
                            >
                              Risk /
                              significance
                            </strong>
                            <p
                              style={{
                                color:
                                  "#617087",
                                lineHeight:
                                  1.6,
                              }}
                            >
                              {finding.risk_impact ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <strong
                              style={{
                                color:
                                  "#071A33",
                              }}
                            >
                              Assessor
                              rationale
                            </strong>
                            <p
                              style={{
                                color:
                                  "#617087",
                                lineHeight:
                                  1.6,
                              }}
                            >
                              {finding.assessor_rationale ||
                                "—"}
                            </p>
                          </div>
                        </div>
                      )}

                      {[
                        "minor_nc",
                        "major_nc",
                      ].includes(
                        finding.finding_type
                      ) && (
                        <div
                          style={{
                            borderTop:
                              "1px solid #e6ebf1",
                            paddingTop:
                              "18px",
                          }}
                        >
                          <h3
                            style={{
                              color:
                                "#071A33",
                              marginTop:
                                0,
                            }}
                          >
                            Corrective
                            Action
                          </h3>

                          <form
                            action={
                              updateCorrectiveAction
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
                              name="finding_id"
                              value={
                                finding.id
                              }
                            />

                            <textarea
                              name="correction"
                              rows="2"
                              defaultValue={
                                action?.correction ??
                                ""
                              }
                              placeholder="Immediate correction"
                              style={{
                                width:
                                  "100%",
                                padding:
                                  "12px",
                                borderRadius:
                                  "8px",
                                border:
                                  "1px solid #d8e0ea",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <textarea
                              name="containment_action"
                              rows="2"
                              defaultValue={
                                action?.containment_action ??
                                ""
                              }
                              placeholder="Containment action"
                              style={{
                                width:
                                  "100%",
                                padding:
                                  "12px",
                                borderRadius:
                                  "8px",
                                border:
                                  "1px solid #d8e0ea",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <textarea
                              name="root_cause"
                              rows="3"
                              defaultValue={
                                action?.root_cause ??
                                ""
                              }
                              placeholder="Root cause"
                              style={{
                                width:
                                  "100%",
                                padding:
                                  "12px",
                                borderRadius:
                                  "8px",
                                border:
                                  "1px solid #d8e0ea",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <textarea
                              name="corrective_action"
                              rows="3"
                              defaultValue={
                                action?.corrective_action ??
                                ""
                              }
                              placeholder="Corrective action"
                              style={{
                                width:
                                  "100%",
                                padding:
                                  "12px",
                                borderRadius:
                                  "8px",
                                border:
                                  "1px solid #d8e0ea",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <div
                              style={{
                                display:
                                  "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "12px",
                              }}
                            >
                              <input
                                name="action_owner"
                                type="text"
                                defaultValue={
                                  action?.action_owner ??
                                  ""
                                }
                                placeholder="Action owner"
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
                                name="target_date"
                                type="date"
                                defaultValue={
                                  action?.target_date ??
                                  ""
                                }
                                style={{
                                  padding:
                                    "12px",
                                  borderRadius:
                                    "8px",
                                  border:
                                    isOverdue
                                      ? "1px solid #b42318"
                                      : "1px solid #d8e0ea",
                                }}
                              />

                              <select
                                name="status"
                                defaultValue={
                                  action?.status ??
                                  "open"
                                }
                                style={{
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
                                <option value="open">
                                  Open
                                </option>
                                <option value="in_progress">
                                  In progress
                                </option>
                                <option value="awaiting_verification">
                                  Awaiting verification
                                </option>
                                <option value="effective">
                                  Effective
                                </option>
                                <option value="closed">
                                  Closed
                                </option>
                              </select>
                            </div>

                            {isOverdue && (
                              <div
                                style={{
                                  color:
                                    "#b42318",
                                  fontWeight:
                                    700,
                                  fontSize:
                                    "13px",
                                }}
                              >
                                This corrective
                                action is overdue.
                              </div>
                            )}

                            <textarea
                              name="verification_evidence"
                              rows="3"
                              defaultValue={
                                action?.verification_evidence ??
                                ""
                              }
                              placeholder="Verification evidence"
                              style={{
                                width:
                                  "100%",
                                padding:
                                  "12px",
                                borderRadius:
                                  "8px",
                                border:
                                  "1px solid #d8e0ea",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <textarea
                              name="effectiveness_review"
                              rows="3"
                              defaultValue={
                                action?.effectiveness_review ??
                                ""
                              }
                              placeholder="Effectiveness review"
                              style={{
                                width:
                                  "100%",
                                padding:
                                  "12px",
                                borderRadius:
                                  "8px",
                                border:
                                  "1px solid #d8e0ea",
                                boxSizing:
                                  "border-box",
                              }}
                            />

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
                              Save
                              Corrective
                              Action
                            </button>
                          </form>
                        </div>
                      )}

                      <div
                        style={{
                          borderTop:
                            "1px solid #e6ebf1",
                          paddingTop:
                            "16px",
                        }}
                      >
                        <form
                          action={
                            updateFindingStatus
                          }
                          style={{
                            display:
                              "flex",
                            gap: "10px",
                            alignItems:
                              "center",
                            flexWrap:
                              "wrap",
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
                            name="finding_id"
                            value={
                              finding.id
                            }
                          />

                          <select
                            name="status"
                            defaultValue={
                              finding.status
                            }
                            style={{
                              padding:
                                "10px 12px",
                              borderRadius:
                                "8px",
                              border:
                                "1px solid #d8e0ea",
                              background:
                                "#ffffff",
                            }}
                          >
                            <option value="open">
                              Open
                            </option>
                            <option value="action_in_progress">
                              Action in progress
                            </option>
                            <option value="verification">
                              Verification
                            </option>
                            <option value="closed">
                              Closed
                            </option>
                          </select>

                          <button
                            type="submit"
                            style={{
                              padding:
                                "10px 14px",
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
                            Update Finding
                            Status
                          </button>
                        </form>
                      </div>
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
