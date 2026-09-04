"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const EVIDENCE_BUCKET = "rca-evidence";
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeFileName(name) {
  return String(name || "evidence")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "evidence";
}

async function getOwnedCase(supabase, userId, caseId) {
  const { data, error } = await supabase
    .from("rca_cases")
    .select("id, current_discipline, status")
    .eq("id", caseId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("8D case not found.");
  }

  return data;
}

async function assertDisciplineUnlocked(
  supabase,
  userId,
  caseId,
  discipline
) {
  if (discipline === 0) return;

  const { count, error } = await supabase
    .from("rca_8d_disciplines")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("owner_id", userId)
    .lt("discipline", discipline)
    .neq("status", "approved");

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      `D${discipline} is locked. Complete and approve every preceding discipline first.`
    );
  }
}

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");
  return { supabase, user };
}

export async function saveCaseOverview(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  if (!caseId) throw new Error("Missing 8D case ID.");
  await getOwnedCase(supabase, user.id, caseId);

  const title = clean(formData.get("title"));
  if (!title) throw new Error("Case title is required.");

  const { error } = await supabase
    .from("rca_cases")
    .update({
      title,
      problem_statement: clean(
        formData.get("problem_statement")
      ),
      sponsor_name: clean(formData.get("sponsor_name")),
      leader_name: clean(formData.get("leader_name")),
      customer_or_stakeholder: clean(
        formData.get("customer_or_stakeholder")
      ),
      product_service_process: clean(
        formData.get("product_service_process")
      ),
      location: clean(formData.get("location")),
      target_close_date: clean(
        formData.get("target_close_date")
      ),
      status: "active",
    })
    .eq("id", caseId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/portal/rca/${caseId}`);
  revalidatePath("/portal/rca");
  redirect(`/portal/rca/${caseId}`);
}

export async function saveDiscipline(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const discipline = Number(formData.get("discipline"));
  const modelId = clean(formData.get("model_id"));
  let narrative = clean(formData.get("narrative"));
  const intent = clean(formData.get("intent")) ?? "save";

  if (!caseId || !Number.isInteger(discipline) || discipline < 0 || discipline > 8) {
    throw new Error("Invalid 8D discipline.");
  }

  const rcaCase = await getOwnedCase(
    supabase,
    user.id,
    caseId
  );

  await assertDisciplineUnlocked(
    supabase,
    user.id,
    caseId,
    discipline
  );

  if (!narrative && discipline === 3) {
    const { data: d3Decision, error: d3DecisionError } = await supabase
      .from("rca_8d_disciplines")
      .select("no_action_required, no_action_justification")
      .eq("case_id", caseId)
      .eq("owner_id", user.id)
      .eq("discipline", 3)
      .single();

    if (d3DecisionError) throw new Error(d3DecisionError.message);
    if (
      d3Decision?.no_action_required &&
      d3Decision.no_action_justification?.trim()
    ) {
      narrative = [
        "Containment decision: No containment action required.",
        "Evidence-based justification:",
        d3Decision.no_action_justification.trim(),
      ].join("\n\n");
    }
  }

  if (!narrative) {
    redirect(
      `/portal/rca/${caseId}?d=${discipline}&error=narrative_required`
    );
  }

  if (intent === "approve" && discipline > 0) {
    const { count, error: priorError } = await supabase
      .from("rca_8d_disciplines")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .lt("discipline", discipline)
      .neq("status", "approved");

    if (priorError) throw new Error(priorError.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Approve the preceding disciplines before approving this gate."
      );
    }
  }

  if (intent === "approve" && discipline === 3) {
    const [decisionResult, containmentResult] = await Promise.all([
      supabase
        .from("rca_8d_disciplines")
        .select("no_action_required, no_action_justification")
        .eq("case_id", caseId)
        .eq("owner_id", user.id)
        .eq("discipline", 3)
        .single(),
      supabase
        .from("rca_actions")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId)
        .eq("owner_id", user.id)
        .eq("action_type", "containment"),
    ]);

    if (decisionResult.error) throw new Error(decisionResult.error.message);
    if (containmentResult.error) throw new Error(containmentResult.error.message);

    const noContainmentDocumented =
      decisionResult.data?.no_action_required === true &&
      Boolean(decisionResult.data?.no_action_justification?.trim());

    if ((containmentResult.count ?? 0) === 0 && !noContainmentDocumented) {
      redirect(`/portal/rca/${caseId}?d=3&error=d3_containment_required`);
    }
  }

  if (intent === "approve" && discipline === 4) {
    const { data: validatedCauses, error: causesError } = await supabase
      .from("rca_causes")
      .select("cause_type")
      .eq("case_id", caseId)
      .eq("owner_id", user.id)
      .eq("status", "validated")
      .in("cause_type", ["occurrence", "escape", "systemic"]);

    if (causesError) throw new Error(causesError.message);
    const validatedTypes = new Set(
      (validatedCauses ?? []).map((cause) => cause.cause_type)
    );
    // A separate escape or systemic cause does not exist in every event.
    // Require the occurrence cause; additional causal streams are optional.
    const missingTypes = validatedTypes.has("occurrence") ? [] : ["occurrence"];

    if (missingTypes.length > 0) {
      const modelQuery = modelId ? `&model=${encodeURIComponent(modelId)}` : "";
      redirect(
        `/portal/rca/${caseId}?d=4${modelQuery}&error=missing_validated_causes&missing=${encodeURIComponent(missingTypes.join(","))}`
      );
    }
  }

  if (intent === "approve" && discipline === 5) {
    const [causesResult, selectedActionsResult] = await Promise.all([
      supabase
        .from("rca_causes")
        .select("id, cause_type")
        .eq("case_id", caseId)
        .eq("owner_id", user.id)
        .eq("status", "validated")
        .in("cause_type", ["occurrence", "escape", "systemic"]),
      supabase
        .from("rca_actions")
        .select("cause_id, action_owner, due_date, effectiveness_criteria, selection_rationale")
        .eq("case_id", caseId)
        .eq("owner_id", user.id)
        .eq("discipline", 5)
        .eq("selection_status", "selected"),
    ]);

    if (causesResult.error) throw new Error(causesResult.error.message);
    if (selectedActionsResult.error) throw new Error(selectedActionsResult.error.message);

    const selectedActions = selectedActionsResult.data ?? [];
    const coveredCauseIds = new Set(
      selectedActions.map((action) => action.cause_id).filter(Boolean)
    );
    const uncoveredTypes = (causesResult.data ?? [])
      .filter((cause) => !coveredCauseIds.has(cause.id))
      .map((cause) => cause.cause_type);
    const incompleteSelectedAction = selectedActions.some(
      (action) =>
        !action.action_owner ||
        !action.due_date ||
        !action.effectiveness_criteria ||
        !action.selection_rationale
    );

    if (selectedActions.length === 0 || uncoveredTypes.length > 0 || incompleteSelectedAction) {
      redirect(
        `/portal/rca/${caseId}?d=5&error=d5_selection_incomplete&missing=${encodeURIComponent([...new Set(uncoveredTypes)].join(","))}`
      );
    }
  }

  if (intent === "approve" && discipline === 6) {
    const { data: verifiedActions, error: verifiedActionsError } = await supabase.from("rca_actions")
      .select("id, effectiveness_result").eq("case_id", caseId).eq("owner_id", user.id)
      .eq("discipline", 5).eq("selection_status", "selected");
    if (verifiedActionsError) throw new Error(verifiedActionsError.message);
    const actions = verifiedActions ?? [];
    if (actions.length === 0 || actions.some((action) => !["effective", "effective_verified"].includes(action.effectiveness_result))) {
      redirect(`/portal/rca/${caseId}?d=6&error=d6_effectiveness_incomplete`);
    }
  }

  const approved = intent === "approve";
  const status = approved
    ? "approved"
    : intent === "review"
      ? "ready_for_review"
      : "in_progress";

  const { error } = await supabase
    .from("rca_8d_disciplines")
    .update({
      narrative,
      status,
      completion_score: approved ? 100 : 60,
      human_approved: approved,
      approved_by: approved ? user.id : null,
      approved_at: approved
        ? new Date().toISOString()
        : null,
    })
    .eq("case_id", caseId)
    .eq("discipline", discipline)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  if (approved) {
    const nextDiscipline = Math.min(discipline + 1, 8);
    const caseStatus = discipline === 8
      ? "effectiveness_review"
      : "active";

    const { error: caseError } = await supabase
      .from("rca_cases")
      .update({
        current_discipline: Math.max(
          rcaCase.current_discipline,
          nextDiscipline
        ),
        status: caseStatus,
      })
      .eq("id", caseId)
      .eq("owner_id", user.id);

    if (caseError) throw new Error(caseError.message);
  }

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: approved
      ? "discipline_approved"
      : "discipline_updated",
    discipline,
    summary: approved
      ? `D${discipline} approved`
      : `D${discipline} updated`,
    event_data: { status },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  revalidatePath("/portal/rca");
  const modelQuery = discipline === 4 && modelId
    ? `&model=${encodeURIComponent(modelId)}`
    : "";
  redirect(`/portal/rca/${caseId}?d=${discipline}${modelQuery}`);
}

export async function addTeamMember(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const memberName = clean(formData.get("member_name"));
  const email = clean(formData.get("email"));

  if (!caseId || !memberName || !email) {
    throw new Error("Case, team member name and email address are required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid team member email address.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 1);
  const { error } = await supabase
    .from("rca_team_members")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      member_name: memberName,
      role_title: clean(formData.get("role_title")),
      email: email.toLowerCase(),
      responsibility: clean(
        formData.get("responsibility")
      ),
    });

  if (error) throw new Error(error.message);
  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=1`);
}

