import {
  getNonconformityWorkspaceSnapshot,
  submitNonconformityDraft,
  confirmNonconformityEvidence,
  createNonconformityExecutiveReport,
} from "../../../../portal/internal-audit-actions/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This transport reuses the existing authorised actions. It never writes an
// NC directly, accepts file bytes, grants roles, approves or closes a record.
const MAX_JSON_BYTES = 96 * 1024;
const OPERATIONS = new Map([
  ["submit", submitNonconformityDraft],
  ["confirm_evidence", confirmNonconformityEvidence],
  ["executive_report", createNonconformityExecutiveReport],
]);

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Vary": "Cookie, Origin",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
function failure(code, message, status, retryable = false) {
  return json({ ok: false, error: { code, message, retryable } }, status);
}
function statusFor(code) {
  if (code === "authentication_required") return 401;
  if (["plan_required", "report_plan_required", "module_access_required", "organisation_mismatch", "draft_scope_mismatch"].includes(code)) return 403;
  if (["submission_conflict", "record_changed", "record_closed", "evidence_changed", "evidence_mismatch"].includes(code)) return 409;
  return 400;
}
function knownFailure(error) {
  if (error?.ncCode) return failure(error.ncCode, error.message, error.retryable ? 503 : statusFor(error.ncCode), Boolean(error.retryable));
  // Do not return database errors, tokens, request bodies or account details.
  console.error("NC_WORKSPACE_TRANSPORT_FAILED");
  return failure("operation_failed", "The NC workspace could not be reached. Keep your device draft and try again.", 503, true);
}
function isCrossSite(request) {
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}
async function readJson(request) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_JSON_BYTES)) {
    throw Object.assign(new Error("Request is too large."), { transportStatus: 413 });
  }
  if (!request.body) throw Object.assign(new Error("A JSON request is required."), { transportStatus: 400 });
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error("Request is too large."), { transportStatus: 413 });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw Object.assign(new Error("A valid JSON request is required."), { transportStatus: 400 }); }
}
function withUploadTransport(result) {
  if (!result.upload) return result;
  // Only a server-issued, record-specific upload capability is exposed.
  // It must remain in memory; it is never part of the saved device snapshot.
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("Invalid storage origin");
  if (origin.username || origin.password || origin.search || origin.hash) throw new Error("Invalid storage origin");
  const upload = result.upload;
  if (upload.bucket !== "internal-audit-evidence" || typeof upload.path !== "string" || typeof upload.token !== "string") throw new Error("Invalid upload capability");
  const path = upload.path.split("/").map(encodeURIComponent).join("/");
  const signedUrl = new URL(`/storage/v1/object/upload/sign/${upload.bucket}/${path}`, origin.origin);
  signedUrl.searchParams.set("token", upload.token);
  return { ...result, upload: { ...upload, signedUrl: signedUrl.href } };
}

export async function GET(request) {
  if (isCrossSite(request)) return failure("same_origin_required", "Open the NC workspace on this website.", 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return failure("same_origin_required", "Open the NC workspace on this website.", 403);
  try { return json({ ok: true, snapshot: await getNonconformityWorkspaceSnapshot() }); }
  catch (error) { return knownFailure(error); }
}

export async function POST(request) {
  // A cookie-authenticated JSON endpoint requires an exact Origin match.
  // Do not trust user-controlled forwarded headers or allow sibling domains.
  if (isCrossSite(request) || request.headers.get("origin") !== new URL(request.url).origin) {
    return failure("same_origin_required", "Submit from the NC workspace on this website.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return failure("json_required", "Use a JSON metadata request. Upload evidence through its authorised upload link.", 415);
  }
  try {
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body) || !OPERATIONS.has(body.operation)) {
      return failure("invalid_operation", "Choose a supported NC workspace operation.", 400);
    }
    if (Object.keys(body).some(key => !["operation", "input"].includes(key)) || !body.input || typeof body.input !== "object" || Array.isArray(body.input)) {
      return failure("invalid_request", "Provide the operation and its input object only.", 400);
    }
    const result = await OPERATIONS.get(body.operation)(body.input);
    if (!result?.ok) {
      if (!result?.error?.code) throw new Error("Invalid action response");
      return json(result, result.error.retryable ? 503 : statusFor(result.error.code));
    }
    return json(withUploadTransport(result));
  } catch (error) {
    if (error?.transportStatus) return failure("invalid_request", error.message, error.transportStatus);
    return knownFailure(error);
  }
}
