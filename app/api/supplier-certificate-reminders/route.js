import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { sendSupplierCertificateReminder } from "../../../lib/supplier-reminder-email";

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: reminders = [], error } = await admin.from("supplier_subtier_suppliers").select("*, suppliers!inner(id,legal_name), organizations!inner(id,name,owner_id)").lte("reminder_date", today).is("reminder_sent_at", null).not("certificate_expiry", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0;
  const failures = [];
  for (const supplier of reminders) {
    try {
      const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(supplier.organizations.owner_id);
      if (ownerError || !owner?.user?.email) throw new Error(ownerError?.message || "Company owner email not found.");
      await sendSupplierCertificateReminder({ to: owner.user.email, organisation: supplier.organizations, supplier, parentSupplier: supplier.suppliers });
      await admin.from("supplier_subtier_suppliers").update({ reminder_sent_at: new Date().toISOString() }).eq("id", supplier.id);
      sent += 1;
    } catch (reminderError) {
      failures.push({ id: supplier.id, error: reminderError.message });
    }
  }
  return NextResponse.json({ checked: reminders.length, sent, failures });
}
