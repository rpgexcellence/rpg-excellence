import { createHash } from 'node:crypto';

export const RECOVERY_COMPANY_ID = '1ce25270-8655-4d1e-8448-0d068c157193';
export const RECOVERY_COMPANY_NAME = 'RPG Excellence v1';
export const RECOVERY_EMAILS = ['r.pereszczako@sky.com', 'info@rpgexcellence.com'];
export const RECOVERY_SOURCE_BUCKET = 'controlled-documents';
export const RECOVERY_TARGET_BUCKET = 'company-controlled-documents';
export const RECOVERY_EXPECTED_RECORDS = 123;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function recoveryRows(admin, table, columns = '*', configure = q => q) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await configure(admin.from(table).select(columns)).order('id').range(offset, offset + 99);
    if (error) throw new Error(`Recovery could not read ${table}: ${error.message}`);
    rows.push(...(data || []));
    if ((data || []).length < 100) return rows;
  }
}

export function validateRecoverySources(sources) {
  if (sources.length !== RECOVERY_EXPECTED_RECORDS) throw new Error(`Expected the verified 123 original revision records; found ${sources.length}. No import was performed.`);
  const seen = new Set(), current = new Set(), drafts = new Set(), ids = new Set();
  for (const d of sources) {
    if (!/^[0-9a-f-]{36}$/i.test(d.id || '') || ids.has(d.id)) throw new Error('Invalid or duplicate original document identity.');
    ids.add(d.id);
    if (!d.document_number?.startsWith('RPG-') || !d.title?.trim() || !String(d.revision || '').trim()) throw new Error('An original record needs its identity checked before recovery.');
    if (d.storage_bucket !== RECOVERY_SOURCE_BUCKET || !d.file_path || d.file_path.includes('..')) throw new Error('Unexpected original file location; recovery stopped.');
    if (!['Current', 'Draft', 'Superseded', 'Withdrawn'].includes(d.status)) throw new Error(`Unsupported original status: ${d.status}`);
    const key = JSON.stringify([d.document_number, String(d.revision)]);
    if (seen.has(key)) throw new Error(`Duplicate original reference and revision: ${d.document_number} ${d.revision}`);
    seen.add(key);
    const active = d.status === 'Current' ? current : d.status === 'Draft' ? drafts : null;
    if (active?.has(d.document_number)) throw new Error(`More than one ${d.status} revision exists for ${d.document_number}.`);
    active?.add(d.document_number);
  }
}

// Copy actual bytes through Storage APIs; never insert storage.objects metadata.
// The original object is never overwritten, moved or deleted.
export async function copyRecoveryFile(admin, source) {
  const { data: blob, error: readError } = await admin.storage.from(RECOVERY_SOURCE_BUCKET).download(source.file_path);
  if (readError || !blob) throw new Error(`Original file could not be read: ${source.document_number} Rev ${source.revision}`);
  const bytes = Buffer.from(await blob.arrayBuffer()), sha256 = hash(bytes);
  const name = String(source.file_name || source.file_path.split('/').pop() || 'document').replace(/[^A-Za-z0-9._-]/g, '_').slice(-160);
  const path = `${RECOVERY_COMPANY_ID}/${source.id}/legacy-recovery/${sha256}/${name}`;
  const { error: uploadError } = await admin.storage.from(RECOVERY_TARGET_BUCKET).upload(path, bytes, { upsert: false, contentType: 'application/octet-stream' });
  if (uploadError && !(String(uploadError.statusCode) === '409' || uploadError.error === 'Duplicate' || /already exists|duplicate/i.test(uploadError.message || ''))) {
    throw new Error(`Company copy failed: ${source.document_number} Rev ${source.revision}. Original retained.`);
  }
  // Verify both a new upload and an object retained by an interrupted earlier run.
  const { data: copied, error: verifyError } = await admin.storage.from(RECOVERY_TARGET_BUCKET).download(path);
  if (verifyError || !copied || hash(Buffer.from(await copied.arrayBuffer())) !== sha256) throw new Error(`Company copy verification failed: ${source.document_number}. Original retained.`);
  return { source_id: source.id, source: source, file_path: path, file_name: name, file_sha256: sha256 };
}

export async function runRPGDocumentRecovery(admin, actorId) {
  const sources = await recoveryRows(admin, 'controlled_documents');
  validateRecoverySources(sources);
  const imported = await recoveryRows(admin, 'rpg_company_document_recovery', 'id,source_document_id', q => q.eq('organization_id', RECOVERY_COMPANY_ID));
  const completed = new Set(imported.map(x => x.source_document_id));
  const pending = sources.filter(d => !completed.has(d.id));
  const items = [];
  for (let index = 0; index < pending.length; index += 3) {
    const outcomes = await Promise.allSettled(pending.slice(index, index + 3).map(d => copyRecoveryFile(admin, d)));
    for (const result of outcomes) {
      if (result.status === 'rejected') throw result.reason;
      items.push(result.value);
    }
  }
  const { data, error } = await admin.rpc('restore_rpg_v1_company_documents', { p_actor: actorId, p_items: items });
  if (error) throw new Error(`Register import was not committed: ${error.message}. Originals retained; verified copies can be reused on retry.`);
  return data;
}
