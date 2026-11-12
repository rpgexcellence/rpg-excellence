import {notFound, redirect} from 'next/navigation';
import {createClient} from '../../../lib/supabase/server';
import {commercialAccess} from '../../../lib/commercial-access.mjs';
import CommercialHub from './CommercialHub';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Commercial Hub | RPG Excellence', robots: {index: false, follow: false}};

export default async function CommercialHubPage() {
  const client = await createClient();
  const {data: {user}} = await client.auth.getUser();
  if (!user) redirect('/portal/login?next=/portal/marketing');
  if (!commercialAccess(user)) notFound();
  return <CommercialHub />;
}
