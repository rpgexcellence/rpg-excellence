import {notFound,redirect} from 'next/navigation';
import {commercialContext,loadCommercialProspects} from '../../../../../lib/commercial-store';
import CompanyRecord from '../CompanyRecord';
export const dynamic='force-dynamic';
export const metadata={title:'Company prospect | RPG Excellence',robots:{index:false,follow:false}};
export default async function Page({params}){const {id}=await params;let ctx;try{ctx=await commercialContext();}catch(e){if(e.status===401)redirect('/portal/login?next=/portal/marketing');notFound();}let records;try{records=await loadCommercialProspects(ctx);}catch(e){return <CompanyRecord setupError={e.message}/>;}const record=records.find(r=>r.id===id);if(!record)notFound();const {data:events,error}=await ctx.admin.from('commercial_prospect_events').select('id,event_type,revision,created_at').eq('prospect_id',id).order('created_at',{ascending:false}).limit(30);return <CompanyRecord record={record} events={events||[]} historyError={Boolean(error)}/>;}
