import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import InternalAuditTrainingPlayer from "../../../../../components/InternalAuditTrainingPlayer";
import { createClient } from "../../../../../lib/supabase/server";

export const metadata = { title: "Internal Auditor Refresher | RPG Excellence" };
export const dynamic = "force-dynamic";

async function loadCourse(supabase, userId, enrolmentId) {
  const { data: enrolment, error: enrolmentError } = await supabase
    .from("hs_training_enrolments")
    .select("id,learner_id,organization_id,course_id,status,progress_percent,started_at,completed_at,expires_at")
    .eq("id", enrolmentId)
    .eq("learner_id", userId)
    .maybeSingle();
  if (enrolmentError) throw new Error(enrolmentError.message);
  if (!enrolment) return null;

  const [courseResult, modulesResult, progressResult] = await Promise.all([
    supabase.from("hs_training_courses").select("id,course_code,title,description,duration_minutes,pass_mark,validity_months,version,active,academy_code").eq("id", enrolment.course_id).eq("course_code", "IA-REFRESHER-001").eq("academy_code", "internal_audit").eq("active", true).maybeSingle(),
    supabase.from("hs_training_modules").select("id,course_id,module_number,title,learning_objective,module_type,content,estimated_minutes,active").eq("course_id", enrolment.course_id).eq("active", true).order("module_number"),
    supabase.from("hs_training_module_progress").select("id,enrolment_id,learner_id,module_id,status,response_data,started_at,completed_at").eq("enrolment_id", enrolment.id).eq("learner_id", userId),
  ]);
  for (const result of [courseResult, modulesResult, progressResult]) if (result.error) throw new Error(result.error.message);
  if (!courseResult.data) return null;
  return { enrolment, course: courseResult.data, modules: modulesResult.data || [], progress: progressResult.data || [] };
}

