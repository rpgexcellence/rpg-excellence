import QRCode from "qrcode";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

const accessFrom = process.env.RPG_ACCESS_EMAIL_FROM || "RPG Excellence <enquiries@rpgexcellence.com>";
const unexpectedMessage = "If you were not expecting this email, contact your company administrator before using the link.";
const baseEmail = (title, body) => `<div style="margin:0;background:#f3f6f9;padding:24px;font-family:Arial,sans-serif;color:#09284c"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #d7e2ed;border-radius:10px"><div style="padding:20px 24px;border-bottom:1px solid #d7e2ed;font-size:20px;font-weight:700">RPG Excellence</div><div style="padding:24px"><h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>${body}<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e9f0;color:#5f7185;font-size:13px;line-height:1.6">${unexpectedMessage}</p></div></div></div>`;
const actionLink = (url, label) => `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#315fe6;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></p>`;

export async function sendQrInvitation({ person, organisation, invitationUrl, expiresAt }) {
  const qr = await QRCode.toDataURL(invitationUrl, { width: 620, margin: 2, errorCorrectionLevel: "M", color: { dark: "#082a54", light: "#ffffff" } });
  const expiry = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(expiresAt)) + " UTC";
  await sendEmail({
    from: accessFrom,
    to: [person.email],
    subject: "Set up your RPG Excellence account",
    attachments: [{ filename: "RPG-Excellence-invitation-QR.png", content: qr.split(",")[1] }],
    html: baseEmail("You’re invited to RPG Excellence", `<p>Hello ${escapeHtml(person.first_name)},</p><p>${escapeHtml(organisation.name)} has invited you to use RPG Excellence.</p><p>Use your personal invitation link to create an account or sign in with your existing account, then confirm your identity to activate your company access.</p>${actionLink(invitationUrl, "Set up your account")}<p>This invitation expires on ${escapeHtml(expiry)}.</p><p>You can also scan the attached QR code to open the same invitation.</p><p style="color:#5f7185;font-size:13px;line-height:1.6">The invitation is personal and can only be accepted using the email address it was sent to. It is single-use. Do not forward it.</p>`),
    text: `Hello ${person.first_name},\n\n${organisation.name} has invited you to use RPG Excellence.\n\nUse your personal invitation link to create an account or sign in with your existing account, then confirm your identity to activate your company access:\n${invitationUrl}\n\nThis invitation expires on ${expiry}.\n\nYou can also scan the attached QR code to open the same invitation. The invitation is personal and can only be accepted using the email address it was sent to. It is single-use. Do not forward it.\n\n${unexpectedMessage}`,
  });
}

export async function sendWelcomeEmail({ person, organisation }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com";
  const accessUrl = new URL("/portal/my-access", site).toString();
  await sendEmail({
    from: accessFrom,
    to: [person.email],
    subject: "Your RPG Excellence access is ready",
    html: baseEmail("Your access is ready", `<p>Hello ${escapeHtml(person.first_name)},</p><p>Your company administrator has connected your account to ${escapeHtml(organisation.name)} on RPG Excellence.</p><p>Sign in to view your assigned modules and responsibilities.</p>${actionLink(accessUrl, "Sign in to RPG Excellence")}`),
    text: `Hello ${person.first_name},\n\nYour company administrator has connected your account to ${organisation.name} on RPG Excellence.\n\nSign in to view your assigned modules and responsibilities:\n${accessUrl}\n\n${unexpectedMessage}`,
  });
}
