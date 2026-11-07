import {
  requireAssetRecord,
  recordAssetAccess,
  attachmentName,
  PRIVATE_ASSET_HEADERS,
} from "../../../../../../lib/asset-record";

import { makeAssetLabel } from "../../../../../../lib/asset-label";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;

  const context = await requireAssetRecord(id, "contribute");

  let owner = "Not recorded";

  if (context.asset.asset_owner_person_id) {
    const { data, error } = await context.admin
      .from("organization_people")
      .select("first_name,last_name")
      .eq("id", context.asset.asset_owner_person_id)
      .eq("organization_id", context.access.organization.id)
      .maybeSingle();

    if (error) {
      throw new Error("The label owner could not be loaded.");
    }

    if (data) {
      owner =
        [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ") || "Not recorded";
    }
  }

  const bytes = await makeAssetLabel({
    asset: context.asset,
    owner,
  });

  await recordAssetAccess(context, "label_download");

  return new Response(bytes, {
    headers: {
      ...PRIVATE_ASSET_HEADERS,
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"".concat(
        attachmentName(context.asset.asset_reference),
        "-label.pdf\"",
      ),
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
