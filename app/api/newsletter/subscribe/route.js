import { createAdminClient } from "../../../../lib/supabase/admin";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const email = normalizeEmail(
      body?.email
    );

    const source =
      typeof body?.source === "string"
        ? body.source.trim()
        : "website";

    const locale =
      typeof body?.locale === "string"
        ? body.locale.trim()
        : "en";

    if (!email || !isValidEmail(email)) {
      return Response.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createAdminClient();

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("newsletter_subscribers")
      .select(
        "id, status"
      )
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Newsletter lookup error:",
        existingError
      );

      return Response.json(
        {
          error:
            "Unable to process your subscription.",
        },
        {
          status: 500,
        }
      );
    }

    if (existing) {
      if (
        existing.status ===
        "subscribed"
      ) {
        return Response.json({
          success: true,
          message:
            "You're already subscribed to RPG Insights.",
        });
      }

      const {
        error:
          resubscribeError,
      } = await supabase
        .from(
          "newsletter_subscribers"
        )
        .update({
          status: "subscribed",
          source,
          locale,
          consented_at:
            new Date().toISOString(),
          unsubscribed_at:
            null,
        })
        .eq("id", existing.id);

      if (resubscribeError) {
        console.error(
          "Newsletter resubscribe error:",
          resubscribeError
        );

        return Response.json(
          {
            error:
              "Unable to reactivate your subscription.",
          },
          {
            status: 500,
          }
        );
      }

      return Response.json({
        success: true,
        message:
          "Welcome back to RPG Insights.",
      });
    }

    const {
      error: insertError,
    } = await supabase
      .from(
        "newsletter_subscribers"
      )
      .insert({
        email,
        status: "subscribed",
        source,
        locale,
        consented_at:
          new Date().toISOString(),
      });

    if (insertError) {
      console.error(
        "Newsletter insert error:",
        insertError
      );

      return Response.json(
        {
          error:
            "Unable to subscribe at the moment.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      success: true,
      message:
        "Thanks for joining RPG Insights.",
    });
  } catch (error) {
    console.error(
      "Newsletter subscribe error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to subscribe at the moment.",
      },
      {
        status: 500,
      }
    );
  }
}
