"use server";

import { approvedThroughD8, gateDataProblems, independentlyEffective } from "../../../lib/rca-workflow.mjs";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

import { getOrganizationAccess } from "../../../lib/organization-access";
import { getUserSubscription, hasPlanAccess } from "../../../lib/subscription";
import { buildNonconformityAnalytics, buildNonconformityExecutiveBrief, nonconformityDate, buildAuditFieldworkScope, readCompleteAuditRows, parseAuditClauseScope, auditClauseMatches } from "../../../lib/nonconformity-reporting.mjs";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

const MANUAL_NC_TYPES = new Set(["major_nc", "minor_nc", "observation", "ofi"]);
const MANUAL_NC_SOURCES = new Set(["operations", "internal_audit", "supplier", "customer_complaint", "product_service", "process_monitoring", "incident", "management_review", "external_audit", "other"]);
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
  if (!MANUAL_NC_TYPES.has(findingType) || !MANUAL_NC_SOURCES.has(sourceCategory) || !title || !criteria || !objectiveEvidence || (["major_nc", "minor_nc"].includes(findingType) && !failureStatement) || !MANUAL_NC_RISKS.has(riskLevel)) {
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
  const {data:controlledFinding,error:findingReadError}=await admin.from("internal_audit_findings").select("id,status,closure_verified")
    .eq("id",access.finding_id).eq("owner_id",access.owner_id).maybeSingle();
  if(findingReadError||!controlledFinding)throw new Error("The controlled finding could not be checked. Refresh before submitting.");
  if(controlledFinding.status==="closed"||controlledFinding.closure_verified===true)throw new Error("This finding is closed. Its response cannot be changed by resubmitting the owner form.");
  if(!["assigned","acknowledged","in_progress","returned","submitted"].includes(access.status))throw new Error("This response is under controlled review. Ask the authorised reviewer to return it before making further changes.");
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
  let responseUpdate = admin.from("internal_audit_action_access").update({
    correction_and_containment: correction, root_cause_response: rootCause,
    extent_and_systemic_review: clean(formData.get("extent_and_systemic_review")),
    corrective_action_plan: plan, effectiveness_measure: effectiveness,
    owner_submission_notes: clean(formData.get("owner_submission_notes")),
    status: "submitted", acknowledged_at: access.acknowledged_at || now,
    submitted_at: now, updated_at: now,
  }).eq("id", access.id).eq("owner_id",access.owner_id).eq("assignee_user_id", user.id).eq("status",access.status);
  responseUpdate=access.updated_at?responseUpdate.eq("updated_at",access.updated_at):responseUpdate.is("updated_at",null);
  const {data:updatedResponse,error:updateError}=await responseUpdate.select("id");
  if (updateError) throw new Error(updateError.message);
  if(!updatedResponse?.length)throw new Error("The response or its assigned owner changed. Refresh before submitting again.");
  revalidatePath("/portal/internal-audit-actions");
  redirect(`/portal/internal-audit-actions?saved=1#action-${access.id}`);
}

// New register/board/offline workflow. The established owner-response actions
// above remain unchanged. No function below approves or closes an NC or CAPA.
const NC_ROOT = '/portal/internal-audit-actions';
const NC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NC_SHA256 = /^[0-9a-f]{64}$/;
const NC_REQUIREMENT_SOURCES = new Set(['management_system_standard','legal_regulatory','customer_contractual','policy_procedure','certification_scheme','other_criteria']);
const NC_EVIDENCE_SOURCES = new Set(['document_record','interview','observation','system_record','photograph_screenshot','measurement_test','external_confirmation','multiple_sources','other']);
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
    isOwner: access.isOwner === true, accessLevel: access.level,
    canCreate: ['contribute','review','approve','admin','owner'].includes(access.level),
    canReview: ['review','approve','admin','owner'].includes(access.level),
    canApprove: ['approve','admin','owner'].includes(access.level) };
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
    let q = admin.from('internal_audit_findings').select('id,organization_id,audit_id,answer_id,supplier_id,finding_reference,finding_type,risk_level,title,failure_statement,criteria,requirement_source,requirement_standard_id,clause,source_audit_id,source_audit_reference,source_audit_title,source_audit_question_id,source_audit_question_code,reported_by_user_id,objective_evidence,evidence_source,process_area,responsible_owner_name,agreed_date,status,linked_rca_case_id,closure_verified,created_at,closed_at,closure_verified_at,updated_at,source_type,source_category,source_reference,detected_at')
      .eq('owner_id', ctx.ownerId).in('finding_type', ['major_nc','minor_nc','observation','ofi']);
    // Legacy unassigned records remain visible to their original owner. Company
    // users receive only findings explicitly assigned to their organisation.
    q = ctx.isOwner ? q.or(`organization_id.eq.${org.id},organization_id.is.null`) : q.eq('organization_id', org.id);
    return q;
  }, 'register');
  const findingIds = findings.map(f => f.id);
  const standardIds=[...new Set(findings.map(f=>f.requirement_standard_id).filter(Boolean))],requirementStandards=[];
  for(let i=0;i<standardIds.length;i+=100)requirementStandards.push(...await ncReadAll(()=>ctx.client.from('internal_audit_standard_catalogue').select('id,standard_code,display_name,edition_label').in('id',standardIds.slice(i,i+100)),'requirement standard references'));
  const byIds = async (table, columns, ids, key = 'id') => {
    const result = [];
    for (let i = 0; i < ids.length; i += 100) result.push(...await ncReadAll(() => admin.from(table).select(columns).eq('owner_id', ctx.ownerId).in(key, ids.slice(i,i+100)), table));
    return result;
  };
  const [access, audits, capaCases, suppliers, contacts, people] = await Promise.all([
    // Select no access tokens, secret hashes or external response credentials.
    byIds('internal_audit_action_access', 'id,finding_id,assignee_user_id,assignee_name,status,created_at,updated_at', findingIds, 'finding_id'),
    byIds('internal_audits', 'id,audit_reference,title', [...new Set(findings.flatMap(f=>[f.audit_id,f.source_audit_id]).filter(Boolean))]),
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
    findings, access, audits, capaCases, myResponses, suppliers, contacts: contacts.filter(c=>supplierIds.has(c.supplier_id)), people, requirementStandards,
    canCreate: ctx.canCreate, canManage: ctx.canReview, canApprove: ctx.canApprove, canExecutiveReport: hasPlanAccess(ctx.subscription,'consultant'),
    legacyUnassigned: findings.filter(f=>!f.organization_id).length,
  };
}
export async function getNonconformityWorkspaceSnapshot() {
  return ncLoadSnapshot(await ncContext('view'));
}

