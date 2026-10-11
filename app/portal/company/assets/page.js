import Link from "next/link";
import CompanyAssetRegister from "../../../../components/CompanyAssetRegister";
import {requireOrganizationAccess} from "../../../../lib/organization-access";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {rcaAdministrationLocations} from "../../../../lib/rcaCompanyLinks";
import {changeCompanyAssetStatus} from "./actions";

export const metadata={title:"Company Asset Register | RPG Excellence"};
export const dynamic="force-dynamic";
const title=value=>String(value||"").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());

export default async function CompanyAssetsPage(){
  const {organization}=await requireOrganizationAccess("people_access","admin","/portal/company/assets");
  const admin=createAdminClient(),locations=rcaAdministrationLocations(organization);
  const {data:assets,error}=await admin.from("organization_assets")
    .select("*").eq("organization_id",organization.id).order("operational_status").order("asset_reference");
  if(error)throw new Error(error.message);
  const counts=(assets||[]).reduce((result,item)=>({...result,[item.operational_status]:(result[item.operational_status]||0)+1}),{});

  return <main className="arPage"><style>{`
    *{box-sizing:border-box}.arPage{min-height:100vh;min-width:0;padding:28px clamp(20px,3vw,48px) 80px;background:#edf3f9;color:#071d3a;font-family:Arial,sans-serif}.arShell{width:100%;max-width:none;margin:0}
    .arTop{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;margin-bottom:18px}.arTop small{color:#087f6c;font-weight:900;letter-spacing:.09em}.arTop h1{margin:6px 0;font-size:34px}.arTop p{margin:0;color:#627991}.arTop nav{display:flex;gap:8px;flex-wrap:wrap}.arLink{padding:11px 14px;border:1px solid #cad8e2;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}
    .arSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px}.arMetric{padding:18px;border:1px solid #d4e1e9;border-radius:12px;background:#fff}.arMetric span{display:block;font-size:11px;color:#6c8296;font-weight:900}.arMetric strong{display:block;margin-top:5px;font-size:25px}.arLayout{display:grid;grid-template-columns:minmax(420px,1fr) minmax(0,1.65fr);gap:18px;align-items:start}
    .arPanel{background:#fff;border:1px solid #d4e1e9;border-radius:16px;padding:20px}.arPanel h2{margin:0}.arPanel>p{margin:6px 0 17px;color:#627991}.arList{display:grid;gap:10px}.arAsset{padding:14px;border:1px solid #d8e3ea;border-radius:11px;background:#fbfdff}.arAssetTop{display:flex;justify-content:space-between;gap:12px}.arAsset h3{margin:0;font-size:16px}.arAsset p{margin:5px 0;color:#647b90;font-size:13px}.arTag{align-self:flex-start;padding:5px 8px;border-radius:999px;background:#e7f6f1;color:#08705f;font-size:10px;font-weight:900;white-space:nowrap}.arTag.out_of_service{background:#fff2d9;color:#925b0c}.arTag.retired{background:#eef1f4;color:#66798a}.arStatus{display:flex;gap:7px;align-items:center;margin-top:10px}.arStatus select,.arStatus button{min-height:36px;padding:7px 9px;border:1px solid #c6d5df;border-radius:8px;background:#fff;color:#173b59;font-weight:800}.arStatus button{background:#173b59;color:#fff;border-color:#173b59;cursor:pointer}.arEmpty{padding:25px;border:1px dashed #b9ccd9;border-radius:11px;text-align:center;color:#647b90}
    @media(max-width:1050px){.arLayout{grid-template-columns:1fr}.arSummary{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.arPage{padding:20px 14px 60px}.arTop h1{font-size:28px}.arTop nav,.arTop nav a{width:100%;text-align:center}.arSummary{grid-template-columns:1fr}.arAssetTop{display:block}.arTag{display:inline-block;margin-top:7px}.arStatus{align-items:stretch}.arStatus select{min-width:0;flex:1}}
  `}</style><div className="arShell">
    <header className="arTop"><div><small>ADMINISTRATION · CONTROLLED COMPANY DATA</small><h1>Company Asset Register</h1><p>Maintain the plant, equipment, rooms and systems available to risk and permit workflows.</p></div><nav><Link className="arLink" href="/portal/company/business-profile">Business Profile</Link><Link className="arLink" href="/portal/health-safety/permits">Permit Register</Link></nav></header>
    <section className="arSummary"><div className="arMetric"><span>ACTIVE</span><strong>{counts.active||0}</strong></div><div className="arMetric"><span>OUT OF SERVICE</span><strong>{counts.out_of_service||0}</strong></div><div className="arMetric"><span>RETIRED</span><strong>{counts.retired||0}</strong></div></section>
    <div className="arLayout"><CompanyAssetRegister locations={locations}/><section className="arPanel"><h2>Current assets</h2><p>Only active assets appear as selectable options on new permits.</p><div className="arList">{assets?.length?assets.map(asset=><article className="arAsset" key={asset.id}><div className="arAssetTop"><div><h3>{asset.asset_reference} — {asset.asset_name}</h3><p>{title(asset.asset_type)} · {asset.site_location_label||"No site"}{asset.area_department?` · ${asset.area_department}`:""}</p>{asset.description&&<p>{asset.description}</p>}</div><span className={`arTag ${asset.operational_status}`}>{title(asset.operational_status)}</span></div><form className="arStatus" action={changeCompanyAssetStatus}><input type="hidden" name="id" value={asset.id}/><select name="status" defaultValue={asset.operational_status} aria-label={`Status for ${asset.asset_reference}`}><option value="active">Active</option><option value="out_of_service">Out of service</option><option value="retired">Retired</option></select><button>Update status</button></form></article>):<div className="arEmpty">No company assets recorded yet. Add the first asset using this page.</div>}</div></section></div>
  </div></main>;
}
