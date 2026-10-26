"use server";

import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

import { getOrganizationAccess } from "../../../lib/organization-access";
import { getUserSubscription, hasPlanAccess } from "../../../lib/subscription";
import { buildNonconformityAnalytics, buildNonconformityExecutiveBrief, nonconformityDate } from "../../../lib/nonconformity-reporting.mjs";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

const MANUAL_NC_TYPES = new Set(["major_nc", "minor_nc"]);
const MANUAL_NC_SOURCES = new Set(["operations", "supplier", "customer_complaint", "product_service", "process_monitoring", "incident", "management_review", "external_audit", "other"]);
const MANUAL_NC_RISKS = new Set(["low", "medium", "high", "critical"]);
const MAX_MANUAL_EVIDENCE_BYTES = 10 * 1024 * 1024;

export async function createManualNonconformity(formData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions?raise=1");

  const findingType = clean(formData.get("finding_type"));
  const sourceCategory = clean(formData.get("source_category"));
  const title = clean(formData.get("title"));
  const criteria = clean(formData.get("criteria"));
  const objectiveEvidence = clean(formData.get("objective_evidence"));
  const failureStatement = clean(formData.get("failure_statement"));
  const riskLevel = clean(formData.get("risk_level")) || "medium";
  const supplierId = clean(formData.get("supplier_id"));
  const supplierContactId = clean(formData.get("supplier_contact_id"));
  if (!MANUAL_NC_TYPES.has(findingType) || !MANUAL_NC_SOURCES.has(sourceCategory) || !title || !criteria || !objectiveEvidence || !failureStatement || !MANUAL_NC_RISKS.has(riskLevel)) {
    redirect("/portal/internal-audit-actions?raise=1&error=manual_incomplete#raise-manual-nc");
  }

  const admin = createAdminClient();
  if (sourceCategory === "supplier") {
    if (!supplierId || !supplierContactId) redirect("/portal/internal-audit-actions?raise=1&error=manual_incomplete#raise-manual-nc");
    const { data: supplier, error: supplierError } = await client.from("suppliers").select("id").eq("id", supplierId).eq("owner_id", user.id).maybeSingle();
    if (supplierError || !supplier) throw new Error(supplierError?.message || "The selected supplier is not available to this account.");
  }
  let supplierContact = null;
  if (sourceCategory === "supplier") {
    const { data, error } = await client.from("supplier_contacts").select("id,first_name,last_name,email,business_title,is_active").eq("id", supplierContactId).eq("supplier_id", supplierId).eq("owner_id", user.id).eq("is_active", true).maybeSingle();
    if (error || !data) throw new Error(error?.message || "Select an active contact belonging to the chosen supplier.");
    supplierContact = data;
  }
  const now = new Date();
  const reference = `MNC-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const { data: finding, error: findingError } = await admin.from("internal_audit_findings").insert({
    owner_id: user.id,
    audit_id: null,
    supplier_id: sourceCategory === "supplier" ? supplierId : null,
    supplier_contact_id: sourceCategory === "supplier" ? supplierContactId : null,
    finding_reference: reference,
    finding_type: findingType,
    title,
    criteria,
    objective_evidence: objectiveEvidence,
    failure_statement: failureStatement,
    process_area: clean(formData.get("process_area")),
    responsible_owner_name: supplierContact ? `${supplierContact.first_name} ${supplierContact.last_name || ""}`.trim() : clean(formData.get("responsible_owner_name")),
    responsible_owner_email: supplierContact?.email || clean(formData.get("responsible_owner_email")),
    agreed_date: clean(formData.get("agreed_date")),
    risk_level: riskLevel,
    status: "response_due",
    source_type: "manual",
    source_category: sourceCategory,
    source_reference: clean(formData.get("source_reference")),
    detected_at: clean(formData.get("detected_at")) || now.toISOString().slice(0, 10),
    requirement_source: clean(formData.get("requirement_source")) || "other_criteria",
    evidence_source: clean(formData.get("evidence_source")) || "multiple_sources",
  }).select("id,finding_reference").single();
  if (findingError || !finding) throw new Error(findingError?.message || "The manual nonconformity could not be created.");

  const evidenceFile = formData.get("evidence_file");
  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > MAX_MANUAL_EVIDENCE_BYTES) redirect("/portal/internal-audit-actions?raise=1&error=file_size#raise-manual-nc");
    const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/manual-findings/${finding.id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("internal-audit-evidence").upload(storagePath, evidenceFile, { contentType: evidenceFile.type || "application/octet-stream" });
    if (uploadError) throw new Error(`Manual NC created, but evidence upload failed: ${uploadError.message}`);
    const { error: attachmentError } = await admin.from("internal_audit_findings").update({
      evidence_attachment_path: storagePath,
      evidence_attachment_name: evidenceFile.name,
      evidence_attachment_type: evidenceFile.type || "application/octet-stream",
      evidence_attachment_size: evidenceFile.size,
      updated_at: new Date().toISOString(),
    }).eq("id", finding.id).eq("owner_id", user.id);
    if (attachmentError) throw new Error(`Manual NC created, but evidence metadata could not be saved: ${attachmentError.message}`);
  }

  revalidatePath("/portal/internal-audit-actions");
  revalidatePath("/portal/suppliers");
  redirect(`/portal/internal-audit-actions?manual_created=${encodeURIComponent(reference)}#all-ncs`);
}

