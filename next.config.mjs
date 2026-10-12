// Add this property inside your existing Next.js config object.
// Do not replace your entire next.config.js / next.config.mjs with this snippet.
outputFileTracingIncludes: {
  '/api/publications/iso-9001-2026/download': [
    './private-assets/Decoding_ISO_9001_2026.pdf',
  ],
  '/api/publications/iso-14001-2026/download': [
    './private-assets/Decoding_ISO_14001_2026.pdf',
  ],
},
