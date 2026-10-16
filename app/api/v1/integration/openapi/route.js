import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPECIFICATION_PATH = path.join(
  process.cwd(),
  "docs",
  "api",
  "rpg-integration-v1.openapi.yaml",
);

export async function GET() {
  try {
    const specification = await readFile(
      SPECIFICATION_PATH,
      "utf8",
    );

    return new Response(specification, {
      status: 200,
      headers: {
        "content-type":
          "application/yaml; charset=utf-8",
        "content-disposition":
          'inline; filename="rpg-integration-v1.openapi.yaml"',
        "cache-control":
          "public, max-age=300, stale-while-revalidate=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "OpenAPI specification could not be served",
      error,
    );

    return Response.json(
      {
        error:
          "openapi_specification_unavailable",
        message:
          "The API specification is temporarily unavailable.",
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  }
}
