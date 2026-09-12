import Stripe from "stripe";
import { createAdminClient } from "../../../../lib/supabase/admin";

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY); }

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
    console.error(
      "Supabase subscription save error:",
      error
    );

    throw new Error(
      `Unable to save subscription: ${error.message}`
    );
  }

  console.log(
    "Subscription saved:",
    subscription.id,
    subscription.status
  );
}

async function saveAssessmentPass(supabase, session) {
  const ownerId = session.metadata?.owner_id;
  const standard = session.metadata?.standard;
  if (!ownerId || !standard || session.payment_status !== "paid") throw new Error("Paid assessment checkout is missing required metadata.");
  const purchasedAt = new Date();
  const expiresAt = new Date(purchasedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
  const remediationExpiresAt = new Date(purchasedAt);
  remediationExpiresAt.setUTCDate(remediationExpiresAt.getUTCDate() + 90);
  const { error } = await supabase.from("assessment_passes").upsert({
    owner_id: ownerId, organization_id: session.metadata?.organization_id || null, standard, status: "available",
    product_type: session.metadata?.purchase_type === "standalone_soa" ? "standalone_soa" : "single_assessment",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    amount_paid: session.amount_total, currency: session.currency,
    purchased_at: purchasedAt.toISOString(), access_expires_at: expiresAt.toISOString(), remediation_expires_at: remediationExpiresAt.toISOString(), updated_at: purchasedAt.toISOString(),
  }, { onConflict: "stripe_checkout_session_id" });
  if (error) throw new Error(`Unable to save assessment pass: ${error.message}`);
}

async function saveTrainingPurchase(supabase, session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const ownerId = session.metadata?.owner_id;
  const learnerId = session.metadata?.learner_id || ownerId;
  const organizationId = session.metadata?.organization_id || null;
  const courseId = session.metadata?.course_id;
  const courseCode = session.metadata?.course_code;

  if (!ownerId || !learnerId || !courseId || !courseCode) {
    throw new Error("Paid training checkout is missing required metadata.");
  }

  const { data: course, error: courseError } = await supabase
    .from("hs_training_courses")
    .select("id,course_code")
    .eq("id", courseId)
    .eq("course_code", courseCode)
    .eq("active", true)
    .maybeSingle();

  if (courseError) {
    throw new Error(`Unable to verify training course: ${courseError.message}`);
  }

  if (!course) {
    throw new Error("Paid training checkout references an unavailable course.");
  }

  const purchasedAt = new Date();
  const accessExpiresAt = new Date(purchasedAt);
  accessExpiresAt.setUTCFullYear(accessExpiresAt.getUTCFullYear() + 1);

  const passRow = {
    owner_id: ownerId,
    organization_id: organizationId,
    course_id: course.id,
    status: "consumed",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    amount_paid: session.amount_total ?? null,
    currency: session.currency || "gbp",
    purchased_at: purchasedAt.toISOString(),
    access_expires_at: accessExpiresAt.toISOString(),
    assigned_to: learnerId,
    consumed_at: purchasedAt.toISOString(),
    updated_at: purchasedAt.toISOString(),
  };

  const { data: trainingPass, error: passError } = await supabase
    .from("hs_training_passes")
    .upsert(passRow, { onConflict: "stripe_checkout_session_id" })
    .select("id")
    .single();

  if (passError) {
    throw new Error(`Unable to save training pass: ${passError.message}`);
  }

  const { data: existingEnrolment, error: enrolmentCheckError } = await supabase
    .from("hs_training_enrolments")
    .select("id")
    .eq("training_pass_id", trainingPass.id)
    .eq("learner_id", learnerId)
    .maybeSingle();

  if (enrolmentCheckError) {
    throw new Error(`Unable to check training enrolment: ${enrolmentCheckError.message}`);
  }

  if (!existingEnrolment) {
    const { error: enrolmentError } = await supabase
      .from("hs_training_enrolments")
      .insert({
        learner_id: learnerId,
        organization_id: organizationId,
        course_id: course.id,
        training_pass_id: trainingPass.id,
        status: "not_started",
        progress_percent: 0,
        expires_at: accessExpiresAt.toISOString(),
        updated_at: purchasedAt.toISOString(),
      });

    if (enrolmentError) {
      throw new Error(`Unable to create training enrolment: ${enrolmentError.message}`);
    }
  }

  console.log("Training access saved:", session.id, learnerId, course.course_code);
}

async function processCheckoutSession(stripe, supabase, session) {
  const purchaseType = session.metadata?.purchase_type;

  if (purchaseType === "training_course") {
    await saveTrainingPurchase(supabase, session);
  } else if (["single_assessment", "standalone_soa"].includes(purchaseType)) {
    await saveAssessmentPass(supabase, session);
  } else if (session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await saveSubscription(supabase, subscription);
  }
}

export async function POST(request) {
  const stripe = getStripe();
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
      createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object;

        await processCheckoutSession(stripe, supabase, session);

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        await processCheckoutSession(stripe, supabase, session);

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

      default: {
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
      }
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

