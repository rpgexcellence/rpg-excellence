import Stripe from "stripe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "../../../../../lib/supabase/server";
import { publication, hasPublicationOwnerAccess, isPaidPublicationSession } from "../../../../../lib/quality-performance-publication";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
function error(message, status) { return Response.json({ error: message }, { status, headers: privateHeaders }); }
async function deliverPdf() {
  const bytes = await readFile(path.join(process.cwd(), "private-assets", publication.filename));
  return new Response(bytes, { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${publication.filename}"` } });
}
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error("Sign in with the account used for your purchase.", 401);
    if (hasPublicationOwnerAccess(user)) return await deliverPdf();
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) return error("Open the download link from your checkout confirmation.", 400);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!isPaidPublicationSession(session, user)) return error("A completed £4.99 purchase for this account is required.", 403);
    return await deliverPdf();
  } catch { return error("Download is temporarily unavailable. Please try again.", 503); }
}
