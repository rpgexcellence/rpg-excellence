"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const AI_MODEL = process.env.OPENAI_RCA_MODEL || "gpt-5-mini";
const AI_PROMPT_VERSION = "rca-8d-evidence-challenge-v1";

const AI_TASKS = {
  0: "containment_review",
  1: "problem_definition",
  2: "is_is_not_analysis",
  3: "containment_review",
  4: "cause_challenge",
  5: "action_design",
  6: "effectiveness_review",
  7: "recurrence_prevention",
  8: "executive_summary",
};

const AI_STAGE_INSTRUCTIONS = {
  0: "Assess whether 8D is justified, urgency is understood and immediate protection is adequate.",
  1: "Assess whether the team has sufficient authority, process knowledge, technical competence, customer insight and clearly assigned roles.",
  2: "Challenge the problem definition using 5W2H and IS / IS NOT. Separate verified facts from assumptions and identify missing scope or baseline data.",
  3: "Assess containment for immediacy, coverage, verification, ownership, traceability, unintended consequences and an exit criterion.",
  4: "Challenge occurrence, escape and systemic cause hypotheses. Require disconfirming tests and evidence of causal mechanism; do not validate any cause.",
  5: "Assess whether proposed permanent corrective actions address validated causes, control risk and include measurable effectiveness criteria.",
  6: "Assess implementation evidence, change control, removal of containment and whether effectiveness is sustained rather than assumed.",
  7: "Assess horizontal deployment, document and risk-control updates, competence, audit coverage and organisational learning.",
  8: "Assess objective closure, unresolved risk, stakeholder communication, lessons learned and recognition. Do not declare the case closed.",
};

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "executive_assessment",
    "strengths",
    "challenges",
    "missing_evidence",
    "recommended_tests",
    "gate_recommendation",
    "confidence",
    "assumptions",
    "warnings",
  ],
  properties: {
    executive_assessment: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    challenges: { type: "array", items: { type: "string" } },
    missing_evidence: { type: "array", items: { type: "string" } },
    recommended_tests: { type: "array", items: { type: "string" } },
    gate_recommendation: {
      type: "string",
      enum: [
        "not_ready",
        "ready_for_human_review",
        "insufficient_information",
      ],
    },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    assumptions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
};

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");
  return { supabase, user };
}

