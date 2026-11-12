import 'server-only';
import {createClient} from './supabase/server';
import {createAdminClient} from './supabase/admin';
import {commercialAccess} from './commercial-access.mjs';

export async function commercialContext(){const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!commercialAccess(user)){const e=Error('This commercial workspace is not available to this account.');e.status=user?404:401;throw e;}return {user,admin:createAdminClient()};}
export async function loadCommercialProspects(ctx){
 const records=[];for(let start=0;;start+=500){const {data,error}=await ctx.admin.from('commercial_prospects').select('id,company_key,record,revision,created_at,updated_at').order('id').range(start,start+499);if(error)throw Error('The private prospect register is not ready. Apply its database migration before importing records.');records.push(...data.map(row=>({...row.record,id:row.id,company_key:row.company_key,revision:row.revision,created_at:row.created_at,updated_at:row.updated_at})));if(data.length<500)break;}
 return records;
}
