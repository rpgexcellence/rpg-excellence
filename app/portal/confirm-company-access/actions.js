"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { sendWelcomeEmail } from "../../../lib/people-onboarding-email";

export async function confirmCompanyAccess(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login?next=/portal/confirm-company-access");

  const email = String(user.email || "").trim().toLowerCase();
  const personId = String(formData.get("person_id") || "");
  const confirmed = formData.get("confirm_details") === "yes";

  if (!email || !personId || !confirmed) {
    redirect("/portal/confirm-company-access?error=confirm");
  }

  const admin = createAdminClient();
  const { data: person } = await admin
    .from("organization_people")
    .select("*")
    .eq("id", personId)
    .eq("email", email)
    .eq("account_type", "system")
    .eq("account_status", "invited")
    .maybeSingle();

  if (!person) redirect("/portal/confirm-company-access?error=invitation");

  const { data: invitation } = await admin
    .from("organization_invitations")
    .select("*")
    .eq("person_id", person.id)
    .eq("organization_id", person.organization_id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) {
    redirect("/portal/confirm-company-access?error=invitation");
  }

  const now = new Date().toISOString();
  const { data: accepted, error: invitationError } = await admin
    .from("organization_invitations")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: now,
    })
    .eq("id", invitation.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (invitationError || !accepted) {
    redirect("/portal/confirm-company-access?error=invitation");
  }

  const { error: personError } = await admin
    .from("organization_people")
    .update({
      user_id: user.id,
      account_status: "active",
      updated_at: now,
    })
    .eq("id", person.id)
    .eq("account_status", "invited");

  if (personError) {
    await admin
      .from("organization_invitations")
      .update({ status: "active", accepted_by: null, accepted_at: null })
      .eq("id", invitation.id);
    redirect("/portal/confirm-company-access?error=activation");
  }

  const [organisationResult, functionsResult, permissionsResult, managerResult] =
    await Promise.all([
      admin
        .from("organizations")
        .select("id,name")
        .eq("id", person.organization_id)
        .single(),
      admin
        .from("organization_person_authorizations")
        .select("*")
        .eq("person_id", person.id),
      admin
        .from("organization_person_permissions")
        .select("*")
        .eq("person_id", person.id),
      person.manager_person_id
        ? admin
            .from("organization_people")
            .select("first_name,last_name")
            .eq("id", person.manager_person_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  await admin.from("organization_access_events").insert({
    organization_id: person.organization_id,
    person_id: person.id,
    actor_id: user.id,
    event_type: "account_activated",
    event_summary: `${person.first_name} ${person.last_name} confirmed their company profile and activated platform access.`,
    event_data: {
      invitation_reference: invitation.invitation_reference,
      activation_method: "authenticated_email_confirmation",
    },
  });

  try {
    await sendWelcomeEmail({
      person,
      organisation: organisationResult.data,
      functions: functionsResult.data || [],
      permissions: permissionsResult.data || [],
      manager: managerResult.data,
    });
  } catch (emailError) {
    console.error("RPG welcome email failed:", emailError);
  }

  redirect("/portal/my-access?welcome=1");
}
