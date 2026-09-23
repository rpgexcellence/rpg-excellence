"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { sendWelcomeEmail } from "../../../lib/people-onboarding-email";

const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");

export async function activateQrInvitation(formData) {
  const token = String(formData.get("token") || "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/join/${token}`)}`);
  const admin = createAdminClient();
  const { data: invitation } = await admin.from("organization_invitations").select("*").eq("token_hash", hash(token)).eq("status", "active").maybeSingle();
  if (!invitation || new Date(invitation.expires_at) <= new Date()) redirect(`/join/${token}?error=expired`);
  const { data: person } = await admin.from("organization_people").select("*").eq("id", invitation.person_id).eq("organization_id", invitation.organization_id).single();
  if (!user.email || user.email.toLowerCase() !== person.email.toLowerCase()) redirect(`/join/${token}?error=email`);
  const now = new Date().toISOString();
  const { data: accepted, error } = await admin.from("organization_invitations").update({ status: "accepted", accepted_by: user.id, accepted_at: now }).eq("id", invitation.id).eq("status", "active").select("id").maybeSingle();
  if (error || !accepted) redirect(`/join/${token}?error=used`);
  await admin.from("organization_people").update({ user_id: user.id, account_status: "active", updated_at: now }).eq("id", person.id);
  const [{ data: organisation }, { data: functions = [] }, { data: permissions = [] }, managerResult] = await Promise.all([
    admin.from("organizations").select("id,name").eq("id", invitation.organization_id).single(),
    admin.from("organization_person_authorizations").select("*").eq("person_id", person.id),
    admin.from("organization_person_permissions").select("*").eq("person_id", person.id),
    person.manager_person_id ? admin.from("organization_people").select("first_name,last_name").eq("id", person.manager_person_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  await admin.from("organization_access_events").insert({ organization_id: invitation.organization_id, person_id: person.id, actor_id: user.id, event_type: "account_activated", event_summary: `${person.first_name} ${person.last_name} verified the QR invitation and activated platform access.`, event_data: { invitation_reference: invitation.invitation_reference } });
  try { await sendWelcomeEmail({ person, organisation, functions, permissions, manager: managerResult.data }); } catch (emailError) { console.error("RPG welcome email failed:", emailError); }
  redirect("/portal/my-access?welcome=1");
}
