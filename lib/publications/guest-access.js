import { createHmac, timingSafeEqual } from "node:crypto";

export const PUBLICATIONS = Object.freeze({
  "ISO9001-2026-GUIDE": {
    slug: "decoding-iso-9001-2026",
    title: "Decoding ISO 9001:2026",
    downloadPath: "/api/publications/iso-9001-2026/download",
    fileName: "Decoding_ISO_9001_2026.pdf",
    downloadName: "Decoding_ISO_9001_2026_RPG_Excellence.pdf",
  },
  "ISO14001-2026-GUIDE": {
    slug: "decoding-iso-14001-2026",
    title: "Decoding ISO 14001:2026",
    downloadPath: "/api/publications/iso-14001-2026/download",
    fileName: "Decoding_ISO_14001_2026.pdf",
    downloadName: "Decoding_ISO_14001_2026_RPG_Excellence.pdf",
  },
  "ISO17025-2017-GUIDE": {
    slug: "decoding-iso-17025-2017",
    title: "Decoding ISO/IEC 17025:2017",
    downloadPath: "/api/publications/iso-17025-2017/download",
    fileName: "Decoding_ISO_IEC_17025_2017_RPG_Excellence_Expanded_Manuscript.pdf",
    downloadName: "Decoding_ISO_IEC_17025_2017_RPG_Excellence.pdf",
  },
});

export const PUBLICATION_PRICE_PENCE = 2999;
export const GUEST_DOWNLOAD_WINDOW_SECONDS = 30 * 24 * 60 * 60;
const SESSION_ID_RE = /^cs_(test|live)_[a-zA-Z0-9]+$/;
const SIGNATURE_RE = /^[a-f0-9]{64}$/;

export function isCheckoutSessionId(id) {
  return typeof id === "string" && SESSION_ID_RE.test(id);
}

function getAccessSecret() {
  // A dedicated secret is preferable. The existing Stripe webhook signing
  // secret is a supported fallback for deployments that have not set one.
  const secret = process.env.PUBLICATION_DOWNLOAD_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("Publication signing secret is not configured.");
  }
  return secret;
}

function signatureFor(sessionId, publicationCode, expires) {
  return createHmac("sha256", getAccessSecret())
    .update(`rpg-publication-guest-v1\n${sessionId}\n${publicationCode}\n${expires}`)
    .digest("hex");
}

export function guestDownloadUrl(sessionId, publicationCode, expires) {
  const pub = PUBLICATIONS[publicationCode];
  if (!pub || !isCheckoutSessionId(sessionId) || !Number.isSafeInteger(expires) || expires <= 0) {
    throw new Error("Invalid publication link inputs.");
  }
  const search = new URLSearchParams({
    session_id: sessionId,
    expires: String(expires),
    signature: signatureFor(sessionId, publicationCode, expires),
  });
  return `${pub.downloadPath}?${search.toString()}`;
}

export function guestUrlFromReturn(sessionId, publicationCode) {
  if (!isCheckoutSessionId(sessionId)) return null;
  // The download route verifies the immutable checkout creation time as well,
  // so repeatedly opening a checkout return cannot extend purchase access.
  const expires = Math.floor(Date.now() / 1000) + GUEST_DOWNLOAD_WINDOW_SECONDS;
  return guestDownloadUrl(sessionId, publicationCode, expires);
}

export function verifyGuestToken(sessionId, publicationCode, expiresRaw, signature) {
  if (!isCheckoutSessionId(sessionId) || !PUBLICATIONS[publicationCode]) return false;
  if (typeof expiresRaw !== "string" || !/^\d{10}$/.test(expiresRaw)) return false;
  const expires = Number(expiresRaw);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  if (typeof signature !== "string" || !SIGNATURE_RE.test(signature)) return false;
  const expected = Buffer.from(signatureFor(sessionId, publicationCode, expires), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isVerifiedPublicationSession(session, publicationCode) {
  return Boolean(session && session.status === "complete" &&
    session.mode === "payment" && session.payment_status === "paid" &&
    session.metadata?.purchase_type === "digital_publication" &&
    session.metadata?.publication_code === publicationCode &&
    session.amount_total === PUBLICATION_PRICE_PENCE && session.currency === "gbp");
}

export function isCurrentGuestPurchase(session) {
  const created = Number(session?.created);
  const now = Math.floor(Date.now() / 1000);
  return session?.metadata?.guest_download === "v1" &&
    Number.isFinite(created) && created > 0 && created <= now &&
    now <= created + GUEST_DOWNLOAD_WINDOW_SECONDS;
}
