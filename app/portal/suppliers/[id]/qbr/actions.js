"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

const clean = (value, max = 4000) => String(value ?? "").trim().slice(0, max);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value));
const allowedDecisions = new Set(["maintain", "conditional", "escalate", "suspend", "remove"]);
const allowedMonitoring = new Set(["routine", "enhanced", "restricted"]);
const allowedActionStatuses = new Set(["open", "in_progress", "awaiting_review", "closed"]);

function parseJson(fd, name, fallback) {
  try { return JSON.parse(clean(fd.get(name), 50000) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

async function resolveActionParty(supabase, supplier, value, label) {
  const [type, id] = clean(value, 100).split(":");
  if (type === "company") {
    const { data } = await supabase.from("organization_people").select("id,first_name,last_name").eq("id", id).eq("organization_id", supplier.organization_id).maybeSingle();
    if (!data) throw new Error(`Select a valid ${label} from Company People.`);
    return { type: "company_person", personId: data.id, contactId: null, name: `${data.first_name} ${data.last_name}`.trim() };
  }
  if (type === "supplier") {
    const { data } = await supabase.from("supplier_contacts").select("id,first_name,last_name").eq("id", id).eq("supplier_id", supplier.id).eq("is_active", true).maybeSingle();
    if (!data) throw new Error(`Select a valid ${label} from the supplier contact list.`);
    return { type: "supplier_contact", personId: null, contactId: data.id, name: `${data.first_name} ${data.last_name || ""}`.trim() };
  }
  throw new Error(`Select the ${label} from Company People or supplier contacts.`);
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
  const submittedActions = parseJson(fd, "actions", []).filter((item) => clean(item.action) || clean(item.reference));
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
    commercial_review: parseJson(fd, "commercial_review", {}), actions: submittedActions,
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

  for (const item of submittedActions) {
    if (!clean(item.action) || !validDate(item.due)) return { error: "Every QBR action requires the action, due date, owner and reviewer." };
    let accountable;
    let reviewer;
    try {
      accountable = await resolveActionParty(supabase, supplier, item.accountable, "action owner");
      reviewer = await resolveActionParty(supabase, supplier, item.reviewer, "action reviewer");
    } catch (error) { return { error: error.message }; }
    const status = allowedActionStatuses.has(item.status) ? item.status : "open";
    if (status === "closed" && (!clean(item.closure_evidence) || !item.reviewer)) return { error: "Closing a QBR action requires a reviewer and closure/effectiveness evidence." };
    const actionId = /^[0-9a-f-]{36}$/i.test(clean(item.id)) ? clean(item.id) : crypto.randomUUID();
    const { data: existing } = await supabase.from("supplier_qbr_actions").select("id,status,action_reference,closed_at,closed_by_user_id,closed_by_name").eq("id", actionId).eq("qbr_id", savedId).maybeSingle();
    const actionReference = clean(item.reference, 80) || existing?.action_reference || `QBR-ACT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const actionRow = {
      id: actionId, qbr_id: savedId, supplier_id: supplier.id, organization_id: supplier.organization_id, owner_id: user.id,
      action_reference: actionReference, action_required: clean(item.action),
      accountable_type: accountable.type, accountable_person_id: accountable.personId, accountable_contact_id: accountable.contactId, accountable_name: accountable.name,
      reviewer_type: reviewer.type, reviewer_person_id: reviewer.personId, reviewer_contact_id: reviewer.contactId, reviewer_name: reviewer.name,
      due_date: clean(item.due, 10), status, closure_evidence: clean(item.closure_evidence) || null,
      closed_at: status === "closed" ? (existing?.closed_at || now) : null,
      closed_by_user_id: status === "closed" ? (existing?.closed_by_user_id || user.id) : null,
      closed_by_name: status === "closed" ? (existing?.closed_by_name || user.email || "Authenticated user") : null,
      updated_at: now,
    };
    const { error: actionError } = await supabase.from("supplier_qbr_actions").upsert(actionRow);
    if (actionError) return { error: `QBR saved, but action ${actionReference} could not be saved: ${actionError.message}` };
    if (!existing || existing.status !== status) {
      const eventType = !existing ? "created" : status === "closed" ? "closed" : "status_changed";
      await supabase.from("supplier_qbr_action_events").insert({
        action_id: actionId, qbr_id: savedId, supplier_id: supplier.id, organization_id: supplier.organization_id, owner_id: user.id,
        event_type: eventType, from_status: existing?.status || null, to_status: status,
        event_summary: !existing ? `${actionReference} created and assigned to ${accountable.name}.` : `${actionReference} changed from ${existing.status} to ${status}${status === "closed" ? ` following review by ${reviewer.name}` : ""}.`,
        actor_user_id: user.id, actor_name: user.email || "Authenticated user",
      });
    }
  }

  if (intent === "complete") {
    await supabase.from("suppliers").update({ next_review_date: nextQbrDate, updated_at: now }).eq("id", supplier.id).eq("owner_id", user.id);
  }
  redirect(`/portal/suppliers/${supplier.id}/qbr?review=${savedId}&saved=${intent}`);
}
