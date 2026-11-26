import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { microsoftAccessToken } from "../../../../../lib/commercial-microsoft-store";
import { microsoftGraph, safeOutlookLink } from "../../../../../lib/commercial-microsoft.mjs";
import { escapeEmailHtml, proposalEmailHtml } from "../../../../../lib/commercial-design.mjs";
import { applicableQuestions } from "../../../../../lib/supplier-assurance";
import {
  EVIDENCE_BUCKET, INVITATION_ORIGIN, INVITATION_TABLE, emailAddress, event, hashToken, invitationError,
  invitationIdPattern, saveInvitation, supplierInvitationContext,
} from "../../../../../lib/supplier-invitation-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const reply = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const publicRow = ({ id, recipient, contact_name, status, outlook_url, created_at, expires_at, history, submitted_at, sent_at, answers, attachments, submissions }) =>
  ({ id, recipient, contact_name, status, outlook_url, created_at, expires_at, history, submitted_at, sent_at, answers, attachments, submissions });

function summarizeInvitations(data) {
  const latest = data[0];
  const submission = latest?.submissions?.at(-1);
  const acknowledgements = data.flatMap(row => row.submissions || [])
    .filter(item => item.answers?.acknowledgement?.documentId)
    .map(item => ({ ...item.answers.acknowledgement, submittedAt: item.submittedAt }))
    .sort((first, second) => second.submittedAt.localeCompare(first.submittedAt));
  return latest ? {
    status: latest.status,
    fileCount: submission?.evidence?.length ?? 0,
    review: latest.status === "reviewed" ? "Verified" : latest.status === "submitted" ? "Awaiting review" :
      latest.status === "clarification" ? "Clarification requested" : "No new submission",
    clarification: latest.status === "clarification"
      ? latest.history.findLast(item => item.action === "RPG requested clarification")?.details : null,
    acknowledgements,
  } : null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ctx = await supplierInvitationContext(searchParams.get("supplierId"));
    const query = ctx.admin.from(INVITATION_TABLE).select("*").eq("supplier_id", ctx.supplier.id)
      .eq("organization_id", ctx.supplier.organization_id);
    if (searchParams.has("file")) {
      const { data: row } = await query.eq("id", searchParams.get("invitationId")).maybeSingle();
      const file = row?.attachments.find(item => item.id === searchParams.get("file"));
      if (!file || !row.submissions.some(submission=>submission.evidence?.some(item=>item.id===file.id))) return reply({ error: "Evidence unavailable." }, 404);
      const { data } = await ctx.admin.storage.from(EVIDENCE_BUCKET).createSignedUrl(file.path, 60, { download: file.name });
      return data?.signedUrl ? NextResponse.redirect(data.signedUrl) : reply({ error: "Evidence unavailable." }, 404);
    }
    if (searchParams.has("summary")) {
      const { data, error } = await ctx.admin.from(INVITATION_TABLE).select("status,submissions,history")
        .eq("supplier_id", ctx.supplier.id).eq("organization_id", ctx.supplier.organization_id)
        .order("created_at", { ascending: false }).limit(30);
      return error ? reply({ error: "Invitation status unavailable." }, 503) : reply({ summary: summarizeInvitations(data) });
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(30);
    if (error) return reply({ error: "Invitation history is unavailable." }, 503);
    return reply({ summary: summarizeInvitations(data), invitations: data.map(row => {
      const { answers, attachments, ...visible } = publicRow(row);
      return visible;
    }) });
  } catch (error) {
    return reply({ error: error.status ? error.message : "Invitation history is unavailable." }, error.status || 503);
  }
}

function draftFields(input, supplier) {
  const recipient = emailAddress(input.recipient);
  const contact = String(input.contact || "").trim();
  const date = String(input.expiry || "");
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + "T23:59:59.999Z") : null;
  if (!recipient || recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
      !contact || contact.length > 150 || !expiresAt || !Number.isFinite(+expiresAt) ||
      expiresAt.toISOString().slice(0,10) !== date || +expiresAt <= Date.now() || +expiresAt > Date.now() + 91*86400000) {
    throw invitationError("Enter a valid recipient, contact name and expiry within the next 90 days.");
  }
  const name = supplier.trading_name || supplier.legal_name;
  return { recipient, contact, date, expiresAt: expiresAt.toISOString(), name,
    subject: "Welcome to RPG Excellence · Supplier onboarding for " + name };
}

