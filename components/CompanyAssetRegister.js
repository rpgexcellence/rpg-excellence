"use client";

import {useActionState} from "react";
import {saveCompanyAsset} from "../app/portal/company/assets/actions";

const initialState={error:"",success:""};
const types=[
  ["plant","Plant"],["equipment","Equipment"],["room_area","Room / area"],
  ["electrical_system","Electrical system"],["process_system","Process system"],
  ["vehicle","Vehicle"],["other","Other"],
];

export default function CompanyAssetRegister({locations=[]}){
  const [state,action,pending]=useActionState(saveCompanyAsset,initialState);
  return <section className="carCard">
    <style>{`
      .carCard{background:#fff;border:1px solid #d4e1e9;border-radius:16px;padding:22px;box-shadow:0 10px 30px rgba(13,42,68,.05)}
      .carCard h2{margin:0;color:#071d3a}.carIntro{margin:6px 0 18px;color:#60778e;line-height:1.5}
      .carGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.carField{display:grid;gap:6px;align-content:start}.carField.full{grid-column:1/-1}
      .carField label{font-size:12px;font-weight:900;color:#102e4a}.carField input,.carField select,.carField textarea{width:100%;min-height:44px;padding:10px 12px;border:1px solid #bfd0dd;border-radius:9px;background:#fbfdff;color:#071d3a;font:inherit}.carField textarea{min-height:88px;resize:vertical}.carField small{color:#6b8195;line-height:1.35}
      .carActions{display:flex;justify-content:flex-end;margin-top:16px}.carButton{min-height:44px;padding:11px 18px;border:0;border-radius:9px;background:#1762a3;color:#fff;font-weight:900;cursor:pointer}.carButton:disabled{opacity:.58;cursor:wait}
      .carMessage{margin:0 0 15px;padding:11px 13px;border-radius:9px;font-weight:800}.carMessage.error{background:#fff0ed;color:#a22f25;border:1px solid #efb5ae}.carMessage.success{background:#e9f8f3;color:#08715f;border:1px solid #9fdacb}
      @media(max-width:700px){.carGrid{grid-template-columns:1fr}.carField.full{grid-column:auto}.carActions,.carButton{width:100%}}
    `}</style>
    <h2>Add a controlled company asset</h2>
    <p className="carIntro">Assets entered here become selectable in Permit to Work. Use a stable reference shown on the equipment, register or drawing.</p>
    {state?.error&&<p className="carMessage error" role="alert">{state.error}</p>}
    {state?.success&&<p className="carMessage success" role="status">{state.success}</p>}
    <form action={action}>
      <div className="carGrid">
        <div className="carField"><label htmlFor="asset_reference">Asset reference *</label><input id="asset_reference" name="asset_reference" required maxLength={100} placeholder="e.g. LEV-014"/><small>Use the organisation’s unique asset or equipment number.</small></div>
        <div className="carField"><label htmlFor="asset_name">Asset name *</label><input id="asset_name" name="asset_name" required maxLength={180} placeholder="e.g. Welding bay extraction unit"/></div>
        <div className="carField"><label htmlFor="asset_type">Asset type *</label><select id="asset_type" name="asset_type" defaultValue="equipment" required>{types.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
        <div className="carField"><label htmlFor="site_location_id">Company location *</label><select id="site_location_id" name="site_location_id" defaultValue="" required><option value="" disabled>{locations.length?"Select Business Profile location":"No Business Profile locations available"}</option>{locations.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select><small>Managed under Administration → Business Profile.</small></div>
        <div className="carField"><label htmlFor="area_department">Area / department</label><input id="area_department" name="area_department" maxLength={180} placeholder="e.g. Engineering Hall / Bay 4"/></div>
        <div className="carField"><label htmlFor="operational_status">Operational status *</label><select id="operational_status" name="operational_status" defaultValue="active"><option value="active">Active</option><option value="out_of_service">Out of service</option><option value="retired">Retired</option></select></div>
        <div className="carField full"><label htmlFor="description">Description and identification guidance</label><textarea id="description" name="description" maxLength={2000} placeholder="Record manufacturer, model, serial number, system boundary or other information needed to identify the correct asset."/></div>
      </div>
      <div className="carActions"><button className="carButton" disabled={pending}>{pending?"Saving asset…":"Add to Asset Register"}</button></div>
    </form>
  </section>;
}
