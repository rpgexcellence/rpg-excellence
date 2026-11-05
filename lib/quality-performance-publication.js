import { isPlatformOwner } from "./portal-admin-access";

export const publication = Object.freeze({
  code: "QUALITY-PERFORMANCE-GUIDE",
  title: "Decoding Quality Performance",
  slug: "decoding-quality-performance",
  amount: 499,
  currency: "gbp",
  filename: "Decoding_Quality_Performance_RPG.pdf",
});

// Reuse the existing authenticated platform-owner policy.
export const hasPublicationOwnerAccess = isPlatformOwner;

export function isPaidPublicationSession(session, user) {
  return session?.payment_status === "paid" && session?.mode === "payment" &&
    session?.metadata?.purchase_type === "digital_publication" &&
    session?.metadata?.publication_code === publication.code &&
    session?.metadata?.owner_id === user?.id &&
    session?.amount_total === publication.amount && session?.currency === publication.currency;
}