export async function submitPortalAuditAction(formData) {
  const accessId = clean(formData.get("action_access_id"));
  if (!accessId) throw new Error("Assigned action is required.");
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions");
  const admin = createAdminClient();
  const { data: access, error } = await admin.from("internal_audit_action_access").select("*")
    .eq("id", accessId).eq("assignee_user_id", user.id).maybeSingle();
  if (error || !access) throw new Error(error?.message || "Assigned action not found.");
  const correction = clean(formData.get("correction_and_containment"));
  const rootCause = clean(formData.get("root_cause_response"));
  const plan = clean(formData.get("corrective_action_plan"));
  const effectiveness = clean(formData.get("effectiveness_measure"));
  if (!correction || !rootCause || !plan || !effectiveness) redirect(`/portal/internal-audit-actions?error=incomplete#action-${accessId}`);
  const evidenceFile = formData.get("evidence_file");
  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > 10 * 1024 * 1024) redirect(`/portal/internal-audit-actions?error=file_size#action-${accessId}`);
    const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${access.owner_id}/${access.audit_id}/action-owner/${access.id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("internal-audit-evidence").upload(storagePath, evidenceFile, { contentType: evidenceFile.type || "application/octet-stream" });
    if (uploadError) throw new Error(uploadError.message);
    const { error: evidenceError } = await admin.from("internal_audit_action_evidence").insert({ owner_id: access.owner_id, action_access_id: access.id, storage_path: storagePath, original_file_name: evidenceFile.name, mime_type: evidenceFile.type, file_size_bytes: evidenceFile.size, evidence_description: clean(formData.get("evidence_description")), uploaded_by_user_id: user.id });
    if (evidenceError) throw new Error(evidenceError.message);
  }
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("internal_audit_action_access").update({
    correction_and_containment: correction, root_cause_response: rootCause,
    extent_and_systemic_review: clean(formData.get("extent_and_systemic_review")),
    corrective_action_plan: plan, effectiveness_measure: effectiveness,
    owner_submission_notes: clean(formData.get("owner_submission_notes")),
    status: "submitted", acknowledged_at: access.acknowledged_at || now,
    submitted_at: now, updated_at: now,
  }).eq("id", access.id).eq("assignee_user_id", user.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath("/portal/internal-audit-actions");
  redirect(`/portal/internal-audit-actions?saved=1#action-${access.id}`);
}

