import { renderPowraReport } from "../../../../../../lib/powra-report.mjs";
import { createClient } from "../../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import { UUID } from "../../../../../../lib/zone-policy.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request,{params}) {
  const {id} = await params;
  if (!UUID.test(id)) return new Response("Assessment not found",{status:404});
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to download the assessment.",{status:401});
  await requirePlanAccess(user,"professional","POWRA");
  const {data:item,error} = await supabase.from("hs_powra_assessments").select("*")
    .eq("id",id).eq("owner_id",user.id).maybeSingle();
  if (error) return new Response("Unable to load assessment.",{status:500});
  if (!item) return new Response("Assessment not found",{status:404});

  let assessmentReference;
  if (UUID.test(item.linked_assessment_id || "")) {
    let assessmentQuery = supabase.from("hs_risk_assessments").select("assessment_reference")
      .eq("id",item.linked_assessment_id).eq("owner_id",user.id);
    if (item.organization_id) assessmentQuery = assessmentQuery.eq("organization_id",item.organization_id);
    const {data:assessment} = await assessmentQuery.maybeSingle();
    assessmentReference = assessment?.assessment_reference;
  }
  const bytes = await renderPowraReport(item,{assessmentReference});
  const filename = String(item.powra_reference || "POWRA").replace(/[^a-z0-9_-]/gi,"-").slice(0,90);
  return new Response(bytes,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":`attachment; filename="${filename}.pdf"`,
    "Cache-Control":"private, no-store",
  }});
}
