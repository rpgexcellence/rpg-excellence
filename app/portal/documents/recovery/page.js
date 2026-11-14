import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import {
  RECOVERY_COMPANY_ID, RECOVERY_COMPANY_NAME, RECOVERY_EMAILS,
  recoveryRows, validateRecoverySources, runRPGDocumentRecovery,
} from '../../../../lib/rpg-document-recovery.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function recoveryAccess() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/portal/login?next=%2Fportal%2Fdocuments%2Frecovery');
  if (!user.email_confirmed_at || !RECOVERY_EMAILS.includes(String(user.email || '').toLowerCase())) notFound();
  const { data: allowed, error } = await client.rpc('company_document_member', { p_org: RECOVERY_COMPANY_ID });
  if (error || !allowed) throw new Error('Your signed-in account needs active access to RPG Excellence v1. No recovery has been started.');
  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin.from('organizations').select('id,name').eq('id', RECOVERY_COMPANY_ID).single();
  if (companyError || company?.name !== RECOVERY_COMPANY_NAME) throw new Error('The recovery company identity does not match.');
  return { admin, user };
}

async function selectRecoveryCompany() {
  const jar = await cookies();
  jar.set('rpg_document_recovery_company', RECOVERY_COMPANY_ID, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/portal/documents', maxAge: 60 * 60 * 24 * 30,
  });
}

async function restoreDocuments() {
  'use server';
  const { admin, user } = await recoveryAccess();
  try {
    const result = await runRPGDocumentRecovery(admin, user.id);
    if (result?.recovered_revisions !== 123) throw new Error('Recovery returned an unexpected result. Check the recovery register before retrying.');
  } catch (error) {
    redirect(`/portal/documents/recovery?error=${encodeURIComponent(String(error.message || 'Recovery did not complete.').slice(0,500))}`);
  }
  await selectRecoveryCompany();
  revalidatePath('/portal/documents');
  redirect('/portal/documents/recovery?complete=1');
}

async function openRestoredRegister() {
  'use server';
  await recoveryAccess();
  await selectRecoveryCompany();
  redirect('/portal/documents');
}

export default async function RecoveryPage({ searchParams }) {
  const { admin } = await recoveryAccess();
  const q = await searchParams;
  let sources = [], restored = [], message = null;
  try {
    sources = await recoveryRows(admin, 'controlled_documents');
    validateRecoverySources(sources);
    restored = await recoveryRows(admin, 'rpg_company_document_recovery', 'id,source_document_id,company_document_id', x => x.eq('organization_id', RECOVERY_COMPANY_ID));
  } catch (error) { message = error.message; }
  const complete = !message && restored.length === 123;
  const card = { background:'#fff', padding:24, border:'1px solid #d8e3ef', borderRadius:12, marginBottom:20 };
  const button = { background:'#10274b', color:'#fff', padding:'14px 22px', border:0, borderRadius:8, fontWeight:700, cursor:'pointer' };
  return <main style={{maxWidth:960,margin:'32px auto',padding:24,fontFamily:'Arial,sans-serif',color:'#10274b'}}>
    <h1>Restore RPG Excellence v1 documents</h1>
    <p>Company: <strong>{RECOVERY_COMPANY_NAME}</strong><br/><small>{RECOVERY_COMPANY_ID}</small></p>
    {q?.error || message ? <div role="alert" style={{...card,color:'#a42323'}}>{q?.error || message}</div> : null}
    {complete ? <div role="status" style={{...card,background:'#e9f8ef'}}><h2>123 original revisions are restored</h2><p>The copies are in this company’s document register. The original records and files remain intact.</p></div> : null}
    <section style={card}><h2>Recovery progress</h2><p>Original revision records found: <strong>{sources.length}</strong></p><p>Revisions already restored: <strong>{restored.length}</strong> / 123</p>
      <p>Existing document numbers, revisions and statuses are retained. Original approval details are recorded in controlled history. This recovery creates no new approval decisions or read acknowledgements.</p>
      <p>New documents continue using your existing automatic numbering. No company numbering settings or counters are reset.</p>
      <p>The recovery copies and verifies the stored file bytes, then commits the register import as one transaction. Your other companies are not modified.</p>
      {!message && !complete ? <form action={restoreDocuments}><button style={button}>Restore the 123 original revisions</button><p><small>Keep this page open until a result appears. If the server times out, reopening this page and retrying reuses verified copies without duplicating revisions.</small></p></form> : null}
      {complete ? <form action={openRestoredRegister}><button style={button}>Open restored company register</button></form> : null}
    </section><Link href="/portal/documents">Back to document management</Link>
  </main>;
}
