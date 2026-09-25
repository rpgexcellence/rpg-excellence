import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "../../../../lib/supabase/server";
import ISMSRiskWorkspace from "../../../../components/ISMSRiskWorkspace";
import ISMSWorkspaceShell from "../../../../components/ISMSWorkspaceShell";
import {saveISMSRisk} from "./actions";
export const metadata={title:"ISMS Risk Management | RPG Excellence"};export const dynamic="force-dynamic";
export default async function ISMSRiskPage(){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect("/portal/login?next=/portal/information-security/risk-management");
 const{data:org}=await s.from("organizations").select("id,name").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();if(!org)redirect("/portal");
 let{data:methodology}=await s.from("isms_risk_methodologies").select("*").eq("organization_id",org.id).eq("status","approved").order("approved_at",{ascending:false}).limit(1).maybeSingle();
 if(!methodology){const result=await s.from("isms_risk_methodologies").insert({owner_id:user.id,organization_id:org.id,approved_by:user.email||"Account owner"}).select("*").single();methodology=result.data}
 const [riskResult,assetResult,controlResult,assessmentResult,linkResult,assetLinkResult,treatmentResult,teamResult]=await Promise.all([
  s.from("isms_risks").select("*").eq("organization_id",org.id).neq("status","archived").order("residual_score",{ascending:false}),
  s.from("isms_assets").select("*").eq("organization_id",org.id).eq("status","active").order("asset_name"),
  s.from("iso27001_control_catalog").select("control_id,control_title,theme,control_order").eq("active",true).order("control_order"),
  s.from("assessments").select("id,standard,status,workspace_type,created_at").eq("organization_id",org.id).eq("owner_id",user.id).in("standard",["ISO/IEC 27001:2022","ISO/IEC 27001:2022/Amd 1:2024"]).order("created_at",{ascending:false}),
  s.from("isms_risk_controls").select("*").eq("organization_id",org.id),
  s.from("isms_risk_assets").select("risk_id,asset_id").eq("owner_id",user.id),
  s.from("isms_risk_treatments").select("*").eq("owner_id",user.id),
  s.from("internal_audit_team_members").select("member_name,email").eq("owner_id",user.id).order("member_name"),
 ]);
 for(const result of [riskResult,assetResult,controlResult,assessmentResult,linkResult,assetLinkResult,treatmentResult])if(result.error)throw new Error(result.error.message);
 const ownerOptions=[{name:user.user_metadata?.full_name||user.email||"Account owner",email:user.email||""},...((teamResult.data||[]).map(x=>({name:x.member_name,email:x.email||""}))),...(riskResult.data||[]).map(x=>({name:x.risk_owner,email:""}))].filter((x,i,a)=>x.name&&a.findIndex(y=>y.name===x.name)===i);
 return <ISMSWorkspaceShell active="risk"><main className="irmPage"><style>{pageStyles}</style><header className="irmTop"><div><small>ISMS HUB · ISO/IEC 27001 RISK MANAGEMENT</small><h1>Information Security Risk Management</h1><p>{org.name} · risks, treatment, SoA controls and accountable acceptance.</p></div><div><Link href="/portal/information-security">← ISMS Hub</Link><Link href="/portal/soa">SoA Register</Link></div></header><ISMSRiskWorkspace action={saveISMSRisk} methodology={methodology} risks={riskResult.data||[]} assets={assetResult.data||[]} controls={controlResult.data||[]} assessments={assessmentResult.data||[]} links={linkResult.data||[]} assetLinks={assetLinkResult.data||[]} treatments={treatmentResult.data||[]} ownerOptions={ownerOptions}/></main></ISMSWorkspaceShell>
}
const pageStyles=".irmPage{min-height:100vh;padding:27px clamp(14px,3vw,46px) 80px;background:#edf3f8;font-family:Arial,sans-serif;color:#071d3a}.irmTop{max-width:1500px;margin:0 auto 20px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.irmTop small{color:#07859a;font-weight:950;letter-spacing:.12em}.irmTop h1{margin:7px 0;font-size:40px}.irmTop p{margin:0;color:#60768c}.irmTop div:last-child{display:flex;gap:8px;flex-wrap:wrap}.irmTop a{padding:11px 14px;border:1px solid #c9d7e4;border-radius:8px;background:#fff;color:#153b60;text-decoration:none;font-weight:850}@media(max-width:650px){.irmPage{padding:16px 10px 105px;overflow-x:hidden}.irmTop{display:block}.irmTop h1{font-size:30px}.irmTop div:last-child{margin-top:14px}.irmTop a{flex:1;text-align:center}}";
