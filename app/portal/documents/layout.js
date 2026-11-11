import { requireOrganizationAccess } from '../../../lib/organization-access';
export const dynamic = 'force-dynamic';
export default async function DocumentsLayout({children}) {
  // Standard company access, independent of commercial plan or paid module grants.
  await requireOrganizationAccess(null,'view','/portal/documents');
  return children;
}
