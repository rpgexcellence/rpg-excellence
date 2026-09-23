import QRCode from "qrcode";
import { accessLabel, functionLabel, moduleLabel } from "./people-access";

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

const baseEmail = (title, body) => `<div style="margin:0;background:#eef4fa;padding:32px;font-family:Arial,sans-serif;color:#09284c"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #d7e2ed;border-radius:18px;overflow:hidden"><div style="padding:22px 28px;background:#082a54;color:#fff;font-size:22px;font-weight:800">RPG <span style="font-weight:400">Excellence</span></div><div style="padding:30px"><div style="color:#315fe6;font-size:11px;font-weight:900;letter-spacing:.12em">CONTROLLED COMPANY ACCESS</div><h1 style="margin:10px 0 16px;font-size:28px">${escapeHtml(title)}</h1>${body}<p style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e9f0;color:#718296;font-size:12px">If you were not expecting this message, do not use the invitation and contact your company administrator.</p></div></div></div>`;

export async function sendQrInvitation({ person, organisation, invitationUrl, functions, permissions, expiresAt }) {
  const qr = await QRCode.toDataURL(invitationUrl, { width: 620, margin: 2, errorCorrectionLevel: "M", color: { dark: "#082a54", light: "#ffffff" } });
  const qrBase64 = qr.split(",")[1];
  const roles = functions.filter((item) => item.status === "authorised").map((item) => functionLabel(item.function_key));
  const modules = permissions.filter((item) => item.access_level !== "none").map((item) => `${moduleLabel(item.module_key)} — ${accessLabel(item.access_level)}`);
  await sendEmail({
    from: accessFrom,
    to: [person.email],
    subject: `${organisation.name} has invited you to RPG Excellence`,
    attachments: [{ filename: "RPG-Excellence-invitation-QR.png", content: qrBase64 }],
    html: baseEmail(`Your RPG invitation is ready`, `<p>Hello ${escapeHtml(person.first_name)},</p><p>${escapeHtml(organisation.name)} has prepared a controlled RPG Excellence profile for you. Scan the attached QR code to verify your email and activate your account.</p><div style="margin:22px 0;padding:16px;background:#f3f7fb;border-left:4px solid #315fe6"><b>Position:</b> ${escapeHtml(person.position || "Not specified")}<br/><b>Authorised functions:</b> ${escapeHtml(roles.join(", ") || "None assigned")}<br/><b>Platform access:</b> ${escapeHtml(modules.join(", ") || "No module access assigned")}<br/><b>Invitation expires:</b> ${escapeHtml(new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt)))}</div><p><b>Security:</b> this QR is personal, single-use and restricted to ${escapeHtml(person.email)}. Do not forward it.</p>`),
    text: `Hello ${person.first_name},\n\n${organisation.name} has invited you to RPG Excellence. Scan the attached personal QR code to verify ${person.email} and activate your account.\n\nThis invitation expires ${expiresAt}. Do not forward it.`,
  });
}

export async function sendWelcomeEmail({ person, organisation, functions, permissions, manager }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com";
  const roles = functions.filter((item) => item.status === "authorised").map((item) => functionLabel(item.function_key));
  const modules = permissions.filter((item) => item.access_level !== "none").map((item) => `${moduleLabel(item.module_key)} — ${accessLabel(item.access_level)}`);
  await sendEmail({
    from: accessFrom,
    to: [person.email],
    subject: `Welcome to ${organisation.name} on RPG Excellence`,
    html: baseEmail(`Welcome to RPG Excellence`, `<p>Hello ${escapeHtml(person.first_name)},</p><p>Your account has been verified and connected to <b>${escapeHtml(organisation.name)}</b>.</p><div style="margin:22px 0;padding:16px;background:#f3f7fb;border-left:4px solid #10a37f"><b>Position:</b> ${escapeHtml(person.position || "Not specified")}<br/><b>Reports to:</b> ${escapeHtml(manager ? `${manager.first_name} ${manager.last_name}` : "Not assigned")}<br/><b>Authorised functions:</b> ${escapeHtml(roles.join(", ") || "None assigned")}<br/><b>Platform access:</b> ${escapeHtml(modules.join(", ") || "No module access assigned")}</div><a href="${site}/portal" style="display:inline-block;padding:13px 18px;border-radius:9px;background:#315fe6;color:#fff;text-decoration:none;font-weight:800">Open RPG Excellence</a><p style="margin-top:22px;color:#5f7185;font-size:13px">Your password is never included in an RPG email. Privileged users should enable multi-factor authentication.</p>`),
    text: `Hello ${person.first_name},\n\nYour RPG Excellence account is active and connected to ${organisation.name}.\n\nAuthorised functions: ${roles.join(", ") || "None assigned"}\nPlatform access: ${modules.join(", ") || "No module access assigned"}\n\nOpen ${site}/portal`,
  });
}
