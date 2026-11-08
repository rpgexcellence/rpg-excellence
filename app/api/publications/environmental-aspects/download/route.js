import Stripe from "stripe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "../../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../../lib/portal-admin-access";
import { isVerifiedPublicationPurchase } from "../../../../../lib/publications.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function failure(message, status) {
  return Response.json({ error: message }, { status, headers });
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id) return failure("Sign in with the account used for your purchase.", 401);

    const query = new URL(request.url).searchParams;
    const asset = query.get("asset") || "guide";
    if (!["guide", "posters"].includes(asset)) return failure("Publication file not found.", 404);

    // Reuse the existing owner policy. No account, role or subscription changes.
    if (!isPlatformOwner(user)) {
      const sessionId = query.get("session_id");
      if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
        return failure("Use the download link from your checkout confirmation page.", 400);
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!isVerifiedPublicationPurchase(session, user.id, "ENVIRONMENTAL-ASPECTS-GUIDE")) {
        return failure("A completed £7.99 purchase for this account is required.", 403);
      }
    }

    // Literal paths allow deployment tracing; never accept a filename from the caller.
    const bytes = asset === "posters"
      ? await readFile(path.join(process.cwd(), "private-assets", "RPG_Environmental_Guidance_Posters.pdf"))
      : await readFile(path.join(process.cwd(), "private-assets", "RPG_Decoding_Environmental_Aspects.pdf"));
    const filename = asset === "posters"
      ? "RPG_Environmental_Guidance_Posters.pdf"
      : "RPG_Decoding_Environmental_Aspects.pdf";
    return new Response(bytes, {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  } catch {
    return failure("Download is temporarily unavailable. Please try again or contact info@rpgexcellence.com.", 503);
  }
}
