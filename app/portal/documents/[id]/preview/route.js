import { createClient } from '../../../../../lib/supabase/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { COMPANY_DOCUMENT_BUCKET } from '../../../../../lib/company-documents';
import { companyDocumentPreview } from '../../../../../lib/company-document-preview.mjs';

export const dynamic = 'force-dynamic';
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'; sandbox",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
};

export async function GET(_request, { params }) {
  const { id } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new Response('Authentication required', { status: 401, headers });
  const { data, error } = await client.from('company_documents').select('id,organization_id,file_path,file_name').eq('id', id).maybeSingle();
  // The request-scoped client enforces revision membership and distribution before opening private storage.
  if (error || !data || !data.file_path?.startsWith(`${data.organization_id}/${data.id}/`) || data.file_path.includes('..')) {
    return new Response('Document unavailable', { status: 404, headers });
  }
  const { data: file, error: storageError } = await createAdminClient().storage.from(COMPANY_DOCUMENT_BUCKET).download(data.file_path);
  if (storageError || !file) return new Response('Document unavailable', { status: 404, headers });
  const result = file.size <= 3 * 1024 * 1024 ? companyDocumentPreview(Buffer.from(await file.arrayBuffer()), data.file_name) : null;
  if (!result) return new Response('Inline preview is unavailable. Use the controlled download to open this file.', { status: 415, headers });
  // Native PDF viewers require the browser's PDF handler rather than a sandboxed document.
  const policy = result.type === 'application/pdf' ? "default-src 'none'; frame-ancestors 'self'" : headers['Content-Security-Policy'];
  return new Response(result.body, { headers: { ...headers, 'Content-Security-Policy': policy, 'Content-Type': result.type, 'Content-Disposition': 'inline' } });
}
