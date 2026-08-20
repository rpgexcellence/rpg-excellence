import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

import { updateManagementAction } from "./actions";

const priorityFor = (type) =>
  type === "major_nc"
    ? "critical"
    : type === "minor_nc"
      ? "high"
      : type === "observation"
        ? "medium"
        : "low";

const priorityLabel = (priority) =>
  ({
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  }[priority] ?? priority);

const labelFor = (type) =>
  ({
    major_nc: "Major NC",
    minor_nc: "Minor NC",
    observation: "Observation",
    ofi: "OFI",
  }[type] ?? type);

const isCompletedManagementStatus = (status) =>
  status === "completed" ||
  status === "verified";

export default async function ManagementActionPlanPage({
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

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select("id, standard, status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (assessmentError || !assessment) {
    redirect("/portal");
  }

  const admin = createAdminClient();

  const {
    data: findingsData,
    error: findingsError,
  } = await admin
    .from("assessment_findings")
    .select("*")
    .eq("assessment_id", id)
    .eq("owner_id", user.id)
    .neq("finding_type", "conformity")
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

  const findingIds =
    findings.map(
      (finding) => finding.id
    );

  let correctiveActions = [];

  if (findingIds.length) {
    const {
      data,
      error,
    } = await admin
      .from("corrective_actions")
      .select("*")
      .eq(
        "assessment_id",
        id
      )
      .eq(
        "owner_id",
        user.id
      )
      .in(
        "finding_id",
        findingIds
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    correctiveActions =
      data ?? [];
  }

  const correctiveByFinding =
    Object.fromEntries(
      correctiveActions.map(
        (action) => [
          action.finding_id,
          action,
        ]
      )
    );

  const {
    data: planData,
    error: planError,
  } = await admin
    .from(
      "management_action_plan"
    )
    .select("*")
    .eq(
      "assessment_id",
      id
    )
    .eq(
      "owner_id",
      user.id
    );

  if (planError) {
    throw new Error(
      planError.message
    );
  }

  const managementPlans =
    planData ?? [];

  /*
   * Canonical finding relationship for the
   * management action plan.
   */
  const planByFinding =
    Object.fromEntries(
      managementPlans
        .filter(
          (row) =>
            row.related_finding_id
        )
        .map(
          (row) => [
            row.related_finding_id,
            row,
          ]
        )
    );

  /*
   * Major and Minor NCs enter the management
   * plan automatically.
   *
   * Observation / OFI only appear here if a
   * management action row already exists.
   */
  const planFindings =
    findings.filter(
      (finding) =>
        [
          "major_nc",
          "minor_nc",
        ].includes(
          finding.finding_type
        ) ||
        Boolean(
          planByFinding[
            finding.id
          ]
        )
    );

  const today =
    new Date();

  /*
   * CRITICAL OPEN
   *
   * If a management action exists, its status
   * is authoritative for the Management Action
   * Plan.
   *
   * If no management action exists yet, an
   * unclosed Major NC still needs management
   * attention and therefore remains open.
   */
  const openCritical =
    planFindings.filter(
      (finding) => {
        if (
          finding.finding_type !==
          "major_nc"
        ) {
          return false;
        }

        const plan =
          planByFinding[
            finding.id
          ];

        if (plan) {
          return !isCompletedManagementStatus(
            plan.status
          );
        }

        return (
          finding.status !==
          "closed"
        );
      }
    ).length;

  /*
   * HIGH OPEN
   *
   * Same rule for Minor NCs.
   */
  const openHigh =
    planFindings.filter(
      (finding) => {
        if (
          finding.finding_type !==
          "minor_nc"
        ) {
          return false;
        }

        const plan =
          planByFinding[
            finding.id
          ];

        if (plan) {
          return !isCompletedManagementStatus(
            plan.status
          );
        }

        return (
          finding.status !==
          "closed"
        );
      }
    ).length;

  /*
   * COMPLETED
   *
   * This metric represents completed /
   * verified Management Action Plan records.
   *
   * A formally closed finding is NOT counted
   * here unless its management action itself
   * is completed or verified.
   */
  const completed =
    managementPlans.filter(
      (plan) =>
        isCompletedManagementStatus(
          plan.status
        )
    ).length;

  const overdue =
    planFindings.filter(
      (finding) => {
        const plan =
          planByFinding[
            finding.id
          ];

        const corrective =
          correctiveByFinding[
            finding.id
          ];

        const targetDate =
          plan?.target_date ??
          corrective?.target_date;

        const status =
          plan?.status ??
          corrective?.status ??
          finding.status;

        return Boolean(
          targetDate &&
            ![
              "completed",
              "verified",
              "closed",
              "effective",
            ].includes(
              status
            ) &&
            new Date(
              `${targetDate}T23:59:59`
            ) < today
        );
      }
    ).length;

  const box = {
    background: "#fff",
    border:
      "1px solid #dfe6ee",
    borderRadius: "12px",
    padding: "18px",
  };

  const input = {
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #d8e0ea",
    boxSizing:
      "border-box",
    width: "100%",
  };

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f3f6f9",
        padding: "40px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            "1180px",
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            gap: "20px",
            flexWrap:
              "wrap",
            marginBottom:
              "24px",
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
                letterSpacing:
                  ".8px",
              }}
            >
              RPG INTELLIGENCE
            </div>

            <h1
              style={{
                color:
                  "#071A33",
                marginBottom:
                  "6px",
              }}
            >
              Management Action Plan
            </h1>

            <p
              style={{
                color:
                  "#617087",
                margin: 0,
              }}
            >
              {
                assessment.standard
              }{" "}
              Assessment
            </p>
          </div>

          <div
            style={{
              display:
                "flex",
              gap: "10px",
              flexWrap:
                "wrap",
            }}
          >
            <Link
              href={`/portal/assessments/${id}/findings`}
              style={{
                ...input,
                width: "auto",
                background:
                  "#fff",
                color:
                  "#071A33",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              ← Findings Register
            </Link>

            <Link
              href={`/portal/assessments/${id}/summary`}
              style={{
                ...input,
                width: "auto",
                background:
                  "#071A33",
                color: "#fff",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              Executive Summary
            </Link>
          </div>
        </div>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "14px",
            marginBottom:
              "24px",
          }}
        >
          {[
            [
              "CRITICAL OPEN",
              openCritical,
            ],
            [
              "HIGH OPEN",
              openHigh,
            ],
            [
              "OVERDUE",
              overdue,
            ],
            [
              "COMPLETED",
              completed,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <div
                key={
                  label
                }
                style={
                  box
                }
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
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
            padding:
              "16px 18px",
            borderRadius:
              "10px",
            lineHeight:
              1.55,
            marginBottom:
              "24px",
          }}
        >
          Major and Minor
          Nonconformities
          automatically enter this
          management plan.
          Observations and OFIs
          remain in the Findings
          Register unless management
          chooses to promote them
          later.
        </div>

        {planFindings.length ===
        0 ? (
          <section
            style={box}
          >
            There are currently
            no mandatory
            management actions
            arising from this
            assessment.
          </section>
        ) : (
          <div
            style={{
              display:
                "grid",
              gap: "18px",
            }}
          >
            {planFindings.map(
              (finding) => {
                const corrective =
                  correctiveByFinding[
                    finding.id
                  ] ?? {};

                const plan =
                  planByFinding[
                    finding.id
                  ] ?? {};

                const priority =
                  plan.priority ??
                  priorityFor(
                    finding.finding_type
                  );

                const target =
                  plan.target_date ??
                  corrective.target_date ??
                  "";

                const status =
                  plan.status ??
                  "open";

                const isOverdue =
                  Boolean(
                    target &&
                      ![
                        "completed",
                        "verified",
                      ].includes(
                        status
                      ) &&
                      new Date(
                        `${target}T23:59:59`
                      ) <
                        today
                  );

                return (
                  <section
                    key={
                      finding.id
                    }
                    style={{
                      ...box,
                      border:
                        priority ===
                        "critical"
                          ? "2px solid #efb4ae"
                          : box.border,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "12px",
                        flexWrap:
                          "wrap",
                        marginBottom:
                          "18px",
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#071A33",
                        }}
                      >
                        {
                          finding.question_number
                        }{" "}
                        ·{" "}
                        {labelFor(
                          finding.finding_type
                        )}
                      </strong>

                      <span
                        style={{
                          fontWeight:
                            800,
                          color:
                            priority ===
                            "critical"
                              ? "#b42318"
                              : "#8a6116",
                        }}
                      >
                        {priorityLabel(
                          priority
                        )}
                      </span>
                    </div>

                    <p
                      style={{
                        color:
                          "#617087",
                        lineHeight:
                          1.6,
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#071A33",
                        }}
                      >
                        Finding:{" "}
                      </strong>

                      {finding.finding_statement ||
                        finding.requirement_summary ||
                        "—"}
                    </p>

                    <form
                      action={
                        updateManagementAction
                      }
                      style={{
                        display:
                          "grid",
                        gap:
                          "12px",
                      }}
                    >
                      <input
                        type="hidden"
                        name="assessment_id"
                        value={id}
                      />

                      <input
                        type="hidden"
                        name="finding_id"
                        value={
                          finding.id
                        }
                      />

                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(190px,1fr))",
                          gap:
                            "12px",
                        }}
                      >
                        <select
                          name="priority"
                          defaultValue={
                            priority
                          }
                          style={
                            input
                          }
                        >
                          {[
                            [
                              "critical",
                              "Critical",
                            ],
                            [
                              "high",
                              "High",
                            ],
                            [
                              "medium",
                              "Medium",
                            ],
                            [
                              "low",
                              "Low",
                            ],
                          ].map(
                            ([
                              value,
                              label,
                            ]) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {
                                  label
                                }
                              </option>
                            )
                          )}
                        </select>

                        <input
                          name="action_owner"
                          defaultValue={
                            plan.action_owner ??
                            corrective.action_owner ??
                            ""
                          }
                          placeholder="Management owner"
                          style={
                            input
                          }
                        />

                        <input
                          name="target_date"
                          type="date"
                          defaultValue={
                            target
                          }
                          style={{
                            ...input,
                            border:
                              isOverdue
                                ? "1px solid #b42318"
                                : input.border,
                          }}
                        />

                        <select
                          name="status"
                          defaultValue={
                            status
                          }
                          style={
                            input
                          }
                        >
                          <option value="open">
                            Open
                          </option>

                          <option value="in_progress">
                            In progress
                          </option>

                          <option value="completed">
                            Completed
                          </option>

                          <option value="verified">
                            Verified
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
                          }}
                        >
                          Management
                          action is
                          overdue.
                        </div>
                      )}

                      <textarea
                        name="action_required"
                        rows="3"
                        defaultValue={
                          plan.action_description ??
                          corrective.corrective_action ??
                          ""
                        }
                        placeholder="Management action required"
                        style={
                          input
                        }
                      />

                      <textarea
                        name="resource_decision"
                        rows="2"
                        defaultValue={
                          plan.resource_decision ??
                          ""
                        }
                        placeholder="Resource / investment / management decision required"
                        style={
                          input
                        }
                      />

                      <textarea
                        name="management_commentary"
                        rows="3"
                        defaultValue={
                          plan.management_commentary ??
                          ""
                        }
                        placeholder="Management commentary / progress"
                        style={
                          input
                        }
                      />

                      <textarea
                        name="verification_evidence"
                        rows="3"
                        defaultValue={
                          plan.verification_evidence ??
                          corrective.verification_evidence ??
                          ""
                        }
                        placeholder="Verification / effectiveness evidence"
                        style={
                          input
                        }
                      />

                      <button
                        type="submit"
                        style={{
                          justifySelf:
                            "start",
                          padding:
                            "11px 17px",
                          border:
                            0,
                          borderRadius:
                            "8px",
                          background:
                            "#1459D9",
                          color:
                            "#fff",
                          fontWeight:
                            700,
                          cursor:
                            "pointer",
                        }}
                      >
                        Save Management
                        Action
                      </button>
                    </form>
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