// Audit references are scoped to the same authorised company as the NC.
export async function getNonconformityAuditOptions() {
  try {
    const ctx=await ncContext('view'),admin=createAdminClient();
    const audits=await ncReadAll(()=>admin.from('internal_audits').select('id,audit_reference,title,audit_type,status,current_gate,planned_start_at').eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id),'audit source register');
    return {ok:true,audits:audits.sort((a,b)=>(b.planned_start_at||'').localeCompare(a.planned_start_at||'')||(a.audit_reference||'').localeCompare(b.audit_reference||''))};
  }catch(error){return ncErrorResponse(error);}
}

// Read the same approved scope through the existing shared coverage engine.
// Browser query strings identify a source; they never authorise it or supply
// trusted audit labels, question references, reporter identities or evidence.
// Give source-load failures a precise, server-side diagnostic without sending
// query text, stack traces, company identifiers or record contents to the browser.
function ncAuditSourceError(stage,error) {
  const reference=`NC-${randomUUID().slice(0,8).toUpperCase()}`;
  console.error('NC_AUDIT_SOURCE_CHECK_FAILED',{
    reference,stage,code:typeof error?.code==='string'?error.code:'unexpected_error',
    name:typeof error?.name==='string'?error.name:'Error',
    message:typeof error?.message==='string'?error.message.slice(0,600):'No error message supplied',
  });
  return ncFailure('audit_source_check_failed',`${stage} could not be checked. Reference ${reference}. Keep your device draft and retry; if this continues, give this reference to the administrator.`,true);
}
async function ncAuditSourceStep(stage,work) {
  try{return await work();}
  catch(error){if(error?.ncCode)throw error;throw ncAuditSourceError(stage,error);}
}
async function ncReadAuditSourceRows(factory,label,orderKeys) {
  return ncAuditSourceStep(label,()=>readCompleteAuditRows(()=>{
    let query=factory();
    // Retain the shared pagination engine. Observe its query result before it
    // converts a database error into its deliberately generic coverage message.
    const checked={
      order(...args){query=query.order(...args);return checked;},
      async range(...args){
        const result=await query.range(...args);
        if(result?.error)throw ncAuditSourceError(label,result.error);
        return result;
      },
    };
    return checked;
  },{label,orderKeys}));
}

async function ncAuditQuestionSource(ctx,admin,auditId,questionId,{requireOpen=true}={}) {
  if(!NC_UUID.test(auditId||'')||!NC_UUID.test(questionId||''))throw ncFailure('invalid_audit_source','Select a valid audit and originating question.');
  const {data:audit,error:auditError}=await admin.from('internal_audits')
    .select('id,audit_reference,title,organization_id,plan_approved,current_gate,status,exclusion_justification,administration_location_label,processes')
    .eq('id',auditId).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).maybeSingle();
  if(auditError)throw ncAuditSourceError('Source audit record',auditError);
  if(!audit)throw ncFailure('invalid_audit_source','The source audit is unavailable in this company.');
  if(requireOpen&&(!audit.plan_approved||audit.current_gate!=='fieldwork'||audit.status==='closed'))throw ncFailure('audit_fieldwork_locked','New findings require approved, open audit fieldwork. Retain your draft and ask the audit administrator to review the audit stage.');
  const read=ncReadAuditSourceRows;
  const [criterionRows,selectedProcesses]=await Promise.all([
    read(()=>admin.from('internal_audit_selected_standards').select('*').eq('audit_id',auditId).eq('owner_id',ctx.ownerId),'Source audit criteria',['standard_id']),
    read(()=>admin.from('internal_audit_selected_processes').select('standard_id,scope_key,process_name').eq('audit_id',auditId).eq('owner_id',ctx.ownerId),'Source audit processes',['standard_id','scope_key']),
  ]);
  const ids=[...new Set(criterionRows.map(row=>row.standard_id).filter(Boolean))];
  if(!ids.length)throw ncFailure('invalid_audit_source','The source audit has no approved selected criteria.');
  const [links,native,catalogue]=await Promise.all([
    read(()=>admin.from('internal_audit_question_scope_links').select('question_id,standard_id,scope_key,clause,requirement_summary').in('standard_id',ids),'Source audit mappings',['standard_id','question_id','scope_key','clause']),
    read(()=>admin.from('internal_audit_questions').select('*').in('standard_id',ids),'Source audit questions'),
    read(()=>admin.from('internal_audit_standard_catalogue').select('id,standard_code,display_name,edition_label,active').in('id',ids),'Source criteria catalogue'),
  ]);
  // Resolve the existing catalogue by its explicit ID instead of depending on
  // a PostgREST embedded relationship. Selection rows need no synthetic id.
  const byStandardId=new Map(catalogue.map(row=>[row.id,row]));
  if(ids.some(id=>!byStandardId.has(id)))throw ncFailure('invalid_audit_source','An approved criterion has no available catalogue record. Ask the audit administrator to review its planning reference.');
  const selectedStandards=criterionRows.map(row=>({...row,internal_audit_standard_catalogue:byStandardId.get(row.standard_id)}));
  const questions=new Map(native.map(row=>[row.id,row]));
  const missing=[...new Set(links.map(row=>row.question_id).filter(id=>id&&!questions.has(id)))];
  for(let start=0;start<missing.length;start+=100){
    const rows=await read(()=>admin.from('internal_audit_questions').select('*').in('id',missing.slice(start,start+100)),'Mapped source audit questions');
    rows.forEach(row=>questions.set(row.id,row));
  }
  const scope=await ncAuditSourceStep('Approved audit scope',()=>buildAuditFieldworkScope({selectedStandards,selectedProcesses,links,questions:[...questions.values()],exclusionJustification:audit.exclusion_justification}));
  const question=scope.questions.find(row=>row.id===questionId);
  // The database guard also requires a real mapping to a selected standard.
  // Retained unmapped questions remain visible for audit coverage diagnosis,
  // but cannot be used to manufacture a trusted source link.
  if(!question||!links.some(row=>row.question_id===questionId))throw ncFailure('audit_question_out_of_scope','This question is inactive, unmapped or outside the current approved audit scope. Review its planning mapping before submitting.');
  const {data:answer,error:answerError}=await admin.from('internal_audit_answers')
    .select('id,conclusion,auditor_notes,risk_level,question_id')
    .eq('audit_id',auditId).eq('owner_id',ctx.ownerId).eq('question_id',questionId).maybeSingle();
  if(answerError)throw ncAuditSourceError('Source evidence note',answerError);
  const standards=new Map(selectedStandards.map(row=>[row.standard_id,Array.isArray(row.internal_audit_standard_catalogue)?row.internal_audit_standard_catalogue[0]:row.internal_audit_standard_catalogue]));
  const requirements=(question.criteria_links||[]).map(link=>{
    const standard=standards.get(link.standard_id);
    return {standardId:link.standard_id,standardCode:standard?.standard_code||'',standardName:standard?.display_name||standard?.standard_code||'',clause:link.clause||'',summary:link.requirement_summary||question.requirement_summary||''};
  });
  return {audit,question,answer,requirements};
}