// New register/board/offline workflow. The established owner-response actions
// above remain unchanged. No function below approves or closes an NC or CAPA.
const NC_ROOT = '/portal/internal-audit-actions';
const NC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NC_SHA256 = /^[0-9a-f]{64}$/;
const NC_EVIDENCE_TYPES = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
  ['application/pdf', 'pdf'], ['text/plain', 'txt'], ['text/csv', 'csv'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
]);
function ncFailure(code, message, retryable = false) {
  const error = new Error(message);
  error.ncCode = code; error.retryable = retryable;
  return error;
}
function ncErrorResponse(error) {
  if (error?.ncCode) return { ok: false, error: { code: error.ncCode, message: error.message, retryable: Boolean(error.retryable) } };
  console.error('NC_WORKSPACE_OPERATION_FAILED', { code: error?.code || 'unexpected_error' });
  return { ok: false, error: { code: 'operation_failed', message: 'The NC operation could not be completed. Keep your device draft and try again.', retryable: true } };
}
async function ncContext(level = 'view') {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw ncFailure('authentication_required', 'Sign in again before accessing or submitting controlled NC records. Your device draft can be retained.');
  const [access, subscription] = await Promise.all([
    getOrganizationAccess('internal_audit', level), getUserSubscription(user.id),
  ]);
  if (!hasPlanAccess(subscription, 'professional')) throw ncFailure('plan_required', 'NC workspace access requires Professional access or an RPG platform-administrator entitlement.');
  if (!access?.allowed || access.user?.id !== user.id || !access.organization?.id || !access.organization?.owner_id) {
    throw ncFailure('module_access_required', `Your current account does not have ${level} access to this company’s Internal Audit module.`);
  }
  if (subscription?.access_source === 'organization_subscription' && subscription.organization_id !== access.organization.id) {
    throw ncFailure('organisation_mismatch', 'The subscription and authorised company do not match.');
  }
  return { client, user, organization: access.organization, ownerId: access.organization.owner_id, subscription,
    isOwner: access.isOwner === true, canCreate: ['contribute','review','approve','admin','owner'].includes(access.level) };
}
async function ncReadAll(makeQuery, source) {
  const rows = []; let offset = 0, previousLast = null;
  for (;;) {
    const { data, error } = await makeQuery().order('id', { ascending: true }).range(offset, offset + 499);
    if (error) {
      console.error('NC_WORKSPACE_READ_FAILED', { source, code: error.code || 'query_failed' });
      throw ncFailure('records_unavailable', `The NC ${source} could not be loaded. Incomplete figures have not been displayed.`, true);
    }
    if (!Array.isArray(data)) throw ncFailure('records_unavailable', `The NC ${source} returned an invalid result.`, true);
    if (!data.length) return rows;
    const last = data[data.length - 1]?.id;
    if (!last || last === previousLast) throw ncFailure('pagination_failed', `The NC ${source} could not be read completely.`, true);
    rows.push(...data); offset += data.length; previousLast = last;
  }
}
async function ncLoadSnapshot(ctx) {
  const admin = createAdminClient();
  const org = ctx.organization;
  const findings = await ncReadAll(() => {
    let q = admin.from('internal_audit_findings').select('id,organization_id,audit_id,supplier_id,finding_reference,finding_type,risk_level,title,failure_statement,criteria,objective_evidence,process_area,responsible_owner_name,agreed_date,status,linked_rca_case_id,closure_verified,created_at,closed_at,closure_verified_at,updated_at,source_type,source_category,source_reference,detected_at')
      .eq('owner_id', ctx.ownerId).in('finding_type', ['major_nc','minor_nc']);
    // Legacy unassigned records remain visible to their original owner. Company
    // users receive only findings explicitly assigned to their organisation.
    q = ctx.isOwner ? q.or(`organization_id.eq.${org.id},organization_id.is.null`) : q.eq('organization_id', org.id);
    return q;
  }, 'register');
  const findingIds = findings.map(f => f.id);
  const byIds = async (table, columns, ids, key = 'id') => {
    const result = [];
    for (let i = 0; i < ids.length; i += 100) result.push(...await ncReadAll(() => admin.from(table).select(columns).eq('owner_id', ctx.ownerId).in(key, ids.slice(i,i+100)), table));
    return result;
  };
  const [access, audits, capaCases, suppliers, contacts, people] = await Promise.all([
    // Select no access tokens, secret hashes or external response credentials.
    byIds('internal_audit_action_access', 'id,finding_id,assignee_user_id,assignee_name,status,created_at,updated_at', findingIds, 'finding_id'),
    byIds('internal_audits', 'id,audit_reference,title', [...new Set(findings.map(f=>f.audit_id).filter(Boolean))]),
    byIds('rca_cases', 'id,status', [...new Set(findings.map(f=>f.linked_rca_case_id).filter(Boolean))]),
    ncReadAll(() => admin.from('suppliers').select('id,legal_name,supplier_reference,approval_status').eq('organization_id', org.id).eq('owner_id',ctx.ownerId), 'supplier options'),
    ncReadAll(() => admin.from('supplier_contacts').select('id,supplier_id,first_name,last_name,business_title,is_active').eq('organization_id', org.id).eq('owner_id',ctx.ownerId).eq('is_active',true), 'supplier contacts'),
    ncReadAll(() => admin.from('organization_people').select('id,first_name,last_name,position,account_status').eq('organization_id',org.id).eq('account_status','active'), 'company people'),
  ]);
  const myResponseIds = access.filter(a=>a.assignee_user_id===ctx.user.id).map(a=>a.id);
  const myResponses = [];
  for (let i=0;i<myResponseIds.length;i+=100) myResponses.push(...await ncReadAll(() => admin.from('internal_audit_action_access')
    .select('id,finding_id,status,assignee_user_id,correction_and_containment,root_cause_response,extent_and_systemic_review,corrective_action_plan,effectiveness_measure,owner_submission_notes,auditor_response,updated_at')
    .eq('owner_id',ctx.ownerId).eq('assignee_user_id',ctx.user.id).in('id',myResponseIds.slice(i,i+100)), 'my response queue'));
  const supplierIds = new Set(suppliers.map(s=>s.id));
  return {
    asOf: new Date().toISOString().slice(0,10), fetchedAt: new Date().toISOString(), currentUserId: ctx.user.id,
    organization: { id: org.id, name: org.name || 'Organisation' },
    findings, access, audits, capaCases, myResponses, suppliers, contacts: contacts.filter(c=>supplierIds.has(c.supplier_id)), people,
    canCreate: ctx.canCreate, canExecutiveReport: hasPlanAccess(ctx.subscription,'consultant'),
    legacyUnassigned: findings.filter(f=>!f.organization_id).length,
  };
}
export async function getNonconformityWorkspaceSnapshot() {
  return ncLoadSnapshot(await ncContext('view'));
}

