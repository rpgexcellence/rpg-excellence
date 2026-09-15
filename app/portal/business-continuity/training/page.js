import { redirect } from "next/navigation";
import BCPTrainingPlayer from "../../../../components/BCPTrainingPlayer";
import { createClient } from "../../../../lib/supabase/server";

export const metadata = { title: "ISO 22301 Interactive Training | RPG Excellence" };
export const dynamic = "force-dynamic";

const correctAnswers = ["The BIA and agreed recovery objectives", "RTO should be earlier than MTPD", "Exercise, evidence and verified improvement", "Corrective action and continual improvement", "Priority products, services and their value chain"];

async function completeAction(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/training");
  const { data: organization } = await supabase.from("organizations").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!organization) throw new Error("Organisation not available.");
  const score = correctAnswers.reduce((total, answer, index) => total + (String(formData.get(`q${index}`)) === answer ? 20 : 0), 0);
  const status = score >= 80 ? "complete" : "in_progress";
  const { error } = await supabase.from("bcp_training_progress").upsert({ owner_id: user.id, organization_id: organization.id, phase_code: "BCP-FULL", score, status, completed_at: status === "complete" ? new Date().toISOString() : null, evidence: { attempted_at: new Date().toISOString(), screens: 53, pass_mark: 80 } }, { onConflict: "owner_id,organization_id,phase_code" });
  if (error) throw new Error(error.message);
  redirect("/portal/business-continuity/training");
}

export default async function TrainingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/training");
  const { data: organization } = await supabase.from("organizations").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  let saved = null;
  if (organization) {
    const result = await supabase.from("bcp_training_progress").select("status,score,completed_at").eq("organization_id", organization.id).eq("phase_code", "BCP-FULL").maybeSingle();
    saved = result.data;
  }
  return <BCPTrainingPlayer saved={saved || {}} completeAction={completeAction} />;
}
