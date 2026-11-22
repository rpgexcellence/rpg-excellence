import { inflateRawSync } from 'node:zlib';

const MAX_XML = 4 * 1024 * 1024;
const MAX_TEXT = 100_000;

function docxXml(bytes) {
  const lowerBound = Math.max(0, bytes.length - 65557);
  let end = bytes.length - 22;
  for (; end >= lowerBound; end--) {
    if (bytes.readUInt32LE(end) === 0x06054b50 && end + 22 + bytes.readUInt16LE(end + 20) === bytes.length) break;
  }
  if (end < lowerBound || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) return null;
  const count = bytes.readUInt16LE(end + 10);
  const length = bytes.readUInt32LE(end + 12);
  let cursor = bytes.readUInt32LE(end + 16);
  const limit = cursor + length;
  if (limit > end || count > 4096) return null;
  for (let i = 0; i < count && cursor + 46 <= limit; i++) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) return null;
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const nameStart = cursor + 46;
    const next = nameStart + nameLength + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
    if (next > limit) return null;
    if (bytes.toString('utf8', nameStart, nameStart + nameLength) === 'word/document.xml') {
      const flags = bytes.readUInt16LE(cursor + 8);
      const method = bytes.readUInt16LE(cursor + 10);
      const compressed = bytes.readUInt32LE(cursor + 20);
      const size = bytes.readUInt32LE(cursor + 24);
      const offset = bytes.readUInt32LE(cursor + 42);
      if ((flags & 1) || size > MAX_XML || offset + 30 > end || bytes.readUInt32LE(offset) !== 0x04034b50) return null;
      const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
      if (start + compressed > end || (method !== 0 && method !== 8)) return null;
      const stored = bytes.subarray(start, start + compressed);
      const xml = method === 0 ? stored : inflateRawSync(stored, { maxOutputLength: MAX_XML });
      return xml.length === size ? xml.toString('utf8') : null;
    }
    cursor = next;
  }
  return null;
}

function docxText(bytes) {
  const xml = docxXml(bytes);
  if (!xml) return null;
  const tokens = /<w:t(?:\s[^>]*?)?>([^<]*)<\/w:t\s*>|<\/w:p\s*>|<w:(?:tab|br)\b[^>]*\/>/g;
  const entities = { amp: '&', lt: '<', gt: '>', apos: "'", quot: '"' };
  let text = '';
  for (const match of xml.matchAll(tokens)) {
    text += match[1] === undefined
      ? match[0].startsWith('<w:tab') ? '\t' : '\n'
      : match[1].replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|apos|quot);/gi, (original, key) => {
        if (!key.startsWith('#')) return entities[key] ?? original;
        const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
        return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : original;
      });
    if (text.length >= MAX_TEXT) return text.slice(0, MAX_TEXT) + '\n\n[Preview truncated]';
  }
  return text.trim() || null;
}

export function companyDocumentPreviewType(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (['docx', 'txt', 'csv'].includes(ext)) return 'text/plain; charset=utf-8';
  return null;
}

export function companyDocumentPreview(bytes, filename) {
  const type = companyDocumentPreviewType(filename);
  if (type === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-' ? { type, body: bytes } : null;
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? { type, body: bytes } : null;
  if (type === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) ? { type, body: bytes } : null;
  if (!type) return null;
  if (/\.docx$/i.test(filename)) {
    try {
      const body = docxText(bytes);
      return body ? { type, body } : null;
    } catch {
      return null;
    }
  }
  return { type, body: bytes };
}
