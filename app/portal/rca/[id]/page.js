import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import {
  addCauseHypothesis,
  addCorrectiveAction,
  addObjectiveEvidence,
  addTeamMember,
  recordNoContainmentRequired,
  reviewCauseHypothesis,
  saveCaseOverview,
  saveDiscipline,
} from "./actions";
import {
  generateAiChallenge,
  reviewAiChallenge,
} from "./ai-actions";

const label = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cfdae8",
  borderRadius: "10px",
  background: "white",
  color: "#061a35",
  padding: "13px 14px",
  font: "inherit",
};

export default async function RcaCasePage({
  params,
  searchParams,
}) {
  const { id } = await params;
  const query = await searchParams;
  const pageError = query?.error;
  const requestedDiscipline = Math.min(
    8,
    Math.max(0, Number(query?.d ?? 0) || 0)
  );
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const [
    caseResult,
    disciplinesResult,
    teamResult,
    causesResult,
    actionsResult,
    aiRunsResult,
    evidenceResult,
  ] = await Promise.all([
    supabase
      .from("rca_cases")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("rca_8d_disciplines")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("discipline"),
    supabase
      .from("rca_team_members")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("rca_causes")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at"),
    supabase
      .from("rca_actions")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at"),
    supabase
      .from("rca_ai_runs")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("rca_evidence")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (caseResult.error) throw new Error(caseResult.error.message);
  if (!caseResult.data) notFound();
  for (const result of [
    disciplinesResult,
    teamResult,
    causesResult,
    actionsResult,
    aiRunsResult,
    evidenceResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const rcaCase = caseResult.data;
  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", rcaCase.organization_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (organizationError) {
    throw new Error(organizationError.message);
  }
  const disciplines = disciplinesResult.data ?? [];
  const team = teamResult.data ?? [];
  const causes = causesResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const aiRuns = aiRunsResult.data ?? [];
  const evidenceRecords = await Promise.all(
    (evidenceResult.data ?? []).map(async (record) => {
      if (!record.storage_path) return { ...record, download_url: null };
      const { data } = await supabase.storage
        .from("rca-evidence")
        .createSignedUrl(record.storage_path, 3600);
      return {
        ...record,
        download_url: data?.signedUrl ?? null,
      };
    })
  );
  const firstIncomplete = disciplines.find(
    (item) => item.status !== "approved"
  );
  const highestUnlocked = firstIncomplete
    ? firstIncomplete.discipline
    : 8;

  if (requestedDiscipline > highestUnlocked) {
    redirect(`/portal/rca/${id}?d=${highestUnlocked}&locked=1`);
  }

  const selected = requestedDiscipline;
  const discipline = disciplines.find(
    (item) => item.discipline === selected
  );
  const approvedCount = disciplines.filter(
    (item) => item.status === "approved"
  ).length;
  const openActions = actions.filter(
    (item) => !["verified", "cancelled"].includes(item.status)
  ).length;
  const latestAiRun = aiRuns.find(
    (run) => run.discipline === selected
  );
  const selectedEvidence = evidenceRecords.filter(
    (record) => record.discipline === selected
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6fa",
        color: "#061a35",
        padding: "42px 22px 80px",
      }}
    >
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Link
              href="/en"
              aria-label="RPG Excellence home"
              style={{
                width: "260px",
                height: "70px",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                textDecoration: "none",
                marginBottom: "22px",
              }}
            >
              <img
                src="/rpg-excellence-logo.png"
                alt="RPG Excellence"
                style={{
                  display: "block",
                  width: "260px",
                  maxWidth: "260px",
                  height: "70px",
                  maxHeight: "70px",
                  objectFit: "contain",
                  objectPosition: "left center",
                }}
              />
            </Link>

            <div
              style={{
                color: "#155eef",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {rcaCase.case_reference} · 8D Investigation
            </div>
            <h1
              style={{
                margin: "8px 0",
                fontSize: "clamp(30px, 5vw, 48px)",
              }}
            >
              {rcaCase.title}
            </h1>
            <div style={{ color: "#607089" }}>
              {organization?.name ?? "Organisation"} · {label(rcaCase.source_type)} · {label(rcaCase.severity)}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/portal/rca" style={linkButton}>
              ← 8D Command Centre
            </Link>
          </div>
        </div>

        <section
          style={{
            marginTop: "26px",
            background: "#061a35",
            color: "white",
            borderRadius: "22px",
            padding: "26px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px",
          }}
        >
          {[
            ["Current gate", `D${rcaCase.current_discipline}`],
            ["Disciplines approved", `${approvedCount}/9`],
            ["Cause hypotheses", causes.length],
            ["Open actions", openActions],
          ].map(([title, value]) => (
            <div key={title}>
              <div
                style={{
                  color: "#9fb2cb",
                  textTransform: "uppercase",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {title}
              </div>
              <strong
                style={{
                  display: "block",
                  marginTop: "7px",
                  fontSize: "30px",
                }}
              >
                {value}
              </strong>
            </div>
          ))}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "22px",
            marginTop: "24px",
          }}
        >
          <aside>
            <div
              style={{
                background: "white",
                border: "1px solid #dce4ee",
                borderRadius: "18px",
                padding: "14px",
                display: "grid",
                gap: "8px",
              }}
            >
              {disciplines.map((item) => {
                const active = item.discipline === selected;
                const locked = item.discipline > highestUnlocked;
                const content = (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        fontWeight: 800,
                      }}
                    >
                      <span>D{item.discipline}</span>
                      <span>
                        {item.status === "approved"
                          ? "✓"
                          : locked
                            ? "🔒"
                            : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>
                  </>
                );

                if (locked) {
                  return (
                    <div
                      key={item.id}
                      aria-disabled="true"
                      title={`Complete and approve D${item.discipline - 1} to unlock D${item.discipline}.`}
                      style={{
                        padding: "13px",
                        borderRadius: "12px",
                        color: "#8190a5",
                        background: "#eef1f5",
                        cursor: "not-allowed",
                        opacity: 0.78,
                      }}
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={`/portal/rca/${id}?d=${item.discipline}`}
                    style={{
                      padding: "13px",
                      borderRadius: "12px",
                      textDecoration: "none",
                      color: active ? "white" : "#061a35",
                      background: active ? "#155eef" : "#f6f8fb",
                    }}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </aside>

          <div style={{ minWidth: 0 }}>
            {discipline && (
              <section style={cardStyle}>
                {pageError === "narrative_required" && (
                  <div style={validationNoticeStyle}>
                    Record the discipline evidence, analysis and conclusion before submitting it for review. For D3, you may instead record an evidence-based “No containment action required” decision.
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "18px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#155eef",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "13px",
                      }}
                    >
                      Discipline D{selected}
                    </div>
                    <h2 style={{ margin: "6px 0" }}>
                      {discipline.title}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: "#607089",
                        lineHeight: 1.6,
                        maxWidth: "900px",
                      }}
                    >
                      {discipline.objective}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      background:
                        discipline.status === "approved"
                          ? "#e8f8ef"
                          : "#eef4ff",
                      color:
                        discipline.status === "approved"
                          ? "#067647"
                          : "#175cd3",
                      fontWeight: 800,
                    }}
                  >
                    {label(discipline.status)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    padding: "18px",
                    borderRadius: "14px",
                    background: "#eef4ff",
                    color: "#274c7a",
                    lineHeight: 1.55,
                  }}
                >
                  <strong>AI Evidence Challenge</strong>
                  <div style={{ marginTop: "5px" }}>
                    The assistant will challenge assumptions,
                    identify missing evidence and propose tests. It
                    cannot approve this gate or convert a hypothesis
                    into a validated cause.
                  </div>
                  <form
                    action={generateAiChallenge}
                    style={{ marginTop: "14px" }}
                  >
                    <input type="hidden" name="case_id" value={id} />
                    <input type="hidden" name="discipline" value={selected} />
                    <button type="submit" style={aiButton}>
                      {latestAiRun
                        ? `Run New AI Challenge for D${selected}`
                        : `Generate AI Challenge for D${selected}`}
                    </button>
                  </form>
                </div>

                {latestAiRun && (
                  <div style={aiResultStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#155eef",
                            fontSize: "12px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          Latest AI evidence challenge
                        </div>
                        <h3 style={{ margin: "6px 0" }}>
                          {label(latestAiRun.output?.gate_recommendation)}
                        </h3>
                      </div>
                      <span style={decisionBadge(latestAiRun.human_decision)}>
                        Human decision: {label(latestAiRun.human_decision)}
                      </span>
                    </div>

                    <p style={{ lineHeight: 1.6 }}>
                      {latestAiRun.output?.executive_assessment}
                    </p>

                    <div style={aiGridStyle}>
                      <AiList
                        title="Challenges"
                        items={latestAiRun.output?.challenges}
                      />
                      <AiList
                        title="Missing evidence"
                        items={latestAiRun.output?.missing_evidence}
                      />
                      <AiList
                        title="Recommended tests"
                        items={latestAiRun.output?.recommended_tests}
                      />
                      <AiList
                        title="Strengths"
                        items={latestAiRun.output?.strengths}
                      />
                    </div>

                    <div style={{ color: "#607089", marginTop: "14px" }}>
                      AI confidence: {latestAiRun.confidence ?? "—"}% · This is advisory analysis, not gate approval.
                    </div>

                    {latestAiRun.human_decision === "pending" && (
                      <form
                        action={reviewAiChallenge}
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "16px",
                        }}
                      >
                        <input type="hidden" name="case_id" value={id} />
                        <input type="hidden" name="run_id" value={latestAiRun.id} />
                        <input type="hidden" name="discipline" value={selected} />
                        <button name="decision" value="accepted" style={approveButton}>
                          Accept as Advisory Input
                        </button>
                        <button name="decision" value="rejected" style={rejectButton}>
                          Reject AI Analysis
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <form action={saveDiscipline}>
                  <input type="hidden" name="case_id" value={id} />
                  <input type="hidden" name="discipline" value={selected} />
                  <label
                    style={{
                      display: "block",
                      marginTop: "20px",
                      fontWeight: 800,
                    }}
                  >
                    Evidence, analysis and conclusion
                  </label>
                  <textarea
                    name="narrative"
                    rows={10}
                    required={!(selected === 3 && discipline.no_action_required)}
                    defaultValue={discipline.narrative ?? ""}
                    placeholder="Record verified facts, evidence reviewed, analysis performed, decisions made and unresolved uncertainty."
                    style={{
                      ...fieldStyle,
                      marginTop: "8px",
                      resize: "vertical",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "14px",
                    }}
                  >
                    <button name="intent" value="save" style={primaryButton}>
                      Save Progress
                    </button>
                    <button name="intent" value="review" style={secondaryButton}>
                      Ready for Review
                    </button>
                    {discipline.status !== "approved" && (
                      <button name="intent" value="approve" style={approveButton}>
                        Human Approve D{selected}
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            {selected >= 2 && (
              <section style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#155eef",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "13px",
                      }}
                    >
                      Objective evidence · D{selected}
                    </div>
                    <h2 style={{ margin: "6px 0" }}>Evidence repository</h2>
                    <p style={{ margin: 0, color: "#607089" }}>
                      Attach verified records supporting this discipline. Files are private and download links expire after one hour.
                    </p>
                  </div>
                  <span style={evidenceCountStyle}>
                    {selectedEvidence.length} file{selectedEvidence.length === 1 ? "" : "s"}
                  </span>
                </div>

                {selectedEvidence.length > 0 && (
                  <div style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
                    {selectedEvidence.map((record) => (
                      <div key={record.id} style={itemStyle}>
                        <div style={{ minWidth: 0 }}>
                          <strong>{record.reference || "Evidence file"}</strong>
                          <div style={{ marginTop: "5px", color: "#607089", lineHeight: 1.45 }}>
                            {record.description}
                          </div>
                          <div style={{ marginTop: "5px", color: "#607089", fontSize: "13px" }}>
                            Strength: {label(record.strength || "not rated")}
                            {record.evidence_date ? ` · Evidence date: ${record.evidence_date}` : ""}
                          </div>
                        </div>
                        {record.download_url && (
                          <a
                            href={record.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={downloadButton}
                          >
                            Open file
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form
                  action={addObjectiveEvidence}
                  encType="multipart/form-data"
                  style={{ marginTop: "18px" }}
                >
                  <input type="hidden" name="case_id" value={id} />
                  <input type="hidden" name="discipline" value={selected} />

                  <label style={dropZoneStyle}>
                    <strong>Drag files here or select files</strong>
                    <span style={{ color: "#607089", fontSize: "13px" }}>
                      PDF, Word, Excel, CSV, text or images · maximum 10 files · 10 MB each
                    </span>
                    <input
                      type="file"
                      name="evidence_files"
                      multiple
                      required
                      accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                      style={{ marginTop: "10px" }}
                    />
                  </label>

                  <div style={formGrid}>
                    <input name="reference" placeholder="Evidence reference (optional)" style={fieldStyle} />
                    <input type="date" name="evidence_date" style={fieldStyle} />
                    <select name="strength" defaultValue="medium" style={fieldStyle}>
                      <option value="low">Low evidence strength</option>
                      <option value="medium">Medium evidence strength</option>
                      <option value="high">High evidence strength</option>
                    </select>
                  </div>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="Describe what this evidence demonstrates and how it supports the D-stage conclusion."
                    style={{ ...fieldStyle, marginTop: "12px", resize: "vertical" }}
                  />
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Add Objective Evidence
                  </button>
                </form>
              </section>
            )}

            {selected === 0 && (
              <section style={cardStyle}>
                <h2>Case control</h2>
                <form action={saveCaseOverview}>
                  <input type="hidden" name="case_id" value={id} />
                  <input name="title" defaultValue={rcaCase.title} required style={fieldStyle} />
                  <textarea
                    name="problem_statement"
                    rows={5}
                    defaultValue={rcaCase.problem_statement ?? ""}
                    placeholder="Initial known facts"
                    style={{ ...fieldStyle, marginTop: "12px" }}
                  />
                  <div style={formGrid}>
                    <input name="sponsor_name" defaultValue={rcaCase.sponsor_name ?? ""} placeholder="Sponsor" style={fieldStyle} />
                    <input name="leader_name" defaultValue={rcaCase.leader_name ?? ""} placeholder="8D leader" style={fieldStyle} />
                    <input name="customer_or_stakeholder" defaultValue={rcaCase.customer_or_stakeholder ?? ""} placeholder="Customer / stakeholder" style={fieldStyle} />
                    <input name="product_service_process" defaultValue={rcaCase.product_service_process ?? ""} placeholder="Product / service / process" style={fieldStyle} />
                    <input name="location" defaultValue={rcaCase.location ?? ""} placeholder="Location" style={fieldStyle} />
                    <input type="date" name="target_close_date" defaultValue={rcaCase.target_close_date ?? ""} style={fieldStyle} />
                  </div>
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Save Case Control
                  </button>
                </form>
              </section>
            )}

            {selected === 1 && (
              <section style={cardStyle}>
                <h2>Cross-functional team</h2>
                <div style={{ display: "grid", gap: "10px" }}>
                  {team.map((member) => (
                    <div key={member.id} style={itemStyle}>
                      <strong>{member.member_name}</strong>
                      <span style={{ color: "#607089" }}>
                        {member.role_title || "Team member"}
                        {member.email ? ` · ${member.email}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
                <form action={addTeamMember} style={{ marginTop: "16px" }}>
                  <input type="hidden" name="case_id" value={id} />
                  <div style={formGrid}>
                    <input name="member_name" required placeholder="Member name" style={fieldStyle} />
                    <input name="role_title" placeholder="Role" style={fieldStyle} />
                    <input type="email" name="email" required placeholder="Email address" autoComplete="email" style={fieldStyle} />
                    <input name="responsibility" placeholder="8D responsibility" style={fieldStyle} />
                  </div>
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Add Team Member
                  </button>
                </form>
              </section>
            )}

            {selected === 4 && (
              <section style={cardStyle}>
                <h2>3 × 5 Whys Cause Architecture</h2>
                <p style={{ color: "#607089" }}>
                  Complete a separate five-Why chain for occurrence, escape and systemic causes. A plausible cause is not a validated cause.
                </p>
                <div style={{ display: "grid", gap: "14px", marginTop: "18px" }}>
                  {causes.map((cause) => (
                    <div key={cause.id} style={causeCardStyle}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>{label(cause.cause_type)} cause</strong>
                        <span style={causeStatusStyle(cause.status)}>
                          {label(cause.status)}
                        </span>
                      </div>
                      <div style={{ marginTop: "8px", fontWeight: 700 }}>
                        {cause.statement}
                      </div>

                      {Array.isArray(cause.why_chain) && cause.why_chain.length > 0 && (
                        <ol style={{ margin: "12px 0 0", paddingLeft: "24px", lineHeight: 1.55 }}>
                          {cause.why_chain.map((why, index) => (
                            <li key={`${cause.id}-why-${index}`} style={{ marginTop: "5px" }}>
                              <strong>Why {index + 1}:</strong> {why}
                            </li>
                          ))}
                        </ol>
                      )}

                      <div style={causeEvidenceGrid}>
                        <div><strong>Evidence supporting:</strong><br />{cause.evidence_for || "Not recorded"}</div>
                        <div><strong>Evidence against / missing:</strong><br />{cause.evidence_against || "Not recorded"}</div>
                      </div>

                      {["hypothesis", "under_test"].includes(cause.status) && (
                        <form action={reviewCauseHypothesis} style={{ marginTop: "14px" }}>
                          <input type="hidden" name="case_id" value={id} />
                          <input type="hidden" name="cause_id" value={cause.id} />
                          <div style={formGrid}>
                            <textarea name="validation_method" rows={3} placeholder="Validation method / test performed" style={fieldStyle} />
                            <textarea name="validation_result" rows={3} placeholder="Objective validation result" style={fieldStyle} />
                          </div>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                            <button name="decision" value="validate" style={approveButton}>
                              Human Validate Cause
                            </button>
                            <button name="decision" value="reject" style={rejectButton}>
                              Reject Hypothesis
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
                  <CauseStreamForm caseId={id} causeType="occurrence" title="Occurrence Cause — 5 Whys" />
                  <CauseStreamForm caseId={id} causeType="escape" title="Escape Cause — 5 Whys" />
                  <CauseStreamForm caseId={id} causeType="systemic" title="Systemic Cause — 5 Whys" />
                </div>
              </section>
            )}

            {[3, 5, 6, 7].includes(selected) && (
              <section style={cardStyle}>
                <h2>Containment and corrective actions</h2>
                {selected === 3 && discipline?.no_action_required && (
                  <div style={noActionDecisionStyle}>
                    <div>
                      <strong>No containment action required</strong>
                      <div style={{ marginTop: "6px", lineHeight: 1.5 }}>
                        {discipline.no_action_justification}
                      </div>
                    </div>
                    <form action={recordNoContainmentRequired}>
                      <input type="hidden" name="case_id" value={id} />
                      <button name="intent" value="clear" style={secondaryButton}>
                        Clear Decision
                      </button>
                    </form>
                  </div>
                )}
                <div style={{ display: "grid", gap: "10px" }}>
                  {actions.map((action) => (
                    <div key={action.id} style={itemStyle}>
                      <div>
                        <strong>{action.title}</strong>
                        <div style={{ color: "#607089", marginTop: "4px" }}>
                          {label(action.action_type)} · {action.action_owner || "Unassigned"}
                        </div>
                      </div>
                      <span>{label(action.status)}</span>
                    </div>
                  ))}
                </div>
                {selected === 3 && !discipline?.no_action_required && (
                  <form
                    action={recordNoContainmentRequired}
                    style={noActionFormStyle}
                  >
                    <input type="hidden" name="case_id" value={id} />
                    <strong>No containment action required?</strong>
                    <p style={{ margin: "6px 0 12px", color: "#607089" }}>
                      Use this only where the risk assessment demonstrates that interim containment would add no protection or is not applicable.
                    </p>
                    <textarea
                      name="justification"
                      required
                      rows={3}
                      placeholder="Document the evidence-based justification, current controls and why affected people, customers, compliance or operations do not require interim protection."
                      style={{ ...fieldStyle, resize: "vertical" }}
                    />
                    <button name="intent" value="record" style={{ ...secondaryButton, marginTop: "12px" }}>
                      Record No Containment Required
                    </button>
                  </form>
                )}

                {!discipline?.no_action_required && (
                <form action={addCorrectiveAction} style={{ marginTop: "16px" }}>
                  <input type="hidden" name="case_id" value={id} />
                  <div style={formGrid}>
                    <select name="action_type" defaultValue={selected === 3 ? "containment" : "corrective"} style={fieldStyle}>
                      <option value="containment">Containment</option>
                      <option value="correction">Correction</option>
                      <option value="corrective">Corrective action</option>
                      <option value="preventive">Preventive action</option>
                      <option value="systemic">Systemic action</option>
                    </select>
                    <select name="cause_id" defaultValue="" style={fieldStyle}>
                      <option value="">No linked cause yet</option>
                      {causes.map((cause) => (
                        <option value={cause.id} key={cause.id}>
                          {label(cause.cause_type)}: {cause.statement}
                        </option>
                      ))}
                    </select>
                    <input name="action_owner" placeholder="Action owner" style={fieldStyle} />
                    <input type="date" name="due_date" style={fieldStyle} />
                  </div>
                  <input name="action_title" required placeholder="Action title" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <textarea name="description" rows={3} placeholder="What will change?" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <textarea name="effectiveness_criteria" rows={3} placeholder="Define measurable effectiveness criteria before implementation" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Add Controlled Action
                  </button>
                </form>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function CauseStreamForm({ caseId, causeType, title }) {
  return (
    <details style={causeBuilderStyle}>
      <summary style={{ fontWeight: 800, cursor: "pointer", fontSize: "18px" }}>
        {title}
      </summary>
      <form action={addCauseHypothesis} style={{ marginTop: "16px" }}>
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="cause_type" value={causeType} />
        <div style={formGrid}>
          <select name="fishbone_category" defaultValue="process" style={fieldStyle}>
            <option value="people">People</option>
            <option value="process">Process</option>
            <option value="equipment">Equipment</option>
            <option value="material">Material</option>
            <option value="measurement">Measurement</option>
            <option value="environment">Environment</option>
            <option value="management">Management</option>
          </select>
          <input
            name="statement"
            required
            placeholder={`Testable ${causeType} cause hypothesis`}
            style={fieldStyle}
          />
        </div>
        <div style={{ display: "grid", gap: "9px", marginTop: "12px" }}>
          {[1, 2, 3, 4, 5].map((number) => (
            <input
              key={`${causeType}-why-${number}`}
              name={`why_${number}`}
              required
              placeholder={`Why ${number}?`}
              style={fieldStyle}
            />
          ))}
        </div>
        <div style={formGrid}>
          <textarea name="evidence_for" rows={3} placeholder="Objective evidence supporting the causal chain" style={fieldStyle} />
          <textarea name="evidence_against" rows={3} placeholder="Contradictory evidence, uncertainty or missing tests" style={fieldStyle} />
        </div>
        <button style={{ ...primaryButton, marginTop: "14px" }}>
          Add {label(causeType)} 5-Why Hypothesis
        </button>
      </form>
    </details>
  );
}

function AiList({ title, items }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #dce4ee",
        borderRadius: "12px",
        padding: "14px",
      }}
    >
      <strong>{title}</strong>
      {values.length > 0 ? (
        <ul style={{ margin: "10px 0 0", paddingLeft: "20px", lineHeight: 1.55 }}>
          {values.map((item, index) => (
            <li key={`${title}-${index}`} style={{ marginTop: "5px" }}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ marginTop: "8px", color: "#607089" }}>None recorded.</div>
      )}
    </div>
  );
}

function decisionBadge(decision) {
  const accepted = decision === "accepted";
  const rejected = decision === "rejected";
  return {
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
    background: accepted ? "#e8f8ef" : rejected ? "#fff0ee" : "#fff7e6",
    color: accepted ? "#067647" : rejected ? "#b42318" : "#92400e",
  };
}

const cardStyle = {
  background: "white",
  border: "1px solid #dce4ee",
  borderRadius: "18px",
  padding: "24px",
  marginBottom: "18px",
};

const itemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  padding: "14px",
  borderRadius: "12px",
  background: "#f6f8fb",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const primaryButton = {
  border: 0,
  borderRadius: "10px",
  background: "#155eef",
  color: "white",
  padding: "13px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "#e9eff8",
  color: "#173a68",
};

const approveButton = {
  ...primaryButton,
  background: "#067647",
};

const aiButton = {
  border: 0,
  borderRadius: "10px",
  background: "#061a35",
  color: "white",
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const rejectButton = {
  ...primaryButton,
  background: "#fff0ee",
  color: "#b42318",
  border: "1px solid #fda29b",
};

const aiResultStyle = {
  marginTop: "16px",
  border: "1px solid #b9d0ff",
  borderRadius: "14px",
  background: "#f7faff",
  padding: "18px",
};

const aiGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const dropZoneStyle = {
  display: "grid",
  gap: "6px",
  justifyItems: "center",
  textAlign: "center",
  border: "2px dashed #9bb7e8",
  borderRadius: "14px",
  background: "#f7faff",
  padding: "24px",
  cursor: "pointer",
};

const evidenceCountStyle = {
  padding: "7px 11px",
  borderRadius: "999px",
  background: "#eef4ff",
  color: "#175cd3",
  fontWeight: 800,
};

const downloadButton = {
  flexShrink: 0,
  padding: "10px 13px",
  borderRadius: "9px",
  background: "#061a35",
  color: "white",
  fontWeight: 800,
  textDecoration: "none",
};

const noActionDecisionStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  margin: "14px 0",
  padding: "16px",
  border: "1px solid #8fd4ae",
  borderRadius: "12px",
  background: "#ecfdf3",
  color: "#05603a",
};

const noActionFormStyle = {
  marginTop: "16px",
  padding: "16px",
  border: "1px solid #d7e0ec",
  borderRadius: "12px",
  background: "#f8fafc",
};

const causeBuilderStyle = {
  border: "1px solid #cfdbea",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "18px",
};

const causeCardStyle = {
  border: "1px solid #d7e0ec",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "18px",
};

const causeEvidenceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "10px",
  marginTop: "14px",
  color: "#607089",
  lineHeight: 1.5,
};

function causeStatusStyle(status) {
  const validated = status === "validated";
  const rejected = status === "rejected";
  return {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
    background: validated ? "#e8f8ef" : rejected ? "#fff0ee" : "#eef4ff",
    color: validated ? "#067647" : rejected ? "#b42318" : "#175cd3",
  };
}

const validationNoticeStyle = {
  marginBottom: "18px",
  padding: "14px 16px",
  border: "1px solid #f2c86b",
  borderRadius: "12px",
  background: "#fff8e7",
  color: "#7a4d00",
  fontWeight: 700,
  lineHeight: 1.5,
};

const linkButton = {
  padding: "13px 16px",
  border: "1px solid #d5deea",
  borderRadius: "10px",
  color: "#061a35",
  background: "white",
  fontWeight: 800,
  textDecoration: "none",
};
