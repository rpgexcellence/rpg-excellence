import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

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
  const narrative = clean(formData.get("narrative"));
  const intent = clean(formData.get("intent")) ?? "save";

  if (!caseId || !Number.isInteger(discipline) || discipline < 0 || discipline > 8) {
    throw new Error("Invalid 8D discipline.");
  }

  const rcaCase = await getOwnedCase(
    supabase,
    user.id,
    caseId
  );

  if (!narrative) {
    throw new Error("Discipline evidence and conclusions are required.");
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

  if (!caseId || !memberName) {
    throw new Error("Case and team member name are required.");
  }

  await getOwnedCase(supabase, user.id, caseId);
  const { error } = await supabase
    .from("rca_team_members")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      member_name: memberName,
      role_title: clean(formData.get("role_title")),
      expertise: clean(formData.get("expertise")),
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
      status: "hypothesis",
      proposed_by_ai: false,
    });

  if (error) throw new Error(error.message);
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