export async function getNonconformityAuditQuestionSource(input={}) {
  try {
    const ctx=await ncAuditSourceStep('Authorised company access',()=>ncContext('contribute'));
    if(!ctx.canCreate)throw ncFailure('module_access_required','Contribute access is required to raise an audit finding.');
    const admin=createAdminClient();
    const source=await ncAuditSourceStep('Source audit preparation',()=>ncAuditQuestionSource(ctx,admin,clean(input.audit_id),clean(input.question_id)));
    const findingType=MANUAL_NC_TYPES.has(input.finding_type)?input.finding_type:'minor_nc';
    const existingFindings=await ncReadAll(()=>admin.from('internal_audit_findings')
      .select('id,finding_reference,finding_type,status,responsible_owner_name,agreed_date')
      .eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id)
      .eq('source_audit_id',source.audit.id).eq('source_audit_question_id',source.question.id),'source question findings');
    return {ok:true,source:{
      audit:{id:source.audit.id,reference:source.audit.audit_reference,title:source.audit.title},
      question:{id:source.question.id,code:source.question.question_code||source.question.clause||source.question.id,text:source.question.question_text},
      requirements:source.requirements,existingFindings,
      defaults:{source_category:'internal_audit',source_audit_id:source.audit.id,source_audit_question_id:source.question.id,
        source_reference:source.audit.audit_reference||'',finding_type:findingType,
        objective_evidence:source.answer?.conclusion||'',risk_level:MANUAL_NC_RISKS.has(source.answer?.risk_level)?source.answer.risk_level:'medium',
        process_area:source.question.process_area||source.audit.administration_location_label||'',
        criteria:source.requirements.map(row=>[row.standardName,row.clause&&`clause ${row.clause}`,row.summary].filter(Boolean).join(' · ')).join('\n')||source.question.requirement_summary||'',
      },
    }};
  }catch(error){return ncErrorResponse(error?.ncCode?error:ncAuditSourceError('Audit finding form preparation',error));}
}

