import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import BCPPlanDocument from "../../../../../../components/BCPPlanDocument";
import BCPPlanPrintControls from "../../../../../../components/BCPPlanPrintControls";
export const dynamic = "force-dynamic";
export const metadata = {title:"Controlled Business Continuity Plan"};
export default async function PrintPlanPage({params,searchParams}){
  const {id} = await params, query = await searchParams;
  const s = await createClient(),{data:{user}}=await s.auth.getUser();
  if(!user)redirect("/portal/login?next=/portal/business-continuity/plans");
  let record;
  if(query?.version){
    const version=Number(query.version);if(!Number.isInteger(version)||version<1)notFound();
    const {data,error}=await s.from("bcp_plan_versions").select("snapshot").eq("plan_id",id).eq("owner_id",user.id).eq("version",version).maybeSingle();
    if(error||!data)notFound();record=data.snapshot;
  }else{
    const {data,error}=await s.from("bcp_plans").select("*").eq("id",id).eq("owner_id",user.id).maybeSingle();
    if(error||!data)notFound();record=data;
  }
  return <main style={{background:"#edf3f8",padding:"20px 0 60px"}}><style>{`@media print{main{padding:0!important;background:#fff!important}}`}</style><div className="noPrint" style={{maxWidth:1100,margin:"0 auto 20px",display:"flex",gap:16,alignItems:"center",padding:"0 20px"}}><Link href={`/portal/business-continuity/plans?id=${id}`}>← Back to plan</Link><BCPPlanPrintControls/>{query?.version&&<span>Historical approved version {query.version}</span>}</div><BCPPlanDocument document={record.generated_document}/></main>;
}