async function completeModuleAction(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const enrolmentId = String(formData.get("enrolment_id") || "").trim();
  const moduleId = String(formData.get("module_id") || "").trim();
  const rawEvidence = String(formData.get("learner_reflection") || "").trim();
  if (!enrolmentId || !moduleId || !rawEvidence) throw new Error("Complete the interactive exercise before continuing.");

  let exerciseEvidence;
  try { exerciseEvidence = JSON.parse(rawEvidence); } catch { throw new Error("The exercise evidence could not be validated."); }
  if (!exerciseEvidence.correct || !exerciseEvidence.guidance_reviewed || String(exerciseEvidence.rationale || "").trim().length < 25) {
    throw new Error("Review the guidance and provide a supported auditor rationale before continuing.");
  }

  const { data: enrolment, error: enrolmentError } = await supabase.from("hs_training_enrolments").select("id,learner_id,course_id,status,started_at").eq("id", enrolmentId).eq("learner_id", user.id).single();
  if (enrolmentError || !enrolment) throw new Error("Training enrolment not found.");
  if (["passed", "expired", "withdrawn"].includes(enrolment.status)) throw new Error("This enrolment cannot be updated.");

  const { data: course, error: courseError } = await supabase.from("hs_training_courses").select("id,course_code,academy_code").eq("id", enrolment.course_id).eq("course_code", "IA-REFRESHER-001").eq("academy_code", "internal_audit").single();
  if (courseError || !course) throw new Error("Internal Audit course access could not be verified.");

  const { data: module, error: moduleError } = await supabase.from("hs_training_modules").select("id,course_id,module_number,title,module_type,active").eq("id", moduleId).eq("course_id", course.id).eq("active", true).single();
  if (moduleError || !module) throw new Error("Training module not found.");

  const { data: earlierModules, error: earlierError } = await supabase.from("hs_training_modules").select("id").eq("course_id", course.id).eq("active", true).lt("module_number", module.module_number);
  if (earlierError) throw new Error(earlierError.message);
  if (earlierModules?.length) {
    const earlierIds = earlierModules.map((item) => item.id);
    const { data: earlierProgress, error: progressError } = await supabase.from("hs_training_module_progress").select("module_id").eq("enrolment_id", enrolment.id).eq("learner_id", user.id).eq("status", "completed").in("module_id", earlierIds);
    if (progressError) throw new Error(progressError.message);
    const completedIds = new Set((earlierProgress || []).map((item) => item.module_id));
    if (!earlierIds.every((id) => completedIds.has(id))) throw new Error("Complete the preceding modules before continuing.");
  }

  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from("hs_training_module_progress").upsert({
    enrolment_id: enrolment.id,
    learner_id: user.id,
    module_id: module.id,
    status: "completed",
    response_data: { ...exerciseEvidence, completed_module_number: module.module_number, completed_module_title: module.title, completed_module_type: module.module_type },
    started_at: now,
    completed_at: now,
  }, { onConflict: "enrolment_id,module_id" });
  if (saveError) throw new Error(saveError.message);

  const [totalResult, completeResult] = await Promise.all([
    supabase.from("hs_training_modules").select("id", { count: "exact", head: true }).eq("course_id", course.id).eq("active", true),
    supabase.from("hs_training_module_progress").select("module_id,hs_training_modules!inner(course_id,active)", { count: "exact", head: true }).eq("enrolment_id", enrolment.id).eq("learner_id", user.id).eq("status", "completed").eq("hs_training_modules.course_id", course.id).eq("hs_training_modules.active", true),
  ]);
  if (totalResult.error) throw new Error(totalResult.error.message);
  if (completeResult.error) throw new Error(completeResult.error.message);
  const total = totalResult.count || 0;
  const completed = completeResult.count || 0;
  const allComplete = total > 0 && completed >= total;
  const progressPercent = total ? Math.min(100, Math.round(completed / total * 100)) : 0;

  const { error: updateError } = await supabase.from("hs_training_enrolments").update({ status: allComplete ? "assessment_due" : "in_progress", progress_percent: progressPercent, started_at: enrolment.started_at || now, updated_at: now }).eq("id", enrolment.id).eq("learner_id", user.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/portal/internal-audit/training/${enrolment.id}`);
  revalidatePath("/portal/internal-audit/training");
  if (allComplete) redirect(`/portal/internal-audit/training/${enrolment.id}/assessment`);
}

export default async function InternalAuditCoursePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=/portal/internal-audit/training/${id}`);
  const record = await loadCourse(supabase, user.id, id);
  if (!record) notFound();

  return <main className="iacPage"><style>{`
    *{box-sizing:border-box}.iacPage{min-height:100vh;padding:28px clamp(16px,4vw,68px) 70px;background:linear-gradient(135deg,#eaf2fb,#f8fafc);color:#071d3a;font-family:Arial,sans-serif}.iacShell{max-width:1500px;margin:auto}.iacTop{display:flex;justify-content:space-between;gap:20px;align-items:start;margin-bottom:20px}.iacTop small{color:#1762ef;font-weight:900;letter-spacing:.11em}.iacTop h1{margin:6px 0;font-size:32px}.iacTop p{margin:0;color:#657b94}.iacActions{display:flex;gap:9px}.iacButton{display:inline-flex;padding:11px 14px;border:1px solid #cbd8e6;border-radius:9px;background:#fff;color:#12385f;text-decoration:none;font-weight:850;white-space:nowrap}.iacReminder{margin-top:16px;padding:18px 22px;border-left:5px solid #e2a11a;border-radius:10px;background:#fff8e7;color:#624a17;line-height:1.5}@media(max-width:700px){.iacPage{padding:20px 10px 55px}.iacTop{display:block}.iacActions{margin-top:13px}}
  `}</style><div className="iacShell"><header className="iacTop"><div><small>INTERNAL AUDIT · INTERACTIVE REFRESHER</small><h1>{record.course.title}</h1><p>{record.course.description}</p></div><div className="iacActions"><Link className="iacButton" href="/portal/internal-audit/training">← Training Academy</Link><Link className="iacButton" href="/portal/internal-audit">Internal Audit Hub</Link></div></header><InternalAuditTrainingPlayer enrolment={record.enrolment} course={record.course} modules={record.modules} progress={record.progress} completeModuleAction={completeModuleAction}/><aside className="iacReminder"><strong>Evidence retained: </strong>Each checked decision, learner rationale and guidance acknowledgement is saved against the enrolment as controlled module evidence.</aside></div></main>;
}
