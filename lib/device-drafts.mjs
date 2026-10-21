// VERIFIED_SOURCE_20261021: ordinary strings and explicit object properties.
export const DRAFT_SCHEMA = 1;
export const DRAFT_TTL = 24 * 60 * 60 * 1000;
export const DRAFT_MAX_BYTES = 2 * 1024 * 1024;
export const protectedDraftField = name => /(?:password|secret|token|signature|confirm|acknowledg|approv|verif|sign.?off|closed|closure|(^|_)status($|_)|authoris)/i.test(name || '');
export function stableDraftJSON(value) {
  const sort = x => Array.isArray(x) ? x.map(sort) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().filter(k => x[k] !== undefined && typeof x[k] !== 'function').map(k => [k, sort(x[k])])) : x;
  return JSON.stringify(sort(value));
}
export function draftPayload(value) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(draftPayload);
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).filter(([key, item]) => !protectedDraftField(key) && item !== undefined && typeof item !== 'function').map(([key, item]) => [key, draftPayload(item)]));
  return null;
}
// Preserve current approval, verification and closure values during recovery.
export function mergeDraftValue(current, saved) {
  if (Array.isArray(saved)) return saved.map((item, index) => mergeDraftValue(Array.isArray(current) ? current.find(x => x?.id && x.id === item?.id) ?? current[index] : undefined, item));
  if (saved && typeof saved === 'object') {
    const next = current && typeof current === 'object' && !Array.isArray(current) ? {
      ...current
    } : {};
    for (const [key, value] of Object.entries(saved)) if (!protectedDraftField(key) && !['__proto__', 'constructor', 'prototype'].includes(key)) next[key] = mergeDraftValue(next[key], value);
    return next;
  }
  return saved;
}
export function validateDeviceDraft(draft, {
  userId,
  organizationId,
  recordKey,
  fingerprint,
  now = Date.now()
}) {
  if (!draft || draft.schema !== DRAFT_SCHEMA || draft.userId !== userId || draft.organizationId !== organizationId || draft.recordKey !== recordKey) throw Error('This draft belongs to another account, company or record.');
  if (!Number.isFinite(draft.savedAt) || !Number.isFinite(draft.expiresAt) || draft.savedAt > now + 60000 || draft.expiresAt <= now || draft.expiresAt - draft.savedAt > DRAFT_TTL) throw Error('This device draft has expired.');
  if (draft.fingerprint !== fingerprint) throw Error('The server record or its linked sources changed. This draft cannot be restored over the current record.');
  if (!Array.isArray(draft.forms) || !draft.states || typeof draft.states !== 'object') throw Error('This device draft is not valid.');
  return draft;
}
