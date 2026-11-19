import Stripe from "stripe";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { isPlatformOwner } from "../../../../../lib/portal-admin-access";
import { EIGHT_D_CODE } from "../../../../../lib/eight-d-publication.mjs";
import { isVerifiedPublicationPurchase } from "../../../../../lib/publications.mjs";
import { EIGHT_D_BUCKET, EIGHT_D_FILES, eightDFilePath } from "../../../../../lib/eight-d-publication-storage";

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

function failure(error, status) {
  return Response.json({ error }, { status, headers });
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id) return failure("Sign in to access this download.", 401);
    const query = new URL(request.url).searchParams;
    const asset = query.get("asset") ?? "guide";
    if (!Object.hasOwn(EIGHT_D_FILES, asset)) return failure("Publication file not found.", 404);

    if (!isPlatformOwner(user)) {
      const sessionId = query.get("session_id");
      if (!/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId ?? "")) {
        return failure("Use the download link from your checkout confirmation page.", 400);
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      let session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (error) {
        if (error.code === "resource_missing") return failure("Purchase could not be verified.", 403);
        throw error;
      }
      if (!isVerifiedPublicationPurchase(session, user.id, EIGHT_D_CODE)) {
        return failure("A completed purchase for this account is required.", 403);
      }
    }

    const filename = EIGHT_D_FILES[asset];
    const storage = createAdminClient().storage;
    const { data: bucket, error: bucketError } = await storage.getBucket(EIGHT_D_BUCKET);
    if (bucketError || bucket?.public !== false) return failure("Download is temporarily unavailable.", 503);
    const { data, error: storageError } = await storage.from(EIGHT_D_BUCKET).download(eightDFilePath(filename));
    if (storageError || !data) return failure("Download is temporarily unavailable.", 503);
    return new Response(data, {
      headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="' + filename + '"' },
    });
  } catch {
    return failure("Download is temporarily unavailable. Please try again or contact info@rpgexcellence.com.", 503);
  }
}
