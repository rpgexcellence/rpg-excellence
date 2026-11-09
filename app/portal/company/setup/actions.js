"use server";
import { revalidatePath } from "next/cache";
import { businessProfileContext } from "../../../../lib/businessProfileAccess";
import { createAdminClient } from "../../../../lib/supabase/admin";
export async function addOwnerPerson(_previousState, formData) {
  const { user, organization, isOwner } = await businessProfileContext();
  if (!organization || !isOwner || organization.owner_id !== user.id || !user.email) return {error: "Only the signed-in company owner can add their own directory record here."};
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) return {error: "Enter your first and last name, up to 100 characters each."};
  const admin = createAdminClient();
  // The database transaction binds the account to its owned company, serialises
  // retries and refuses to replace, link or reactivate an existing directory row.
  const {error} = await admin.rpc("add_company_owner_person", {p_company: organization.id, p_actor: user.id, p_first_name: firstName, p_last_name: lastName});
  if (error) return {error: "Your details could not be added. If a record already exists, review it in People, Roles & Access."};
  revalidatePath("/portal", "layout");
  return {success: "Your company-user record is ready for site and asset responsibilities."};
}
