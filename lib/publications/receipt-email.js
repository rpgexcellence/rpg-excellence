import { GUEST_DOWNLOAD_WINDOW_SECONDS, PUBLICATIONS, guestDownloadUrl, isCurrentGuestPurchase, isVerifiedPublicationSession } from "./guest-access";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export async function sendPublicationReceipt(session) {
  const code = session.metadata?.publication_code;
  const pub = PUBLICATIONS[code];
  if (!pub || !isVerifiedPublicationSession(session, code) || !isCurrentGuestPurchase(session)) {
    // No receipt is sent for old account-bound purchases or unpaid sessions.
    return;
  }

  const email = String(session.customer_details?.email || session.customer_email || "")
    .trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Paid publication order has no valid customer email.");
  }
  if (!process.env.RESEND_API_KEY) {
    // Failing the webhook is intentional: Stripe retries until email delivery
    // is accepted, while the checkout success page still offers download.
    throw new Error("RESEND_API_KEY is not configured for publication delivery.");
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com").replace(/\/$/, "");
  const expires = Number(session.created) + GUEST_DOWNLOAD_WINDOW_SECONDS;
  const downloadUrl = `${site}${guestDownloadUrl(session.id, code, expires)}`;
  const expiryLabel = new Date(expires * 1000).toLocaleDateString("en-GB", {
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
  });
  const from = process.env.RPG_PUBLICATION_EMAIL_FROM ||
    process.env.RPG_ACCESS_EMAIL_FROM || "RPG Excellence <enquiries@rpgexcellence.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `rpg-publication-${session.id}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Your RPG Excellence publication — ${pub.title}`,
      html: `<div style="font-family:Arial,sans-serif;color:#183454;max-width:650px;margin:auto;padding:24px">
        <div style="background:#102b4a;padding:24px;color:white;font-size:23px;font-weight:700">RPG Excellence</div>
        <h1 style="font-size:24px;margin-top:25px">Your publication is ready</h1>
        <p>Thank you for purchasing <strong>${escapeHtml(pub.title)}</strong>.</p>
        <p>Your secure download is available without creating an RPG Excellence account.</p>
        <p style="padding:18px 0"><a href="${escapeHtml(downloadUrl)}" style="background:#1556b7;color:#fff;padding:14px 20px;border-radius:7px;text-decoration:none;font-weight:700">Download your PDF</a></p>
        <p style="font-size:14px">The link expires on <strong>${escapeHtml(expiryLabel)}</strong>. It is intended only for you; please do not share it.</p>
        <p style="font-size:14px">Need help? Email info@rpgexcellence.com and include your Stripe receipt or order reference.</p>
        <p style="font-size:12px;color:#60748a">This is an independent RPG Excellence publication, not an official ISO, IEC or BSI publication.</p>
      </div>`,
      text: `Thank you for purchasing ${pub.title}.\n\nDownload your PDF: ${downloadUrl}\n\nThis personal link expires ${expiryLabel}. Do not share it.\n\nSupport: info@rpgexcellence.com`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Publication email could not be sent (Resend HTTP ${response.status}).`);
  }
}
