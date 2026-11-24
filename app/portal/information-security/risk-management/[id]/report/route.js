import { createClient } from "../../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import { renderISMSRiskRecord } from "../../../../../../lib/isms-risk-record-pdf.mjs";
import { siteToday } from "../../../../../../lib/zone-policy.mjs";
import { loadRiskRecord } from "../../risk-record-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to download this record.", { status: 401 });
  await requirePlanAccess(user, "professional", "Information Security");
  const { data: organization, error } = await supabase.from("organizations").select("id,name")
    .eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (error) throw new Error("The organisation could not be loaded.");
  const record = organization && await loadRiskRecord(supabase, user.id, organization.id, id);
  if (!record) return new Response("Risk assessment not found.", { status: 404 });
  const bytes = await renderISMSRiskRecord(record, { organizationName: organization.name, today: siteToday("Europe/London") });
  const filename = String(record.risk.risk_reference || "isms-risk").replace(/[^A-Za-z0-9_-]/g, "-");
  return new Response(bytes, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="' + filename + '.pdf"',
    "Cache-Control": "private, no-store",
  } });
}
