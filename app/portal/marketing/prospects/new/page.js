import {notFound,redirect} from 'next/navigation';
import {commercialContext} from '../../../../../lib/commercial-store';
import CompanyRecord from '../CompanyRecord';
export const dynamic='force-dynamic';
export const metadata={title:'New prospect company | RPG Excellence',robots:{index:false,follow:false}};
export default async function Page(){try{await commercialContext();}catch(e){if(e.status===401)redirect('/portal/login?next=/portal/marketing');notFound();}return <CompanyRecord/>;}