export async function addCauseHypothesis(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const statement = clean(formData.get("statement"));
  const causeType = clean(formData.get("cause_type"));

  if (
    !caseId ||
    !statement ||
    !["occurrence", "escape", "systemic", "contributing"].includes(causeType)
  ) {
    throw new Error("Valid cause type and statement are required.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 4);
  const whyChain = [1, 2, 3, 4, 5].map((number) =>
    clean(formData.get(`why_${number}`))
  );

  const completedWhys = whyChain.filter(Boolean);
  const firstGap = whyChain.findIndex((why) => !why);
  const hasAnswerAfterGap = firstGap >= 0 && whyChain.slice(firstGap + 1).some(Boolean);
  if (["occurrence", "escape", "systemic"].includes(causeType) && completedWhys.length === 0) {
    throw new Error(`Record at least one evidence-based Why for the ${causeType} cause.`);
  }
  if (hasAnswerAfterGap) {
    throw new Error("Complete the Why sequence in order without leaving gaps.");
  }

  const { error } = await supabase
    .from("rca_causes")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      cause_type: causeType,
      statement,
      fishbone_category:
        clean(formData.get("fishbone_category")) || null,
      evidence_for: clean(formData.get("evidence_for")),
      evidence_against: clean(
        formData.get("evidence_against")
      ),
      why_chain: completedWhys,
      status: "hypothesis",
      proposed_by_ai: false,
    });

  if (error) throw new Error(error.message);
  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=4`);
}

export async function reviewCauseHypothesis(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const causeId = clean(formData.get("cause_id"));
  const modelId = clean(formData.get("model_id"));
  const decision = clean(formData.get("decision"));
  const validationMethod = clean(formData.get("validation_method"));
  const validationResult = clean(formData.get("validation_result"));

  if (!caseId || !causeId || !["validate", "reject"].includes(decision)) {
    throw new Error("Invalid cause review decision.");
  }

  if (decision === "validate" && (!validationMethod || !validationResult)) {
    const modelQuery = modelId ? `&model=${encodeURIComponent(modelId)}` : "";
    redirect(
      `/portal/rca/${caseId}?d=4${modelQuery}&error=cause_validation_required&cause=${encodeURIComponent(causeId)}`
    );
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 4);

  const validated = decision === "validate";
  const now = new Date().toISOString();
  const { data: cause, error } = await supabase
    .from("rca_causes")
    .update({
      status: validated ? "validated" : "rejected",
      validation_method: validated ? validationMethod : null,
      validation_result: validated ? validationResult : null,
      validated_by: validated ? user.id : null,
      validated_at: validated ? now : null,
    })
    .eq("id", causeId)
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .select("id, cause_type")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!cause) throw new Error("Cause hypothesis not found.");

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: validated ? "cause_validated" : "cause_rejected",
    discipline: 4,
    summary: `${cause.cause_type} cause ${validated ? "validated" : "rejected"}`,
    event_data: {
      cause_id: causeId,
      validation_method: validated ? validationMethod : null,
      validation_result: validated ? validationResult : null,
    },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  const modelQuery = modelId ? `&model=${encodeURIComponent(modelId)}` : "";
  redirect(`/portal/rca/${caseId}?d=4${modelQuery}`);
}

export async function addCorrectiveAction(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const title = clean(formData.get("action_title"));
  const actionType = clean(formData.get("action_type"));
  const causeId = clean(formData.get("cause_id"));
  const effectivenessScore = Number(formData.get("effectiveness_score"));
  const feasibilityScore = Number(formData.get("feasibility_score"));
  const implementationRiskScore = Number(formData.get("implementation_risk_score"));

  if (
    !caseId ||
    !title ||
    !["containment", "correction", "corrective", "preventive", "systemic"].includes(actionType)
  ) {
    throw new Error("Valid action type and title are required.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  const discipline = actionType === "containment" ? 3 : 5;
  await assertDisciplineUnlocked(
    supabase,
    user.id,
    caseId,
    discipline
  );

  if (actionType === "containment") {
    const { data: d3Decision, error: decisionError } = await supabase
      .from("rca_8d_disciplines")
      .select("no_action_required")
      .eq("case_id", caseId)
      .eq("owner_id", user.id)
      .eq("discipline", 3)
      .single();

    if (decisionError) throw new Error(decisionError.message);
    if (d3Decision?.no_action_required) {
      throw new Error(
        "D3 is recorded as requiring no containment action. Clear that decision before adding containment."
      );
    }
  }

  if (discipline === 5) {
    if (!causeId) {
      throw new Error("Link every permanent corrective-action candidate to a validated cause.");
    }
    if (
      ![effectivenessScore, feasibilityScore, implementationRiskScore].every(
        (score) => Number.isInteger(score) && score >= 1 && score <= 5
      )
    ) {
      throw new Error("Score effectiveness, feasibility and implementation risk from 1 to 5.");
    }
  }
  const { error } = await supabase
    .from("rca_actions")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      cause_id: causeId,
      discipline,
      action_type: actionType,
      title,
      description: clean(formData.get("description")),
      action_owner: clean(formData.get("action_owner")),
      due_date: clean(formData.get("due_date")),
      effectiveness_criteria: clean(
        formData.get("effectiveness_criteria")
      ),
      effectiveness_score: discipline === 5 ? effectivenessScore : null,
      feasibility_score: discipline === 5 ? feasibilityScore : null,
      implementation_risk_score: discipline === 5 ? implementationRiskScore : null,
      selection_status: discipline === 5 ? "candidate" : "selected",
      status: "open",
    });

  if (error) throw new Error(error.message);
  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=${discipline}`);
}

