'use server';
import {revalidatePath} from 'next/cache';
import {requireZonePage,zoneRoot} from '../../../../lib/site-zones';
export async function reportZoneConcern(_state,fd) {
 try {
  const token=String(fd.get('token')||'');const {admin,zone,access}=await requireZonePage(token);
  if(!access.user||access.organization?.id!==zone.organization_id)throw new Error('Sign in with an active company account to report a concern.');
  const description=String(fd.get('description')||'').trim();
  if(description.length<10||description.length>3000)throw new Error('Describe the concern using 10 to 3000 characters.');
  const {error}=await admin.from('organization_zone_concerns').insert({organization_id:zone.organization_id,zone_id:zone.id,reporter_user_id:access.user.id,description});
  if(error)throw new Error('The concern could not be saved. Please try again.');
  revalidatePath(`${zoneRoot(zone.site_id)}/${zone.id}`);
  return {success:'Concern recorded. The area management team can review it in the zone register. For urgent issues, contact your supervisor directly.'};
 }catch(error){if(error.digest)throw error;return {error:error.message};}
}
