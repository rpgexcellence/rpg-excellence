import Stripe from "stripe";

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
    const body = await request.json();

    const plan =
      typeof body?.plan === "string"
        ? body.plan.toLowerCase()
        : "";

    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      return Response.json(
        {
          error: "Invalid subscription plan",
        },
        {
          status: 400,
        }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.rpgexcellence.com";

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        subscription_data: {
          trial_period_days: 7,
        },

        success_url:
          `${origin}/portal/billing/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/en/pricing?checkout=cancelled`,

        allow_promotion_codes: true,

        billing_address_collection: "auto",
      });

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
          "Unable to create checkout session",
      },
      {
        status: 500,
      }
    );
  }
}