export async function submitD6ActionForVerification(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const actionId = clean(formData.get("action_id"));
  const implementationResult = clean(formData.get("implementation_result"));
  const evidenceReference = clean(formData.get("implementation_evidence_reference"));
  if (!caseId || !actionId || !implementationResult || !evidenceReference || formData.get("implementation_confirmation") !== "on") {
    throw new Error("Implementation details, evidence reference and owner confirmation are required.");
  }
  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 6);
  const { count: evidenceCount, error: evidenceError } = await supabase.from("rca_evidence")
    .select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("owner_id", user.id)
    .eq("discipline", 6).eq("action_id", actionId);
  if (evidenceError) throw new Error(evidenceError.message);
  if (!evidenceCount) redirect(`/portal/rca/${caseId}?d=6&error=d6_action_evidence_required&action=${encodeURIComponent(actionId)}`);
  const now = new Date().toISOString();
  const { data: action, error } = await supabase.from("rca_actions").update({
    implementation_result: implementationResult, implementation_evidence_reference: evidenceReference,
    implementation_evidence: evidenceReference,
    d6_submitted_at: now, effectiveness_result: "awaiting_verification", status: "open", updated_at: now,
  }).eq("id", actionId).eq("case_id", caseId).eq("owner_id", user.id).eq("discipline", 5)
    .eq("selection_status", "selected").select("id, title").maybeSingle();
  if (error || !action) throw new Error(error?.message || "Selected corrective action not found.");
  const { error: accessError } = await supabase.from("internal_audit_action_access").update({
    d6_verification_requested_at: now, d6_verification_completed_at: null, updated_at: now,
  }).eq("rca_case_id", caseId).eq("owner_id", user.id);
  if (accessError) throw new Error(accessError.message);
  await supabase.from("rca_case_events").insert({ case_id: caseId, owner_id: user.id,
    event_type: "d6_action_submitted", discipline: 6,
    summary: `${action.title} submitted for auditor effectiveness verification`, event_data: { action_id: action.id } });
  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=6&saved=verification_requested`);
}

export async function decideCorrectiveActionCandidate(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const actionId = clean(formData.get("action_id"));
  const decision = clean(formData.get("decision"));
  const rationale = clean(formData.get("selection_rationale"));

  if (!caseId || !actionId || !["select", "reject"].includes(decision)) {
    throw new Error("Invalid corrective-action selection decision.");
  }

  if (decision === "select" && !rationale) {
    redirect(`/portal/rca/${caseId}?d=5&error=selection_rationale_required`);
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 5);

  const { data: candidate, error: candidateError } = await supabase
    .from("rca_actions")
    .select("id, title, cause_id, action_owner, due_date, effectiveness_criteria")
    .eq("id", actionId)
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .eq("discipline", 5)
    .maybeSingle();

  if (candidateError) throw new Error(candidateError.message);
  if (!candidate) throw new Error("Corrective-action candidate not found.");

  if (
    decision === "select" &&
    (!candidate.cause_id ||
      !candidate.action_owner ||
      !candidate.due_date ||
      !candidate.effectiveness_criteria)
  ) {
    redirect(`/portal/rca/${caseId}?d=5&error=candidate_fields_required`);
  }

  const selected = decision === "select";
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("rca_actions")
    .update({
      selection_status: selected ? "selected" : "rejected",
      selection_rationale: rationale,
      selected_by: selected ? user.id : null,
      selected_at: selected ? now : null,
      updated_at: now,
    })
    .eq("id", actionId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: selected ? "corrective_action_selected" : "corrective_action_rejected",
    discipline: 5,
    summary: `${candidate.title} ${selected ? "selected" : "rejected"}`,
    event_data: { action_id: actionId, selection_rationale: rationale },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=5`);
}

