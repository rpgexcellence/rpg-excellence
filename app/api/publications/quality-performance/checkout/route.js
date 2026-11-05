import Stripe from "stripe";
import { createClient } from "../../../../../lib/supabase/server";
import { publication, hasPublicationOwnerAccess } from "../../../../../lib/quality-performance-publication";
export const runtime = "nodejs";
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Please sign in before purchasing." }, { status: 401 });
    if (hasPublicationOwnerAccess(user)) return Response.json({ url: "/api/publications/quality-performance/download" });
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com").replace(/\/$/, "");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      success_url: `${origin}/en/publications/${publication.slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/en/publications/${publication.slug}?checkout=cancelled`,
      billing_address_collection: "auto",
      line_items: [{ quantity: 1, price_data: { currency: publication.currency, unit_amount: publication.amount, product_data: { name: publication.title, description: "20-page practical PDF guide with a worked example and four worksheets." } } }],
      metadata: { purchase_type: "digital_publication", publication_code: publication.code, owner_id: user.id },
    });
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
