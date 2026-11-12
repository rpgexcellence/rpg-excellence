"use server";

import {soaContext,soaPeople} from "../../../../../lib/soa-access";
import {soaPerson,soaPersonName,validateSoaAction,validateSoaUpload,soaControlHref} from "../../../../../lib/soa-workflow.mjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const VALID_REGISTER_STATUSES = [
  "draft",
  "under_review",
  "approved",
  "superseded",
];

const VALID_APPLICABILITY = [
  "pending",
  "applicable",
  "not_applicable",
];

const VALID_IMPLEMENTATION_STATUSES = [
  "not_assessed",
  "not_implemented",
  "planned",
  "partially_implemented",
  "implemented",
  "effective",
];

const VALID_INCLUSION_SOURCES = [
  "risk_treatment",
  "legal_regulatory",
  "contractual",
  "business_requirement",
  "interested_party",
  "good_practice",
];

const VALID_TREATMENT_DECISIONS = [
  "pending",
  "monitor",
  "accept",
  "reduce",
  "avoid",
  "share",
];

function cleanText(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function cleanDate(value) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Enter dates in YYYY-MM-DD format.");
  }

  return text;
}

function requireChoice(value, allowed, label) {
  const text = cleanText(value);

  if (!text || !allowed.includes(text)) {
    throw new Error(`Select a valid ${label}.`);
  }

  return text;
}

function optionalRiskValue(value, label) {
  const text = cleanText(value);
  if (!text) return null;
  const number = Number(text);
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    throw new Error(`${label} must be a whole number from 1 to 5.`);
  }
  return number;
}

function calculatedRiskLevel(score) {
  if (!score) return "not_assessed";
  if (score >= 17) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "moderate";
  return "low";
}

function fieldKey(controlId) {
  return controlId.replaceAll(".", "_");
}

async function getContext(formData) {
 const assessmentId=cleanText(formData.get("assessment_id"));
 if(!assessmentId)throw Error("Missing assessment reference.");
 return soaContext(assessmentId,true);
}

async function provisionRegister(admin, assessment, userId) {
  const { data: registerId, error } = await admin.rpc(
    "provision_iso27001_soa",
    {
      p_assessment_id: assessment.id,
      p_owner_id: userId,
      p_organization_id: assessment.organization_id ?? null,
    }
  );

  if (error || !registerId) {
    throw new Error(error?.message ?? "Unable to create the Statement of Applicability.");
  }

  return registerId;
}

export async function provisionSoa(formData) {
  const { admin, assessment, assessmentId, user, ownerId, canApprove } = await getContext(formData);

  await provisionRegister(admin, assessment, ownerId);

  revalidatePath(`/portal/assessments/${assessmentId}/soa`);
  redirect(`/portal/assessments/${assessmentId}/soa`);
}

