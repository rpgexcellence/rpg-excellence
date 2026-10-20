import Stripe from "stripe";
import { isPlatformOwner } from "../../../../../lib/portal-admin-access";
import { createClient } from "../../../../../lib/supabase/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Sign in to access your purchase.", { status: 401 });
    // Platform owner may access their own publication without Stripe checkout.
    // Authorization is verified server-side against the authenticated account.
    const ownerAccess = isPlatformOwner(user);
    if (ownerAccess) {
      console.info("Publication owner download", { userId: user.id, publication: "ISO17025-2017-GUIDE" });
      return await deliverPdf();
    }
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) return new Response("Invalid checkout reference.", { status: 400 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.mode !== "payment" ||
        session.metadata?.purchase_type !== "digital_publication" ||
        session.metadata?.publication_code !== "ISO17025-2017-GUIDE" ||
        session.metadata?.owner_id !== user.id || session.amount_total !== 2999 || session.currency !== "gbp") {
      return new Response("Purchase not verified.", { status: 403 });
    }
    return await deliverPdf();
  } catch (error) {
    console.error("Publication download verification failed", error);
    return new Response("Unable to verify this purchase. Please contact support.", { status: 503 });
  }
}

async function deliverPdf() {
  const pdf = await readFile(path.join(process.cwd(), "private-assets", "Decoding_ISO_IEC_17025_2017_RPG_Excellence_Expanded_Manuscript.pdf"));
  return new Response(pdf, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=Decoding_ISO_IEC_17025_2017_RPG_Excellence.pdf",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  }});
}