async function assertOwnedAndUnlocked(
  supabase,
  userId,
  caseId,
  discipline
) {
  const { data: rcaCase, error: caseError } = await supabase
    .from("rca_cases")
    .select("id")
    .eq("id", caseId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (caseError || !rcaCase) throw new Error("8D case not found.");
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

function responseText(response) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return null;
}

export async function generateAiChallenge(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const disciplineNumber = Number(formData.get("discipline"));

  if (
    !caseId ||
    !Number.isInteger(disciplineNumber) ||
    disciplineNumber < 0 ||
    disciplineNumber > 8
  ) {
    throw new Error("Invalid AI evidence challenge request.");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  await assertOwnedAndUnlocked(
    supabase,
    user.id,
    caseId,
    disciplineNumber
  );

  const [
    caseResult,
    disciplineResult,
    teamResult,
    causesResult,
    actionsResult,
    evidenceResult,
  ] = await Promise.all([
    supabase.from("rca_cases").select("*").eq("id", caseId).eq("owner_id", user.id).single(),
    supabase.from("rca_8d_disciplines").select("*").eq("case_id", caseId).eq("discipline", disciplineNumber).eq("owner_id", user.id).single(),
    supabase.from("rca_team_members").select("member_name, role_title, expertise, responsibility").eq("case_id", caseId).eq("owner_id", user.id).eq("active", true),
    supabase.from("rca_causes").select("cause_type, statement, evidence_for, evidence_against, validation_method, validation_result, status").eq("case_id", caseId).eq("owner_id", user.id),
    supabase.from("rca_actions").select("action_type, title, description, action_owner, due_date, effectiveness_criteria, effectiveness_result, status").eq("case_id", caseId).eq("owner_id", user.id),
    supabase.from("rca_evidence").select("discipline, evidence_type, reference, description, evidence_date, strength").eq("case_id", caseId).eq("owner_id", user.id),
  ]);

  for (const result of [
    caseResult,
    disciplineResult,
    teamResult,
    causesResult,
    actionsResult,
    evidenceResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const inputSnapshot = {
    case: caseResult.data,
    selected_discipline: disciplineResult.data,
    team: teamResult.data ?? [],
    causes: causesResult.data ?? [],
    actions: actionsResult.data ?? [],
    evidence: evidenceResult.data ?? [],
  };

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      store: false,
      instructions: [
        "You are an evidence-led 8D root cause and corrective action reviewer.",
        "Challenge assumptions and distinguish facts, hypotheses and conclusions.",
        "Never claim to approve a discipline, validate a cause, verify an action or close a case.",
        "Do not invent facts, evidence, people, dates, measurements or compliance requirements.",
        "Treat absent information as missing evidence and recommend proportionate tests.",
        "Use concise professional British English.",
        AI_STAGE_INSTRUCTIONS[disciplineNumber],
      ].join(" "),
      input: JSON.stringify(inputSnapshot),
      text: {
        format: {
          type: "json_schema",
          name: "rca_8d_evidence_challenge",
          strict: true,
          schema: AI_SCHEMA,
        },
      },
    }),
    cache: "no-store",
  });

  const rawResponse = await apiResponse.json();
  if (!apiResponse.ok) {
    throw new Error(
      rawResponse?.error?.message ||
        "The AI evidence challenge could not be generated."
    );
  }

  const rawText = responseText(rawResponse);
  if (!rawText) throw new Error("The AI returned no structured analysis.");

  let output;
  try {
    output = JSON.parse(rawText);
  } catch {
    throw new Error("The AI returned an invalid structured response.");
  }

  const { error: insertError } = await supabase
    .from("rca_ai_runs")
    .insert({
      case_id: caseId,
      owner_id: user.id,
      discipline: disciplineNumber,
      task_type: AI_TASKS[disciplineNumber],
      prompt_version: AI_PROMPT_VERSION,
      model_name: rawResponse.model || AI_MODEL,
      input_snapshot: inputSnapshot,
      output,
      confidence: output.confidence,
      assumptions: output.assumptions,
      missing_evidence: output.missing_evidence,
      warnings: output.warnings,
      human_decision: "pending",
    });

  if (insertError) throw new Error(insertError.message);

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: "ai_evidence_challenge_generated",
    discipline: disciplineNumber,
    summary: `AI evidence challenge generated for D${disciplineNumber}`,
    event_data: {
      prompt_version: AI_PROMPT_VERSION,
      model: rawResponse.model || AI_MODEL,
    },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=${disciplineNumber}`);
}

export async function reviewAiChallenge(formData) {
  const { supabase, user } = await context();
  const caseId = clean(formData.get("case_id"));
  const runId = clean(formData.get("run_id"));
  const disciplineNumber = Number(formData.get("discipline"));
  const decision = clean(formData.get("decision"));

  if (
    !caseId ||
    !runId ||
    !Number.isInteger(disciplineNumber) ||
    !["accepted", "rejected"].includes(decision)
  ) {
    throw new Error("Invalid AI review decision.");
  }

  await assertOwnedAndUnlocked(
    supabase,
    user.id,
    caseId,
    disciplineNumber
  );

  const reviewedAt = new Date().toISOString();
  const { data: run, error } = await supabase
    .from("rca_ai_runs")
    .update({
      human_decision: decision,
      reviewed_by: user.id,
      reviewed_at: reviewedAt,
    })
    .eq("id", runId)
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!run) throw new Error("AI challenge not found.");

  await supabase.from("rca_case_events").insert({
    case_id: caseId,
    owner_id: user.id,
    event_type: "ai_evidence_challenge_reviewed",
    discipline: disciplineNumber,
    summary: `AI evidence challenge ${decision} for D${disciplineNumber}`,
    event_data: { run_id: runId, decision },
  });

  revalidatePath(`/portal/rca/${caseId}`);
  redirect(`/portal/rca/${caseId}?d=${disciplineNumber}`);
}
