"use server";
import { readBusinessDetails } from "../../../../lib/businessProfileDetails";
import { revalidatePath } from "next/cache";
import { businessProfileContext } from "../../../../lib/businessProfileAccess";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function saveBusinessProfile(previousState, formData) {
  const context = await businessProfileContext();
  if (!context.organization) return { error: "Create your business from the Dashboard before editing its profile." };
  const text = key => typeof formData.get(key) === "string" ? formData.get(key).trim() : "";
  const name = text("name"), industry = text("industry"), country = text("country");
  if (!name) return { error: "Organisation name is required." };
  if (name.length > 180 || industry.length > 2000 || country.length > 100) return { error: "Use up to 180 characters for the organisation name, 2000 for selected sectors and 100 for country." };
  const parsed = readBusinessDetails(formData);
  if (parsed.error) return { error: parsed.error };
  const admin = createAdminClient();
  const { data, error } = await admin.from("organizations")
    .update({ name, industry: industry || null, country: country || null, ...parsed.details })
    .eq("id", context.organization.id).eq("owner_id", context.organization.owner_id)
    .select("id").maybeSingle();
  if (error || !data) return { error: error?.message || "The business profile could not be saved. Refresh the page and try again." };
  revalidatePath("/portal", "layout");
  return { success: "Business profile saved.", error: "" };
}
