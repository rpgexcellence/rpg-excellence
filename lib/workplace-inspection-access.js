import { isPlatformOwner } from './portal-admin-access';
import { canAdministerInspection } from './workplace-inspection-policy.mjs';
export async function resolveInspectionAccess(admin, access) {
  let person = access.person;
  if (!person) {
    const result = await admin.from('organization_people').select('*').eq('organization_id',access.organization.id).eq('user_id',access.user.id).eq('account_status','active').order('created_at').limit(1).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    person = result.data;
  }
  const resolved = {...access, person, isPlatformAdministrator:isPlatformOwner(access.user)};
  return {...resolved, canAdministerInspection:canAdministerInspection(resolved)};
}
