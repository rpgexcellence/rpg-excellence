"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import {
  EVIDENCE_BUCKET, INVITATION_ORIGIN, emailAddress, event, invitationError, readSupplierInvitation,
  saveInvitation, verifiedSupplierInvitation,
} from "../../../lib/supplier-invitation-store";

const limit = 2500;
const text = (data, key) => String(data.get(key) || "").trim().slice(0, limit);

export async function supplierSignIn(token, _state, data) {
  const invitation = await readSupplierInvitation(token);
  const email = emailAddress(data.get("email"));
  const message = "If this is the invited email address, check your mailbox for the sign-in link or code.";
  if (!invitation || email !== invitation.row.recipient) return { message };
  const supabase = await createClient();
  const callback = new URL("/auth/callback", INVITATION_ORIGIN);
  callback.searchParams.set("next", "/supplier-access/" + token);
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback.href } });
  return error ? { error: "Sign-in could not start. Try again shortly or contact RPG Excellence." } : { message };
}

export async function supplierVerifyCode(token, _state, data) {
  const invitation = await readSupplierInvitation(token);
  const email = emailAddress(data.get("email"));
  const code = String(data.get("code") || "").trim();
  if (!invitation || email !== invitation.row.recipient || !/^\d{6,8}$/.test(code)) return { error: "Enter the invited email address and a valid verification code." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return { error: "This code is invalid or expired. Request another sign-in message." };
  revalidatePath("/supplier-access/" + token);
  return { message: "Email verified." };
}

async function validatedUpload(data) {
  const file = data.get("evidence");
  if (!file?.size) return null;
  if (file.size > 4 * 1024 * 1024) throw invitationError("Evidence files must be 4 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = bytes.subarray(0, 5).toString() === "%PDF-" ? "pdf" :
    bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png" :
    bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) ? "jpeg" : "";
  if (!kind) throw invitationError("Choose a PDF, PNG or JPEG evidence file.");
  const name = String(file.name).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 160) || "evidence";
  return { name, kind, bytes };
}

export async function saveSupplierResponse(token, _state, data) {
  let uploadedPath;
  let admin;
  try {
    const session = await verifiedSupplierInvitation(token);
    const { user, row, document } = session;
    admin = session.admin;
    if (!["draft","sent","in_progress","clarification"].includes(row.status)) throw invitationError("This submission is locked for RPG review.");
    const responseVersion = Number(row.answers.responseVersion || 0);
    if (String(data.get("responseVersion")) !== String(responseVersion)) {
      throw invitationError("This assessment was updated in another session. Reload the saved draft before continuing.", 409);
    }
    const intent = data.get("intent");
    if (!["save", "submit"].includes(intent)) throw invitationError("Choose Save draft or Submit for RPG review.");
    const controls = {};
    for (const question of row.questionnaire) {
      const response = text(data, question.id + "_response");
      const evidence = text(data, question.id + "_evidence");
      if (response && !["yes","partial","no","na"].includes(response)) throw invitationError("Choose a valid assurance response.");
      if (intent === "submit" && (!response || (question.blocker && !evidence))) {
        throw invitationError("Complete all control responses and provide evidence notes for mandatory controls.");
      }
      controls[question.id] = { response, evidence };
    }
    const answers = {
      responseVersion: responseVersion + 1,
      profile: { legalName:text(data,"legalName"), registration:text(data,"registration"), address:text(data,"address"), scope:text(data,"scope"), sites:text(data,"sites") },
      contact: { primaryName:text(data,"primaryName"), title:text(data,"title"), email:row.recipient, telephone:text(data,"telephone"), escalation:text(data,"escalation") },
      standards: { certifications:text(data,"certifications"), subtiers:text(data,"subtiers") },
      risk: { disruption:text(data,"disruption"), dependencies:text(data,"dependencies") },
      controls, monitoring: { contact:text(data,"monitoringContact"), changes:text(data,"changes") },
      acknowledgement: data.get("acknowledged") === "on" ? { documentId:document.id, documentReference:document.document_reference, version:document.version, signatory:text(data,"signatory") } : null,
    };
    if (intent === "submit" && (!answers.profile.legalName || !answers.profile.address || !answers.profile.scope || !answers.contact.primaryName ||
      !answers.standards.certifications || !answers.risk.dependencies || !answers.monitoring.contact || !answers.acknowledgement?.signatory)) {
      throw invitationError("Complete the required supplier details and sign the issued Code of Conduct acknowledgement.");
    }
    const file = await validatedUpload(data);
    const attachments = [...row.attachments];
    if (file) {
      if (attachments.length >= 12) throw invitationError("This invitation already has 12 evidence files.");
      const id = randomUUID();
      const path = row.organization_id + "/" + row.id + "/" + id + "." + file.kind;
      const { error } = await admin.storage.from(EVIDENCE_BUCKET).upload(path, file.bytes, { contentType:file.kind === "pdf" ? "application/pdf" : "image/" + file.kind, upsert:false });
      if (error) throw invitationError("The evidence file could not be saved. Try again.");
      uploadedPath = path; attachments.push({ id, name:file.name, path });
    }
    const submitting = intent === "submit";
    const date = new Date().toISOString();
    const evidence = attachments.map(({ id, name }) => ({ id, name }));
    const submissions = submitting ? [...row.submissions, { submittedAt:date, email:user.email, answers, evidence }] : row.submissions;
    await saveInvitation(admin,row,{
      status: submitting ? "submitted" : row.status === "clarification" ? "clarification" : "in_progress",
      answers, attachments, submissions, submitted_at:submitting ? date : row.submitted_at,
      history:[...row.history, event(submitting ? "Supplier submitted assessment" : "Supplier saved a draft",user.email)],
    }, { requireCurrent: true });
    uploadedPath = null;
    revalidatePath("/supplier-access/" + token);
    return { message:submitting ? "Your assessment has been submitted to RPG Excellence." : "Your assessment draft has been saved." };
  } catch (error) {
    if (uploadedPath && admin) await admin.storage.from(EVIDENCE_BUCKET).remove([uploadedPath]).catch(()=>{});
    return { error:error.status ? error.message : "The assessment could not be saved. Please retry." };
  }
}
