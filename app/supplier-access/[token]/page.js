import Link from "next/link";
import RpgSignInFrame from "../../../components/RpgSignInFrame";
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
  if (!found) return <RpgSignInFrame supplier title="Invitation unavailable"
    introduction="This supplier invitation is unavailable. Contact the RPG team that sent it to request a new link." />;
  let session;
  try { session=await verifiedSupplierInvitation(token); }
  catch (error) {
    if (error.status !== 403) {
      return <RpgSignInFrame supplier title="Assessment unavailable"
        introduction={error.status ? error.message : "This assessment is temporarily unavailable."} />;
    }
    return <RpgSignInFrame supplier title="Sign in to your supplier assessment"
      introduction="Use the email address on your invitation to request a secure sign-in link or verification code.">
      {query?.signin==="retry" && <div className="loginMessage" role="alert">This sign-in could not be completed. Request a fresh link in this browser.</div>}
      <SupplierSignIn token={token} />
      <p className="legal">Read the <Link href="/en/privacy">RPG Excellence Privacy Policy</Link>.</p>
    </RpgSignInFrame>;
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
