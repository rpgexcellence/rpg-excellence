"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

const clean = (value, max = 4000) => String(value ?? "").trim().slice(0, max);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value));
const allowedDecisions = new Set(["maintain", "conditional", "escalate", "suspend", "remove"]);
const allowedMonitoring = new Set(["routine", "enhanced", "restricted"]);

function parseJson(fd, name, fallback) {
  try { return JSON.parse(clean(fd.get(name), 50000) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

async function context(supplierId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=/portal/suppliers/${supplierId}/qbr`);
  const { data: supplier, error } = await supabase.from("suppliers").select("id,organization_id,owner_id,legal_name,supplier_reference").eq("id", supplierId).eq("owner_id", user.id).maybeSingle();
  if (error || !supplier) throw new Error(error?.message || "Supplier record not found.");
  return { supabase, user, supplier };
}

export async function saveSupplierQbr(supplierId, _previousState, fd) {
  const { supabase, user, supplier } = await context(supplierId);
  const id = clean(fd.get("qbr_id"), 60);
  const intent = clean(fd.get("intent"), 20) === "complete" ? "complete" : "draft";
  const quarter = clean(fd.get("quarter"), 20);
  const reviewDate = clean(fd.get("review_date"), 10);
  const nextQbrDate = clean(fd.get("next_qbr_date"), 10);
  if (!quarter || !validDate(reviewDate) || !validDate(nextQbrDate)) return { error: "Select the quarter, review date and next QBR date." };
  if (nextQbrDate <= reviewDate) return { error: "The next QBR date must be after the current review date." };

  const decision = clean(fd.get("recommended_decision"), 30);
  const monitoring = clean(fd.get("monitoring_level"), 30);
  const approverPersonId = clean(fd.get("approver_person_id"), 60) || null;
  const buyerPersonId = clean(fd.get("buyer_person_id"), 60) || null;
  const supplierContactId = clean(fd.get("supplier_contact_id"), 60) || null;
  if (intent === "complete" && (!approverPersonId || !clean(fd.get("executive_conclusion")) || !clean(fd.get("decision_rationale")))) {
    return { error: "Complete the executive conclusion, decision rationale and authorised approver before completing the QBR." };
  }
  if (approverPersonId) {
    const { data: approver } = await supabase.from("organization_people").select("id").eq("id", approverPersonId).eq("organization_id", supplier.organization_id).maybeSingle();
    if (!approver) return { error: "Select a valid company approver." };
  }
  if (buyerPersonId) {
    const { data: buyer } = await supabase.from("organization_people").select("id").eq("id", buyerPersonId).eq("organization_id", supplier.organization_id).maybeSingle();
    if (!buyer) return { error: "Select a valid buyer from the company user list." };
  }
  if (supplierContactId) {
    const { data: contact } = await supabase.from("supplier_contacts").select("id").eq("id", supplierContactId).eq("supplier_id", supplier.id).eq("is_active", true).maybeSingle();
    if (!contact) return { error: "Select a valid active supplier contact." };
  }

  const now = new Date().toISOString();
  const reference = clean(fd.get("qbr_reference"), 50) || `QBR-${new Date(reviewDate).getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const row = {
    supplier_id: supplier.id, organization_id: supplier.organization_id, owner_id: user.id,
    qbr_reference: reference, quarter, review_date: reviewDate, next_qbr_date: nextQbrDate,
    participants: clean(fd.get("participants")) || null, buyer_person_id: buyerPersonId,
    supplier_contact_id: supplierContactId, approver_person_id: approverPersonId,
    executive_conclusion: clean(fd.get("executive_conclusion")) || null,
    recommended_decision: allowedDecisions.has(decision) ? decision : "maintain",
    decision_rationale: clean(fd.get("decision_rationale")) || null,
    monitoring_level: allowedMonitoring.has(monitoring) ? monitoring : "routine",
    approval_expiry: validDate(fd.get("approval_expiry")) ? clean(fd.get("approval_expiry"), 10) : null,
    approval_conditions: clean(fd.get("approval_conditions")) || null,
    scorecard: parseJson(fd, "scorecard", {}), assurance_review: parseJson(fd, "assurance_review", {}),
    aerospace_review: parseJson(fd, "aerospace_review", {}), risk_review: parseJson(fd, "risk_review", {}),
    commercial_review: parseJson(fd, "commercial_review", {}), actions: parseJson(fd, "actions", []),
    status: intent === "complete" ? "completed" : "draft",
    completed_at: intent === "complete" ? now : null, updated_at: now,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("supplier_quarterly_business_reviews").update(row).eq("id", id).eq("supplier_id", supplier.id).eq("owner_id", user.id);
    if (error) return { error: error.code === "23505" ? "A QBR already exists for this supplier and quarter." : error.message };
  } else {
    const { data, error } = await supabase.from("supplier_quarterly_business_reviews").insert(row).select("id").single();
    if (error) return { error: error.code === "23505" ? "A QBR already exists for this supplier and quarter." : error.message };
    savedId = data.id;
  }

  if (intent === "complete") {
    await supabase.from("suppliers").update({ next_review_date: nextQbrDate, updated_at: now }).eq("id", supplier.id).eq("owner_id", user.id);
  }
  redirect(`/portal/suppliers/${supplier.id}/qbr?review=${savedId}&saved=${intent}`);
}
