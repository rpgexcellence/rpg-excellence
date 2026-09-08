import { createAdminClient } from "../../../lib/supabase/admin";

const allowedStandards = new Set(["ISO 9001", "ISO 14001", "ISO 45001", "ISO 22301", "ISO/IEC 27001", "ISO/IEC 17025", "ISO/IEC 17024", "ISO 19011", "AS9100", "Integrated management system", "Other / not sure"]);
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

async function sendNotification({ reference, fullName, email, organisation, phone, jobTitle, country, topic, standards, otherStandard, preferredContact, timescale, message }) {
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

  const htmlRows = rows.map(([label, value]) => `<tr><th style="padding:9px 12px;text-align:left;vertical-align:top;background:#f3f7fb;border:1px solid #dce6ef">${escapeHtml(label)}</th><td style="padding:9px 12px;border:1px solid #dce6ef">${escapeHtml(value)}</td></tr>`).join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "RPG Excellence Website <enquiries@rpgexcellence.com>",
      to: ["info@rpgexcellence.com"],
      reply_to: email,
      subject: `[${reference}] ${topic} — ${organisation}`,
      html: `<div style="font-family:Arial,sans-serif;color:#0b1830;max-width:720px"><h1 style="color:#1459d9">New RPG Excellence enquiry</h1><table style="width:100%;border-collapse:collapse">${htmlRows}</table><h2 style="margin-top:24px">Customer message</h2><div style="white-space:pre-wrap;padding:16px;background:#f7faff;border-left:4px solid #1459d9">${escapeHtml(message)}</div><p style="color:#607089">Reply to this email to respond directly to ${escapeHtml(fullName)}.</p></div>`,
      text: `${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nCustomer message:\n${message}`,
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
      await sendNotification({ reference, fullName, email, organisation, phone, jobTitle, country, topic, standards, otherStandard, preferredContact, timescale, message });
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
