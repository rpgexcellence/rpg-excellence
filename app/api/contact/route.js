import { createAdminClient } from "../../../lib/supabase/admin";

const allowedStandards = new Set(["ISO 9001", "ISO 14001", "ISO 45001", "ISO 22301", "ISO/IEC 27001", "ISO/IEC 17025", "ISO/IEC 17024", "ISO 19011", "AS9100", "Integrated management system", "Other / not sure"]);
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
    const { error } = await supabase.from("contact_enquiries").insert({
      enquiry_reference: reference,
      full_name: fullName,
      email,
      phone: clean(body?.phone, 80) || null,
      organisation,
      job_title: clean(body?.jobTitle, 160) || null,
      country: clean(body?.country, 120) || null,
      topic,
      standards,
      other_standard: clean(body?.otherStandard, 200) || null,
      preferred_contact: clean(body?.preferredContact, 40) || "Email",
      required_timescale: clean(body?.timescale, 100) || null,
      message,
      locale: clean(body?.locale, 10) || "en",
      source: clean(body?.source, 80) || "website",
      consented_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Contact enquiry insert error:", error);
      return Response.json({ error: "Your enquiry could not be saved. Please email info@rpgexcellence.com." }, { status: 500 });
    }
    return Response.json({ success: true, reference });
  } catch (error) {
    console.error("Contact enquiry error:", error);
    return Response.json({ error: "Your enquiry could not be sent. Please email info@rpgexcellence.com." }, { status: 500 });
  }
}
