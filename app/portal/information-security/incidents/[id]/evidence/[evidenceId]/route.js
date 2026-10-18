import { NextResponse } from "next/server";
import { requireOrganizationAccess } from "../../../../../../../lib/organization-access";
import { createAdminClient } from "../../../../../../../lib/supabase/admin";

const safeDownloadName = (value) =>
  String(value || "security-incident-evidence")
    .replace(/[\r\n"]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .slice(0, 180) || "security-incident-evidence";

export async function GET(request, { params }) {
  try {
    const { id, evidenceId } = await params;
    const { organization } = await requireOrganizationAccess(
      "information_security",
      "view",
      `/portal/information-security/incidents/${id}`,
    );

    const admin = createAdminClient();
    const { data: evidence, error } = await admin
      .from("isms_security_incident_evidence")
      .select("id,incident_id,organization_id,storage_path,original_file_name,mime_type,file_size_bytes")
      .eq("id", evidenceId)
      .eq("incident_id", id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence record not found or access is not permitted." },
        { status: 404 },
      );
    }

    const { data: incident, error: incidentError } = await admin
      .from("isms_security_incidents")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (incidentError) throw new Error(incidentError.message);
    if (!incident) {
      return NextResponse.json(
        { error: "The linked security incident is not available." },
        { status: 404 },
      );
    }

    const { data: file, error: downloadError } = await admin.storage
      .from("isms-security-incident-evidence")
      .download(evidence.storage_path);

    if (downloadError || !file) {
      throw new Error(downloadError?.message || "The evidence file could not be retrieved.");
    }

    const bytes = await file.arrayBuffer();
    const fileName = safeDownloadName(evidence.original_file_name);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": evidence.mime_type || file.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Security incident evidence download failed", error);
    const message = error instanceof Error ? error.message : "Evidence download failed.";
    const unauthorised = /sign|access|authori|permission|subscription/i.test(message);
    return NextResponse.json(
      { error: unauthorised ? "You are not authorised to download this evidence." : "The evidence file could not be downloaded." },
      { status: unauthorised ? 403 : 500 },
    );
  }
}
