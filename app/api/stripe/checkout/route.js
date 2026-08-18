import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const PRICE_IDS = {
  starter:
    "price_1U5WlUD5EtNcxgfBEIP28fEM",

  professional:
    "price_1U5WmDD5EtNcxgfBl5BaxRHe",

  consultant:
    "price_1U5WmuD5EtNcxgfB5KYndk8X",
};

export async function POST(request) {
  try {
    // -----------------------------------------------
    // VERIFY SIGNED-IN USER
    // -----------------------------------------------

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        {
          error:
            "Please sign in before starting a subscription.",
        },
        {
          status: 401,
        }
      );
    }

    // -----------------------------------------------
    // READ SELECTED PLAN
    // -----------------------------------------------

    const body =
      await request.json();

    const plan =
      typeof body?.plan === "string"
        ? body.plan
            .trim()
            .toLowerCase()
        : "";

    const priceId =
      PRICE_IDS[plan];

    if (!priceId) {
      return Response.json(
        {
          error:
            "Invalid subscription plan.",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------
    // LOAD USER ORGANISATION
    // -----------------------------------------------

    const {
      data: organizations,
      error:
        organizationsError,
    } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: true,
      })
      .limit(1);

    if (organizationsError) {
      console.error(
        "Unable to load organization:",
        organizationsError
      );
    }

    const organization =
      organizations?.[0] ?? null;

    // -----------------------------------------------
    // WEBSITE URL
    // -----------------------------------------------

    const origin =
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      "https://www.rpgexcellence.com";

    // -----------------------------------------------
    // CREATE STRIPE CHECKOUT SESSION
    // -----------------------------------------------

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer_email:
          user.email ?? undefined,

        client_reference_id:
          user.id,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        metadata: {
          owner_id: user.id,
          plan,
          price_id: priceId,
          organization_id:
            organization?.id ?? "",
        },

        subscription_data: {
          trial_period_days: 7,

          metadata: {
            owner_id:
              user.id,
            plan,
            price_id:
              priceId,
            organization_id:
              organization?.id ?? "",
          },
        },

        success_url:
          `${origin}/portal/billing/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/en/pricing?checkout=cancelled`,

        allow_promotion_codes:
          true,

        billing_address_collection:
          "auto",
      });

    if (!session.url) {
      return Response.json(
        {
          error:
            "Stripe did not return a checkout URL.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe Checkout error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to create checkout session.",
      },
      {
        status: 500,
      }
    );
  }
}
