/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  outputFileTracingIncludes: {
    "/api/v1/integration/openapi": ["./docs/api/rpg-integration-v1.openapi.yaml"],
    "/api/publications/iso-17025-2017/download": [
      "./private-assets/Decoding_ISO_IEC_17025_2017_RPG_Excellence_Expanded_Manuscript.pdf",
    ],
    "/api/publications/iso-9001-2026/download": [
      "./private-assets/Decoding_ISO_9001_2026.pdf",
    ],
    "/api/publications/iso-14001-2026/download": [
      "./private-assets/Decoding_ISO_14001_2026.pdf",
    ],
  },
};

export default nextConfig;
