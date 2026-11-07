import { notFound } from "next/navigation";
import { ASSET_UUID, requireAssetRecord, recordAssetAccess, safeEvidencePath, attachmentName, PRIVATE_ASSET_HEADERS } from "../../../../../../../lib/asset-record";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request, {
  params
}) {
  const {
    id,
    recordId
  } = await params;
  const context = await requireAssetRecord(id);
  if (!ASSET_UUID.test(String(recordId))) notFound();
  const {
    data: record,
    error
  } = await context.admin.from("organization_asset_maintenance").select("id,evidence_storage_path,evidence_file_name").eq("id", recordId).eq("asset_id", context.asset.id).eq("organization_id", context.access.organization.id).eq("owner_id", context.access.organization.owner_id).maybeSingle();
  if (error) throw new Error("The evidence is unavailable. Please try again later.");
  if (!record || !safeEvidencePath(record.evidence_storage_path, context.access.organization.id, context.asset.id)) notFound();
  const {
    data,
    error: downloadError
  } = await context.admin.storage.from("asset-maintenance-evidence").download(record.evidence_storage_path);
  if (downloadError || !data) return new Response("Evidence is currently unavailable. No safety or compliance conclusion can be drawn.", {
    status: 503,
    headers: PRIVATE_ASSET_HEADERS
  });
  await recordAssetAccess(context, "evidence_download", record.id);
  return new Response(data, {
    headers: {
      ...PRIVATE_ASSET_HEADERS,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename=\"".concat(attachmentName(record.evidence_file_name), "\""),
      "Content-Security-Policy": "default-src 'none'; sandbox"
    }
  });
}
