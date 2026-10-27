import Stripe from "stripe";
import { open } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { createClient } from "../../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../../lib/portal-admin-access";
import { isVerifiedPublicationPurchase } from "../../../../../lib/publications.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CODE = "ISO9001-2026-INSIGHTS";
const FILES = {
  pdf: { name: "RPG_ISO9001_2026_Collected_Technical_Insights.pdf", type: "application/pdf" },
  bundle: { name: "RPG_ISO9001_2026_Customer_Download.zip", type: "application/zip" },
};

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "pdf";
    if (!Object.hasOwn(FILES, format)) return new Response("Unknown download format.", { status: 400 });
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return new Response("Sign in to access your purchase.", { status: 401 });
    if (!isPlatformOwner(user)) {
      const sessionId = url.searchParams.get("session_id");
      if (!sessionId || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
        return new Response("Invalid checkout reference.", { status: 400 });
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!isVerifiedPublicationPurchase(session, user.id, CODE)) {
        return new Response("Purchase not verified.", { status: 403 });
      }
    }
    const file = FILES[format];
    const handle = await open(path.join(process.cwd(), "private-assets", file.name), "r");
    // Stream private artwork after verification; do not buffer large downloads.
    const stream = Readable.toWeb(handle.createReadStream());
    return new Response(stream, { headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch (error) {
    console.error("Technical Insights download failed", error?.message);
    return new Response("Unable to deliver this publication. Please contact RPG Excellence support.", { status: 503 });
  }
}
