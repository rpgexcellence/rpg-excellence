import { readSupplierInvitation, verifiedSupplierInvitation } from "../../../lib/supplier-invitation-store";
import { SupplierResponseForm, SupplierSignIn } from "./SupplierResponseForm";

export const dynamic = "force-dynamic";
export const metadata = { title:"Supplier assessment | RPG Excellence", referrer:"no-referrer", robots:{ index:false, follow:false } };

function Frame({ children }) {
  return <main className="supplierAccess" style={{ maxWidth:960,margin:"24px auto",padding:"0 18px 32px",fontFamily:"Arial,sans-serif",color:"#102748" }}>
    <header style={{ background:"linear-gradient(110deg,#102748,#075b5d)",color:"white",padding:20,borderRadius:10 }}>
      <strong>RPG Excellence</strong><h1>Supplier assurance assessment</h1>
    </header>
    {children}
  </main>;
}
export default async function SupplierAccessPage({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;
  const found = await readSupplierInvitation(token);
  if (!found) return <Frame><p>This invitation is unavailable. Contact RPG Excellence for assistance.</p></Frame>;
  let session;
  try { session=await verifiedSupplierInvitation(token); }
  catch (error) {
    return <Frame>{error.status===403 ? <>{query?.signin==="retry" && <p role="alert">This sign-in could not be completed. Request a fresh link in this browser.</p>}<SupplierSignIn token={token} /></> : <p>{error.status ? error.message : "This assessment is temporarily unavailable."}</p>}</Frame>;
  }
  const { row, document } = session;
  if (["submitted","reviewed"].includes(row.status)) {
    return <Frame><p>Your assessment was submitted on {new Date(row.submitted_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}.</p>
      <p>RPG Excellence will contact you if any clarification is needed.</p></Frame>;
  }
  const clarification=row.status==="clarification" ? row.history.findLast(item=>item.action==="RPG requested clarification")?.details : null;
  const invitation={ answers:row.answers, questionnaire:row.questionnaire, evidenceNames:row.attachments.map(({id,name})=>({id,name})) };
  return <Frame>{clarification && <p><strong>Clarification requested</strong> · {clarification}</p>}
    <SupplierResponseForm token={token} invitation={invitation} document={document} /></Frame>;
}