async function createDraft(ctx, input) {
  const { supplier, admin, user } = ctx;
  const fields = draftFields(input, supplier);
  const { data: document } = await admin.from("supplier_code_of_conduct_documents").select("id")
    .eq("supplier_id", supplier.id).eq("organization_id", supplier.organization_id).eq("status", "issued")
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (!document) throw invitationError("Issue the Supplier Code of Conduct before creating an invitation.", 409);
  const access = await microsoftAccessToken(ctx);
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  const { data: row, error } = await admin.from(INVITATION_TABLE).insert({
    id, supplier_id: supplier.id, organization_id: supplier.organization_id, owner_id: user.id,
    recipient: fields.recipient, contact_name: fields.contact, expires_at: fields.expiresAt,
    token_hash: hashToken(token), document_id: document.id, status: "creating",
    questionnaire: applicableQuestions(supplier.applicable_standards || [], supplier.supplier_types || [])
      .map(({ id, question, evidence, blocker }) => ({ id, question, evidence, blocker })),
    history: [event("Outlook draft requested", user.email)],
  }).select("*").single();
  if (error) throw invitationError(error.code === "23505" ?
    "An invitation is already open. Check its status or revoke it before creating another." :
    "The invitation could not be recorded. Outlook was not contacted.", error.code === "23505" ? 409 : 503);
  try {
    const link = INVITATION_ORIGIN + "/supplier-access/" + token;
    const body = "Hello " + fields.contact + ",\n\nWelcome to RPG Excellence. Please complete the supplier assurance assessment for " + fields.name +
      " (" + supplier.supplier_reference + "). Sign in using " + fields.recipient + ", complete the requested sections, attach evidence and acknowledge the issued Code of Conduct. Submit your responses for RPG review.\n\nSecure access: " +
      link + "\n\nInvitation expires " + fields.date + " (UTC).\n\nRPG Excellence Supplier Assurance";
    const message = await microsoftGraph(access, "/me/messages", { method: "POST", timeoutMs: 22000, body: {
      subject: fields.subject, body: { contentType: "HTML", content: proposalEmailHtml({ body }).replace(escapeEmailHtml(link),() => '<a href="'+escapeEmailHtml(link)+'">Open your secure supplier assessment</a>') },
      toRecipients: [{ emailAddress: { address: fields.recipient } }],
      internetMessageHeaders: [{ name: "x-rpg-supplier-invitation", value: id }],
    } });
    if (!message.id || message.isDraft !== true) throw new Error("Outlook draft unconfirmed");
    return publicRow(await saveInvitation(admin, row, { status: "draft", message_id: message.id, outlook_url: safeOutlookLink(message.webLink),
      history: [...row.history, event("Outlook draft created", user.email)] }));
  } catch {
    try { await saveInvitation(admin, row, { status: "unknown", history: [...row.history, event("Outlook draft outcome uncertain", user.email)] }); } catch {}
    throw invitationError("Outlook may have created the draft. Check Drafts before preparing another copy.", 503);
  }
}

async function updateInvitation(ctx, input) {
  if (!invitationIdPattern.test(input.invitationId || "")) throw invitationError("Invitation unavailable.", 404);
  const { data: row } = await ctx.admin.from(INVITATION_TABLE).select("*").eq("id", input.invitationId)
    .eq("supplier_id", ctx.supplier.id).eq("organization_id", ctx.supplier.organization_id).maybeSingle();
  if (!row) throw invitationError("Invitation unavailable.", 404);
  const actor = ctx.user.email;
  const save = (changes, action, details = null) => saveInvitation(ctx.admin, row, {
    ...changes, history: [...row.history, event(action, actor, details)],
  });
  if (input.operation === "refresh" && !row.sent_at && row.message_id && ["draft","sent","in_progress","submitted","reviewed","clarification"].includes(row.status)) {
    const access = await microsoftAccessToken(ctx);
    const message = await microsoftGraph(access, "/me/messages/" + encodeURIComponent(row.message_id) + "?$select=isDraft,sentDateTime,toRecipients");
    const recipients = message.toRecipients?.map(item => emailAddress(item.emailAddress?.address)) || [];
    if (message.isDraft !== false || !message.sentDateTime) return publicRow(row);
    if (recipients.length !== 1 || recipients[0] !== row.recipient) throw invitationError("The Outlook recipient has changed. Revoke this invitation and create a new one.", 409);
    return publicRow(await save({ status: row.status === "draft" ? "sent" : row.status, sent_at: message.sentDateTime }, "Sending confirmed in Outlook"));
  }
  if (input.operation === "revoke" && (!["revoked", "reviewed", "creating"].includes(row.status) || row.status === "creating" && Date.now()-Date.parse(row.created_at)>120000)) {
    return publicRow(await save({ status: "revoked" }, "Invitation revoked"));
  }
  if (input.operation === "review" && row.status === "submitted") {
    return publicRow(await save({ status: "reviewed" }, "RPG reviewed the supplier submission"));
  }
  if (input.operation === "clarify" && ["submitted","reviewed"].includes(row.status) && Date.parse(row.expires_at) > Date.now()) {
    const note = String(input.note || "").trim().slice(0, 2000);
    if (!note) throw invitationError("Enter the clarification required.");
    return publicRow(await save({ status: "clarification" }, "RPG requested clarification", note));
  }
  throw invitationError("This action is unavailable for the current invitation status.", 409);
}

export async function POST(request) {
  try {
    if (request.headers.get("origin") !== INVITATION_ORIGIN) return reply({ error: "Open the RPG Excellence supplier workspace to continue." }, 403);
    if (Number(request.headers.get("content-length") || 0) > 8192) return reply({ error: "Request too large." }, 413);
    const body = await request.text();
    if (body.length > 8192) return reply({ error: "Request too large." }, 413);
    const input = JSON.parse(body);
    const ctx = await supplierInvitationContext(input.supplierId);
    const invitation = input.operation === "create" ? await createDraft(ctx, input) : await updateInvitation(ctx, input);
    const { answers, attachments, submissions, ...result } = invitation;
    return reply({ invitation: result });
  } catch (error) {
    return reply({ error: error.status ? error.message : "The Outlook action could not be completed. Check the Microsoft 365 connection in Commercial Hub." }, error.status || 503);
  }
}
