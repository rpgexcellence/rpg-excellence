import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        {
          error: "Not authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const admin = createAdminClient();

    const { data: subscription, error: subscriptionError } =
      await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("owner_id", user.id)
        .not("stripe_customer_id", "is", null)
        .order("updated_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Unable to find subscription:",
        subscriptionError
      );

      return Response.json(
        {
          error: "Unable to find subscription",
        },
        {
          status: 500,
        }
      );
    }

    if (!subscription?.stripe_customer_id) {
      return Response.json(
        {
          error: "No Stripe customer found",
        },
        {
          status: 404,
        }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.rpgexcellence.com";

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${origin}/portal`,
      });

    return Response.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error(
      "Stripe customer portal error:",
      error
    );

    return Response.json(
      {
        error: "Unable to open billing portal",
      },
      {
        status: 500,
      }
    );
  }
}