// Reuse the same active catalogue and scope-link clause records as Audit
// Planning. These are reference definitions, not another company's audit data.
export async function getNonconformityRequirementOptions() {
  try {
    const ctx=await ncContext('view');
    const referenceClient=ctx.client;
    const standards=await ncReadAll(()=>referenceClient.from('internal_audit_standard_catalogue').select('id,standard_code,display_name,edition_label').eq('active',true),'standards catalogue');
    const ids=standards.map(s=>s.id),links=[],questions=[];
    for(let i=0;i<ids.length;i+=100){
      questions.push(...await ncReadAll(()=>referenceClient.from('internal_audit_questions').select('id,standard_id,clause,process_area,question_code').in('standard_id',ids.slice(i,i+100)).eq('active',true),'detailed audit clauses'));
      let offset=0,lastKey=null;
      for(;;){
        const {data,error}=await referenceClient.from('internal_audit_question_scope_links').select('question_id,standard_id,scope_key,clause,requirement_summary').in('standard_id',ids.slice(i,i+100)).order('standard_id').order('question_id').order('scope_key').order('clause').range(offset,offset+499);
        if(error||!Array.isArray(data))throw ncFailure('records_unavailable','The Audit Planning clause catalogue could not be loaded completely. Choose Other to enter a manual requirement, or retry the search.',true);
        if(!data.length)break;
        const tail=data[data.length-1],key=JSON.stringify([tail.standard_id,tail.question_id,tail.scope_key,tail.clause]);
        if(key===lastKey)throw ncFailure('pagination_failed','The Audit Planning clause catalogue could not be read completely. Retry while connected.',true);
        links.push(...data);offset+=data.length;lastKey=key;
      }
    }
    const byId=new Map(standards.map(s=>[s.id,s])),byClause=new Map();
    for(const row of [...questions.map(q=>({...q,requirement_summary:q.process_area})),...links]){
      const clause=clean(row.clause),standard=byId.get(row.standard_id);if(!clause||!standard)continue;
      const key=`${row.standard_id}|${clause}`;
      if(!byClause.has(key))byClause.set(key,{standardId:standard.id,standardCode:standard.standard_code,standardName:standard.display_name,edition:standard.edition_label||'',clause,summaries:[]});
      const summary=clean(row.requirement_summary),item=byClause.get(key);if(summary&&!item.summaries.includes(summary))item.summaries.push(summary);
    }
    return {ok:true,standards:standards.sort((a,b)=>(a.display_name||a.standard_code).localeCompare(b.display_name||b.standard_code)),clauses:[...byClause.values()].map(item=>({...item,summary:item.summaries.join(' · ')})).sort((a,b)=>a.standardCode.localeCompare(b.standardCode)||a.clause.localeCompare(b.clause,'en',{numeric:true}))};
  }catch(error){return ncErrorResponse(error);}
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
    objective_evidence:ncText(input,'objective_evidence',16000,true), failure_statement:ncText(input,'failure_statement',12000,['major_nc','minor_nc'].includes(input.finding_type)),
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
  // Old saved attempts retain their exact version-1 digest. Only submissions
  // that explicitly include these existing finding fields add them to identity.
  const documents=['requirement_source','requirement_standard_id','clause','evidence_source'];
  if(documents.some(key=>Object.hasOwn(input,key))){
    payload.requirement_source=ncText(input,'requirement_source',60,true);
    payload.requirement_standard_id=ncText(input,'requirement_standard_id',36);
    payload.clause=ncText(input,'clause',300);
    payload.evidence_source=ncText(input,'evidence_source',60,true);
    if(!NC_REQUIREMENT_SOURCES.has(payload.requirement_source)||!NC_EVIDENCE_SOURCES.has(payload.evidence_source))throw ncFailure('invalid_requirement','Choose the source of requirement and source of evidence.');
    if(payload.requirement_standard_id&&!NC_UUID.test(payload.requirement_standard_id))throw ncFailure('invalid_requirement','The selected standard is invalid.');
    if(payload.requirement_source!=='management_system_standard')payload.requirement_standard_id=null;
    else if(!payload.requirement_standard_id||!payload.clause)throw ncFailure('invalid_requirement','Select a standard and its planning clause, or choose Other to enter the requirement manually.');
    if(payload.requirement_source==='other_criteria'&&!payload.clause)throw ncFailure('invalid_requirement','Enter the source or reference for the manually specified requirement.');
  }
  if(Object.hasOwn(input,'source_audit_id')){
    payload.source_audit_id=ncText(input,'source_audit_id',36);
    if(!['internal_audit','external_audit'].includes(payload.source_category))payload.source_audit_id=null;
    if(payload.source_audit_id&&!NC_UUID.test(payload.source_audit_id))throw ncFailure('invalid_audit_source','Select a valid audit register record.');
    if(payload.source_category==='internal_audit'&&!payload.source_audit_id)throw ncFailure('invalid_audit_source','Select the applicable audit from this company’s register.');
    if(payload.source_category==='external_audit'&&!payload.source_reference)throw ncFailure('invalid_audit_source','Enter the external auditor or organisation and report reference.');
  }
  // Leave old device-draft digests unchanged. Only an explicit, non-empty
  // question handoff adds source-question identity to a new submission.
  const sourceQuestion=ncText(input,'source_audit_question_id',36);
  if(sourceQuestion){
    if(!NC_UUID.test(sourceQuestion)||payload.source_category!=='internal_audit'||!payload.source_audit_id)throw ncFailure('invalid_audit_source','An originating question requires its internal audit register record.');
    payload.source_audit_question_id=sourceQuestion;
  }
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
    if(submission.payload.requirement_standard_id){
      const {data:standard,error:standardError}=await ctx.client.from('internal_audit_standard_catalogue').select('id').eq('id',submission.payload.requirement_standard_id).eq('active',true).maybeSingle();
      const {data:clauses,error:clauseError}=await ctx.client.from('internal_audit_question_scope_links').select('standard_id').eq('standard_id',submission.payload.requirement_standard_id).eq('clause',submission.payload.clause).limit(1);
      const {data:questions,error:questionError}=await ctx.client.from('internal_audit_questions').select('id').eq('standard_id',submission.payload.requirement_standard_id).eq('clause',submission.payload.clause).eq('active',true).limit(1);
      if(standardError||clauseError||questionError)throw ncFailure('requirement_check_failed','The selected planning clause could not be checked. Retain the draft and retry.',true);
      if(!standard||(!clauses?.length&&!questions?.length))throw ncFailure('invalid_requirement','The selected clause is no longer available in Audit Planning. Review the requirement or choose Other.');
    }
    let sourceAudit=null;
    if(submission.payload.source_audit_id){
      const {data,error}=await admin.from('internal_audits').select('id,audit_reference,title').eq('id',submission.payload.source_audit_id).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).maybeSingle();
      if(error)throw ncFailure('audit_source_check_failed','The source audit could not be checked. Keep the draft and retry.',true);
      if(!data)throw ncFailure('invalid_audit_source','The selected audit is no longer available in this company. Review the source before submitting.');
      sourceAudit=data;
    }
    const auditQuestion=submission.payload.source_audit_question_id
      ?await ncAuditQuestionSource(ctx,admin,submission.payload.source_audit_id,submission.payload.source_audit_question_id):null;
    if(auditQuestion&&submission.payload.requirement_standard_id&&!auditQuestion.requirements.some(row=>{
      const clause=parseAuditClauseScope(row.clause);
      return row.standardId===submission.payload.requirement_standard_id&&clause.selectors.some(selector=>auditClauseMatches(submission.payload.clause,selector));
    }))throw ncFailure('requirement_outside_source_question','Select an applicable requirement linked to this audit question. Use Other to describe a separate legal, contractual or procedural requirement.');
    // An historical audit reference alone remains a manual finding. A current
    // verified question handoff also receives the native audit/answer links,
    // so existing reports, CAPA links and closure gates see the same record.
    const owner=await ncResolveOwner(admin,ctx,submission.payload);
    const { responsible_person_id,responsible_owner_name,responsible_owner_email,...fields }=submission.payload;
    const day=new Date().toISOString().slice(0,10).replaceAll('-','');
    const { data,error }=await admin.from('internal_audit_findings').insert({
      ...fields,owner_id:ctx.ownerId,organization_id:ctx.organization.id,audit_id:auditQuestion?.audit.id||null,
      ...(auditQuestion?{answer_id:auditQuestion.answer?.id||null,reported_by_user_id:ctx.user.id}:{}),
      finding_reference:`MNC-${day}-${randomUUID().slice(0,8).toUpperCase()}`,
      responsible_owner_name:owner.name,responsible_owner_email:owner.email,
      source_type:'manual',status:['major_nc','minor_nc'].includes(fields.finding_type)?'response_due':'issued',closure_verified:false,
      ...(sourceAudit?{source_audit_reference:sourceAudit.audit_reference,source_audit_title:sourceAudit.title}:{}),
      requirement_source:fields.requirement_source||'other_criteria',evidence_source:fields.evidence_source||'multiple_sources',
      client_submission_id:submission.requestId,client_submission_digest:submission.digest,
    }).select('id,finding_reference,organization_id,status,closure_verified,client_submission_digest,evidence_attachment_path').single();
    if (error?.code==='23505') { finding=await ncExisting(admin,ctx,submission);replayed=true; }
    else if (error) throw ncFailure('registration_failed','The NC could not be registered. Keep the original device draft and retry.',true);
    else finding=data;
    if (!finding) throw ncFailure('registration_unconfirmed','Registration could not be confirmed. Keep the original device draft and retry.',true);
    revalidatePath(NC_ROOT);revalidatePath('/portal/suppliers');
    if(auditQuestion)revalidatePath(`/portal/internal-audits/${auditQuestion.audit.id}`);
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