export async function recordNoContainmentRequired(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const intent = clean(formData.get("intent")) || "record";
  const justification = clean(formData.get("justification"));

  if (!caseId || !["record", "clear"].includes(intent)) {
    throw new Error("Invalid D3 containment decision.");
  }

  if (intent === "record" && !justification) {
    throw new Error(
      "Provide a justification explaining why no containment action is required."
    );
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 3);

  if (intent === "record") {
    const { count, error: actionError } = await supabase
      .from("rca_actions")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .eq("owner_id", user.id)
      .eq("action_type", "containment");

    if (actionError) throw new Error(actionError.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "A containment action already exists. Remove the no-containment decision or manage the recorded action."
      );
    }
  }

  const { error } = await supabase
    .from("rca_8d_disciplines")
    .update({
      no_action_required: intent === "record",
      no_action_justification: intent === "record" ? justification : null,
    })
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .eq("discipline", 3);

  if (error) throw new Error(error.message);

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type:
      intent === "record"
        ? "no_containment_required_recorded"
        : "no_containment_required_cleared",
    discipline: 3,
    summary:
      intent === "record"
        ? "No containment action required"
        : "No-containment decision cleared",
    event_data: {
      justification: intent === "record" ? justification : null,
    },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=3`);
}

export async function addObjectiveEvidence(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const discipline = Number(formData.get("discipline"));
  const actionId = clean(formData.get("action_id"));
  const description = clean(formData.get("description"));
  const reference = clean(formData.get("reference"));
  const strength = clean(formData.get("strength"));
  const evidenceDate = clean(formData.get("evidence_date"));
  const files = formData
    .getAll("evidence_files")
    .filter((file) => file && typeof file === "object" && file.size > 0);

  if (
    !caseId ||
    !Number.isInteger(discipline) ||
    discipline < 2 ||
    discipline > 8
  ) {
    throw new Error("Objective evidence can be added from D2 onwards.");
  }

  if (!description) {
    throw new Error("Describe what the evidence demonstrates.");
  }

  if (files.length === 0) {
    throw new Error("Select at least one evidence file.");
  }

  if (files.length > 10) {
    throw new Error("Upload a maximum of 10 files at one time.");
  }

  if (strength && !["low", "medium", "high"].includes(strength)) {
    throw new Error("Invalid evidence strength.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(
    supabase,
    user.id,
    caseId,
    discipline
  );

  if (discipline === 6) {
    if (!actionId) throw new Error("D6 evidence must be attached to a specific corrective action.");
    const { data: linkedAction, error: linkedActionError } = await supabase.from("rca_actions").select("id")
      .eq("id", actionId).eq("case_id", caseId).eq("owner_id", user.id).eq("discipline", 5)
      .eq("selection_status", "selected").maybeSingle();
    if (linkedActionError || !linkedAction) throw new Error(linkedActionError?.message || "Selected corrective action not found.");
  }

  const uploadedPaths = [];
  const evidenceRows = [];

  try {
    for (const file of files) {
      if (file.size > MAX_EVIDENCE_BYTES) {
        throw new Error(`${file.name} exceeds the 10 MB file limit.`);
      }

      if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) {
        throw new Error(`${file.name} is not an accepted evidence file type.`);
      }

      const storagePath = [
        user.id,
        caseId,
        `D${discipline}`,
        ...(discipline === 6 ? [actionId] : []),
        `${crypto.randomUUID()}-${safeFileName(file.name)}`,
      ].join("/");

      const { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);
      uploadedPaths.push(storagePath);
      evidenceRows.push({
        case_id: caseId,
        owner_id: user.id,
        discipline,
        action_id: discipline === 6 ? actionId : null,
        evidence_type: "document",
        reference: reference || file.name,
        description,
        storage_path: storagePath,
        evidence_date: evidenceDate,
        strength: strength || null,
      });
    }

    const { error: evidenceError } = await supabase
      .from("rca_evidence")
      .insert(evidenceRows);

    if (evidenceError) throw new Error(evidenceError.message);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from(EVIDENCE_BUCKET)
        .remove(uploadedPaths);
    }
    throw error;
  }

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: "objective_evidence_added",
    discipline,
    summary: `${evidenceRows.length} objective evidence file(s) added to ${discipline === 6 ? "a D6 corrective action" : `D${discipline}`}`,
    event_data: {
      evidence_count: evidenceRows.length,
      references: evidenceRows.map((row) => row.reference),
      action_id: discipline === 6 ? actionId : null,
    },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=${discipline}`);
}

