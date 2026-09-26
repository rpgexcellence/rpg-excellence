import Link from "next/link";
import { redirect } from "next/navigation";
import BCPStrategiesSolutions from "../../../../components/BCPStrategiesSolutions";
import { createClient } from "../../../../lib/supabase/server";
import { saveStrategiesSolutions } from "./actions";

export const metadata = { title: "Business Continuity Strategies & Solutions | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function StrategiesSolutionsPage({ searchParams }) {
  const params = await searchParams, s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/strategies-solutions");
  const { data: org } = await s.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  let bias = [], hazards = [], outsourced = [], initial = null;
  if (org) {
    const load = (table) => s.from(table).select("*").eq("organization_id", org.id).neq("status", "archived").order("updated_at", { ascending: false });
    const results = await Promise.all([load("bcp_bia_assessments"), load("bcp_hazard_assessments"), load("bcp_outsourced_process_assessments")]);
    [bias, hazards, outsourced] = results.map((x) => x.data || []);
    if (params?.new !== "1") {
      let query = s.from("bcp_strategy_assessments").select("*").eq("organization_id", org.id).neq("status", "archived");
      if (params?.id) query = query.eq("id", params.id);
      ({ data: initial } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle());
    }
  }
  return <main style={{minHeight:"100vh",padding:"26px 2vw 80px",background:"#edf3f8",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:1840,margin:"auto"}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:20,marginBottom:20}}><div><small style={{color:"#6845d1",fontWeight:900,letterSpacing:".1em"}}>BCP HUB · MODULE 8 · ISO 22301 CLAUSE 8.3</small><h1 style={{margin:"7px 0",color:"#071d3a",fontSize:42}}>Business Continuity Strategies &amp; Solutions</h1><p style={{margin:0,color:"#62788e"}}>Convert approved recovery requirements into feasible, resourced and accountable continuity capability.</p></div><div style={{display:"flex",gap:8}}><Link href="/portal/business-continuity/strategies-solutions?new=1" style={{padding:"11px 14px",borderRadius:8,background:"#315fe6",color:"#fff",textDecoration:"none",fontWeight:850}}>+ New assessment</Link><Link href="/portal/business-continuity" style={{padding:"11px 14px",border:"1px solid #c5d3e0",borderRadius:8,background:"#fff",color:"#173b60",textDecoration:"none",fontWeight:850}}>← BCP Hub</Link></div></header>
    <BCPStrategiesSolutions action={saveStrategiesSolutions} bias={bias} hazards={hazards} outsourced={outsourced} initial={initial} organisationName={org?.name || ""} startStep={params?.step || 0}/>
  </div></main>;
}
