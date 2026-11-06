import { createAdminClient } from "../../../lib/supabase/admin";

const allowedStandards = new Set(["ISO 9001", "ISO 14001", "ISO 45001", "ISO 22301", "ISO/IEC 27001", "ISO/IEC 17025", "ISO/IEC 17024", "ISO 19011", "AS9100", "Integrated management system", "Other / not sure"]);
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);


function emailTable(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:12px 0 22px">${rows.map(([label, value]) => `<tr><th scope="row" style="width:34%;padding:12px;text-align:left;vertical-align:top;background:#f0f5fb;border:1px solid #dce6ef;font-size:13px;line-height:1.6">${escapeHtml(label)}</th><td style="padding:12px;vertical-align:top;border:1px solid #dce6ef;font-size:14px;line-height:1.6;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("")}</table>`;
}

function emailText(value) {
  // Explicit line breaks remain readable in Outlook and other email clients.
  return escapeHtml(value).replace(/\r\n?/g, "\n").replace(/\n/g, "<br />");
}

function partnerApplicationHtml(message) {
  const text = message.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const prefixes = ["Partner route: ", "Business website: ", "Countries served: ", "Industry focus: "];
  // Keep the complete original message as a readable fallback for older formats.
  if (!prefixes.every((prefix, index) => lines[index]?.startsWith(prefix))) return null;
  const experienceMarker = "\n\nRelevant experience and current services:\n";
  const proposalMarker = "\n\nProposed collaboration:\n";
  const notice = "Applicant requests a partnership discussion. No partner appointment or commercial terms are accepted by submitting this form.";
  const start = text.indexOf(experienceMarker);
  const end = text.indexOf(proposalMarker, start + experienceMarker.length);
  if (start < 0 || end < 0) return null;
  const experience = text.slice(start + experienceMarker.length, end);
  const proposalWithNotice = text.slice(end + proposalMarker.length);
  const proposal = proposalWithNotice.endsWith("\n\n" + notice)
    ? proposalWithNotice.slice(0, -(notice.length + 2)) : proposalWithNotice;
  const details = prefixes.map((prefix, index) => [prefix.slice(0, -2), lines[index].slice(prefix.length)]);
  const section = (heading, value) => `<h2 style="margin:26px 0 10px;color:#102d4e;font-size:19px;line-height:1.4">${heading}</h2><div style="padding:18px;background:#f7faff;border:1px solid #dce6ef;border-left:4px solid #1459d9;border-radius:4px;font-size:14px;line-height:1.8;word-break:break-word">${emailText(value)}</div>`;
  return `<h2 style="margin:26px 0 10px;color:#102d4e;font-size:19px">Partnership details</h2>${emailTable(details)}${section("Experience and current services", experience)}${section("Proposed collaboration", proposal)}<p style="margin:22px 0;color:#607089;font-size:12px;line-height:1.7">Application for discussion only. Partner appointment and commercial terms require separate agreement.</p>`;
}

async function sendNotification({ reference, fullName, email, organisation, phone, jobTitle, country, topic, standards, otherStandard, preferredContact, timescale, message, source }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const rows = [
    ["Reference", reference],
    ["Topic", topic],
    ["Standards", standards.join(", ")],
    ["Other standard", otherStandard],
    ["Name", fullName],
    ["Organisation", organisation],
    ["Job title", jobTitle],
    ["Email", email],
    ["Telephone", phone],
    ["Country", country],
    ["Preferred contact", preferredContact],
    ["Required timescale", timescale],
  ].filter(([, value]) => value);

  const isPartner = source === "partner-application";
  const heading = isPartner ? "New partner application" : "New RPG Excellence enquiry";
  const htmlRows = emailTable(rows);
  const partnerBody = isPartner ? partnerApplicationHtml(message) : null;
  const messageBody = partnerBody || `<h2 style="margin-top:24px">${isPartner ? "Partner application details" : "Customer message"}</h2><div style="padding:16px;background:#f7faff;border-left:4px solid #1459d9;font-size:14px;line-height:1.8">${emailText(message)}</div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "RPG Excellence Website <enquiries@rpgexcellence.com>",
      to: ["info@rpgexcellence.com"],
      reply_to: email,
      subject: `[${reference}] ${topic} — ${organisation}`,
      html: `<div style="font-family:Arial,sans-serif;color:#0b1830;max-width:720px;margin:0 auto"><h1 style="color:#1459d9;font-size:26px;line-height:1.25">${heading}</h1><h2 style="font-size:19px;color:#102d4e">${isPartner ? "Applicant and contact details" : "Enquiry details"}</h2>${htmlRows}${messageBody}<p style="margin-top:24px;color:#607089;font-size:13px;line-height:1.7">Reply to this email to respond directly to ${escapeHtml(fullName)}.</p></div>`,
      text: `${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${isPartner ? "Partner application details" : "Customer message"}:\n${message}`,
    }),
  });

  if (!response.ok) {
    const failure = await response.text();
    throw new Error(`Resend ${response.status}: ${failure.slice(0, 500)}`);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (clean(body?.website)) return Response.json({ success: true, reference: "ENQ-RECEIVED" });

    const fullName = clean(body?.fullName, 160);
    const email = clean(body?.email, 254).toLowerCase();
    const organisation = clean(body?.organisation, 200);
    const topic = clean(body?.topic, 160);
    const message = clean(body?.message, 5000);
    const standards = Array.isArray(body?.standards) ? [...new Set(body.standards.map((item) => clean(item, 80)).filter((item) => allowedStandards.has(item)))] : [];

    if (!fullName || !validEmail(email) || !organisation || !topic || message.length < 20 || standards.length === 0 || body?.consent !== true) {
      return Response.json({ error: "Complete the required contact, topic, standard, message and consent fields." }, { status: 400 });
    }

    const reference = `ENQ-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const supabase = createAdminClient();
    const phone = clean(body?.phone, 80) || null;
    const jobTitle = clean(body?.jobTitle, 160) || null;
    const country = clean(body?.country, 120) || null;
    const otherStandard = clean(body?.otherStandard, 200) || null;
    const preferredContact = clean(body?.preferredContact, 40) || "Email";
    const timescale = clean(body?.timescale, 100) || null;
    const { error } = await supabase.from("contact_enquiries").insert({
      enquiry_reference: reference,
      full_name: fullName,
      email,
      phone,
      organisation,
      job_title: jobTitle,
      country,
      topic,
      standards,
      other_standard: otherStandard,
      preferred_contact: preferredContact,
      required_timescale: timescale,
      message,
      locale: clean(body?.locale, 10) || "en",
      source: clean(body?.source, 80) || "website",
      consented_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Contact enquiry insert error:", error);
      return Response.json({ error: "Your enquiry could not be saved. Please email info@rpgexcellence.com." }, { status: 500 });
    }
    try {
      await sendNotification({ reference, fullName, email, organisation, phone, jobTitle, country, topic, standards, otherStandard, preferredContact, timescale, message, source: clean(body?.source, 80) });
    } catch (notificationError) {
      console.error("Contact notification email error:", notificationError);
      return Response.json({ success: true, reference, notificationSent: false });
    }

    return Response.json({ success: true, reference, notificationSent: true });
  } catch (error) {
    console.error("Contact enquiry error:", error);
    return Response.json({ error: "Your enquiry could not be sent. Please email info@rpgexcellence.com." }, { status: 500 });
  }
}
