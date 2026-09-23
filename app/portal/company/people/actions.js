"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { ACCESS_LEVELS, AUTHORISATION_STATUSES, PLATFORM_MODULES, PROFESSIONAL_FUNCTIONS } from "../../../../lib/people-access";
import { sendQrInvitation } from "../../../../lib/people-onboarding-email";

const clean = (value, max = 250) => String(value || "").trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const allowedModules = new Set(PLATFORM_MODULES.map(([key]) => key));
const allowedLevels = new Set(ACCESS_LEVELS.map(([key]) => key));
const allowedFunctions = new Set(PROFESSIONAL_FUNCTIONS.map(([key]) => key));
const allowedStatuses = new Set(AUTHORISATION_STATUSES.map(([key]) => key));
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

async function requirePeopleAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/company/people");
  const admin = createAdminClient();
  const { data: owned } = await admin.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (owned) return { user, admin, organization: owned };
  const { data: person } = await admin.from("organization_people").select("id,organization_id").eq("user_id", user.id).eq("account_status", "active").limit(1).maybeSingle();
  if (!person) redirect("/portal");
  const { data: authorization } = await admin.from("organization_person_authorizations").select("id,expires_at").eq("person_id", person.id).eq("function_key", "company_administrator").eq("status", "authorised").maybeSingle();
  const { data: access } = await admin.from("organization_person_permissions").select("id").eq("person_id", person.id).eq("module_key", "people_access").eq("access_level", "admin").maybeSingle();
  if (!authorization || !access || (authorization.expires_at && authorization.expires_at < new Date().toISOString().slice(0, 10))) redirect("/portal");
  const { data: organization } = await admin.from("organizations").select("id,name").eq("id", person.organization_id).single();
  return { user, admin, organization };
}

export async function createPersonInvitation(_previousState, formData) {
  const { user, admin, organization } = await requirePeopleAdmin();
  const firstName = clean(formData.get("first_name"), 100);
  const lastName = clean(formData.get("last_name"), 100);
  const email = clean(formData.get("email"), 254).toLowerCase();
  const accountType = clean(formData.get("account_type"), 20) === "system" ? "system" : "directory";
  if (!firstName || !lastName || !validEmail(email)) return { error: "Enter the person’s first name, surname and a valid work email." };

  const selectedFunctions = formData.getAll("selected_functions").map(String).filter((key) => allowedFunctions.has(key));
  const permissions = PLATFORM_MODULES.map(([moduleKey]) => {
    const accessLevel = clean(formData.get(`module_${moduleKey}`), 20);
    return { organization_id: organization.id, module_key: moduleKey, access_level: allowedLevels.has(accessLevel) ? accessLevel : "none", scope_type: clean(formData.get(`scope_${moduleKey}`), 30) || "organisation", scope_values: [], granted_by: user.id };
  }).filter((item) => item.access_level !== "none");
  const authorizations = selectedFunctions.map((functionKey) => {
    const statusValue = clean(formData.get(`function_status_${functionKey}`), 30);
    const expiresAt = clean(formData.get(`function_expiry_${functionKey}`), 20);
    return { organization_id: organization.id, function_key: functionKey, status: allowedStatuses.has(statusValue) ? statusValue : "proposed", authorised_by: user.id, authorised_at: statusValue === "authorised" ? new Date().toISOString() : null, expires_at: expiresAt || null, standards_scope: [], competence_evidence: clean(formData.get(`function_evidence_${functionKey}`), 1000) || null };
  });

  const relationshipIds = ["manager_person_id", "functional_manager_person_id", "deputy_person_id"];
  const relationships = Object.fromEntries(relationshipIds.map((key) => [key, clean(formData.get(key), 50) || null]));
  const suppliedIds = Object.values(relationships).filter(Boolean);
  if (suppliedIds.length) {
    const { data: validPeople = [] } = await admin.from("organization_people").select("id").eq("organization_id", organization.id).in("id", suppliedIds);
    const valid = new Set(validPeople.map((item) => item.id));
    for (const key of relationshipIds) if (relationships[key] && !valid.has(relationships[key])) relationships[key] = null;
  }

  const { data: person, error: personError } = await admin.from("organization_people").insert({
    organization_id: organization.id,
    first_name: firstName,
    last_name: lastName,
    email,
    position: clean(formData.get("position"), 180) || null,
    department: clean(formData.get("department"), 180) || null,
    site: clean(formData.get("site"), 180) || null,
    employee_reference: clean(formData.get("employee_reference"), 100) || null,
    ...relationships,
    account_type: accountType,
    account_status: accountType === "system" ? "invited" : "directory",
    comments: clean(formData.get("comments"), 2000) || null,
    created_by: user.id,
  }).select("*").single();
  if (personError) return { error: personError.code === "23505" ? "A person with this email already exists in the company directory." : personError.message };

  if (permissions.length) {
    const { error } = await admin.from("organization_person_permissions").insert(permissions.map((item) => ({ ...item, person_id: person.id })));
    if (error) return { error: `Person created, but module access could not be saved: ${error.message}` };
  }
  if (authorizations.length) {
    const { error } = await admin.from("organization_person_authorizations").insert(authorizations.map((item) => ({ ...item, person_id: person.id })));
    if (error) return { error: `Person created, but professional authorisations could not be saved: ${error.message}` };
  }

  await admin.from("organization_access_events").insert({ organization_id: organization.id, person_id: person.id, actor_id: user.id, event_type: "person_created", event_summary: `${firstName} ${lastName} added as ${accountType === "system" ? "an invited system user" : "a directory person"}.`, event_data: { permissions: permissions.length, authorizations: authorizations.length } });
  if (accountType !== "system") redirect("/portal/company/people?created=directory");

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const reference = `IR-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const { error: invitationError } = await admin.from("organization_invitations").insert({ organization_id: organization.id, person_id: person.id, invitation_reference: reference, token_hash: tokenHash(token), created_by: user.id, expires_at: expiresAt });
  if (invitationError) return { error: `Person created, but the QR invitation could not be generated: ${invitationError.message}` };
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com";
  let emailStatus = "sent";
  try {
    await sendQrInvitation({ person, organisation: organization, invitationUrl: `${site}/join/${token}`, functions: authorizations, permissions, expiresAt });
  } catch (error) {
    console.error("RPG QR invitation email failed:", error);
    emailStatus = "failed";
  }
  await admin.from("organization_access_events").insert({ organization_id: organization.id, person_id: person.id, actor_id: user.id, event_type: "qr_invitation_generated", event_summary: `${reference} generated; email ${emailStatus}.`, event_data: { reference, expires_at: expiresAt, email_status: emailStatus } });
  redirect(`/portal/company/people?invite=${encodeURIComponent(token)}&email=${emailStatus}`);
}

export async function suspendPerson(formData) {
  const { user, admin, organization } = await requirePeopleAdmin();
  const personId = clean(formData.get("person_id"), 60);
  const { data: person } = await admin.from("organization_people").select("id,first_name,last_name").eq("id", personId).eq("organization_id", organization.id).maybeSingle();
  if (!person) redirect("/portal/company/people?error=person");
  await admin.from("organization_people").update({ account_status: "suspended", updated_at: new Date().toISOString() }).eq("id", person.id);
  await admin.from("organization_invitations").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("person_id", person.id).eq("status", "active");
  await admin.from("organization_access_events").insert({ organization_id: organization.id, person_id: person.id, actor_id: user.id, event_type: "access_suspended", event_summary: `${person.first_name} ${person.last_name} access suspended.` });
  redirect("/portal/company/people?suspended=1");
}
