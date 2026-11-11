import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { resolvePortalAdminAccess } from '../../../lib/portal-admin-access';
export const dynamic = 'force-dynamic';
export default async function RPGDocumentsLayout({ children }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/portal/login');
  const { access, error } = await resolvePortalAdminAccess({ admin:createAdminClient(),user,allowedRoles:['admin','document_controller'] });
  if (error || !access) notFound();
  return children;
}
