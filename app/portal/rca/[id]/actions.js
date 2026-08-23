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
      throw new Error(
        "Before approving D3, add a containment action or document why no containment action is required."
      );
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
    const missingTypes = ["occurrence", "escape", "systemic"].filter(
      (type) => !validatedTypes.has(type)
    );

    if (missingTypes.length > 0) {
      throw new Error(
        `D4 requires validated occurrence, escape and systemic causes. Missing: ${missingTypes.join(", ")}.`
      );
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
  redirect(`/portal/rca/${caseId}?d=${discipline}`);
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

  if (
    ["occurrence", "escape", "systemic"].includes(causeType) &&
    whyChain.some((why) => !why)
  ) {
    throw new Error(`Complete all five Whys for the ${causeType} cause.`);
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
      why_chain: whyChain.filter(Boolean),
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
  const decision = clean(formData.get("decision"));
  const validationMethod = clean(formData.get("validation_method"));
  const validationResult = clean(formData.get("validation_result"));

  if (!caseId || !causeId || !["validate", "reject"].includes(decision)) {
    throw new Error("Invalid cause review decision.");
  }

  if (decision === "validate" && (!validationMethod || !validationResult)) {
    throw new Error(
      "Document the validation method and objective result before validating a cause."
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
  redirect(`/portal/rca/${caseId}?d=4`);
}

export async function addCorrectiveAction(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const title = clean(formData.get("action_title"));
  const actionType = clean(formData.get("action_type"));

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
  const { error } = await supabase
    .from("rca_actions")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      cause_id: clean(formData.get("cause_id")),
      discipline,
      action_type: actionType,
      title,
      description: clean(formData.get("description")),
      action_owner: clean(formData.get("action_owner")),
      due_date: clean(formData.get("due_date")),
      effectiveness_criteria: clean(
        formData.get("effectiveness_criteria")
      ),
      status: "open",
    });

  if (error) throw new Error(error.message);
  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=${discipline}`);
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
    summary: `${evidenceRows.length} objective evidence file(s) added to D${discipline}`,
    event_data: {
      evidence_count: evidenceRows.length,
      references: evidenceRows.map((row) => row.reference),
    },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=${discipline}`);
}
