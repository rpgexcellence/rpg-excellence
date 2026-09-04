import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import {
  addCauseHypothesis,
  addCorrectiveAction,
  addCostEntry,
  addAnalysisNode,
  addObjectiveEvidence,
  addTeamMember,
  createAnalysisModel,
  decideCorrectiveActionCandidate,
  deleteCostEntry,
  recordNoContainmentRequired,
  reviewAnalysisNode,
  reviewCauseHypothesis,
  saveCaseOverview,
  saveDiscipline,
  submitD6ActionForVerification,
} from "./actions";
const label = (value) =>
  String(value === "effective" ? "effective_verified" : value ?? "")
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
  const missingCauseTypes = String(query?.missing ?? "")
    .split(",")
    .filter(Boolean)
    .map(label);
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
    evidenceResult,
    analysisModelsResult,
    analysisNodesResult,
    costsResult,
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
      .from("rca_evidence")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("rca_analysis_models")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .eq("status", "active")
      .order("created_at"),
    supabase
      .from("rca_analysis_nodes")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at"),
    supabase
      .from("rca_cost_entries")
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
    evidenceResult,
    analysisModelsResult,
    analysisNodesResult,
    costsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const rcaCase = caseResult.data;
  const { data: linkedAuditAction, error: linkedAuditActionError } = await supabase
    .from("internal_audit_action_access").select("id, status, audit_id")
    .eq("rca_case_id", id).eq("owner_id", user.id).limit(1).maybeSingle();
  if (linkedAuditActionError) throw new Error(linkedAuditActionError.message);
  const finalOwnerResponseSubmitted = ["submitted", "accepted"].includes(linkedAuditAction?.status);
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
  const analysisModels = analysisModelsResult.data ?? [];
  const analysisNodes = analysisNodesResult.data ?? [];
  const costEntries = costsResult.data ?? [];
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
    (item) => Number(item.completion_score || 0) < 100
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
    (item) => Number(item.completion_score || 0) >= 100
  ).length;
  const openActions = actions.filter(
    (item) => !["verified", "cancelled"].includes(item.status)
  ).length;
  const selectedEvidence = evidenceRecords.filter(
    (record) => record.discipline === selected
  );
  const selectedCosts = costEntries.filter(
    (entry) => entry.discipline === selected
  );
  const selectedCostTotals = selectedCosts.reduce((totals, entry) => {
    const currency = entry.currency || "GBP";
    totals[currency] = (totals[currency] || 0) + Number(entry.amount || 0);
    return totals;
  }, {});
  const requestedModelId = String(query?.model ?? "");
  const activeAnalysisModel =
    analysisModels.find((model) => model.id === requestedModelId) ??
    analysisModels[0] ??
    null;
  const activeAnalysisNodes = activeAnalysisModel
    ? analysisNodes.filter((node) => node.model_id === activeAnalysisModel.id)
    : [];
  const evidenceChallenge = buildEvidenceChallenge({
    selected,
    discipline,
    team,
    causes,
    actions,
    selectedEvidence,
    rcaCase,
    analysisModels,
    analysisNodes,
  });

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
            <Link href={`/portal/rca/${id}/summary`} style={primaryLinkButton}>
              Executive Summary
            </Link>
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
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "22px",
            marginTop: "24px",
          }}
        >
          <nav
            aria-label="8D discipline status"
            style={disciplineStatusNavStyle}
          >
              {disciplines.map((item) => {
                const active = item.discipline === selected;
                const locked = item.discipline > highestUnlocked;
                const statusMark =
                  item.human_approved
                    ? "✓ Auditor approved"
                    : Number(item.completion_score || 0) >= 100
                      ? "✓ Owner completed"
                    : locked
                      ? "🔒 Locked"
                      : label(item.status);

                if (locked) {
                  return (
                    <div
                      key={item.id}
                      aria-disabled="true"
                      title={`Complete and approve D${item.discipline - 1} to unlock D${item.discipline}.`}
                      style={disciplineStatusItemStyle(active, true)}
                    >
                      <strong>D{item.discipline}</strong>
                      <span>{statusMark}</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={`/portal/rca/${id}?d=${item.discipline}`}
                    style={disciplineStatusItemStyle(active, false)}
                  >
                    <strong>D{item.discipline}</strong>
                    <span>{statusMark}</span>
                  </Link>
                );
              })}
          </nav>

          <div style={{ minWidth: 0 }}>
            {discipline && (
              <section style={cardStyle}>
                {pageError === "narrative_required" && (
                  <div style={validationNoticeStyle}>
                    Record the discipline evidence, analysis and conclusion before submitting it for review. For D3, you may instead record an evidence-based “No containment action required” decision.
                  </div>
                )}
                {pageError === "d3_containment_required" && (
                  <div style={validationNoticeStyle}>
                    <strong>D3 containment decision required.</strong>
                    <div style={{ marginTop: "6px" }}>
                      Add at least one interim containment action below, or select “No containment action required” and provide an evidence-based justification. D3 will remain open until one of these controls is recorded.
                    </div>
                  </div>
                )}
                {pageError === "missing_validated_causes" && (
                  <div style={validationNoticeStyle}>
                    <strong>D4 cannot be approved yet.</strong>
                    <div style={{ marginTop: "6px" }}>
                      Complete and human-validate the occurrence cause. Escape and systemic causes are added only where the evidence demonstrates that a separate causal stream exists.
                    </div>
                    <div style={{ marginTop: "6px" }}>
                      Saving a causal chain creates a hypothesis. Open each hypothesis and record its validation method and objective result before selecting Human Approve D4.
                    </div>
                  </div>
                )}
                {pageError === "cause_validation_required" && (
                  <div style={validationNoticeStyle}>
                    <strong>Cause validation is incomplete.</strong>
                    <div style={{ marginTop: "6px" }}>
                      Enter both the validation method or test performed and the objective validation result before selecting Human Validate Cause.
                    </div>
                  </div>
                )}
                {pageError === "node_validation_required" && (
                  <div style={validationNoticeStyle}>
                    <strong>Analysis element validation is incomplete.</strong>
                    <div style={{ marginTop: "6px" }}>
                      Enter both the validation method or test and its objective result before human validation.
                    </div>
                  </div>
                )}
                {pageError === "selection_rationale_required" && (
                  <div style={validationNoticeStyle}>
                    Record why the proposed action was selected before confirming the decision.
                  </div>
                )}
                {pageError === "candidate_fields_required" && (
                  <div style={validationNoticeStyle}>
                    A selected action requires a validated cause, accountable owner, due date and measurable effectiveness criteria.
                  </div>
                )}
                {pageError === "d5_selection_incomplete" && (
                  <div style={validationNoticeStyle}>
                    <strong>D5 cannot be approved yet.</strong>
                    <div style={{ marginTop: "6px" }}>
                      Select at least one complete permanent corrective action for every validated cause. Missing cause coverage: {missingCauseTypes.join(", ") || "review the selected actions below"}.
                    </div>
                  </div>
                )}
                {pageError === "d6_effectiveness_incomplete" && (
                  <div style={validationNoticeStyle}>
                    <strong>D6 cannot be completed yet.</strong>
                    <div style={{ marginTop: "6px" }}>Every selected permanent corrective action must be independently confirmed Effective—verified by the auditor. Other decisions remain open for further action or evidence.</div>
                  </div>
                )}
                {pageError === "d6_action_evidence_required" && (
                  <div style={errorNoticeStyle}><strong>Objective evidence required.</strong> Attach at least one file to the relevant corrective action before notifying the auditor.</div>
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
                        discipline.human_approved
                          ? "#e8f8ef"
                          : "#eef4ff",
                      color:
                        discipline.human_approved
                          ? "#067647"
                          : "#175cd3",
                      fontWeight: 800,
                    }}
                  >
                    {discipline.human_approved ? "Auditor Approved" : Number(discipline.completion_score || 0) >= 100 ? "Owner Completed" : label(discipline.status)}
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
                  <strong>Evidence Challenge</strong>
                  <div style={{ marginTop: "5px" }}>
                    These structured checks identify missing evidence,
                    unsupported assumptions and incomplete validation.
                    They run locally without an external analysis service and
                    cannot approve this gate or validate a cause.
                  </div>
                </div>

                <div style={reviewResultStyle}>
                  <div
                    style={{
                      color: "#155eef",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {evidenceChallenge.title}
                  </div>
                  <h3 style={{ margin: "6px 0" }}>
                    {evidenceChallenge.readiness}
                  </h3>
                  <p style={{ lineHeight: 1.6 }}>
                    {evidenceChallenge.assessment}
                  </p>
                  <div style={reviewGridStyle}>
                    <ReviewList title="Challenges" items={evidenceChallenge.challenges} />
                    <ReviewList title="Missing evidence" items={evidenceChallenge.missingEvidence} />
                    <ReviewList title="Required verification" items={evidenceChallenge.requiredVerification} />
                    <ReviewList title="Recorded strengths" items={evidenceChallenge.strengths} />
                  </div>
                  <div style={{ color: "#607089", marginTop: "14px" }}>
                    Rules-based advisory review only · Human approval remains mandatory.
                  </div>
                </div>

                <form action={saveDiscipline}>
                  <input type="hidden" name="case_id" value={id} />
                  <input type="hidden" name="discipline" value={selected} />
                  {selected === 4 && activeAnalysisModel && (
                    <input type="hidden" name="model_id" value={activeAnalysisModel.id} />
                  )}
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
                    <button name="intent" value="save" style={primaryButton} disabled={finalOwnerResponseSubmitted}>
                      Save Progress
                    </button>
                    {!finalOwnerResponseSubmitted && <button name="intent" value="review" style={secondaryButton}>
                      Ready for Review
                    </button>}
                    {!finalOwnerResponseSubmitted && discipline.status !== "approved" && (
                      <button name="intent" value="approve" style={approveButton}>
                        Human Approve D{selected}
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            <section id="copq" style={cardStyle}>
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
                  <div style={sectionKickerStyle}>Optional · D{selected}</div>
                  <h2 style={{ margin: "6px 0" }}>Cost of Poor Quality</h2>
                  <p style={{ margin: 0, color: "#607089", lineHeight: 1.55 }}>
                    Record direct or estimated costs attributable to this stage. These values inform the executive summary but do not control gate approval.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {Object.entries(selectedCostTotals).map(([currency, total]) => (
                    <span key={currency} style={evidenceCountStyle}>
                      {formatMoney(total, currency)}
                    </span>
                  ))}
                  {Object.keys(selectedCostTotals).length === 0 && (
                    <span style={evidenceCountStyle}>No cost recorded</span>
                  )}
                </div>
              </div>

              <div style={costGuidanceStyle}>
                <strong>What may be included?</strong>
                <div style={{ marginTop: "6px" }}>
                  Material and scrap · investigation and rework labour · downtime and lost capacity · administration · inspection and testing · containment and recovery · logistics · customer claims, returns or other external failure costs.
                </div>
              </div>

              {selectedCosts.length > 0 && (
                <div style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
                  {selectedCosts.map((entry) => (
                    <div key={entry.id} style={itemStyle}>
                      <div>
                        <strong>{label(entry.cost_category)} · {formatMoney(entry.amount, entry.currency)}</strong>
                        <div style={{ color: "#607089", marginTop: "4px" }}>
                          {entry.description} · {entry.quantity} × {formatMoney(entry.unit_cost, entry.currency)} · {label(entry.cost_status)}
                        </div>
                        {entry.source_reference && (
                          <div style={{ color: "#607089", marginTop: "4px" }}>Source: {entry.source_reference}</div>
                        )}
                      </div>
                      <form action={deleteCostEntry}>
                        <input type="hidden" name="case_id" value={id} />
                        <input type="hidden" name="cost_id" value={entry.id} />
                        <input type="hidden" name="discipline" value={selected} />
                        <button style={deleteButton}>Remove</button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              <form action={addCostEntry} style={{ marginTop: "18px" }}>
                <input type="hidden" name="case_id" value={id} />
                <input type="hidden" name="discipline" value={selected} />
                <div style={costFormGridStyle}>
                  <select name="cost_category" required defaultValue="" style={fieldStyle}>
                    <option value="" disabled>Cost category</option>
                    <option value="material">Material / scrap / rework</option>
                    <option value="labour">Investigation or rework labour</option>
                    <option value="downtime">Downtime / lost capacity</option>
                    <option value="administration">Administration</option>
                    <option value="external_failure">External failure / customer impact</option>
                    <option value="inspection_testing">Inspection / testing</option>
                    <option value="containment_recovery">Containment / recovery</option>
                    <option value="logistics">Logistics / expedited delivery</option>
                    <option value="other">Other</option>
                  </select>
                  <input name="description" required placeholder="Description and basis" style={fieldStyle} />
                  <input name="quantity" type="number" min="0.01" step="0.01" required defaultValue="1" placeholder="Quantity / hours" style={fieldStyle} />
                  <input name="unit_cost" type="number" min="0" step="0.01" required placeholder="Unit cost" style={fieldStyle} />
                  <select name="currency" defaultValue="GBP" style={fieldStyle}>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  <select name="cost_status" defaultValue="estimated" style={fieldStyle}>
                    <option value="estimated">Estimated</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                  <input name="source_reference" placeholder="Source / invoice / timesheet reference" style={fieldStyle} />
                  <input name="incurred_at" type="date" style={fieldStyle} />
                </div>
                <button style={{ ...primaryButton, marginTop: "12px" }}>Add Cost Entry</button>
              </form>
            </section>

            {selected >= 2 && selected !== 6 && (
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
              <AnalysisWorkbench
                caseId={id}
                problemStatement={rcaCase.problem_statement}
                models={analysisModels}
                activeModel={activeAnalysisModel}
                nodes={activeAnalysisNodes}
                causes={causes}
              />
            )}

            {selected === 5 && (
              <CorrectiveActionSelectionWorkbench
                caseId={id}
                causes={causes.filter((cause) => cause.status === "validated")}
                actions={actions.filter((action) => action.discipline === 5)}
              />
            )}

            {selected === 6 && (
              <D6EffectivenessWorkbench caseId={id} actions={actions.filter((action) => action.discipline === 5 && action.selection_status === "selected")} evidenceRecords={evidenceRecords.filter((record) => record.discipline === 6)} />
            )}

            {[3, 7].includes(selected) && (
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

                {selected === 3 && !discipline?.no_action_required && (
                <form action={addCorrectiveAction} style={{ marginTop: "16px" }}>
                  <input type="hidden" name="case_id" value={id} />
                  <input type="hidden" name="action_type" value="containment" />
                  <div style={formGrid}>
                    <div style={{ ...fieldStyle, background: "#f4f7fb" }}>
                      <strong>Interim containment action</strong>
                      <div style={{ marginTop: "5px", color: "#607089", fontSize: "13px" }}>
                        Permanent corrective actions are selected in D5 after root-cause validation.
                      </div>
                    </div>
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

function D6EffectivenessWorkbench({ caseId, actions, evidenceRecords }) {
  const effectiveCount = actions.filter((action) => ["effective", "effective_verified"].includes(action.effectiveness_result)).length;
  const submittedCount = actions.filter((action) => Boolean(action.d6_submitted_at)).length;
  const implementationPending = actions.filter((action) => !action.d6_submitted_at);
  const awaitingAssessment = actions.filter((action) => action.effectiveness_result === "awaiting_verification");
  const assessedActions = actions.filter((action) => ["effective_verified", "partially_effective", "not_effective", "unable_to_verify"].includes(action.effectiveness_result));
  const furtherAction = actions.filter((action) => ["partially_effective", "not_effective", "unable_to_verify"].includes(action.effectiveness_result));
  const completionPercentage = actions.length ? Math.round((effectiveCount / actions.length) * 100) : 0;
  const dashboardMetrics = [
    { label: "Total controlled actions", value: actions.length, detail: "D5 actions selected for implementation", items: actions, color: "#155eef", background: "#eef4ff" },
    { label: "Effectiveness pending", value: implementationPending.length, detail: "Implementation or evidence not submitted", items: implementationPending, color: "#b54708", background: "#fff7ed" },
    { label: "Submitted for review", value: submittedCount, detail: "Cumulative owner submissions", items: actions.filter((action) => action.d6_submitted_at), color: "#6941c6", background: "#f4f3ff" },
    { label: "Awaiting auditor assessment", value: awaitingAssessment.length, detail: "Notification issued; decision outstanding", items: awaitingAssessment, color: "#026aa2", background: "#f0f9ff" },
    { label: "Auditor assessed", value: assessedActions.length, detail: "Independent decision recorded", items: assessedActions, color: "#344054", background: "#f2f4f7" },
    { label: "Effective—verified", value: effectiveCount, detail: "Acceptance criteria achieved", items: actions.filter((action) => ["effective", "effective_verified"].includes(action.effectiveness_result)), color: "#067647", background: "#ecfdf3" },
    { label: "Further action required", value: furtherAction.length, detail: "Partial, ineffective or insufficient evidence", items: furtherAction, color: "#b42318", background: "#fff1f0" },
  ];
  return (
    <section style={cardStyle}>
      <div style={{ color: "#155eef", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>D6 Implementation and Effectiveness Verification</div>
      <h2 style={{ margin: "6px 0" }}>Verify each permanent corrective action</h2>
      <p style={{ color: "#607089", lineHeight: 1.6 }}>The action owner records implementation and objective evidence here. The auditor is then notified and makes the independent effectiveness decision. D7 remains locked until every selected action is confirmed Effective—verified.</p>
      <div style={d6DashboardShellStyle}>
        <div style={d6DashboardHeaderStyle}><div><div style={d6DashboardKickerStyle}>LIVE D6 CONTROL DASHBOARD</div><h3 style={{ margin: "5px 0 6px", fontSize: "24px" }}>Action effectiveness status</h3><div style={{ color: "#b9c9df" }}>Select any block to jump directly to the relevant corrective action.</div></div><div style={{ ...d6ProgressRingStyle, background: `conic-gradient(#32d583 ${completionPercentage * 3.6}deg, #28486f 0deg)` }}><div style={d6ProgressRingInnerStyle}><strong>{completionPercentage}%</strong><span>verified</span></div></div></div>
        <div style={d6DashboardGridStyle}>{dashboardMetrics.map((metric) => <a key={metric.label} href={metric.items.length ? `#d6-action-${metric.items[0].id}` : "#d6-actions"} style={{ ...d6MetricCardStyle, background: metric.background, borderColor: `${metric.color}55` }}><div style={{ ...d6MetricIconStyle, background: metric.color }} aria-hidden="true" /><div><div style={{ color: metric.color, fontSize: "30px", fontWeight: 900, lineHeight: 1 }}>{metric.value}</div><strong style={{ display: "block", color: "#102f50", marginTop: "8px" }}>{metric.label}</strong><span style={{ display: "block", color: "#607089", fontSize: "12px", lineHeight: 1.4, marginTop: "4px" }}>{metric.detail}</span></div><span style={{ color: metric.color, fontWeight: 900, marginLeft: "auto" }}>→</span></a>)}</div>
      </div>
      <div id="d6-actions" style={{ display: "grid", gap: "16px", marginTop: "20px", scrollMarginTop: "24px" }}>
        {actions.map((action) => {
          const actionEvidence = evidenceRecords.filter((record) => record.action_id === action.id);
          return (
          <article id={`d6-action-${action.id}`} key={action.id} style={{ ...candidateCardStyle(["effective", "effective_verified"].includes(action.effectiveness_result) ? "selected" : "candidate"), scrollMarginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
              <div><strong style={{ fontSize: "18px" }}>{action.title}</strong><div style={{ marginTop: "5px", color: "#607089" }}>Owner: {action.action_owner || "Unassigned"} · Due: {action.due_date || "Not set"}</div></div>
              <span style={selectionBadgeStyle(["effective", "effective_verified"].includes(action.effectiveness_result) ? "selected" : "candidate")}>{label(action.effectiveness_result || (action.d6_submitted_at ? "awaiting auditor verification" : "implementation open"))}</span>
            </div>
            <div style={{ marginTop: "12px", padding: "12px", borderRadius: "10px", background: "#f4f7fb" }}><strong>D5 effectiveness criteria:</strong><div style={{ marginTop: "5px" }}>{action.effectiveness_criteria || "Not defined"}</div></div>
            <div style={{ marginTop: "14px", padding: "14px", border: "1px solid #cbd8ea", borderRadius: "12px", background: "#f8fbff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}><div><strong>Objective evidence for this action</strong><div style={{ color: "#607089", fontSize: "13px", marginTop: "4px" }}>Only evidence attached here will be released to the auditor for this action-level decision.</div></div><span style={evidenceCountStyle}>{actionEvidence.length} file{actionEvidence.length === 1 ? "" : "s"}</span></div>
              {actionEvidence.length > 0 && <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>{actionEvidence.map((record) => <div key={record.id} style={itemStyle}><div><strong>{record.reference || "Evidence file"}</strong><div style={{ color: "#607089", marginTop: "4px" }}>{record.description}</div><div style={{ color: "#607089", fontSize: "13px", marginTop: "4px" }}>Strength: {label(record.strength || "not rated")}{record.evidence_date ? ` · Evidence date: ${record.evidence_date}` : ""}</div></div>{record.download_url ? <a href={record.download_url} target="_blank" rel="noopener noreferrer" style={downloadButton}>Open file</a> : null}</div>)}</div>}
              <form action={addObjectiveEvidence} encType="multipart/form-data" style={{ marginTop: "14px" }}><input type="hidden" name="case_id" value={caseId} /><input type="hidden" name="discipline" value="6" /><input type="hidden" name="action_id" value={action.id} /><label style={dropZoneStyle}><strong>Attach evidence to this action</strong><span style={{ color: "#607089", fontSize: "13px" }}>PDF, Word, Excel, CSV, text or images · maximum 10 files · 10 MB each</span><input type="file" name="evidence_files" multiple required accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp" style={{ marginTop: "10px" }} /></label><div style={formGrid}><input name="reference" placeholder="Evidence reference (optional)" style={fieldStyle} /><input type="date" name="evidence_date" style={fieldStyle} /><select name="strength" defaultValue="medium" style={fieldStyle}><option value="low">Low evidence strength</option><option value="medium">Medium evidence strength</option><option value="high">High evidence strength</option></select></div><textarea name="description" required rows={3} placeholder="Describe what this evidence demonstrates for this corrective action and its effectiveness criteria." style={{ ...fieldStyle, marginTop: "12px", resize: "vertical" }} /><button type="submit" style={{ ...primaryButton, marginTop: "12px" }}>Add Evidence to This Action</button></form>
            </div>
            <form action={submitD6ActionForVerification} style={{ marginTop: "14px" }}>
              <input type="hidden" name="case_id" value={caseId} /><input type="hidden" name="action_id" value={action.id} />
              <textarea name="implementation_result" required rows={3} defaultValue={action.implementation_result || ""} placeholder="What was implemented, when, and any deviation from the approved D5 plan" style={{ ...fieldStyle, marginTop: "12px" }} />
              <textarea name="implementation_evidence_reference" required rows={2} defaultValue={action.implementation_evidence_reference || ""} placeholder="Summarise how the evidence attached to this action demonstrates implementation and the expected result" style={{ ...fieldStyle, marginTop: "12px" }} />
              <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "12px", lineHeight: 1.45 }}><input type="checkbox" name="implementation_confirmation" required /><span>I confirm this action has been implemented and the referenced evidence is ready for independent auditor verification.</span></label>
              {actionEvidence.length === 0 && <div style={{ ...errorNoticeStyle, marginTop: "12px" }}><strong>Submission blocked:</strong> attach objective evidence to this action first.</div>}
              <button type="submit" disabled={actionEvidence.length === 0} style={{ ...primaryButton, marginTop: "12px", opacity: actionEvidence.length === 0 ? 0.55 : 1, cursor: actionEvidence.length === 0 ? "not-allowed" : "pointer" }}>{action.d6_submitted_at ? "Resubmit and Notify Auditor" : "Submit Action and Notify Auditor"}</button>
            </form>
          </article>
          );
        })}
        {actions.length === 0 && <div style={emptyWorkbenchStyle}>No selected D5 corrective actions are available for D6 verification.</div>}
      </div>
    </section>
  );
}

function CorrectiveActionSelectionWorkbench({ caseId, causes, actions }) {
  const causeById = new Map(causes.map((cause) => [cause.id, cause]));
  const selectedActions = actions.filter((action) => action.selection_status === "selected");
  const candidates = actions.filter((action) => action.selection_status === "candidate");
  const rejected = actions.filter((action) => action.selection_status === "rejected");

  return (
    <section style={cardStyle}>
      <div style={{ color: "#155eef", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
        D5 Permanent Corrective Action Selection
      </div>
      <h2 style={{ margin: "6px 0" }}>Compare, select and control permanent corrective actions</h2>
      <p style={{ color: "#607089", lineHeight: 1.6 }}>
        Each selected action must address a validated cause, have an accountable owner and due date, and define measurable effectiveness criteria before implementation.
      </p>

      <div style={d5SummaryGridStyle}>
        {[
          ["Validated causes", causes.length],
          ["Candidates", candidates.length],
          ["Selected", selectedActions.length],
          ["Rejected", rejected.length],
        ].map(([title, value]) => (
          <div key={title} style={d5SummaryCardStyle}>
            <span>{title}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: "24px" }}>Validated cause coverage</h3>
      <div style={coverageGridStyle}>
        {causes.map((cause) => {
          const linkedSelected = selectedActions.filter((action) => action.cause_id === cause.id);
          return (
            <div key={cause.id} style={coverageCardStyle(linkedSelected.length > 0)}>
              <strong>{label(cause.cause_type)}</strong>
              <span style={{ lineHeight: 1.45 }}>{cause.statement}</span>
              <span style={{ fontWeight: 800 }}>
                {linkedSelected.length > 0 ? `${linkedSelected.length} selected action(s)` : "Action not yet selected"}
              </span>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: "24px" }}>Action candidates</h3>
      <div style={{ display: "grid", gap: "12px" }}>
        {actions.map((action) => {
          const cause = causeById.get(action.cause_id);
          const decisionScore =
            Number(action.effectiveness_score || 0) +
            Number(action.feasibility_score || 0) +
            (6 - Number(action.implementation_risk_score || 5));
          return (
            <div key={action.id} style={candidateCardStyle(action.selection_status)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                <div>
                  <strong style={{ fontSize: "18px" }}>{action.title}</strong>
                  <div style={{ marginTop: "5px", color: "#607089" }}>
                    {cause ? `${label(cause.cause_type)}: ${cause.statement}` : "Cause link unavailable"}
                  </div>
                </div>
                <span style={selectionBadgeStyle(action.selection_status)}>{label(action.selection_status)}</span>
              </div>
              <p style={{ lineHeight: 1.55 }}>{action.description || "No action description recorded."}</p>
              <div style={candidateMetricsStyle}>
                <span><strong>Effectiveness:</strong> {action.effectiveness_score ?? "—"}/5</span>
                <span><strong>Feasibility:</strong> {action.feasibility_score ?? "—"}/5</span>
                <span><strong>Implementation risk:</strong> {action.implementation_risk_score ?? "—"}/5</span>
                <span><strong>Decision score:</strong> {decisionScore}/15</span>
                <span><strong>Owner:</strong> {action.action_owner || "Unassigned"}</span>
                <span><strong>Due:</strong> {action.due_date || "Not set"}</span>
              </div>
              <div style={{ marginTop: "12px" }}>
                <strong>Effectiveness criteria:</strong>{" "}
                {action.effectiveness_criteria || "Not defined"}
              </div>
              {action.selection_rationale && (
                <div style={{ marginTop: "10px" }}><strong>Decision rationale:</strong> {action.selection_rationale}</div>
              )}
              {action.selection_status === "candidate" && (
                <form action={decideCorrectiveActionCandidate} style={{ marginTop: "14px" }}>
                  <input type="hidden" name="case_id" value={caseId} />
                  <input type="hidden" name="action_id" value={action.id} />
                  <textarea name="selection_rationale" rows={2} placeholder="Required when selecting: explain why this action is suitable, proportionate and preferable to alternatives" style={fieldStyle} />
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                    <button name="decision" value="select" style={approveButton}>Select Permanent Action</button>
                    <button name="decision" value="reject" style={rejectButton}>Reject Candidate</button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
        {actions.length === 0 && <div style={emptyWorkbenchStyle}>No corrective-action candidates recorded.</div>}
      </div>

      <details style={{ ...causeBuilderStyle, marginTop: "20px" }} open={actions.length === 0}>
        <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "18px" }}>Add permanent corrective-action candidate</summary>
        <form action={addCorrectiveAction} style={{ marginTop: "16px" }}>
          <input type="hidden" name="case_id" value={caseId} />
          <div style={formGrid}>
            <select name="action_type" required defaultValue="corrective" style={fieldStyle}>
              <option value="corrective">Corrective action</option>
              <option value="preventive">Preventive action</option>
              <option value="systemic">Systemic action</option>
              <option value="correction">Permanent correction</option>
            </select>
            <select name="cause_id" required defaultValue="" style={fieldStyle}>
              <option value="" disabled>Select validated cause</option>
              {causes.map((cause) => (
                <option value={cause.id} key={cause.id}>{label(cause.cause_type)}: {cause.statement}</option>
              ))}
            </select>
            <input name="action_owner" required placeholder="Accountable action owner" style={fieldStyle} />
            <input type="date" name="due_date" required style={fieldStyle} />
          </div>
          <input name="action_title" required placeholder="Candidate action title" style={{ ...fieldStyle, marginTop: "12px" }} />
          <textarea name="description" required rows={3} placeholder="Describe exactly what will change" style={{ ...fieldStyle, marginTop: "12px" }} />
          <textarea name="effectiveness_criteria" required rows={3} placeholder="Define measurable effectiveness criteria and acceptance threshold" style={{ ...fieldStyle, marginTop: "12px" }} />
          <div style={formGrid}>
            <ScoreSelect name="effectiveness_score" title="Expected effectiveness" />
            <ScoreSelect name="feasibility_score" title="Feasibility" />
            <ScoreSelect name="implementation_risk_score" title="Implementation risk" />
          </div>
          <button type="submit" style={{ ...primaryButton, marginTop: "14px" }}>Add Candidate</button>
        </form>
      </details>
    </section>
  );
}

function ScoreSelect({ name, title }) {
  return (
    <select name={name} required defaultValue="" style={fieldStyle}>
      <option value="" disabled>{title}: select 1–5</option>
      {[1, 2, 3, 4, 5].map((score) => <option value={score} key={score}>{title}: {score}/5</option>)}
    </select>
  );
}

function AnalysisWorkbench({ caseId, problemStatement, models, activeModel, nodes, causes }) {
  const methods = [
    {
      key: "3x5_whys",
      title: "3 × 5 Whys",
      description: "Trace occurrence, escape and systemic causal chains through five evidence-tested questions.",
    },
    {
      key: "ishikawa",
      title: "Ishikawa / Fishbone",
      description: "Explore interacting causes across People, Process, Equipment, Material, Measurement, Environment and Management.",
    },
    {
      key: "bow_tie",
      title: "HSE Bow Tie",
      description: "Map hazard, top event, threats, preventive barriers, consequences and recovery barriers.",
    },
  ];

  return (
    <section style={cardStyle}>
      <div style={{ color: "#155eef", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
        D4 Root Cause Analysis Workbench
      </div>
      <h2 style={{ margin: "6px 0" }}>Choose and combine investigation tools</h2>
      <p style={{ color: "#607089", lineHeight: 1.6 }}>
        Start one or more analysis models. Every proposed cause remains a hypothesis until a competent person validates it against objective evidence.
      </p>

      <div style={methodGridStyle}>
        {methods.map((method) => {
          const existing = models.find((model) => model.method === method.key);
          const selected = activeModel?.method === method.key;
          return existing ? (
            <Link
              key={method.key}
              href={`/portal/rca/${caseId}?d=4&model=${existing.id}`}
              style={methodCardStyle(selected)}
            >
              <strong style={{ fontSize: "18px" }}>{method.title}</strong>
              <span style={{ color: selected ? "#dbe8ff" : "#607089", lineHeight: 1.45 }}>
                {method.description}
              </span>
              <span style={{ fontWeight: 800 }}>{selected ? "Open workspace" : "Continue analysis →"}</span>
            </Link>
          ) : (
            <form action={createAnalysisModel} key={method.key} style={methodCardStyle(false)}>
              <input type="hidden" name="case_id" value={caseId} />
              <input type="hidden" name="method" value={method.key} />
              <strong style={{ fontSize: "18px" }}>{method.title}</strong>
              <span style={{ color: "#607089", lineHeight: 1.45 }}>{method.description}</span>
              <button type="submit" style={methodStartButton}>Start this method</button>
            </form>
          );
        })}
      </div>

      {!activeModel && (
        <div style={emptyWorkbenchStyle}>
          Select a method above to open its interactive investigation workspace.
        </div>
      )}

      {activeModel?.method === "3x5_whys" && (
        <div style={workbenchStyle}>
          <h3>3 × 5 Whys Cause Architecture</h3>
          <p style={{ color: "#607089" }}>
            Start with the occurrence cause. Add escape or systemic chains only where a separate control or management-system failure exists. Stop at the causal depth supported by evidence; five questions are guidance, not a mandatory quota.
          </p>
          <CauseCards caseId={caseId} modelId={activeModel.id} causes={causes} />
          <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
            <CauseStreamForm caseId={caseId} causeType="occurrence" title="Occurrence Cause — 5 Whys" />
            <CauseStreamForm caseId={caseId} causeType="escape" title="Escape Cause — 5 Whys" />
            <CauseStreamForm caseId={caseId} causeType="systemic" title="Systemic Cause — 5 Whys" />
          </div>
        </div>
      )}

      {activeModel?.method === "ishikawa" && (
        <div style={workbenchStyle}>
          <h3>Ishikawa / Fishbone Analysis</h3>
          <p style={{ color: "#607089" }}>
            Add evidence-based hypotheses to the relevant branch. Classify validated nodes as occurrence, escape or systemic so they transfer into D5.
          </p>
          <FishboneWorkspace caseId={caseId} problemStatement={problemStatement} model={activeModel} nodes={nodes} />
        </div>
      )}

      {activeModel?.method === "bow_tie" && (
        <div style={workbenchStyle}>
          <h3>HSE Bow Tie Analysis</h3>
          <p style={{ color: "#607089" }}>
            Build the pathway from hazard to top event, then examine threats, preventive barriers, consequences and recovery barriers.
          </p>
          <BowTieWorkspace caseId={caseId} model={activeModel} nodes={nodes} />
        </div>
      )}
    </section>
  );
}

function CauseCards({ caseId, modelId, causes }) {
  return (
    <div style={{ display: "grid", gap: "14px", marginTop: "18px" }}>
      {causes.map((cause) => (
        <div key={cause.id} style={causeCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <strong>{label(cause.cause_type)} cause</strong>
            <span style={causeStatusStyle(cause.status)}>{label(cause.status)}</span>
          </div>
          <div style={{ marginTop: "8px", fontWeight: 700 }}>{cause.statement}</div>
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
              <input type="hidden" name="case_id" value={caseId} />
              <input type="hidden" name="cause_id" value={cause.id} />
              <input type="hidden" name="model_id" value={modelId} />
              <div style={formGrid}>
                <textarea name="validation_method" required rows={3} placeholder="Required: validation method / test performed" style={fieldStyle} />
                <textarea name="validation_result" required rows={3} placeholder="Required: objective validation result" style={fieldStyle} />
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                <button name="decision" value="validate" style={approveButton}>Human Validate Cause</button>
                <button name="decision" value="reject" style={rejectButton}>Reject Hypothesis</button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

function FishboneWorkspace({ caseId, problemStatement, model, nodes }) {
  const categories = [
    { key: "people", title: "People", color: "#8b5cf6", side: "top" },
    { key: "process", title: "Process", color: "#2563eb", side: "top" },
    { key: "equipment", title: "Equipment", color: "#10b981", side: "top" },
    { key: "material", title: "Material", color: "#eab308", side: "top" },
    { key: "measurement", title: "Measurement", color: "#ec4899", side: "bottom" },
    { key: "environment", title: "Environment", color: "#f97316", side: "bottom" },
    { key: "management", title: "Management", color: "#0f766e", side: "bottom" },
  ];
  const branch = (category) => {
    const branchNodes = nodes.filter((node) => node.category === category.key);
    return (
      <section key={category.key} style={fishboneCauseBranchStyle(category.side, category.color)}>
        <div style={{ ...fishboneCategoryStyle, background: category.color }}>{category.title}</div>
        <div style={fishboneBranchLineStyle(category.side, category.color)} aria-hidden="true" />
        <div style={fishboneCauseListStyle}>
          {branchNodes.map((node) => (
            <AnalysisNodeCard key={node.id} caseId={caseId} modelId={model.id} node={node} />
          ))}
          {branchNodes.length === 0 && <div style={fishboneEmptyStyle}>Add a testable cause</div>}
        </div>
      </section>
    );
  };
  return (
    <>
      <div style={fishboneViewportStyle}>
        <div style={fishboneDiagramStyle}>
          <div style={fishboneTopRowStyle}>{categories.filter((item) => item.side === "top").map(branch)}</div>
          <div style={fishboneSpineRowStyle}>
            <div style={fishboneTailStyle} aria-hidden="true">CAUSES</div>
            <div style={fishboneSpineStyle} aria-hidden="true" />
            <div style={fishboneHeadStyle}>
              <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".06em" }}>PROBLEM / EFFECT</div>
              <div style={{ marginTop: "7px", fontWeight: 800, lineHeight: 1.35 }}>
                {problemStatement || "Define the controlled problem statement in D2"}
              </div>
            </div>
          </div>
          <div style={fishboneBottomRowStyle}>{categories.filter((item) => item.side === "bottom").map(branch)}</div>
        </div>
        <div style={fishboneLegendStyle}>Select any cause card to inspect evidence, validation status and the human review decision.</div>
      </div>
      <AnalysisNodeForm caseId={caseId} model={model} nodes={nodes} mode="ishikawa" />
    </>
  );
}

function BowTieWorkspace({ caseId, model, nodes }) {
  const hazards = nodes.filter((node) => node.node_type === "hazard");
  const threats = nodes.filter((node) => node.node_type === "threat");
  const topEvents = nodes.filter((node) => node.node_type === "top_event");
  const consequences = nodes.filter((node) => node.node_type === "consequence");
  const preventiveBarriers = nodes.filter((node) => node.node_type === "preventive_barrier");
  const recoveryBarriers = nodes.filter((node) => node.node_type === "recovery_barrier");
  const escalationFactors = nodes.filter((node) => node.node_type === "barrier_failure");
  const cards = (items) => items.length ? items.map((node) => (
    <AnalysisNodeCard key={node.id} caseId={caseId} modelId={model.id} node={node} />
  )) : <div style={bowTieEmptyStyle}>None linked</div>;
  const leftPaths = threats.length ? threats : [{ id: "empty-threat", title: "Add a threat", status: "not_recorded" }];
  const rightPaths = consequences.length ? consequences : [{ id: "empty-consequence", title: "Add a consequence", status: "not_recorded" }];
  return (
    <>
      <div style={bowTieViewportStyle}>
        <div style={bowTieDiagramStyle}>
          <section style={bowTieHazardStyle}>
            <div style={bowTieEyebrowStyle}>HAZARD</div>
            <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
              {hazards.length ? cards(hazards) : <div style={bowTieEmptyStyle}>Define the hazard or source of potential harm</div>}
            </div>
          </section>
          <div style={bowTiePhaseLabelsStyle}>
            <span>BEFORE THE TOP EVENT · PREVENTION</span><span aria-hidden="true" /><span>AFTER THE TOP EVENT · RECOVERY</span>
          </div>
          <div style={bowTieCoreGridStyle}>
            <div style={bowTiePathsStyle}>
              {leftPaths.map((threat) => {
                const linked = preventiveBarriers.filter((barrier) => barrier.parent_node_id === threat.id);
                return <div key={threat.id} style={bowTieLeftPathStyle}>
                  <div style={bowTieThreatBoxStyle}>{threat.id.startsWith("empty-") ? threat.title : cards([threat])}</div>
                  <div style={bowTieBarrierTrackStyle}>
                    <div style={bowTieConnectorStyle} aria-hidden="true" />
                    <div style={bowTieBarrierRackStyle}>{cards(linked)}</div>
                    <div style={bowTieArrowHeadStyle} aria-hidden="true">▶</div>
                  </div>
                </div>;
              })}
            </div>
            <section style={bowTieTopEventStyle}>
              <div style={bowTieTopEventLabelStyle}>TOP EVENT</div>
              <div style={{ display: "grid", gap: "8px", marginTop: "10px", width: "100%" }}>
                {topEvents.length ? cards(topEvents) : <div style={bowTieEmptyStyle}>Define the loss-of-control event</div>}
              </div>
            </section>
            <div style={bowTiePathsStyle}>
              {rightPaths.map((consequence) => {
                const linked = recoveryBarriers.filter((barrier) => barrier.parent_node_id === consequence.id);
                return <div key={consequence.id} style={bowTieRightPathStyle}>
                  <div style={bowTieBarrierTrackStyle}>
                    <div style={bowTieConnectorStyle} aria-hidden="true" />
                    <div style={bowTieBarrierRackStyle}>{cards(linked)}</div>
                    <div style={bowTieArrowHeadStyle} aria-hidden="true">▶</div>
                  </div>
                  <div style={bowTieConsequenceBoxStyle}>{consequence.id.startsWith("empty-") ? consequence.title : cards([consequence])}</div>
                </div>;
              })}
            </div>
          </div>
          <div style={bowTieBarrierLabelsStyle}><span>Preventive barriers</span><span aria-hidden="true" /><span>Recovery barriers</span></div>
          <section style={bowTieEscalationStyle}>
            <div><div style={bowTieEyebrowStyle}>ESCALATION FACTORS & CONTROLS</div><p style={{ margin: "5px 0 0", color: "#607089", fontSize: "12px" }}>Conditions that could defeat a barrier and the controls protecting barrier performance.</p></div>
            <div style={bowTieEscalationGridStyle}>
              {escalationFactors.length ? escalationFactors.map((factor) => {
                const controls = [...preventiveBarriers, ...recoveryBarriers].filter((barrier) => barrier.parent_node_id === factor.id);
                return <div key={factor.id} style={bowTieEscalationCardStyle}>
                  {cards([factor])}
                  <div style={{ marginTop: "8px" }}><strong style={{ fontSize: "12px" }}>Escalation-factor barriers</strong><div style={{ display: "grid", gap: "6px", marginTop: "6px" }}>{cards(controls)}</div></div>
                </div>;
              }) : <div style={bowTieEmptyStyle}>No escalation factors recorded</div>}
            </div>
          </section>
          <div style={bowTieUnlinkedStyle}>
            <strong>Unlinked barriers requiring pathway assignment:</strong>{" "}
            {[...preventiveBarriers, ...recoveryBarriers].filter((barrier) => !barrier.parent_node_id).length}
          </div>
        </div>
        <div style={bowTieLegendStyle}>Open any element to inspect evidence and complete human validation. Link barriers to a threat, consequence or escalation factor using the parent-element field.</div>
      </div>
      <AnalysisNodeForm caseId={caseId} model={model} nodes={nodes} mode="bow_tie" />
    </>
  );
}

function AnalysisNodeCard({ caseId, modelId, node }) {
  return (
    <details style={analysisNodeStyle(node.status)}>
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>
        {node.title} · {label(node.status)}
      </summary>
      <div style={{ marginTop: "10px", color: "#607089", lineHeight: 1.5 }}>
        {node.description || "No supporting description recorded."}
      </div>
      {node.cause_type && <div style={{ marginTop: "8px" }}><strong>Cause classification:</strong> {label(node.cause_type)}</div>}
      <div style={causeEvidenceGrid}>
        <div><strong>Evidence supporting:</strong><br />{node.evidence_for || "Not recorded"}</div>
        <div><strong>Evidence against:</strong><br />{node.evidence_against || "Not recorded"}</div>
      </div>
      {["hypothesis", "under_test"].includes(node.status) && (
        <form action={reviewAnalysisNode} style={{ marginTop: "12px" }}>
          <input type="hidden" name="case_id" value={caseId} />
          <input type="hidden" name="model_id" value={modelId} />
          <input type="hidden" name="node_id" value={node.id} />
          <textarea name="validation_method" required rows={2} placeholder="Required: validation method / test" style={fieldStyle} />
          <textarea name="validation_result" required rows={2} placeholder="Required: objective validation result" style={{ ...fieldStyle, marginTop: "8px" }} />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            <button name="decision" value="validate" style={approveButton}>Human Validate</button>
            <button name="decision" value="reject" style={rejectButton}>Reject</button>
          </div>
        </form>
      )}
    </details>
  );
}

function AnalysisNodeForm({ caseId, model, nodes, mode }) {
  const bowTieTypes = ["hazard", "threat", "preventive_barrier", "top_event", "consequence", "recovery_barrier", "barrier_failure"];
  return (
    <details style={{ ...causeBuilderStyle, marginTop: "18px" }} open={nodes.length === 0}>
      <summary style={{ fontWeight: 800, cursor: "pointer", fontSize: "18px" }}>Add analysis element</summary>
      <form action={addAnalysisNode} style={{ marginTop: "16px" }}>
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="model_id" value={model.id} />
        <div style={formGrid}>
          {mode === "ishikawa" ? (
            <>
              <input type="hidden" name="node_type" value="cause" />
              <select name="category" required defaultValue="process" style={fieldStyle}>
                {["people", "process", "equipment", "material", "measurement", "environment", "management"].map((category) => (
                  <option key={category} value={category}>{label(category)}</option>
                ))}
              </select>
            </>
          ) : (
            <select name="node_type" required defaultValue="threat" style={fieldStyle}>
              {bowTieTypes.map((type) => <option value={type} key={type}>{label(type)}</option>)}
            </select>
          )}
          <select name="cause_type" defaultValue="" style={fieldStyle}>
            <option value="">Not a cause / not yet classified</option>
            <option value="occurrence">Occurrence cause</option>
            <option value="escape">Escape cause</option>
            <option value="systemic">Systemic cause</option>
            <option value="contributing">Contributing cause</option>
          </select>
          <select name="parent_node_id" defaultValue="" style={fieldStyle}>
            <option value="">No parent element</option>
            {nodes.map((node) => <option value={node.id} key={node.id}>{label(node.node_type)}: {node.title}</option>)}
          </select>
          <input name="title" required placeholder="Element or testable hypothesis" style={fieldStyle} />
        </div>
        <textarea name="description" rows={3} placeholder="Describe the causal logic, control purpose or failure mechanism" style={{ ...fieldStyle, marginTop: "12px" }} />
        <div style={formGrid}>
          <textarea name="evidence_for" rows={3} placeholder="Evidence supporting" style={fieldStyle} />
          <textarea name="evidence_against" rows={3} placeholder="Evidence against / missing" style={fieldStyle} />
        </div>
        <button type="submit" style={{ ...primaryButton, marginTop: "12px" }}>Add to model</button>
      </form>
    </details>
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
              required={number === 1}
              placeholder={`Why ${number}?${number === 1 ? " (required)" : " (optional if root cause already reached)"}`}
              style={fieldStyle}
            />
          ))}
        </div>
        <p style={{ color: "#607089", margin: "10px 0 0", fontSize: "14px" }}>
          Stop when the evidence-supported root cause is reached. Do not invent additional Why levels merely to reach five.
        </p>
        <div style={formGrid}>
          <textarea name="evidence_for" rows={3} placeholder="Objective evidence supporting the causal chain" style={fieldStyle} />
          <textarea name="evidence_against" rows={3} placeholder="Contradictory evidence, uncertainty or missing tests" style={fieldStyle} />
        </div>
        <button style={{ ...primaryButton, marginTop: "14px" }}>
          Add {label(causeType)} Causal Hypothesis
        </button>
      </form>
    </details>
  );
}

function buildEvidenceChallenge({
  selected,
  discipline,
  team,
  causes,
  actions,
  selectedEvidence,
  rcaCase,
  analysisModels,
  analysisNodes,
}) {
  const challenges = [];
  const missingEvidence = [];
  const requiredVerification = [];
  const strengths = [];
  const narrative = String(discipline?.narrative ?? "").trim();
  const stageActions = actions.filter(
    (action) => action.discipline === selected
  );

  const titles = [
    "D0 INITIAL RESPONSE AND PROTECTION REVIEW",
    "D1 TEAM CAPABILITY REVIEW",
    "D2 PROBLEM DEFINITION REVIEW",
    "D3 CONTAINMENT EFFECTIVENESS REVIEW",
    "D4 ROOT CAUSE VALIDATION REVIEW",
    "D5 CORRECTIVE ACTION SELECTION REVIEW",
    "D6 IMPLEMENTATION AND EFFECTIVENESS REVIEW",
    "D7 RECURRENCE PREVENTION REVIEW",
    "D8 CLOSURE AND LEARNING REVIEW",
  ];

  const recordNarrative = (minimum, message) => {
    if (narrative.length < minimum) challenges.push(message);
    else strengths.push("The discipline conclusion records substantive analysis and decisions.");
  };

  const requireEvidence = (message) => {
    if (selectedEvidence.length === 0) missingEvidence.push(message);
    else strengths.push(
      `${selectedEvidence.length} objective evidence file${selectedEvidence.length === 1 ? " is" : "s are"} attached to this gate.`
    );
  };

  if (selected === 0) {
    recordNarrative(
      60,
      "Record the urgency decision, immediate protection applied and any unresolved exposure."
    );
    if (!rcaCase.problem_statement) {
      missingEvidence.push("The initial problem or risk requiring 8D is not defined.");
    }
    if (!rcaCase.sponsor_name || !rcaCase.leader_name) {
      challenges.push("Name both the accountable sponsor and the investigation leader.");
    } else {
      strengths.push("An accountable sponsor and investigation leader are assigned.");
    }
    requiredVerification.push(
      "Verify the scale of exposure, affected people or customers, regulatory implications and immediate protective controls."
    );
    requiredVerification.push("Confirm that 8D is proportionate to the problem and that escalation criteria were applied.");
  }

  if (selected === 1) {
    recordNarrative(
      50,
      "Explain why the selected team has the authority, independence and combined competence needed for this investigation."
    );
    if (team.length === 0) {
      missingEvidence.push("No cross-functional team members are recorded.");
    } else {
      strengths.push(`${team.length} active team member${team.length === 1 ? " is" : "s are"} recorded.`);
    }
    if (team.some((member) => !member.email || !member.responsibility)) {
      challenges.push(
        "One or more team members lack an email address or defined 8D responsibility."
      );
    }
    requiredVerification.push(
      "Verify coverage of process knowledge, technical expertise, customer or user impact and decision-making authority."
    );
    requiredVerification.push("Confirm every member understands their named 8D responsibility and route for escalation.");
  }

  if (selected === 2) {
    recordNarrative(
      100,
      "Define the problem with measurable facts, scope, impact and boundaries; avoid a short or solution-led statement."
    );
    requireEvidence("Attach source evidence supporting the problem definition, extent and baseline.");
    requiredVerification.push(
      "Test the definition using what, where, when, who, extent and impact, including IS/IS NOT boundaries."
    );
    challenges.push(
      "Separate observed facts from suspected causes; causes must not be embedded in the problem statement."
    );
  }

  if (selected === 3) {
    recordNarrative(
      80,
      "Record the containment decision, coverage, verification result, residual risk and exit criteria."
    );
    const containmentActions = actions.filter(
      (action) => action.action_type === "containment"
    );
    if (containmentActions.length === 0 && !discipline?.no_action_required) {
      missingEvidence.push(
        "No containment action or approved no-containment justification is recorded."
      );
    }
    requiredVerification.push(
      "Test whether containment reached every affected unit, customer, location and time period without creating unacceptable new risk."
    );
    if (containmentActions.length > 0) {
      requireEvidence("Attach evidence that containment was implemented and is effective, not merely planned.");
      if (containmentActions.some((action) => !action.action_owner || !action.due_date)) {
        challenges.push("Every containment action needs an accountable owner and controlled completion date.");
      }
    } else if (discipline?.no_action_required) {
      strengths.push("A no-containment decision has been explicitly recorded for human review.");
      requiredVerification.push("Confirm the no-containment justification is risk-based and authorised.");
    }
  }

  if (selected === 4) {
    recordNarrative(
      120,
      "Summarise the causal logic, competing hypotheses, contradictory evidence and the basis for the validated conclusions."
    );
    requireEvidence("Attach objective evidence used to test and validate the causal conclusions.");
    const assessedTypes = ["occurrence", "escape", "systemic"];
    for (const type of assessedTypes) {
      const typeCauses = causes.filter((cause) => cause.cause_type === type);
      const completeChain = typeCauses.some(
        (cause) => Array.isArray(cause.why_chain) && cause.why_chain.length >= 1
      );
      const validated = typeCauses.some((cause) => cause.status === "validated");
      const modelCoverage = (analysisNodes ?? []).some(
        (node) => node.cause_type === type || node.branch_key === type
      );
      if (type === "occurrence" && !completeChain && !modelCoverage) {
        missingEvidence.push(
          "Analyse the occurrence cause to the evidence-supported causal depth using sequential Whys or another documented workbench method."
        );
      }
      if (type === "occurrence" && !validated) {
        challenges.push(
          "The occurrence cause has not been validated against objective evidence."
        );
      } else if (type !== "occurrence" && typeCauses.length > 0 && !validated) {
        challenges.push(`The recorded ${type} hypothesis must be validated or rejected before D4 approval.`);
      }
    }
    requiredVerification.push(
      "Attempt to disprove each causal chain and record the validation method, result and contradictory evidence."
    );
    if ((analysisModels ?? []).length > 0) {
      strengths.push(`${analysisModels.length} structured root-cause analysis model${analysisModels.length === 1 ? " is" : "s are"} recorded.`);
    } else {
      missingEvidence.push("No 3×5 Whys, Ishikawa/Fishbone or HSE Bow Tie model is recorded.");
    }
  }

  if (selected === 5) {
    recordNarrative(
      100,
      "Explain the option comparison, selection rationale, expected risk reduction and any residual implementation risk."
    );
    const reviewedActions = stageActions;
    if (reviewedActions.length === 0) {
      missingEvidence.push("No permanent corrective-action candidate is recorded.");
    }
    const selectedActions = reviewedActions.filter(
      (action) => action.selection_status === "selected"
    );
    if (selectedActions.length === 0) {
      missingEvidence.push("No corrective-action candidate has been selected.");
    } else {
      strengths.push(`${selectedActions.length} corrective action${selectedActions.length === 1 ? " is" : "s are"} selected for implementation.`);
    }
    if (reviewedActions.some((action) => !action.action_owner || !action.due_date)) {
      challenges.push("One or more actions lack an owner or due date.");
    }
    if (reviewedActions.some((action) => !action.effectiveness_criteria)) {
      missingEvidence.push(
        "Measurable effectiveness criteria are missing from one or more actions."
      );
    }
    if (selectedActions.some((action) => !action.selection_rationale)) {
      challenges.push("Record why each selected action is preferred over the alternatives.");
    }
    requiredVerification.push("Trace every selected action to a validated cause and confirm that no validated cause is left untreated.");
    requiredVerification.push("Review feasibility, implementation risk, unintended consequences and measurable effectiveness criteria before approval.");
  }

  if (selected === 6) {
    recordNarrative(
      120,
      "Record what was implemented, deviations from the approved plan, measured results, residual risk and the effectiveness conclusion."
    );
    requireEvidence("Attach implementation records and objective before/after results for the permanent corrective actions.");
    const implementationActions = actions.filter(
      (action) => action.action_type !== "containment" && action.selection_status !== "rejected"
    );
    if (implementationActions.length === 0) {
      missingEvidence.push("No selected permanent corrective action is available for implementation review.");
    }
    if (implementationActions.some((action) => !action.action_owner || !action.due_date)) {
      challenges.push("Every implemented action must retain an accountable owner and controlled completion date.");
    }
    if (implementationActions.some((action) => !action.effectiveness_criteria)) {
      missingEvidence.push("Measurable effectiveness criteria are missing from one or more implemented actions.");
    }
    requiredVerification.push("Compare implementation against the approved change and investigate every deviation.");
    requiredVerification.push("Demonstrate effectiveness using the predefined measure and an adequate monitoring period before removing containment.");
  }

  if (selected === 7) {
    recordNarrative(
      110,
      "Record how learning was applied across equivalent processes, products, locations and management-system controls."
    );
    requireEvidence("Attach updated procedures, risk controls, training, audit checks or other systemic-change records.");
    const preventiveActions = actions.filter(
      (action) => ["preventive", "systemic"].includes(action.action_type)
    );
    if (preventiveActions.length === 0) {
      missingEvidence.push("No preventive or systemic action is recorded for recurrence prevention.");
    }
    if (preventiveActions.some((action) => !action.effectiveness_criteria)) {
      challenges.push("Define how each systemic change will be monitored for recurrence.");
    }
    requiredVerification.push("Confirm equivalent processes, products, sites and suppliers were screened for the same causal conditions.");
    requiredVerification.push("Verify that relevant standards, risk assessments, training, audit criteria and change controls were updated.");
  }

  if (selected === 8) {
    recordNarrative(
      120,
      "Record the sustained-effectiveness decision, lessons learned, residual risks, recognition and formal closure authority."
    );
    requireEvidence("Attach the final effectiveness record and evidence supporting authorised closure.");
    const unverified = actions.filter(
      (action) => !["verified", "cancelled"].includes(action.status)
    );
    if (unverified.length > 0) {
      missingEvidence.push(
        `${unverified.length} action${unverified.length === 1 ? " remains" : "s remain"} unverified.`
      );
    }
    requiredVerification.push(
      "Confirm effectiveness was sustained for a justified period and that recurrence indicators remain acceptable."
    );
    requiredVerification.push("Verify lessons learned, record completion, team recognition and sponsor or authorised-person closure.");
  }

  const issueCount = challenges.length + missingEvidence.length;
  return {
    title: titles[selected] ?? `D${selected} DISCIPLINE REVIEW`,
    readiness: issueCount === 0 ? "No structural gaps detected" : `${issueCount} review point${issueCount === 1 ? "" : "s"} identified`,
    assessment:
      issueCount === 0
        ? "The recorded structure meets the configured checks. Review content quality and objective evidence before human approval."
        : "Resolve or consciously address the points below before submitting this discipline for human approval.",
    challenges,
    missingEvidence,
    requiredVerification,
    strengths,
  };
}

function ReviewList({ title, items }) {
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

function formatMoney(value, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const sectionKickerStyle = {
  color: "#155eef",
  fontWeight: 800,
  textTransform: "uppercase",
  fontSize: "13px",
};

const costGuidanceStyle = {
  marginTop: "16px",
  padding: "15px",
  borderRadius: "12px",
  background: "#eef4ff",
  color: "#274c7a",
  lineHeight: 1.55,
};

const costFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "10px",
};

const deleteButton = {
  border: "1px solid #fda29b",
  borderRadius: "9px",
  background: "#fff0ee",
  color: "#b42318",
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const cardStyle = {
  background: "white",
  border: "1px solid #dce4ee",
  borderRadius: "18px",
  padding: "24px",
  marginBottom: "18px",
};

const methodGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const d5SummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "10px",
  marginTop: "18px",
};

const d5SummaryCardStyle = {
  display: "grid",
  gap: "7px",
  padding: "15px",
  border: "1px solid #dce4ee",
  borderRadius: "12px",
  background: "#f8faff",
};

const coverageGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "10px",
};

const coverageCardStyle = (covered) => ({
  display: "grid",
  gap: "8px",
  padding: "14px",
  borderRadius: "12px",
  border: covered ? "1px solid #75c69a" : "1px solid #f2b8b5",
  background: covered ? "#e8f8ef" : "#fff5f4",
  color: covered ? "#065f46" : "#9b1c1c",
});

const candidateCardStyle = (status) => ({
  padding: "18px",
  borderRadius: "14px",
  border:
    status === "selected"
      ? "2px solid #36a269"
      : status === "rejected"
        ? "1px solid #f2b8b5"
        : "1px solid #cbd7e6",
  background:
    status === "selected"
      ? "#f0fbf5"
      : status === "rejected"
        ? "#fff7f6"
        : "#f8faff",
});

const selectionBadgeStyle = (status) => ({
  alignSelf: "flex-start",
  padding: "7px 11px",
  borderRadius: "999px",
  background:
    status === "selected"
      ? "#d8f3e4"
      : status === "rejected"
        ? "#ffe2df"
        : "#e9eff8",
  color:
    status === "selected"
      ? "#067647"
      : status === "rejected"
        ? "#b42318"
        : "#173a68",
  fontWeight: 800,
  fontSize: "12px",
});

const candidateMetricsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "8px",
  marginTop: "12px",
  padding: "12px",
  borderRadius: "10px",
  background: "white",
};

const disciplineStatusNavStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(9, minmax(105px, 1fr))",
  gap: "8px",
  overflowX: "auto",
  padding: "12px",
  border: "1px solid #dce4ee",
  borderRadius: "16px",
  background: "white",
};

const disciplineStatusItemStyle = (active, locked) => ({
  display: "grid",
  gap: "5px",
  minWidth: "105px",
  padding: "11px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  background: active ? "#155eef" : locked ? "#eef1f5" : "#f6f8fb",
  color: active ? "white" : locked ? "#8190a5" : "#061a35",
  opacity: locked ? 0.78 : 1,
  cursor: locked ? "not-allowed" : "pointer",
  fontSize: "12px",
});

const methodCardStyle = (selected) => ({
  display: "grid",
  gap: "10px",
  alignContent: "start",
  minHeight: "170px",
  boxSizing: "border-box",
  padding: "18px",
  border: selected ? "2px solid #155eef" : "1px solid #cfdae8",
  borderRadius: "14px",
  background: selected ? "#155eef" : "#f8faff",
  color: selected ? "white" : "#061a35",
  textDecoration: "none",
});

const methodStartButton = {
  justifySelf: "start",
  border: 0,
  borderRadius: "9px",
  background: "#061a35",
  color: "white",
  padding: "10px 13px",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyWorkbenchStyle = {
  marginTop: "18px",
  padding: "28px",
  border: "2px dashed #b9c8da",
  borderRadius: "14px",
  color: "#607089",
  textAlign: "center",
};

const workbenchStyle = {
  marginTop: "22px",
  paddingTop: "20px",
  borderTop: "1px solid #dce4ee",
};

const fishboneViewportStyle = { overflowX: "auto", marginTop: "18px", paddingBottom: "5px" };
const fishboneDiagramStyle = { minWidth: "1180px", padding: "22px", border: "1px solid #cdd9e8", borderRadius: "18px", background: "linear-gradient(180deg,#ffffff 0%,#f7faff 100%)" };
const fishboneTopRowStyle = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", padding: "0 180px 0 100px", alignItems: "end" };
const fishboneBottomRowStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px", padding: "0 240px 0 170px", alignItems: "start" };
const fishboneSpineRowStyle = { height: "92px", display: "grid", gridTemplateColumns: "110px 1fr 250px", alignItems: "center", margin: "-2px 0" };
const fishboneTailStyle = { display: "grid", placeItems: "center", width: "88px", height: "70px", color: "white", background: "#12335c", fontWeight: 900, fontSize: "12px", letterSpacing: ".06em", clipPath: "polygon(0 50%, 34% 0, 100% 0, 100% 100%, 34% 100%)" };
const fishboneSpineStyle = { height: "5px", background: "#12335c", boxShadow: "0 2px 0 rgba(18,51,92,.1)" };
const fishboneHeadStyle = { minHeight: "92px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "17px 28px 17px 38px", color: "white", background: "linear-gradient(135deg,#12335c,#155eef)", clipPath: "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%, 13% 50%)", textAlign: "center" };
const fishboneCauseBranchStyle = (side, color) => ({ position: "relative", minHeight: "190px", display: "flex", flexDirection: side === "top" ? "column" : "column-reverse", justifyContent: "flex-end", padding: side === "top" ? "0 10px 34px" : "34px 10px 0", borderRadius: "14px", background: "rgba(247,250,255,.72)", border: `1px solid ${color}33` });
const fishboneCategoryStyle = { position: "relative", zIndex: 2, alignSelf: "center", minWidth: "130px", maxWidth: "210px", padding: "9px 12px", borderRadius: "9px", color: "white", fontWeight: 900, textAlign: "center", boxShadow: "0 5px 12px rgba(18,51,92,.14)" };
const fishboneBranchLineStyle = (side, color) => ({ position: "absolute", zIndex: 0, left: "50%", width: "4px", height: "92px", background: color, transformOrigin: side === "top" ? "bottom" : "top", transform: side === "top" ? "rotate(38deg)" : "rotate(-38deg)", bottom: side === "top" ? "-3px" : "auto", top: side === "bottom" ? "-3px" : "auto", opacity: .9 });
const fishboneCauseListStyle = { position: "relative", zIndex: 2, display: "grid", gap: "8px", margin: "10px 0", maxHeight: "290px", overflowY: "auto" };
const fishboneEmptyStyle = { padding: "10px", border: "1px dashed #9eb0c6", borderRadius: "9px", background: "rgba(255,255,255,.9)", color: "#607089", fontSize: "12px", textAlign: "center" };
const fishboneLegendStyle = { marginTop: "8px", color: "#607089", fontSize: "12px", textAlign: "center" };

const hazardBannerStyle = {
  marginTop: "16px",
  padding: "14px 16px",
  borderRadius: "12px",
  background: "#fff4e5",
  color: "#8a3f00",
};

const bowTieViewportStyle = { overflowX: "auto", marginTop: "16px", paddingBottom: "5px" };
const bowTieDiagramStyle = { width: "100%", minWidth: "1240px", boxSizing: "border-box", padding: "26px", border: "1px solid #cbd8e8", borderRadius: "20px", background: "linear-gradient(180deg,#f9fbfe 0%,#eef4fa 100%)", boxShadow: "inset 0 1px 0 white" };
const bowTieHazardStyle = { width: "420px", margin: "0 auto 14px", padding: "14px", border: "2px solid #d97706", borderRadius: "14px", background: "#fff7e8", textAlign: "center" };
const bowTieEyebrowStyle = { color: "#155eef", fontSize: "11px", fontWeight: 900, letterSpacing: ".08em" };
const bowTiePhaseLabelsStyle = { display: "grid", gridTemplateColumns: "1fr 250px 1fr", gap: "18px", marginBottom: "10px", color: "#52677f", fontSize: "11px", fontWeight: 900, letterSpacing: ".04em", textAlign: "center" };
const bowTieCoreGridStyle = { display: "grid", gridTemplateColumns: "minmax(430px,1fr) 250px minmax(430px,1fr)", gap: "18px", alignItems: "center" };
const bowTiePathsStyle = { display: "grid", gap: "24px", alignContent: "center", minWidth: 0 };
const bowTieLeftPathStyle = { display: "grid", gridTemplateColumns: "240px minmax(190px,1fr)", gap: "14px", alignItems: "center", minWidth: 0 };
const bowTieRightPathStyle = { display: "grid", gridTemplateColumns: "minmax(190px,1fr) 240px", gap: "14px", alignItems: "center", minWidth: 0 };
const bowTieThreatBoxStyle = { minWidth: 0, padding: "14px", border: "2px solid #d97706", borderRadius: "12px", background: "#fff7e8", fontWeight: 800, textAlign: "left" };
const bowTieConsequenceBoxStyle = { minWidth: 0, padding: "14px", border: "2px solid #dc4b3e", borderRadius: "12px", background: "#fff1f0", fontWeight: 800, textAlign: "left" };
const bowTieBarrierTrackStyle = { position: "relative", minHeight: "76px", display: "grid", placeItems: "center", padding: "5px 20px" };
const bowTieConnectorStyle = { position: "absolute", left: 0, right: 0, top: "50%", height: "3px", background: "#294765" };
const bowTieBarrierRackStyle = { position: "relative", zIndex: 2, width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", alignItems: "center", textAlign: "left" };
const bowTieArrowHeadStyle = { position: "absolute", zIndex: 3, right: 0, top: "calc(50% - 10px)", color: "#294765", fontSize: "17px" };
const bowTieTopEventStyle = { minHeight: "250px", width: "250px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "26px", border: "5px solid #102f50", borderRadius: "50%", background: "linear-gradient(145deg,#ffffff,#e8f0f8)", boxShadow: "0 14px 30px rgba(16,47,80,.2)", textAlign: "left" };
const bowTieTopEventLabelStyle = { fontSize: "20px", fontWeight: 900, letterSpacing: ".05em", color: "#102f50" };
const bowTieBarrierLabelsStyle = { display: "grid", gridTemplateColumns: "1fr 250px 1fr", gap: "18px", padding: "8px 0 0", color: "#067647", fontSize: "12px", fontWeight: 900, textAlign: "center" };
const bowTieEscalationStyle = { marginTop: "24px", padding: "16px", border: "1px solid #f2b45f", borderRadius: "14px", background: "#fffaf2" };
const bowTieEscalationGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "10px", marginTop: "12px" };
const bowTieEscalationCardStyle = { padding: "10px", border: "1px solid #e4b56f", borderRadius: "12px", background: "white" };
const bowTieUnlinkedStyle = { marginTop: "12px", padding: "10px 13px", borderRadius: "10px", background: "#eef3f9", color: "#40566f", fontSize: "12px" };
const bowTieEmptyStyle = { padding: "10px", border: "1px dashed #ba8952", borderRadius: "9px", background: "rgba(255,255,255,.55)", color: "#765b3e", fontSize: "12px", textAlign: "center" };
const bowTieLegendStyle = { marginTop: "8px", color: "#607089", fontSize: "12px", textAlign: "center" };

const analysisNodeStyle = (status) => ({
  width: "100%",
  minWidth: 0,
  padding: "11px",
  borderRadius: "10px",
  border:
    status === "validated"
      ? "1px solid #75c69a"
      : status === "rejected"
        ? "1px solid #fda29b"
        : "1px solid #cbd7e6",
  background:
    status === "validated"
      ? "#e8f8ef"
      : status === "rejected"
        ? "#fff0ee"
        : "white",
  textAlign: "left",
  overflowWrap: "break-word",
});

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

const errorNoticeStyle = {
  padding: "12px 14px",
  border: "1px solid #fda29b",
  borderRadius: "10px",
  background: "#fff1f0",
  color: "#b42318",
  lineHeight: 1.5,
};

const d6DashboardShellStyle = { marginTop: "22px", padding: "22px", borderRadius: "20px", background: "linear-gradient(135deg, #071d3a 0%, #123b69 100%)", boxShadow: "0 18px 45px rgba(16, 47, 80, 0.22)" };
const d6DashboardHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap", color: "white", marginBottom: "18px" };
const d6DashboardKickerStyle = { color: "#5eead4", fontSize: "11px", fontWeight: 900, letterSpacing: ".1em" };
const d6DashboardGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" };
const d6MetricCardStyle = { minHeight: "122px", display: "flex", alignItems: "flex-start", gap: "12px", padding: "17px", border: "1px solid", borderRadius: "15px", textDecoration: "none", boxShadow: "0 8px 22px rgba(5, 25, 50, 0.12)" };
const d6MetricIconStyle = { width: "7px", minHeight: "88px", flexShrink: 0, borderRadius: "999px" };
const d6ProgressRingStyle = { width: "112px", height: "112px", display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "50%" };
const d6ProgressRingInnerStyle = { width: "82px", height: "82px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#0b284d", color: "white" };

const secondaryButton = {
  ...primaryButton,
  background: "#e9eff8",
  color: "#173a68",
};

const approveButton = {
  ...primaryButton,
  background: "#067647",
};

const rejectButton = {
  ...primaryButton,
  background: "#fff0ee",
  color: "#b42318",
  border: "1px solid #fda29b",
};

const reviewResultStyle = {
  marginTop: "16px",
  border: "1px solid #b9d0ff",
  borderRadius: "14px",
  background: "#f7faff",
  padding: "18px",
};

const reviewGridStyle = {
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

const primaryLinkButton = {
  ...linkButton,
  background: "#155eef",
  borderColor: "#155eef",
  color: "white",
};
