import {NextResponse} from 'next/server';
import {commercialContext} from '../../../../../lib/commercial-store';
import {microsoftStatus} from '../../../../../lib/commercial-microsoft-store';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json(await microsoftStatus(await commercialContext()),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:'Microsoft connection is unavailable.'},{status:e.status||503,headers:{'Cache-Control':'private, no-store'}});}}
