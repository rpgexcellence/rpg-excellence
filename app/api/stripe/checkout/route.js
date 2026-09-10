import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY); }

const PRICE_IDS = {
  starter:
    "price_1U5WlUD5EtNcxgfBEIP28fEM",

  professional:
    "price_1U5WmDD5EtNcxgfBl5BaxRHe",

  consultant:
    "price_1U5WmuD5EtNcxgfB5KYndk8X",
};
const ASSESSMENT_STANDARDS = ["ISO 9001:2015/Amd 1:2024", "ISO 14001:2026", "ISO 45001:2018", "ISO/IEC 17024:2026"];

export async function POST(request) {
  try {
    const stripe = getStripe();
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

    const purchaseType = ["single_assessment", "standalone_soa"].includes(body?.purchaseType)
      ? body.purchaseType
      : "subscription";

    const plan =
      typeof body?.plan === "string"
        ? body.plan
            .trim()
            .toLowerCase()
        : "";

    const priceId =
      PRICE_IDS[plan];

    const standard = typeof body?.standard === "string" ? body.standard.trim() : "";

    if (purchaseType === "single_assessment" && !ASSESSMENT_STANDARDS.includes(standard)) {
      return Response.json({ error: "Invalid assessment standard." }, { status: 400 });
    }

    if (purchaseType === "subscription" && !priceId) {
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

    const shared = {
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      success_url: `${origin}/portal/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/en/pricing?checkout=cancelled`,
      billing_address_collection: "auto",
    };

    const session = purchaseType === "single_assessment"
      ? await stripe.checkout.sessions.create({
        ...shared,
        mode: "payment",
        line_items: [{ price_data: { currency: "gbp", unit_amount: 12900, product_data: { name: `RPG Intelligence ${standard} Assessment`, description: "One assessment with 30-day completion access, 90-day linked corrective-action management and retained read-only records." } }, quantity: 1 }],
        metadata: { purchase_type: "single_assessment", owner_id: user.id, organization_id: organization?.id ?? "", standard },
      })
      : purchaseType === "standalone_soa"
      ? await stripe.checkout.sessions.create({
        ...shared,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            unit_amount: 12900,
            product_data: {
              name: "RPG Intelligence ISO/IEC 27001 Statement of Applicability",
              description: "Standalone 93-control SoA workspace with ISO/IEC 27002-aligned guidance, controlled executive report and PDF.",
            },
          },
          quantity: 1,
        }],
        metadata: {
          purchase_type: "standalone_soa",
          owner_id: user.id,
          organization_id: organization?.id ?? "",
          standard: "ISO/IEC 27001:2022",
        },
      })
      : await stripe.checkout.sessions.create({
        ...shared,
        mode: "subscription",

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        metadata: {
          purchase_type: "subscription",
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

        allow_promotion_codes:
          true,

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
