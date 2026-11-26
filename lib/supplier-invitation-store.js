import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { commercialAccess } from "./commercial-access.mjs";

export const INVITATION_ORIGIN = "https://www.rpgexcellence.com";
export const INVITATION_TABLE = "supplier_assurance_invitations";
export const EVIDENCE_BUCKET = "supplier-submission-evidence";
export const invitationTokenPattern = /^[a-f0-9]{64}$/;
export const invitationIdPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const emailAddress = value => String(value ?? "").trim().toLowerCase();
export const hashToken = value => createHash("sha256").update(value).digest("hex");
export const event = (action, actor, details = null) => ({ action, actor, details, at: new Date().toISOString() });

export function invitationError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export async function supplierInvitationContext(supplierId) {
  if (!invitationIdPattern.test(supplierId || "")) throw invitationError("Supplier record unavailable.", 404);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!commercialAccess(user)) throw invitationError("Supplier invitations are unavailable to this account.", 403);
  const { data: supplier, error } = await supabase.from("suppliers")
    .select("id, organization_id, owner_id, legal_name, trading_name, supplier_reference, supplier_types, applicable_standards")
    .eq("id", supplierId).eq("owner_id", user.id).maybeSingle();
  if (error || !supplier) throw invitationError("Supplier record unavailable.", 404);
  return { user, supplier, admin: createAdminClient() };
}

export async function invitationStoreReady(){
  try {
    const admin = createAdminClient();
    const { error } = await admin.from(INVITATION_TABLE).select("id", { head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function saveInvitation(admin, row, changes, { requireCurrent = false } = {}) {
  let query = admin.from(INVITATION_TABLE)
    .update({ ...changes, revision: row.revision + 1 })
    .eq("id", row.id).eq("revision", row.revision);
  if (requireCurrent) query = query.gt("expires_at", new Date().toISOString());
  const { data, error } = await query.select("*").maybeSingle();
  if (error || !data) throw invitationError("The invitation changed. Reload it and try again.", 409);
  return data;
}

export async function readSupplierInvitation(token){
  if (!invitationTokenPattern.test(token)) return null;
  const admin = createAdminClient();
  const { data: row } = await admin.from(INVITATION_TABLE).select("*").eq("token_hash", hashToken(token))
    .in("status", ["draft", "sent", "in_progress", "submitted", "clarification", "reviewed"])
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  return row ? { admin, row } : null;
}

export async function verifiedSupplierInvitation(token) {
  const found = await readSupplierInvitation(token);
  if (!found) throw invitationError("This invitation is expired or unavailable.", 404);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at || emailAddress(user.email) !== found.row.recipient) {
    throw invitationError("Sign in using the email address on this invitation.", 403);
  }
  const { data: document } = await found.admin.from("supplier_code_of_conduct_documents")
    .select("id,document_reference,version,sections,declaration,status").eq("id",found.row.document_id)
    .eq("supplier_id",found.row.supplier_id).eq("organization_id",found.row.organization_id).maybeSingle();
  if (!document) throw invitationError("The issued Code of Conduct is unavailable. Contact RPG Excellence.", 404);
  if (document.status !== "issued" && !["submitted", "reviewed"].includes(found.row.status)) {
    throw invitationError("The Code of Conduct has been superseded. Ask RPG Excellence for a new invitation.", 409);
  }
  return { ...found, user, document };
}