const ANALYSIS_METHODS = {
  "3x5_whys": "3 × 5 Whys",
  ishikawa: "Ishikawa / Fishbone",
  bow_tie: "HSE Bow Tie",
};

const ANALYSIS_NODE_TYPES = [
  "cause",
  "hazard",
  "top_event",
  "threat",
  "preventive_barrier",
  "consequence",
  "recovery_barrier",
  "barrier_failure",
];

export async function createAnalysisModel(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const method = clean(formData.get("method"));

  if (!caseId || !method || !ANALYSIS_METHODS[method]) {
    throw new Error("Select a valid root cause analysis method.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 4);

  const { data: existing, error: existingError } = await supabase
    .from("rca_analysis_models")
    .select("id")
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .eq("method", method)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    redirect(`/portal/rca/${caseId}?d=4&model=${existing.id}`);
  }

  const { data: model, error } = await supabase
    .from("rca_analysis_models")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      discipline: 4,
      method,
      title: ANALYSIS_METHODS[method],
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: "analysis_model_created",
    discipline: 4,
    summary: `${ANALYSIS_METHODS[method]} analysis started`,
    event_data: { model_id: model.id, method },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=4&model=${model.id}`);
}

export async function addAnalysisNode(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const modelId = clean(formData.get("model_id"));
  const nodeType = clean(formData.get("node_type"));
  const title = clean(formData.get("title"));
  const causeType = clean(formData.get("cause_type"));

  if (
    !caseId ||
    !modelId ||
    !title ||
    !ANALYSIS_NODE_TYPES.includes(nodeType)
  ) {
    throw new Error("Complete the required analysis-node fields.");
  }

  if (
    causeType &&
    !["occurrence", "escape", "systemic", "contributing"].includes(causeType)
  ) {
    throw new Error("Select a valid cause classification.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 4);

  const { data: model, error: modelError } = await supabase
    .from("rca_analysis_models")
    .select("id, method")
    .eq("id", modelId)
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (modelError) throw new Error(modelError.message);
  if (!model) throw new Error("Analysis model not found.");

  const parentNodeId = clean(formData.get("parent_node_id"));
  if (parentNodeId) {
    const { count, error: parentError } = await supabase
      .from("rca_analysis_nodes")
      .select("id", { count: "exact", head: true })
      .eq("id", parentNodeId)
      .eq("model_id", modelId)
      .eq("owner_id", user.id);
    if (parentError) throw new Error(parentError.message);
    if ((count ?? 0) !== 1) throw new Error("Parent analysis node not found.");
  }

  const { error } = await supabase.from("rca_analysis_nodes").insert({
    model_id: modelId,
    case_id: caseId,
    owner_id: user.id,
    parent_node_id: parentNodeId,
    node_type: nodeType,
    cause_type: causeType,
    category: clean(formData.get("category")),
    title,
    description: clean(formData.get("description")),
    evidence_for: clean(formData.get("evidence_for")),
    evidence_against: clean(formData.get("evidence_against")),
    status: "hypothesis",
    metadata: {
      control_owner: clean(formData.get("control_owner")),
      control_effectiveness: clean(formData.get("control_effectiveness")),
    },
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=4&model=${modelId}`);
}

