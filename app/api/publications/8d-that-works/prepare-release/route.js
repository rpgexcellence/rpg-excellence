import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { EIGHT_D_BUCKET, eightDFilePath } from "../../../../../lib/eight-d-publication-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const authorizationHash = "18891b8600fef2e6172d8fe6e998436a0d4938d33a579a2034e54b796f82bcd7";
const expires = Date.parse("2026-11-19T14:29:55+00:00");
const approvedFiles = {
  "RPG_8D_That_Works.pdf": {
    "size": 1198380,
    "sha256": "8752857d68009167743e047488e719e2342d48b410233391a761d3734839c59b"
  },
  "RPG_8D_Practical_Posters.pdf": {
    "size": 405399,
    "sha256": "0fe9633313685abc4004b3fa4ace47107718fdd7b887d90ee4203d1bf33ccfb2"
  }
};

export async function POST(request) {
  const authorization = request.headers.get("authorization") || "";
  const digest = createHash("sha256").update(authorization).digest();
  if (Date.now() > expires || !timingSafeEqual(digest, Buffer.from(authorizationHash, "hex"))) {
    return new Response(null, { status: 404 });
  }

  const filename = new URL(request.url).searchParams.get("file") || "";
  if (!Object.hasOwn(approvedFiles, filename)) return new Response(null, { status: 400 });
  const approvedFile = approvedFiles[filename];
  if (Number(request.headers.get("content-length")) !== approvedFile.size) return new Response(null, { status: 400 });
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length !== approvedFile.size || createHash("sha256").update(bytes).digest("hex") !== approvedFile.sha256) {
    return new Response(null, { status: 400 });
  }

  const storage = createAdminClient().storage;
  let result = await storage.getBucket(EIGHT_D_BUCKET);
  if (result.error) {
    await storage.createBucket(EIGHT_D_BUCKET, { public: false, allowedMimeTypes: ["application/pdf"], fileSizeLimit: 4000000 });
    result = await storage.getBucket(EIGHT_D_BUCKET);
  }
  if (result.error || result.data?.public !== false) return new Response(null, { status: 503 });
  const bucket = storage.from(EIGHT_D_BUCKET);
  const target = eightDFilePath(filename);
  const { error } = await bucket.upload(target, bytes, { contentType: "application/pdf", upsert: false });
  if (error) {
    const existing = await bucket.download(target);
    if (existing.error || !existing.data || createHash("sha256").update(Buffer.from(await existing.data.arrayBuffer())).digest("hex") !== approvedFile.sha256) {
      return new Response(null, { status: 503 });
    }
  }
  return Response.json({ uploaded: filename }, { headers: { "Cache-Control": "no-store" } });
}
