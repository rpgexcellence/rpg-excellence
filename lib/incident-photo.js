import "server-only";
import sharp from "sharp";
export const MAX_INCIDENT_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_PIXELS = 24000000;
const failure = (message) =>
  Object.assign(new Error(message), { code: "INCIDENT_PHOTO_INVALID" });

// Decode and re-encode supported raster photos. Never persist the original
// filename or original bytes, including EXIF/GPS/device metadata.
export async function prepareIncidentPhoto(file) {
  if (!file || file.size === 0) return null;
  if (
    typeof file.arrayBuffer !== "function" ||
    !Number.isInteger(file.size) ||
    file.size < 1 ||
    file.size > MAX_INCIDENT_PHOTO_BYTES
  )
    throw failure(
      "Choose one JPEG, PNG or WebP photo up to 3 MB, or submit without a photo.",
    );
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length !== file.size)
    throw failure(
      "The photo could not be read. Select it again or submit without a photo.",
    );
  const jpeg = input.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = input
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    input.subarray(0, 4).toString() === "RIFF" &&
    input.subarray(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !webp)
    throw failure(
      "Only JPEG, PNG and WebP photos are supported. Convert HEIC images to JPEG before uploading.",
    );
  try {
    const image = sharp(input, {
      limitInputPixels: MAX_PIXELS,
      failOn: "warning",
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_PIXELS ||
      (metadata.pages || 1) > 1
    )
      throw Error("Unsupported dimensions or animation");
    const buffer = await image
      .rotate()
      .resize({
        width: 2560,
        height: 2560,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 4 })
      .timeout({ seconds: 10 })
      .toBuffer();
    if (!buffer.length || buffer.length > MAX_INCIDENT_PHOTO_BYTES)
      throw Error("Image output exceeds limit");
    return { buffer, mime: "image/webp", fileName: "Report-photo.webp" };
  } catch {
    throw failure(
      "This photo could not be processed. Use a valid static photo up to 24 megapixels, or submit without it.",
    );
  }
}

// Both callers obtain organisation and report IDs from the server-side intake
// result. No public bucket policy, public upload URL or account identity is used.
export async function storeIncidentPhoto({
  admin,
  organizationId,
  incidentId,
  photo,
  actorUserId = null,
}) {
  if (!photo) return { attached: false };
  const report = await admin
    .from("incident_reports")
    .select("id,anonymous,status")
    .eq("id", incidentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (
    report.error ||
    !report.data ||
    ["closed", "rejected", "duplicate"].includes(report.data.status)
  )
    throw Error("The photo could not be attached to this report.");
  const path = `${organizationId}/${incidentId}/intake-photo.webp`;
  const existing = await admin
    .from("incident_evidence")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("incident_id", incidentId)
    .eq("storage_path", path)
    .maybeSingle();
  if (existing.error)
    throw Error("Photo registration is temporarily unavailable.");
  if (existing.data) return { attached: true, id: existing.data.id };
  const uploaded = await admin.storage
    .from("incident-evidence")
    .upload(path, photo.buffer, { contentType: "image/webp", upsert: false });
  if (uploaded.error) throw Error("Photo storage is temporarily unavailable.");
  const actor = report.data.anonymous ? null : actorUserId;
  const saved = await admin
    .from("incident_evidence")
    .insert({
      organization_id: organizationId,
      incident_id: incidentId,
      storage_path: path,
      file_name: photo.fileName,
      mime_type: photo.mime,
      size_bytes: photo.buffer.length,
      uploaded_by: actor,
    })
    .select("id")
    .single();
  if (saved.error) {
    await admin.storage.from("incident-evidence").remove([path]);
    throw Error("The photo could not be registered.");
  }
  const event = await admin.from("incident_events").insert({
    organization_id: organizationId,
    incident_id: incidentId,
    actor_user_id: actor,
    event_type: "report_photo_added",
    summary:
      "Private report photo attached; identifying image metadata removed. Original file is not retained.",
    event_data: {
      evidence_id: saved.data.id,
      mime_type: photo.mime,
      size_bytes: photo.buffer.length,
      metadata_removed: true,
    },
  });
  if (event.error)
    console.error("Incident photo audit entry failed:", event.error.code);
  return { attached: true, id: saved.data.id };
}