function ncText(input, key, max, required = false) {
  const raw = input[key];
  if (raw !== undefined && raw !== null && typeof raw !== 'string') throw ncFailure('invalid_field', `The ${key.replaceAll('_',' ')} field must contain text.`);
  const value = clean(raw);
  if ((required && !value) || (value && value.length > max)) throw ncFailure('invalid_field', `Check ${key.replaceAll('_',' ')}${required ? ' (required)' : ''}. Maximum ${max} characters.`);
  return value;
}
function ncSubmission(input, ctx) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw ncFailure('invalid_submission','The NC submission is invalid.');
  if (input.user_id !== ctx.user.id || input.organization_id !== ctx.organization.id) throw ncFailure('draft_scope_mismatch','This draft belongs to another account or company. Sign in to its original workspace before submitting it.');
  const requestId = ncText(input,'client_submission_id',36,true);
  if (!NC_UUID.test(requestId)) throw ncFailure('invalid_submission_id','The device submission identity is invalid.');
  const payload = {
    finding_type:ncText(input,'finding_type',30,true), source_category:ncText(input,'source_category',40,true),
    title:ncText(input,'title',220,true), criteria:ncText(input,'criteria',12000,true),
    objective_evidence:ncText(input,'objective_evidence',16000,true), failure_statement:ncText(input,'failure_statement',12000,true),
    process_area:ncText(input,'process_area',300), risk_level:ncText(input,'risk_level',20,true),
    source_reference:ncText(input,'source_reference',300), detected_at:ncText(input,'detected_at',10,true),
    agreed_date:ncText(input,'agreed_date',10), supplier_id:ncText(input,'supplier_id',36),
    supplier_contact_id:ncText(input,'supplier_contact_id',36), responsible_person_id:ncText(input,'responsible_person_id',36),
    responsible_owner_name:ncText(input,'responsible_owner_name',220), responsible_owner_email:ncText(input,'responsible_owner_email',254),
  };
  if (!MANUAL_NC_TYPES.has(payload.finding_type) || !MANUAL_NC_SOURCES.has(payload.source_category) || !MANUAL_NC_RISKS.has(payload.risk_level)) throw ncFailure('invalid_classification','Choose a supported classification, source and risk level.');
  if (!nonconformityDate(payload.detected_at) || payload.detected_at > new Date().toISOString().slice(0,10) || (payload.agreed_date && !nonconformityDate(payload.agreed_date))) throw ncFailure('invalid_date','Check the detection and target-response dates. The detection date cannot be in the future.');
  for (const key of ['supplier_id','supplier_contact_id','responsible_person_id']) if (payload[key] && !NC_UUID.test(payload[key])) throw ncFailure('invalid_reference',`The ${key.replaceAll('_',' ')} is invalid.`);
  if (payload.source_category === 'supplier' && (!payload.supplier_id || !payload.supplier_contact_id)) throw ncFailure('supplier_contact_required','Select the supplier and an active responsible supplier contact.');
  if (payload.responsible_owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.responsible_owner_email)) throw ncFailure('invalid_email','Check the responsible owner’s email address.');
  if (payload.source_category !== 'supplier') { payload.supplier_id=null; payload.supplier_contact_id=null; }
  else { payload.responsible_person_id=null; payload.responsible_owner_name=null; payload.responsible_owner_email=null; }
  let evidence = null;
  if (input.evidence !== undefined && input.evidence !== null) {
    const file = input.evidence;
    if (typeof file !== 'object' || Array.isArray(file) || typeof file.name !== 'string' || !file.name.trim() || file.name.length > 180 || typeof file.type !== 'string' || !NC_EVIDENCE_TYPES.has(file.type) || !Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_MANUAL_EVIDENCE_BYTES || typeof file.sha256 !== 'string' || !NC_SHA256.test(file.sha256)) throw ncFailure('invalid_evidence','Choose one supported evidence file up to 10 MB and retain the original file in your draft.');
    evidence = { name:file.name.trim(),type:file.type,size:file.size,sha256:file.sha256 };
  }
  const digest = createHash('sha256').update(JSON.stringify({ version:1, actor:ctx.user.id, organization:ctx.organization.id, payload, evidence })).digest('hex');
  return { requestId,payload,evidence,digest };
}
function ncReceipt(finding, replayed, attachmentState) {
  return { ok:true, replayed, submissionState:attachmentState,
    finding:{ id:finding.id,reference:finding.finding_reference,href:`${NC_ROOT}?record=${encodeURIComponent(finding.id)}#nc-${encodeURIComponent(finding.id)}` } };
}
async function ncExisting(admin,ctx,submission) {
  const { data,error } = await admin.from('internal_audit_findings')
    .select('id,finding_reference,organization_id,status,closure_verified,client_submission_digest,evidence_attachment_path')
    .eq('owner_id',ctx.ownerId).eq('client_submission_id',submission.requestId).maybeSingle();
  if (error) throw ncFailure('submission_check_failed','The previous submission could not be checked. Keep the draft and retry.',true);
  if (data && (data.organization_id !== ctx.organization.id || data.client_submission_digest !== submission.digest)) throw ncFailure('submission_conflict','This submission identity already belongs to different report content. Open the existing NC or create a separate new draft; it has not been overwritten.');
  return data;
}
async function ncResolveOwner(admin,ctx,payload) {
  if (payload.source_category === 'supplier') {
    const { data:supplier,error:se } = await admin.from('suppliers').select('id').eq('id',payload.supplier_id).eq('organization_id',ctx.organization.id).eq('owner_id',ctx.ownerId).maybeSingle();
    if (se || !supplier) throw ncFailure('supplier_unavailable','The selected supplier is no longer available in this company. Review the draft before submitting.');
    const { data:contact,error:ce } = await admin.from('supplier_contacts').select('id,first_name,last_name,email').eq('id',payload.supplier_contact_id).eq('supplier_id',supplier.id).eq('organization_id',ctx.organization.id).eq('owner_id',ctx.ownerId).eq('is_active',true).maybeSingle();
    if (ce || !contact) throw ncFailure('contact_unavailable','The selected supplier contact is no longer active. Select a current contact before submitting.');
    return { name:`${contact.first_name || ''} ${contact.last_name || ''}`.trim(),email:contact.email || null };
  }
  if (payload.responsible_person_id) {
    const { data:person,error } = await admin.from('organization_people').select('id,first_name,last_name,email').eq('id',payload.responsible_person_id).eq('organization_id',ctx.organization.id).eq('account_status','active').maybeSingle();
    if (error || !person) throw ncFailure('owner_unavailable','The selected company person is no longer available. Review the owner before submitting.');
    return { name:`${person.first_name || ''} ${person.last_name || ''}`.trim(),email:person.email || null };
  }
  return { name:payload.responsible_owner_name,email:payload.responsible_owner_email };
}
async function ncEvidence(admin,ctx,submission,finding,allowUpload,replayed) {
  if (!submission.evidence) return ncReceipt(finding,replayed,'confirmed');
  const expected = submission.evidence;
  const folder = `${ctx.ownerId}/manual-findings/${finding.id}`;
  const basename = `${submission.requestId}.${NC_EVIDENCE_TYPES.get(expected.type)}`;
  const path = `${folder}/${basename}`;
  if (finding.evidence_attachment_path) {
    if (finding.evidence_attachment_path !== path) throw ncFailure('evidence_changed','The NC evidence has changed since this submission. Open the controlled record before making further changes.');
    return ncReceipt(finding,replayed,'confirmed');
  }
  if (finding.status === 'closed' || finding.closure_verified === true) throw ncFailure('record_closed','This NC has progressed to closure. Its evidence cannot be changed by replaying the original submission.');
  const bucket = admin.storage.from('internal-audit-evidence');
  const { data:files,error:listError } = await bucket.list(folder,{ search:basename,limit:100 });
  if (listError) throw ncFailure('evidence_check_failed','The NC was registered, but its evidence could not be checked. Keep the draft and retry.',true);
  const existing = (files || []).find(file=>file.name===basename);
  if (existing) {
    if (Number(existing.metadata?.size) !== expected.size) throw ncFailure('evidence_mismatch','The uploaded evidence size does not match the original draft. Retain the draft and contact your administrator.');
    const { data:blob,error:downloadError } = await bucket.download(path);
    if (downloadError || !blob) throw ncFailure('evidence_check_failed','The uploaded evidence could not be verified. Keep the draft and retry.',true);
    const bytes=Buffer.from(await blob.arrayBuffer());
    if (bytes.length!==expected.size || createHash('sha256').update(bytes).digest('hex')!==expected.sha256) throw ncFailure('evidence_mismatch','The uploaded evidence does not match the original draft. Retain the draft and contact your administrator.');
    const { data:attached,error:updateError } = await admin.from('internal_audit_findings').update({
      evidence_attachment_path:path,evidence_attachment_name:expected.name,evidence_attachment_type:expected.type,evidence_attachment_size:expected.size,
    }).eq('id',finding.id).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).eq('client_submission_id',submission.requestId).is('evidence_attachment_path',null).neq('status','closed').eq('closure_verified',false).select('id');
    if (updateError) throw ncFailure('evidence_metadata_failed','The file was uploaded, but its attachment record could not be completed. Keep the draft and retry.',true);
    if (!attached?.length) {
      const current=await ncExisting(admin,ctx,submission);
      if (current?.evidence_attachment_path!==path) throw ncFailure('record_changed','The NC changed during evidence confirmation. Open the controlled record before continuing.');
    }
    revalidatePath(NC_ROOT); revalidatePath('/portal/suppliers');
    return ncReceipt(finding,replayed,'confirmed');
  }
  const receipt=ncReceipt(finding,replayed,'evidence_pending');
  if (!allowUpload) return receipt;
  // Upload directly to this signed, record-specific path. File bytes do not
  // pass through a Next server action or Vercel's request-body size limit.
  const { data:signed,error:signError }=await bucket.createSignedUploadUrl(path);
  if (signError || !signed?.token) throw ncFailure('evidence_upload_unavailable','The NC was registered, but its evidence upload could not be prepared. Keep the draft and retry.',true);
  return { ...receipt,upload:{ bucket:'internal-audit-evidence',path,token:signed.token } };
}
async function ncProcessSubmission(input,allowCreate) {
  const ctx=await ncContext('contribute');
  const submission=ncSubmission(input,ctx);
  const admin=createAdminClient();
  let finding=await ncExisting(admin,ctx,submission),replayed=Boolean(finding);
  if (!finding) {
    if (!allowCreate) throw ncFailure('submission_not_found','The NC has not yet been registered. Submit the original draft first.');
    const owner=await ncResolveOwner(admin,ctx,submission.payload);
    const { responsible_person_id,responsible_owner_name,responsible_owner_email,...fields }=submission.payload;
    const day=new Date().toISOString().slice(0,10).replaceAll('-','');
    const { data,error }=await admin.from('internal_audit_findings').insert({
      ...fields,owner_id:ctx.ownerId,organization_id:ctx.organization.id,audit_id:null,
      finding_reference:`MNC-${day}-${randomUUID().slice(0,8).toUpperCase()}`,
      responsible_owner_name:owner.name,responsible_owner_email:owner.email,
      source_type:'manual',status:'response_due',closure_verified:false,
      requirement_source:'other_criteria',evidence_source:'multiple_sources',
      client_submission_id:submission.requestId,client_submission_digest:submission.digest,
    }).select('id,finding_reference,organization_id,status,closure_verified,client_submission_digest,evidence_attachment_path').single();
    if (error?.code==='23505') { finding=await ncExisting(admin,ctx,submission);replayed=true; }
    else if (error) throw ncFailure('registration_failed','The NC could not be registered. Keep the original device draft and retry.',true);
    else finding=data;
    if (!finding) throw ncFailure('registration_unconfirmed','Registration could not be confirmed. Keep the original device draft and retry.',true);
    revalidatePath(NC_ROOT);revalidatePath('/portal/suppliers');
  }
  return ncEvidence(admin,ctx,submission,finding,allowCreate,replayed);
}
export async function submitNonconformityDraft(input) {
  try { return await ncProcessSubmission(input,true); } catch(error) { return ncErrorResponse(error); }
}
export async function confirmNonconformityEvidence(input) {
  try { return await ncProcessSubmission(input,false); } catch(error) { return ncErrorResponse(error); }
}

export async function createNonconformityExecutiveReport(options={}) {
  try {
    const ctx=await ncContext('view');
    if (!hasPlanAccess(ctx.subscription,'consultant')) throw ncFailure('report_plan_required','Executive reporting requires Consultant access or an RPG platform-administrator entitlement.');
    if (!options || typeof options!=='object' || Array.isArray(options)) throw ncFailure('invalid_filters','Invalid report options.');
    const snapshot=await ncLoadSnapshot(ctx);
    const safeKeys=['from','to','classification','risk','source','owner','location','query','supplierId'];
    const filters={};
    for(const key of safeKeys) if(options[key]!==undefined && options[key]!==null) {
      if(typeof options[key]!=='string' || options[key].length>500) throw ncFailure('invalid_filters','A report filter is invalid.');
      filters[key]=options[key].trim();
    }
    const analytics=buildNonconformityAnalytics(snapshot,filters);
    return { ok:true,report:{ reference:`NC-REVIEW-${randomUUID()}`,generatedAt:new Date().toISOString(),organization:snapshot.organization,analytics,brief:buildNonconformityExecutiveBrief(analytics,snapshot.organization.name) } };
  } catch(error) { return ncErrorResponse(error); }
}
