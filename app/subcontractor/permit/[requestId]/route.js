import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import {
  isPdfEvidence, isRequestId, maxPdfBytes, parseSubcontractorDetails, recipientMatches, requestOpen, requestTable,
} from "../../../../lib/permit-subcontractor.mjs";

const origin = "https://www.rpgexcellence.com";
const maxBodyBytes = maxPdfBytes + 48 * 1024;
const html = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function response(title, body, status = 200) {
  return new Response(`<!doctype html>
<html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(title)} | RPG Excellence</title>
<style>body{font:1rem/1.55 system-ui,sans-serif;background:#edf4f8;color:#102a45;padding:16px;margin:0}main{max-width:42rem;margin:3vh auto;padding:clamp(16px,4vw,36px);background:#fff;border-radius:12px}h1{line-height:1.15}form,label{display:grid;gap:8px}form{gap:16px}input,textarea,button{font:inherit;padding:8px;border:1px solid #8dabbc;border-radius:6px;max-width:100%;box-sizing:border-box}button{background:#096b60;color:#fff;padding:10px;cursor:pointer}a{color:#096b60}.job{background:#edf4f8;padding:14px;white-space:pre-wrap;overflow-wrap:anywhere}</style>
<main><strong>RPG Excellence</strong><h1>${html(title)}</h1>${body}</main></html>`, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}

const unavailable = () => response("Request unavailable", "<p>Ask the permit issuer to check the request or send a replacement. Use the business email to which the request was sent.</p>", 404);

async function context(id) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: row } = await admin.from(requestTable)
    .select("id,permit_id,permit_updated_at,recipient_email,revoked_at,submitted_at,submitted_by,expires_at")
    .eq("id", id).maybeSingle();
  if (!recipientMatches(user, row?.recipient_email)) return { user };
  if (row.submitted_at || row.revoked_at) return { user, row };
  const { data: permit } = await admin.from("hs_permits")
    .select("permit_reference,task_description,scope_limits,status,updated_at")
    .eq("id", row.permit_id).maybeSingle();
  return { user, row, permit, admin };
}

function requestForm(permit, error = "") {
  return response("Subcontractor information request",
    `<div class="job"><strong>${html(permit.permit_reference)}</strong><br>${html(permit.task_description)}${permit.scope_limits ? `<br><br>${html(permit.scope_limits)}` : ""}</div>
    <p>Provide information for this job only. Submission is for review and gives no authority to start work.</p>
    ${error ? `<p role="alert">${html(error)}</p>` : ""}
    <form method="post" enctype="multipart/form-data">
      <label>Subcontractor company<input name="company" maxlength="160" autocomplete="organization" required></label>
      <label>Nominated work lead<input name="work_lead" maxlength="160" required></label>
      <label>Business telephone (optional)<input type="tel" name="telephone" maxlength="40"></label>
      <label>Proposed work and method summary<textarea name="method_summary" rows="5" maxlength="4000" required></textarea></label>
      <label>Job evidence (one PDF, up to 2 MB)<input type="file" name="evidence" accept="application/pdf,.pdf" required></label>
      <p>Include the job-specific risk assessment and method statement and any insurance or competence evidence requested by the permit issuer. Include only information needed for this job.</p>
      <button type="submit">Submit for review</button>
    </form>`, error ? 400 : 200);
}

export async function GET(_request, { params }) {
  const { requestId } = await params;
  if (!isRequestId(requestId)) return unavailable();
  try {
    const access = await context(requestId);
    if (!access) {
      const next = encodeURIComponent(`/subcontractor/permit/${requestId}`);
      return response("Open your information request", `<p><a href="/portal/login?next=${next}">Sign in to RPG Excellence</a> with the verified business email to which the request was sent. If you create an account, verify your email and reopen the original request.</p>`);
    }
    if (access.row?.submitted_by === access.user.id && access.row.submitted_at) {
      return response("Submitted for review", "<p>RPG received your information. Contact the permit issuer if you need to make a correction.</p>");
    }
    return requestOpen(access.row, access.permit) ? requestForm(access.permit) : unavailable();
  } catch {
    return unavailable();
  }
}

async function readForm(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("multipart/form-data;") || !request.body ||
      Number(request.headers.get("content-length")) > maxBodyBytes) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": type } }).formData();
}

export async function POST(request, { params }) {
  const { requestId } = await params;
  if (request.headers.get("origin") !== origin || !isRequestId(requestId)) return unavailable();

  try {
    const access = await context(requestId);
    if (!requestOpen(access?.row, access?.permit)) return unavailable();
    const { user, row, permit, admin } = access;
    const form = await readForm(request).catch(() => null);
    const fields = form && parseSubcontractorDetails(form);
    const file = form?.get("evidence");
    if (!fields || !(file instanceof File) || file.size > maxPdfBytes) {
      return requestForm(permit, "Complete the required fields and attach a PDF of up to 2 MB.");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isPdfEvidence(file, bytes)) return requestForm(permit, "Attach a valid PDF file.");
    const now = new Date().toISOString();
    const { data, error } = await admin.from(requestTable).update({
      ...fields,
      submitted_at: now,
      submitted_by: user.id,
      evidence_pdf: bytes.toString("base64"),
    }).eq("id", requestId).eq("recipient_email", row.recipient_email)
      .is("revoked_at", null).is("submitted_at", null).gt("expires_at", now).select("id").maybeSingle();
    if (error || !data) return unavailable();
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/subcontractor/permit/${requestId}`,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return unavailable();
  }
}
