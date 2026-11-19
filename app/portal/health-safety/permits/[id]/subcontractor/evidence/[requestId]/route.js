import { createClient } from "../../../../../../../../lib/supabase/server";
import { getPermitAccess, mayIssuePermit } from "../../../../../../../../lib/permitAccess";
import { isRequestId, requestTable } from "../../../../../../../../lib/permit-subcontractor.mjs";

const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_request, { params }) {
  const { id, requestId } = await params;
  if (!isRequestId(id) || !isRequestId(requestId)) return missing();
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return missing();
    const access = await getPermitAccess(user.id, id);
    if (!access.allowed || !access.permit?.organization_id || !mayIssuePermit(access)) return missing();
    const { data } = await access.admin.from(requestTable).select("evidence_pdf")
      .eq("permit_id", id).eq("id", requestId).not("submitted_at", "is", null).maybeSingle();
    if (!data?.evidence_pdf) return missing();
    return new Response(Buffer.from(data.evidence_pdf, "base64"), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="subcontractor-evidence.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return missing();
  }
}