// Existing Findings & Actions management. The browser sends an intention and
// expected record version; only this authenticated server builds SQL changes.
const NC_MANAGEMENT_LEVELS={save_details:'review',assign_owner:'review',start_capa:'review',link_capa:'review',review_response:'review',verify_action:'approve',verify_finding:'approve',close_advisory:'approve',reopen:'approve'};
const NC_MANAGEMENT_FIELDS=['finding_type','title','criteria','objective_evidence','failure_statement','process_area','risk_level','agreed_date'];
const NC_ACCESS_PUBLIC=['id','finding_id','rca_case_id','assignee_user_id','assignee_name','assignee_email','status','updated_at','correction_and_containment','root_cause_response','extent_and_systemic_review','corrective_action_plan','effectiveness_measure','owner_submission_notes','submitted_at','auditor_response','auditor_response_at','auditor_response_by','effectiveness_result','verification_method','verification_evidence','verified_at','verified_by','d6_verification_requested_at','d6_verification_completed_at'];
const ncPick=(row,keys)=>row?Object.fromEntries(keys.map(key=>[key,row[key]??null])):null;
// Preserve PostgreSQL microseconds; Date.toISOString() would truncate the
// record version and make a legitimate subsequent transaction look stale.
const ncVersion=value=>value===null?null:typeof value==='string'&&!Number.isNaN(Date.parse(value))?value.trim():undefined;
const ncIsClosed=finding=>finding.status==='closed'||finding.closure_verified===true;
const ncIsNC=finding=>['major_nc','minor_nc'].includes(finding.finding_type);
const ncEffective=action=>action.status==='verified'&&['effective','effective_verified'].includes(action.effectiveness_result)&&action.verified_by&&action.verified_at;
const ncReason=event=>String(event?.event_data?.reason||event?.summary||'').replace(/\n\[request identity sha256: [0-9a-f]{64}\]$/,'');
function ncManagementInput(input,ctx){
  if(!input||typeof input!=='object'||Array.isArray(input)||input.user_id!==ctx.user.id||input.organization_id!==ctx.organization.id)throw ncFailure('management_scope_mismatch','This decision belongs to another signed-in account or company.');
  const operation=ncText(input,'operation',40,true),findingId=ncText(input,'finding_id',36,true),requestId=ncText(input,'request_id',36,true),reason=ncText(input,'reason',1000,true);
  if(!Object.hasOwn(NC_MANAGEMENT_LEVELS,operation)||!NC_UUID.test(findingId)||!NC_UUID.test(requestId)||reason.length<5)throw ncFailure('invalid_management_request','Choose a supported decision and record a clear reason.');
  const expected=ncVersion(input.expected_updated_at),linksDigest=ncText(input,'expected_links_digest',64,true);if(expected===undefined||!NC_SHA256.test(linksDigest))throw ncFailure('record_version_required','Refresh this finding and its linked responses before recording a decision.');
  if(!input.data||typeof input.data!=='object'||Array.isArray(input.data)||JSON.stringify(input.data).length>100000)throw ncFailure('invalid_management_request','Check the decision fields.');
  const keys={save_details:NC_MANAGEMENT_FIELDS,assign_owner:['person_id','supplier_contact_id','agreed_date'],start_capa:[],link_capa:['case_id'],review_response:['decision','conclusion','human_confirmation'],verify_action:['action_id','result','method','conclusion','human_confirmation'],verify_finding:['result','method','conclusion','human_confirmation'],close_advisory:['conclusion','human_confirmation'],reopen:['conclusion','human_confirmation']}[operation];
  if(Object.keys(input.data).some(key=>!keys.includes(key)))throw ncFailure('invalid_management_request','This decision contains fields that are not editable for its operation.');
  // Bind interrupted/repeated high-level requests to their original content.
  // The fingerprint is retained in the existing event reason; the UI displays
  // the human reason only. No new request store or device database is used.
  const data=Object.fromEntries(keys.filter(key=>Object.hasOwn(input.data,key)).map(key=>[key,input.data[key]]));
  const digest=createHash('sha256').update(JSON.stringify({actor:ctx.user.id,organization:ctx.organization.id,findingId,requestId,operation,reason,expected,linksDigest,data})).digest('hex');
  const conclusion=['close_advisory','reopen'].includes(operation)?ncText(data,'conclusion',9000,true):null;
  return {operation,findingId,requestId,reason,expected,linksDigest,data,boundReason:`${reason}${conclusion?`\nReview conclusion: ${conclusion}`:''}\n[request identity sha256: ${digest}]`};
}
async function ncManagementReplay(admin,ctx,request){
  const {data:event,error}=await admin.from('internal_audit_events').select('id,created_by,event_data')
    .eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).eq('finding_id',request.findingId)
    .eq('event_data->>management_request_id',request.requestId).maybeSingle();
  if(error)throw ncFailure('management_history_unavailable','The decision history could not be checked. Retain this request and retry.',true);
  if(!event)return null;
  if(event.created_by!==ctx.user.id||event.event_data?.operation!==request.operation||event.event_data?.reason!==request.boundReason)throw ncFailure('management_request_conflict','This request identity already belongs to different decision content. Refresh the finding before starting a separate decision.');
  return {ok:true,replayed:true,result:event.event_data.result};
}
async function ncManagementState(ctx,admin,findingId){
  const {data:finding,error}=await admin.from('internal_audit_findings').select('*').eq('id',findingId).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).maybeSingle();
  if(error)throw ncFailure('finding_unavailable','This finding could not be loaded completely.',true);
  if(!finding||!MANUAL_NC_TYPES.has(finding.finding_type))throw ncFailure('finding_unavailable','This controlled finding is unavailable in the authorised company. Legacy findings without a company assignment require administrator review.');
  const one=async(table,id)=>{if(!id)return null;let q=admin.from(table).select('*').eq('id',id).eq('owner_id',ctx.ownerId);if(['internal_audits','rca_cases'].includes(table))q=q.eq('organization_id',ctx.organization.id);const {data,error}=await q.maybeSingle();if(error||!data)throw ncFailure('linked_record_unavailable','A linked controlled record could not be checked. Refresh before continuing.',true);return data;};
  const [{data:access,error:accessError},audit,capa]=await Promise.all([
    admin.from('internal_audit_action_access').select('*').eq('finding_id',findingId).eq('owner_id',ctx.ownerId).maybeSingle(),one('internal_audits',finding.audit_id),one('rca_cases',finding.linked_rca_case_id),
  ]);
  if(accessError)throw ncFailure('response_unavailable','The assigned response could not be loaded.',true);
  if(access&&access.rca_case_id&&access.rca_case_id!==finding.linked_rca_case_id)throw ncFailure('linked_record_mismatch','The response and finding refer to different CAPA cases. Ask an administrator to review the controlled links.');
  const [actions,disciplines,evidence,people]=await Promise.all([
    capa?ncReadAll(()=>admin.from('rca_actions').select('*').eq('owner_id',ctx.ownerId).eq('case_id',capa.id),'linked corrective actions'):[],
    capa?ncReadAll(()=>admin.from('rca_8d_disciplines').select('*').eq('owner_id',ctx.ownerId).eq('case_id',capa.id),'controlled CAPA disciplines'):[],
    capa?ncReadAll(()=>admin.from('rca_evidence').select('id,action_id,discipline,reference,description,evidence_date,storage_path').eq('owner_id',ctx.ownerId).eq('case_id',capa.id).eq('discipline',6),'action verification evidence'):[],
    ncReadAll(()=>admin.from('organization_people').select('id,first_name,last_name,email,user_id,account_status').eq('organization_id',ctx.organization.id),'controlled company owner references'),
  ]);
  const contacts=finding.supplier_id?await ncReadAll(()=>admin.from('supplier_contacts').select('id,first_name,last_name,email,business_title').eq('supplier_id',finding.supplier_id).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).eq('is_active',true),'linked supplier owner references'):[];
  return {finding,access,audit,capa,actions,disciplines,evidence,people,contacts,selected:actions.filter(action=>Number(action.discipline)===5&&action.selection_status==='selected')};
}
function ncIndependent(ctx,state,action=null){
  const email=ctx.user.email?.toLowerCase();
  if(state.access&&(state.access.assignee_user_id===ctx.user.id||(email&&state.access.assignee_email?.toLowerCase()===email)))return false;
  const person=action?state.people.find(person=>person.id===action.action_owner_person_id):null;
  if(person&&(person.user_id===ctx.user.id||(email&&person.email?.toLowerCase()===email)))return false;
  return true;
}
function ncLinkedVersion(state){
  return createHash('sha256').update(JSON.stringify({finding:ncPick(state.finding,['id','finding_type','title','criteria','objective_evidence','failure_statement','risk_level','process_area','agreed_date','status','updated_at','linked_rca_case_id','closure_verified','closure_verified_at']),access:ncPick(state.access,NC_ACCESS_PUBLIC),capa:state.capa,actions:state.actions,disciplines:state.disciplines,evidence:state.evidence})).digest('hex');
}
export async function getNonconformityManagementRecord(findingId){
  try{
    const ctx=await ncContext('view');if(!NC_UUID.test(findingId||''))throw ncFailure('invalid_reference','Choose a valid finding.');
    const admin=createAdminClient(),state=await ncManagementState(ctx,admin,findingId),{finding,access,audit,capa}=state;
    const history=await ncReadAll(()=>admin.from('internal_audit_events').select('id,event_type,summary,event_data,created_by,created_at').eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).eq('finding_id',findingId),'finding management history');
    const paths=state.evidence.map(row=>row.storage_path).filter(Boolean);let urls=[];
    if(paths.length){const result=await admin.storage.from('rca-evidence').createSignedUrls(paths,300);if(result.error)throw ncFailure('evidence_unavailable','Controlled evidence links could not be prepared.',true);urls=result.data||[];}
    const usable=!ncIsClosed(finding)&&audit?.status!=='closed',independent=ncIndependent(ctx,state);
    return {ok:true,record:{linksDigest:ncLinkedVersion(state),
      finding:ncPick(finding,['id','finding_reference','finding_type','title','criteria','objective_evidence','failure_statement','risk_level','process_area','agreed_date','status','updated_at','audit_id','supplier_id','source_audit_id','source_audit_reference','source_audit_question_id','source_audit_question_code','responsible_owner_name','responsible_owner_email','responsible_owner_person_id','responsible_owner_supplier_contact_id','linked_rca_case_id','closure_verified','closure_verified_by','closure_verified_at','closed_at']),
      access:ncPick(access,NC_ACCESS_PUBLIC),audit:ncPick(audit,['id','audit_reference','title','status','current_gate']),capa:capa?{...ncPick(capa,['id','case_reference','title','status','method','current_discipline','target_close_date','updated_at']),allGatesApproved:approvedThroughD8(state.disciplines)}:null,
      actions:state.selected.map(action=>({...ncPick(action,['id','title','action_owner','action_owner_person_id','status','due_date','effectiveness_criteria','implementation_result','effectiveness_result','effectiveness_verification_method','effectiveness_verification_conclusion','verified_by','verified_at','updated_at','d6_submitted_at']),canVerify:ctx.canApprove&&usable&&ncIndependent(ctx,state,action)})),
      evidence:state.evidence.map(row=>({...ncPick(row,['id','action_id','reference','description','evidence_date']),url:urls.find(url=>url.path===row.storage_path)?.signedUrl||null})),
      people:state.people.filter(person=>person.account_status==='active').map(person=>ncPick(person,['id','first_name','last_name','email','user_id'])),
      contacts:state.contacts,
      history:history.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||a.id.localeCompare(b.id)).map(event=>({id:event.id,operation:event.event_data?.operation||event.event_type,reason:ncReason(event),actorId:event.created_by,createdAt:event.created_at,changes:event.event_data?.changes||[]})),
      capabilities:{canEdit:ctx.canReview&&usable&&(!audit||audit.current_gate==='fieldwork'),canAssign:ctx.canReview&&usable,canStartCapa:ctx.canReview&&usable&&ncIsNC(finding)&&!capa,canReview:ctx.canReview&&usable&&independent&&ncIsNC(finding)&&Boolean(access),canVerify:ctx.canApprove&&usable&&independent&&ncIsNC(finding)&&Boolean(access)&&Boolean(capa),canCloseAdvisory:ctx.canApprove&&usable&&!ncIsNC(finding),canReopen:ctx.canApprove&&ncIsClosed(finding)&&audit?.status!=='closed'},
    }};
  }catch(error){return ncErrorResponse(error);}
}
export async function getNonconformityCapaOptions(){
  try{const ctx=await ncContext('review');if(!ctx.canReview)throw ncFailure('module_access_required','Review access is required.');const admin=createAdminClient();return {ok:true,cases:await ncReadAll(()=>admin.from('rca_cases').select('id,case_reference,title,status,method').eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).eq('method','8d'),'controlled CAPA linking options')};}catch(error){return ncErrorResponse(error);}
}
async function ncPortalPersonId(admin,email){
  if(!email)return null;
  for(let page=1;page<=100;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});if(error)throw ncFailure('owner_account_unavailable','The selected owner’s portal account could not be checked.',true);const users=data?.users;if(!Array.isArray(users))throw ncFailure('owner_account_unavailable','The portal account register returned an incomplete result.',true);const user=users.find(user=>user.email?.toLowerCase()===email.toLowerCase());if(user)return user.id;if(!users.length)return null;}
  throw ncFailure('owner_account_unavailable','The account register could not be checked completely. Contact the platform administrator.',true);
}
export async function manageNonconformity(input){
  let admin,ctx,request;
  try{
    const operation=input?.operation,level=Object.hasOwn(NC_MANAGEMENT_LEVELS,operation)?NC_MANAGEMENT_LEVELS[operation]:'approve';
    ctx=await ncContext(level);request=ncManagementInput(input,ctx);
    if((level==='contribute'&&!ctx.canCreate)||(level==='review'&&!ctx.canReview)||(level==='approve'&&!ctx.canApprove))throw ncFailure('module_access_required','Your current role cannot make this finding-management decision.');
    admin=createAdminClient();const replay=await ncManagementReplay(admin,ctx,request);if(replay)return replay;
    const state=await ncManagementState(ctx,admin,request.findingId),{finding:f,access,audit,capa}=state;
    if(ncVersion(f.updated_at)!==request.expected)throw ncFailure('management_conflict','The finding changed. Refresh and review it before recording a decision.');
    if(ncLinkedVersion(state)!==request.linksDigest)throw ncFailure('management_conflict','A linked owner response, corrective action or evidence record changed. Refresh and review it before recording a decision.');
    if(audit?.status==='closed')throw ncFailure('audit_revision_required','The audit is closed. Use its controlled revision process before amending linked findings.');
    if(ncIsClosed(f)&&request.operation!=='reopen')throw ncFailure('record_closed','Reopen the controlled finding before making further changes.');
    const data=request.data,now=new Date().toISOString(),changes=[];let caseId=capa?.id||null,ownerAccess=null;
    const update=(table,row,values)=>changes.push({table,id:row.id,kind:'update',expected_updated_at:row.updated_at??null,values});
    const updateFinding=values=>update('internal_audit_findings',f,values);
    const text=(key,max=12000,required=true)=>ncText(data,key,max,required);
    const confirm=()=>{if(data.human_confirmation!==true)throw ncFailure('human_confirmation_required','Review the evidence and confirm this human decision before submitting.');};
    const requireNC=()=>{if(!ncIsNC(f))throw ncFailure('invalid_management_operation','This control applies to Major and Minor NCs. Observation and OFI follow-up is proportionate.');};
    const requireIndependent=action=>{if(!ncIndependent(ctx,state,action))throw ncFailure('independent_reviewer_required','The response or action owner cannot verify their own work. Appoint an independent authorised reviewer.');};
    const finalReady=()=>{if(!capa||!approvedThroughD8(state.disciplines)||state.disciplines.some(row=>gateDataProblems(Number(row.discipline),capa.workflow_profile,row.gate_data,capa).length)||!state.selected.length||!state.selected.every(action=>independentlyEffective(action,state.people,access?.assignee_user_id)))throw ncFailure('capa_verification_required','D0-D8 must each have an explicit human approval, and every selected action must be independently verified effective. Accepting a response does not approve investigation gates.');};
    switch(request.operation){
      case 'save_details':{
        if(audit&&audit.current_gate!=='fieldwork')throw ncFailure('audit_revision_required','An approved audit finding statement requires the controlled revision process before amendment.');
        const type=text('finding_type',30),risk=text('risk_level',20),date=text('agreed_date',10,false);
        if(!MANUAL_NC_TYPES.has(type)||!MANUAL_NC_RISKS.has(risk)||(date&&!nonconformityDate(date)))throw ncFailure('invalid_classification','Check classification, risk and target date.');
        updateFinding({finding_type:type,title:text('title',220),criteria:text('criteria',12000),objective_evidence:text('objective_evidence',16000),failure_statement:ncText(data,'failure_statement',12000,['major_nc','minor_nc'].includes(type)),process_area:text('process_area',300,false),risk_level:risk,agreed_date:date});break;
      }
      case 'assign_owner':{
        const personId=text('person_id',36,false),contactId=text('supplier_contact_id',36,false),date=text('agreed_date',10,false);
        if(Boolean(personId)===Boolean(contactId)||personId&&!NC_UUID.test(personId)||contactId&&!NC_UUID.test(contactId)||date&&!nonconformityDate(date))throw ncFailure('invalid_owner','Select one active company person or linked supplier contact and check the target date.');
        let person,name,email,userId;
        if(personId){person=state.people.find(person=>person.id===personId&&person.account_status==='active');if(!person)throw ncFailure('owner_unavailable','Select a current person in this company.');name=[person.first_name,person.last_name].filter(Boolean).join(' ');email=person.email;userId=person.user_id||null;}
        else{if(!f.supplier_id)throw ncFailure('owner_unavailable','This finding has no controlled supplier link.');const {data:contact,error}=await admin.from('supplier_contacts').select('id,first_name,last_name,email').eq('id',contactId).eq('supplier_id',f.supplier_id).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).eq('is_active',true).maybeSingle();if(error||!contact)throw ncFailure('owner_unavailable','Select an active contact belonging to this finding’s supplier.');name=[contact.first_name,contact.last_name].filter(Boolean).join(' ');email=contact.email;userId=await ncPortalPersonId(admin,email);}
        if(!name||ncIsNC(f)&&!email)throw ncFailure('owner_unavailable','A controlled name and email are required for an NC response.');
        updateFinding({responsible_owner_name:name,responsible_owner_email:email||null,responsible_owner_person_id:personId,responsible_owner_supplier_contact_id:contactId,agreed_date:Object.hasOwn(data,'agreed_date')?date:f.agreed_date||null});
        if(ncIsNC(f)){
          if(!userId&&!capa)throw ncFailure('capa_link_required','Initiate or link the controlled CAPA before issuing access to an external response owner.');
          const token=randomBytes(32).toString('base64url');
          const values={assignee_user_id:userId,assignee_name:name,assignee_email:email,rca_case_id:caseId,status:'assigned',secure_token_hash:createHash('sha256').update(token).digest('hex'),secure_token_expires_at:new Date(Date.now()+14*86400000).toISOString()};
          if(capa)ownerAccess={path:`/audit-actions/${token}`,expiresAt:values.secure_token_expires_at};
          if(access){update('internal_audit_action_access',access,values);}else{
            changes.push({table:'internal_audit_action_access',id:request.requestId,kind:'insert',values});
          }
        }break;
      }
      case 'start_capa':{
        requireNC();if(capa)throw ncFailure('capa_already_linked','This finding already has a controlled CAPA. Open its existing case.');caseId=request.requestId;
        changes.push({table:'rca_cases',id:caseId,kind:'insert',values:{case_reference:`8D-${f.finding_reference||'NC'}-${caseId.slice(0,6).toUpperCase()}`,method:'8d',source_type:'audit',title:`${f.finding_reference||'NC'} · ${f.title}`,problem_statement:f.failure_statement||f.objective_evidence,severity:f.risk_level||'medium',status:'draft',current_discipline:0,sponsor_name:f.responsible_owner_name||null,product_service_process:f.process_area||null,detected_at:now,target_close_date:f.agreed_date||null}});
        if(access)update('internal_audit_action_access',access,{rca_case_id:caseId});updateFinding({linked_rca_case_id:caseId});break;
      }
      case 'link_capa':{
        requireNC();if(capa)throw ncFailure('capa_already_linked','An existing controlled CAPA link cannot be silently replaced.');caseId=text('case_id',36);if(!NC_UUID.test(caseId))throw ncFailure('invalid_reference','Select a controlled CAPA case.');const {data:chosen,error}=await admin.from('rca_cases').select('id,method').eq('id',caseId).eq('owner_id',ctx.ownerId).eq('organization_id',ctx.organization.id).maybeSingle();if(error||!chosen||chosen.method!=='8d')throw ncFailure('capa_unavailable','Select an 8D case belonging to this company.');if(access)update('internal_audit_action_access',access,{rca_case_id:caseId});updateFinding({linked_rca_case_id:caseId});break;
      }
      case 'review_response':{
        requireNC();confirm();requireIndependent();if(!capa||Number(capa.current_discipline)<8&&!['effectiveness_review','closed'].includes(capa.status))throw ncFailure('capa_final_stage_required','Complete the controlled CAPA through D8 before reviewing the final owner response.');if(!access||access.status!=='submitted')throw ncFailure('response_not_submitted','A submitted final owner response is required.');const decision=text('decision',20),conclusion=text('conclusion');if(!['accepted','returned'].includes(decision))throw ncFailure('invalid_decision','Choose Accept or Return.');if(decision==='accepted')finalReady();
        update('internal_audit_action_access',access,{status:decision==='accepted'?'verified_effective':'returned',auditor_response:conclusion,auditor_response_at:now,auditor_response_by:ctx.user.id});
        if(capa){if(decision==='returned'){for(const discipline of state.disciplines.filter(row=>Number(row.discipline)===6))update('rca_8d_disciplines',discipline,{status:'in_progress',human_approved:false,approved_by:null,approved_at:null});}update('rca_cases',capa,{status:decision==='accepted'?'effectiveness_review':'active',current_discipline:decision==='accepted'?8:6});}
        updateFinding({status:'action_in_progress'});break;
      }
      case 'verify_action':{
        requireNC();confirm();const actionId=text('action_id',36),result=text('result',40),method=text('method'),conclusion=text('conclusion');if(!['effective_verified','partially_effective','not_effective','unable_to_verify'].includes(result))throw ncFailure('invalid_decision','Choose a supported action-effectiveness result.');const action=state.selected.find(action=>action.id===actionId);if(!action||!action.d6_submitted_at||!access||!capa)throw ncFailure('action_not_submitted','Select a submitted D6 corrective action belonging to this finding.');requireIndependent(action);const effective=result==='effective_verified';if(effective&&!state.evidence.some(evidence=>evidence.action_id===actionId))throw ncFailure('action_evidence_required','Action-linked objective evidence is required to verify effectiveness.');
        update('rca_actions',action,{effectiveness_result:effective?'effective':result,implementation_evidence:'Objective evidence retained in the controlled D6 repository.',effectiveness_verification_method:method,effectiveness_verification_conclusion:conclusion,verified_by:ctx.user.id,verified_at:now,status:effective?'verified':'open'});
        const allEffective=effective&&state.selected.filter(row=>row.id!==actionId).every(ncEffective);
        update('rca_cases',capa,{status:'active',current_discipline:6});update('internal_audit_action_access',access,{status:'verification_requested',effectiveness_result:null,verified_at:null,verified_by:null,d6_verification_completed_at:allEffective?now:null});updateFinding({status:'action_in_progress'});break;
      }
      case 'verify_finding':{
        requireNC();confirm();requireIndependent();const result=text('result',40),method=text('method'),conclusion=text('conclusion');if(!['effective','partially_effective','ineffective'].includes(result)||!access||!capa)throw ncFailure('invalid_decision','A controlled owner response, CAPA and supported effectiveness decision are required.');const effective=result==='effective';if(Number(capa.current_discipline)<8&&!['effectiveness_review','closed'].includes(capa.status))throw ncFailure('capa_final_stage_required','Complete D8 before recording a final finding-effectiveness decision.');if(effective){finalReady();if(access.status!=='verified_effective')throw ncFailure('response_review_required','Accept the final submitted response before recording finding closure.');}
        updateFinding({status:effective?'closed':'action_in_progress',closure_verified:effective,closure_verified_by:effective?ctx.user.id:null,closure_verified_at:effective?now:null,closed_at:effective?now:null});
        update('internal_audit_action_access',access,{status:effective?'verified_effective':result==='partially_effective'?'verified_partially_effective':'verified_ineffective',verification_method:method,verification_evidence:conclusion,effectiveness_result:result,verified_by:ctx.user.id,verified_at:now});
        const otherFindings=await ncReadAll(()=>admin.from('internal_audit_findings').select('id,status,closure_verified').eq('owner_id',ctx.ownerId).eq('linked_rca_case_id',capa.id),'findings sharing the controlled CAPA');const closeCase=effective&&otherFindings.filter(row=>row.id!==f.id).every(row=>row.status==='closed'&&row.closure_verified===true);update('rca_cases',capa,{status:closeCase?'closed':'effectiveness_review',closed_at:closeCase?now:null,closure_summary:conclusion});break;
      }
      case 'close_advisory':{
        confirm();if(ncIsNC(f))throw ncFailure('invalid_management_operation','Major and Minor NCs require verified corrective action.');text('conclusion');updateFinding({status:'closed',closed_at:now,closure_verified:false,closure_verified_by:null,closure_verified_at:null});break;
      }
      case 'reopen':{
        confirm();text('conclusion');if(!ncIsClosed(f))throw ncFailure('record_not_closed','This finding is already open.');updateFinding({status:ncIsNC(f)?'action_in_progress':'issued',closed_at:null,closure_verified:false,closure_verified_by:null,closure_verified_at:null});if(capa&&capa.status==='closed')update('rca_cases',capa,{status:'effectiveness_review',closed_at:null});break;
      }
    }
    if(['verify_action','review_response'].includes(request.operation))changes.sort((a,b)=>(a.table==='rca_cases'?0:a.table==='internal_audit_action_access'?1:2)-(b.table==='rca_cases'?0:b.table==='internal_audit_action_access'?1:2));
    const args={p_owner_id:ctx.ownerId,p_organization_id:ctx.organization.id,p_actor_id:ctx.user.id,p_finding_id:f.id,p_request_id:request.requestId,p_operation:request.operation,p_reason:request.boundReason,p_expected_updated_at:request.expected,p_changes:changes,p_case_id:caseId};
    const {data:result,error}=await admin.rpc('apply_nc_management_change',args);
    if(error){const replay=await ncManagementReplay(admin,ctx,request);if(replay)return replay;console.error('NC_MANAGEMENT_SAVE_FAILED',{code:error.code||'transaction_failed'});throw ncFailure('management_save_failed','The decision was not confirmed. Refresh linked records or retry the same original request; no partial database update is retained.',true);}
    if(!result?.finding_id)throw ncFailure('management_save_unconfirmed','The management result was not confirmed. Retry the original request to check its saved history.',true);
    revalidatePath(NC_ROOT);if(f.audit_id)revalidatePath(`/portal/internal-audits/${f.audit_id}`);if(caseId)revalidatePath(`/portal/rca/${caseId}`);
    return {ok:true,result,replayed:Boolean(result.replayed),...(ownerAccess?{ownerAccess}:{} )};
  }catch(error){return ncErrorResponse(error);}
}
