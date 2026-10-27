// Authoritative GBP catalogue shared by checkout and purchase buttons.
export const PUBLICATIONS = Object.freeze({
  "ISO9001-2026-GUIDE": { slug: "decoding-iso-9001-2026", name: "Decoding ISO 9001:2026 — A Practical Guide to Quality Decisions", description: "RPG Excellence independent 33-page PDF publication.", unitAmount: 2999 },
  "ISO14001-2026-GUIDE": { slug: "decoding-iso-14001-2026", name: "Decoding ISO 14001:2026 — A Practical Reference and Pocket Guide", description: "RPG Excellence independent 24-page PDF publication.", unitAmount: 2999 },
  "ISO17025-2017-GUIDE": { slug: "decoding-iso-17025-2017", name: "Decoding ISO/IEC 17025:2017 — Technical Laboratory Competence Guide", description: "RPG Excellence independent 52-page PDF publication.", unitAmount: 2999 },
  "ISO9001-2026-INSIGHTS": { slug: "iso-9001-2026-technical-insights", name: "ISO 9001:2026 — Technical Insights & Poster Collection", description: "Reviewed 53-page collected edition: seven articles, seven chapter covers and 21 supporting posters. All articles, covers and posters are included in one PDF.", unitAmount: 999 },
});
export function getPublication(code) {
  return Object.hasOwn(PUBLICATIONS, code) ? PUBLICATIONS[code] : null;
}
export function isVerifiedPublicationPurchase(session, userId, code) {
  const publication = getPublication(code);
  return Boolean(publication && userId && session?.payment_status === "paid" &&
    session.mode === "payment" && session.metadata?.purchase_type === "digital_publication" &&
    session.metadata?.publication_code === code && session.metadata?.owner_id === userId &&
    session.amount_total === publication.unitAmount && session.currency === "gbp");
}
