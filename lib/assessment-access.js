import { createAdminClient } from "./supabase/admin";
import { getUserSubscription, hasActiveSubscription } from "./subscription";

export async function canEditAssessment(userId, assessmentId) {
  if (hasActiveSubscription(await getUserSubscription(userId))) return true;
  const admin = createAdminClient();
  const { data, error } = await admin.from("assessment_passes").select("id")
    .eq("owner_id", userId).eq("assessment_id", assessmentId).eq("status", "redeemed")
    .gt("access_expires_at", new Date().toISOString()).limit(1).maybeSingle();
  if (error) { console.error("Unable to verify assessment access:", error); return false; }
  return Boolean(data);
}

export async function requireAssessmentWriteAccess(userId, assessmentId) {
  if (!(await canEditAssessment(userId, assessmentId))) {
    throw new Error("This assessment is read-only because its completion access has ended. Your retained results remain available.");
  }
}
