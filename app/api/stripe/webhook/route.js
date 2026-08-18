import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

function fromUnix(value) {
  if (!value) {
    return null;
  }

  return new Date(
    value * 1000
  ).toISOString();
}

async function saveSubscription(
  supabase,
  subscription
) {
  const ownerId =
    subscription.metadata?.owner_id;

  const plan =
    subscription.metadata?.plan ||
    null;

  const organizationId =
    subscription.metadata
      ?.organization_id ||
    null;

  const price =
    subscription.items?.data?.[0]
      ?.price;

  if (!ownerId) {
    console.error(
      "Stripe subscription missing owner_id metadata:",
      subscription.id
    );

    return;
  }

  const row = {
    owner_id: ownerId,
    organization_id:
      organizationId || null,

    plan,

    stripe_customer_id:
      typeof subscription.customer ===
      "string"
        ? subscription.customer
        : subscription.customer?.id,

    stripe_subscription_id:
      subscription.id,

    stripe_price_id:
      price?.id ?? null,

    status:
      subscription.status,

    trial_start:
      fromUnix(
        subscription.trial_start
      ),

    trial_end:
      fromUnix(
        subscription.trial_end
      ),

    current_period_start:
      fromUnix(
        subscription.current_period_start
      ),

    current_period_end:
      fromUnix(
        subscription.current_period_end
      ),

    cancel_at_period_end:
      Boolean(
        subscription.cancel_at_period_end
      ),

    updated_at:
      new Date().toISOString(),
  };

  const { error } =
    await supabase
      .from("subscriptions")
      .upsert(row, {
        onConflict:
          "stripe_subscription_id",
      });

  if (error) {
    throw new Error(
      `Unable to save subscription: ${error.message}`
    );
  }
}

export async function POST(request) {
  const signature =
    request.headers.get(
      "stripe-signature"
    );

  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET;

  if (
    !signature ||
    !webhookSecret
  ) {
    return new Response(
      "Webhook configuration missing",
      {
        status: 400,
      }
    );
  }

  const body =
    await request.text();

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error.message
    );

    return new Response(
      "Invalid webhook signature",
      {
        status: 400,
      }
    );
  }

  try {
    const supabase =
      await createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object;

        if (
          session.subscription
        ) {
          const subscription =
            await stripe.subscriptions.retrieve(
              session.subscription
            );

          await saveSubscription(
            supabase,
            subscription
          );
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object;

        await saveSubscription(
          supabase,
          subscription
        );

        break;
      }

      case "invoice.paid": {
        console.log(
          "Stripe invoice paid:",
          event.data.object.id
        );

        break;
      }

      case "invoice.payment_failed": {
        console.error(
          "Stripe invoice payment failed:",
          event.data.object.id
        );

        break;
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return Response.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return new Response(
      "Webhook processing failed",
      {
        status: 500,
      }
    );
  }
}