// End of RCA analysis workbench server actions.

export async function reviewAnalysisNode(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const modelId = clean(formData.get("model_id"));
  const nodeId = clean(formData.get("node_id"));
  const decision = clean(formData.get("decision"));
  const validationMethod = clean(formData.get("validation_method"));
  const validationResult = clean(formData.get("validation_result"));

  if (
    !caseId ||
    !modelId ||
    !nodeId ||
    !["validate", "reject"].includes(decision)
  ) {
    throw new Error("Invalid analysis-node review decision.");
  }

  if (decision === "validate" && (!validationMethod || !validationResult)) {
    redirect(
      `/portal/rca/${caseId}?d=4&model=${encodeURIComponent(modelId)}&error=node_validation_required&node=${encodeURIComponent(nodeId)}`
    );
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, 4);

  const { data: node, error: nodeError } = await supabase
    .from("rca_analysis_nodes")
    .select("id, title, description, node_type, cause_type, category, evidence_for, evidence_against, linked_cause_id")
    .eq("id", nodeId)
    .eq("model_id", modelId)
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (nodeError) throw new Error(nodeError.message);
  if (!node) throw new Error("Analysis node not found.");

  const validated = decision === "validate";
  const now = new Date().toISOString();
  let linkedCauseId = node.linked_cause_id;

  if (validated && node.cause_type && !linkedCauseId) {
    const { data: linkedCause, error: causeError } = await supabase
      .from("rca_causes")
      .insert({
        case_id: caseId,
        owner_id: user.id,
        cause_type: node.cause_type,
        statement: node.title,
        fishbone_category: node.category,
        evidence_for: node.evidence_for,
        evidence_against: node.evidence_against,
        validation_method: validationMethod,
        validation_result: validationResult,
        status: "validated",
        proposed_by_ai: false,
        validated_by: user.id,
        validated_at: now,
      })
      .select("id")
      .single();
    if (causeError) throw new Error(causeError.message);
    linkedCauseId = linkedCause.id;
  }

  const { error } = await supabase
    .from("rca_analysis_nodes")
    .update({
      status: validated ? "validated" : "rejected",
      validation_method: validated ? validationMethod : null,
      validation_result: validated ? validationResult : null,
      validated_by: validated ? user.id : null,
      validated_at: validated ? now : null,
      linked_cause_id: validated ? linkedCauseId : node.linked_cause_id,
      updated_at: now,
    })
    .eq("id", nodeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: validated ? "analysis_node_validated" : "analysis_node_rejected",
    discipline: 4,
    summary: `${node.node_type} ${validated ? "validated" : "rejected"}`,
    event_data: { model_id: modelId, node_id: nodeId, linked_cause_id: linkedCauseId },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=4&model=${modelId}`);
}

const COST_CATEGORIES = new Set([
  "material",
  "labour",
  "downtime",
  "administration",
  "external_failure",
  "inspection_testing",
  "containment_recovery",
  "logistics",
  "other",
]);

const COST_CURRENCIES = new Set(["GBP", "EUR", "USD"]);

export async function addCostEntry(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const discipline = Number(formData.get("discipline"));
  const costCategory = clean(formData.get("cost_category"));
  const description = clean(formData.get("description"));
  const currency = clean(formData.get("currency")) ?? "GBP";
  const costStatus = clean(formData.get("cost_status")) ?? "estimated";
  const quantity = Number(formData.get("quantity"));
  const unitCost = Number(formData.get("unit_cost"));

  if (
    !caseId ||
    !Number.isInteger(discipline) ||
    discipline < 0 ||
    discipline > 8 ||
    !costCategory ||
    !COST_CATEGORIES.has(costCategory) ||
    !description ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(unitCost) ||
    unitCost < 0 ||
    !COST_CURRENCIES.has(currency) ||
    !["estimated", "confirmed"].includes(costStatus)
  ) {
    throw new Error("Enter a valid cost category, description, quantity and unit cost.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  await assertDisciplineUnlocked(supabase, user.id, caseId, discipline);

  const amount = Math.round(quantity * unitCost * 100) / 100;
  const { error } = await supabase.from("rca_cost_entries").insert({
    case_id: caseId,
    owner_id: user.id,
    discipline,
    cost_category: costCategory,
    description,
    quantity,
    unit_cost: unitCost,
    amount,
    currency,
    cost_status: costStatus,
    source_reference: clean(formData.get("source_reference")),
    incurred_at: clean(formData.get("incurred_at")),
  });

  if (error) throw new Error(error.message);

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: "cost_recorded",
    discipline,
    summary: `${costCategory} cost recorded`,
    event_data: { amount, currency, cost_status: costStatus },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  revalidatePath(`/portal/rca/${caseId}/summary`);
  redirect(`/portal/rca/${caseId}?d=${discipline}#copq`);
}

export async function deleteCostEntry(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const costId = clean(formData.get("cost_id"));
  const discipline = Number(formData.get("discipline"));

  if (!caseId || !costId || !Number.isInteger(discipline)) {
    throw new Error("Invalid cost entry.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  const { error } = await supabase
    .from("rca_cost_entries")
    .delete()
    .eq("id", costId)
    .eq("case_id", caseId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/portal/rca/${caseId}`);
  revalidatePath(`/portal/rca/${caseId}/summary`);
  redirect(`/portal/rca/${caseId}?d=${discipline}#copq`);
}