export async function saveSoaRegister(formData) {
  const { admin, assessment, assessmentId, user, ownerId, canApprove } = await getContext(formData);
  const registerId = await provisionRegister(admin, assessment, ownerId);
  if(!canApprove)throw Error("Approval or administrator access is required to change SoA governance.");
  const status = requireChoice(
    formData.get("status"),
    VALID_REGISTER_STATUSES,
    "SoA status"
  );

  const approvedBy = cleanText(formData.get("approved_by"));

  if (status === "approved" && !approvedBy) {
    throw new Error("Approved by is required before approving the Statement of Applicability.");
  }

  const { error } = await admin
    .from("assessment_soa_registers")
    .update({
      version: cleanText(formData.get("version")) ?? "1.0",
      status,
      isms_scope: cleanText(formData.get("isms_scope")),
      risk_assessment_reference: cleanText(
        formData.get("risk_assessment_reference")
      ),
      risk_treatment_plan_reference: cleanText(
        formData.get("risk_treatment_plan_reference")
      ),
      prepared_by: cleanText(formData.get("prepared_by")),
      reviewed_by: cleanText(formData.get("reviewed_by")),
      approved_by: approvedBy,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      review_due_at: cleanDate(formData.get("review_due_at")),
      approval_statement: cleanText(formData.get("approval_statement")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", registerId)
    .eq("assessment_id", assessmentId)
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/portal/assessments/${assessmentId}/soa`);
}

export async function saveSoaControl(formData) {
  const { admin, assessment, assessmentId, user, ownerId, canApprove } = await getContext(formData);
  const registerId = await provisionRegister(admin, assessment, ownerId);
  const controlId = cleanText(formData.get("control_id"));

  if (!controlId || !/^([5-8])\.\d{1,2}$/.test(controlId)) {
    throw new Error("Invalid Annex A control.");
  }

  const people=await soaPeople({admin,assessment});
  const {data:existing,error:existingError}=await admin.from("assessment_soa_entries").select("*").eq("assessment_id",assessmentId).eq("control_id",controlId).eq("owner_id",ownerId).maybeSingle();
  if(existingError)throw Error("The current control could not be checked. Reload before saving.");
  const riskIds=[...new Set(formData.getAll("linked_risk_ids").map(String))];
  if(riskIds.length>100||riskIds.some(id=>!(/^[0-9a-f-]{36}$/i.test(id))))throw Error("Select valid company risks.");
  const {data:risks,error:riskError}=riskIds.length?await admin.from("isms_risks").select("id").in("id",riskIds).eq("organization_id",assessment.organization_id).eq("owner_id",ownerId).neq("status","archived"):{data:[],error:null};
  if(riskError||risks.length!==riskIds.length)throw Error("A selected risk is unavailable in this company. Reload the risk choices.");
  const key = fieldKey(controlId);
  const applicability = requireChoice(
    formData.get(`applicability_${key}`),
    VALID_APPLICABILITY,
    "applicability conclusion"
  );
  const implementationStatus = requireChoice(
    formData.get(`implementation_status_${key}`),
    VALID_IMPLEMENTATION_STATUSES,
    "implementation status"
  );
  const justification = cleanText(
    formData.get(`applicability_justification_${key}`)
  );

  if (applicability !== "pending" && !justification) {
    throw new Error("Record a justification for the applicability decision.");
  }

  if(applicability==="not_applicable"&&riskIds.length)throw Error("Remove the risk-treatment links before excluding this control.");

  const inclusionSource = formData
    .getAll(`inclusion_source_${key}`)
    .filter(
      (value) =>
        typeof value === "string" &&
        VALID_INCLUSION_SOURCES.includes(value)
    );

  const residualLikelihood = optionalRiskValue(formData.get(`residual_likelihood_${key}`), "Residual likelihood");
  const residualImpact = optionalRiskValue(formData.get(`residual_impact_${key}`), "Residual impact");
  if ((residualLikelihood && !residualImpact) || (!residualLikelihood && residualImpact)) {
    throw new Error("Complete both residual likelihood and impact.");
  }
  if (applicability === "applicable" && (!residualLikelihood || !residualImpact)) {
    throw new Error("Applicable controls require residual likelihood and impact values for the risk matrix.");
  }
  const residualRiskScore = residualLikelihood && residualImpact ? residualLikelihood * residualImpact : null;
  const residualRiskLevel = calculatedRiskLevel(residualRiskScore);
  const treatmentDecision = requireChoice(
    formData.get(`treatment_decision_${key}`),
    VALID_TREATMENT_DECISIONS,
    "risk-treatment decision"
  );
  const residualRiskRationale = cleanText(
    formData.get(`residual_risk_rationale_${key}`)
  );
  const riskPerson=soaPerson(people,cleanText(formData.get(`risk_owner_person_id_${key}`)),"risk owner");
  const controlPerson=soaPerson(people,cleanText(formData.get(`control_owner_person_id_${key}`)),"control owner");
  const riskOwner=soaPersonName(riskPerson)||null;
  const acceptanceAuthority = cleanText(
    formData.get(`risk_acceptance_authority_${key}`)
  );
  const acceptedAt = cleanDate(formData.get(`risk_accepted_at_${key}`));
  const riskReviewDueAt = cleanDate(
    formData.get(`risk_review_due_at_${key}`)
  );
  const actionRequired = cleanText(formData.get(`action_required_${key}`));

  if (residualRiskLevel !== "not_assessed" && !residualRiskRationale) {
    throw new Error("Explain the evidence and reasoning supporting the residual-risk level.");
  }

  if (["moderate", "high", "critical"].includes(residualRiskLevel) && !riskOwner) {
    throw new Error("A risk owner is required for Moderate, High or Critical residual risk.");
  }

  if (["high", "critical"].includes(residualRiskLevel)) {
    if (!["reduce", "avoid", "share", "accept"].includes(treatmentDecision)) {
      throw new Error("High or Critical residual risk requires a controlled treatment decision.");
    }

    if (!actionRequired) {
      throw new Error("High or Critical residual risk requires a recorded action.");
    }

    if (!acceptanceAuthority || !acceptedAt || !riskReviewDueAt) {
      throw new Error("High or Critical residual risk requires acceptance authority, acceptance date and review date.");
    }

    if (implementationStatus === "effective") {
      throw new Error("A control with High or Critical residual risk cannot be concluded Effective.");
    }
  }

  if (treatmentDecision === "accept" && (!acceptanceAuthority || !acceptedAt)) {
    throw new Error("Accepted residual risk requires the acceptance authority and acceptance date.");
  }

  const payload = {
    soa_register_id: registerId,
    assessment_id: assessmentId,
    owner_id: ownerId,
    organization_id:assessment.organization_id,
    control_id: controlId,
    applicability,
    applicability_justification: justification,
    inclusion_source: inclusionSource,
    implementation_status: implementationStatus,
    control_description: cleanText(formData.get(`control_description_${key}`)),
    control_owner:soaPersonName(controlPerson)||null,
    control_owner_person_id:controlPerson?.id||null,
    risk_owner_person_id:riskPerson?.id||null,
    implementation_evidence: cleanText(
      formData.get(`implementation_evidence_${key}`)
    ),
    effectiveness_evidence: cleanText(
      formData.get(`effectiveness_evidence_${key}`)
    ),
    residual_risk: residualRiskRationale,
    residual_risk_level: residualRiskLevel,
    residual_likelihood: residualLikelihood,
    residual_impact: residualImpact,
    residual_risk_score: residualRiskScore,
    residual_risk_rationale: residualRiskRationale,
    risk_owner: riskOwner,
    treatment_decision: treatmentDecision,
    risk_acceptance_authority: acceptanceAuthority,
    risk_accepted_at: acceptedAt,
    risk_review_due_at: riskReviewDueAt,
    action_required: actionRequired,
    action_owner_person_id:cleanText(formData.get(`action_owner_person_id_${key}`)),
    action_verifier_person_id:cleanText(formData.get(`action_verifier_person_id_${key}`)),
    action_status:cleanText(formData.get(`action_status_${key}`))||"not_required",
    action_completion_evidence:cleanText(formData.get(`action_completion_evidence_${key}`)),
    action_verification_conclusion:cleanText(formData.get(`action_verification_conclusion_${key}`)),
    target_date: cleanDate(formData.get(`target_date_${key}`)),
    assessor_conclusion: cleanText(
      formData.get(`assessor_conclusion_${key}`)
    ),
    finding_reference: cleanText(formData.get(`finding_reference_${key}`)),
    last_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  validateSoaAction({values:payload,existing:existing||{},people,actorId:user.id,canApprove});
  if(applicability==="applicable"&&!controlPerson)throw Error("Select a control owner for an applicable control.");
  const uploads=[];
  for(const kind of ["implementation","effectiveness"]){
    const files=formData.getAll(`${kind}_files`).filter(file=>typeof file!=="string"&&file.size>0);
    if(files.length>3)throw Error("Attach up to 3 files per evidence category per save.");
    for(const file of files){const bytes=new Uint8Array(await file.arrayBuffer());validateSoaUpload(file,bytes);uploads.push({file,bytes,kind});}
  }
  if(implementationStatus==="effective"&&!payload.effectiveness_evidence&&!uploads.some(u=>u.kind==="effectiveness")){
    const {count,error}=await admin.from("soa_control_evidence").select("id",{head:true,count:"exact"}).eq("assessment_id",assessmentId).eq("organization_id",assessment.organization_id).eq("control_id",controlId).eq("evidence_kind","effectiveness");
    if(error||!count)throw Error("Record effectiveness evidence or attach an effectiveness file before marking the control Effective.");
  }
  const uploaded=[];
  let savedControl;
  try{
    for(const {file,bytes,kind} of uploads){
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-160)||"evidence";
      const path=`${assessment.organization_id}/${assessmentId}/${key}/${crypto.randomUUID()}-${safeName}`;
      const {error}=await admin.storage.from("soa-control-evidence").upload(path,bytes,{contentType:file.type,upsert:false});
      if(error)throw Error("Evidence upload failed. The control has not been saved; retry with the files selected.");
      uploaded.push({evidence_kind:kind,storage_path:path,file_name:file.name.slice(0,250),mime_type:file.type,size_bytes:file.size});
    }
    const {data,error}=await admin.rpc("save_soa_control_workflow",{p_assessment:assessmentId,p_actor:user.id,p_control:controlId,p_expected:cleanText(formData.get("expected_updated_at")),p_values:payload,p_risks:riskIds,p_files:uploaded});
    if(error){if(error.message?.includes("This control changed"))throw Error("This control changed. Reload before saving again.");throw Error("The SoA changes could not be saved. Check the workflow migration is applied, then retry.");}
    savedControl=data;
  }catch(error){if(uploaded.length)await admin.storage.from("soa-control-evidence").remove(uploaded.map(u=>u.storage_path));throw error;}

  if (
    savedControl.residual_likelihood !== residualLikelihood ||
    savedControl.residual_impact !== residualImpact ||
    savedControl.residual_risk_score !== residualRiskScore ||
    savedControl.residual_risk_level !== residualRiskLevel
  ) {
    throw new Error("The residual-risk matrix values were not saved correctly. Review the assessment_soa_entries column definitions.");
  }

  revalidatePath(`/portal/assessments/${assessmentId}/soa`);
  revalidatePath("/portal/soa/management-board");
  revalidatePath("/portal/tasks");
  revalidatePath("/portal");
  revalidatePath("/portal/information-security/risk-management");
  redirect(soaControlHref(assessmentId,controlId).replace("#",`&saved_control=${encodeURIComponent(controlId)}#`));
}

export async function saveSoaControlWithFeedback(_previous,formData){
 try{await saveSoaControl(formData);return {ok:true};}
 catch(error){if(error?.digest?.startsWith("NEXT_REDIRECT"))throw error;console.error("SOA_CONTROL_SAVE_FAILED",{message:error.message});return {error:error.message||"The control could not be saved. Your changes remain in the form."};}
}
