import Stripe from "stripe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "../../../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../../../lib/portal-admin-access";
import { isVerifiedPublicationPurchase } from "../../../../../../lib/publications.mjs";
import { getClausePublication } from "../../../../../../lib/iso9001-clause-publications.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function failure(message, status) {
  return Response.json({ error: message }, { status, headers: privateHeaders });
}

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id) return failure("Sign in with the account used for your purchase.", 401);

    const { clause } = await params;
    const publication = getClausePublication(clause);
    if (!publication) return failure("Publication not found.", 404);
    const query = new URL(request.url).searchParams;
    const asset = query.get("asset") || "guide";
    if (!["guide", "posters"].includes(asset)) return failure("Publication file not found.", 404);

    // Existing authenticated owner policy preserves complimentary access.
    if (!isPlatformOwner(user)) {
      const sessionId = query.get("session_id");
      if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
        return failure("Open the download link from your checkout confirmation page.", 400);
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!isVerifiedPublicationPurchase(session, user.id, publication.code)) {
        return failure("A completed £4.99 purchase of this clause guide for this account is required.", 403);
      }
    }

    // Filenames are taken only from trusted product metadata, never from request input.
    const filename = asset === "posters" ? publication.posterFilename : publication.filename;
    const bytes = await readFile(path.join(process.cwd(), "private-assets", filename));
    return new Response(bytes, { headers: {
      ...privateHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
    } });
  } catch {
    return failure("Download is temporarily unavailable. Please try again or contact info@rpgexcellence.com.", 503);
  }
}
