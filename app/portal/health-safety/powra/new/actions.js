"use server";

import { POWRA_CHECKS } from "../../../../../lib/powraChecklist";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import { loadPowraAdministrationOptions, resolvePowraCompanySelection } from "../../../../../lib/powraCompanyOptions";
import { resolvePowraZone } from "../../../../../lib/powra-zones";
import { decidePowra, POWRA_ROOT } from "../../../../../lib/powra-workflow.mjs";
import { UUID } from "../../../../../lib/zone-policy.mjs";

export async function createPowra(previousState, formData) {
  const text = name => String(formData.get(name) || "").trim();
  let savedId;
  try {
    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) redirect("/portal/login?next=" + POWRA_ROOT + "/new");
    await requirePlanAccess(user.id,"professional","POWRA");
    const {data:organization,error:orgError} = await supabase.from("organizations").select("id").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();
    if (orgError) throw orgError;
    if (!organization) throw new Error("Create an organisation before starting a POWRA.");

    let prestartChecks, hazards;
    try {
      prestartChecks = JSON.parse(text("prestart_checks"));
      hazards = JSON.parse(text("hazards"));
    } catch {
      throw new Error("The POWRA answers could not be read.");
    }
    if (!Array.isArray(prestartChecks) || !Array.isArray(hazards) ||
        prestartChecks.length !== POWRA_CHECKS.length ||
        POWRA_CHECKS.some(question => prestartChecks.filter(row => row?.question === question).length !== 1) ||
        prestartChecks.some(row => !row || !["yes","no","na",""].includes(row.answer)) ||
        hazards.length > 25 ||
        hazards.some(row => !row || typeof row.name !== "string" || !row.name.trim() || row.name.length > 160 ||
          typeof row.control !== "string" || row.control.length > 1500 || !["low","medium","high",""].includes(row.remaining_risk))) {
      throw new Error("The POWRA answers are invalid.");
    }
    prestartChecks = prestartChecks.map(({question,answer}) => ({question,answer}));
    hazards = hazards.map(({name,control,remaining_risk,verified,changed}) => ({name,control,remaining_risk,verified:verified === true,changed:changed === true}));

    const options = await loadPowraAdministrationOptions(organization.id);
    const {site,person,members,supervisor} = resolvePowraCompanySelection(options,formData);
    const task = text("task");
    const assessmentDate = text("assessment_date");
    if (task.length < 3 || task.length > 500 || !/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate) ||
        !Number.isFinite(Date.parse(assessmentDate)) || new Date(assessmentDate).toISOString().slice(0,10) !== assessmentDate) {
      throw new Error("Complete the task and a valid date under Task & location.");
    }

    const linkedId = text("linked_assessment_id");
    const priorId = text("reassessment_of");
    const zoneId = text("zone_id");
    if ([linkedId,priorId,zoneId].some(id => id && !UUID.test(id))) throw new Error("Select valid linked records.");
    const [linked,prior,zone] = await Promise.all([
      linkedId ? supabase.from("hs_risk_assessments").select("id,administration_location_id").eq("id",linkedId).eq("owner_id",user.id)
        .eq("organization_id",organization.id).in("status",["approved","communicated"]).maybeSingle() : { data:null },
      priorId ? supabase.from("hs_powra_assessments").select("id").eq("id",priorId).eq("owner_id",user.id)
        .eq("organization_id",organization.id).in("decision",["stop_work","supervisor_review"]).maybeSingle() : { data:null },
      zoneId ? resolvePowraZone(organization.id,zoneId,[site.id]) : null,
    ]);
    if (linkedId && (linked.error || !linked.data || (linked.data.administration_location_id && linked.data.administration_location_id !== site.id))) {
      throw new Error("Select an approved risk assessment applicable to this company site.");
    }
    if (zoneId && !zone) throw new Error("Select a published workplace zone at the selected site.");
    if (priorId && (prior.error || !prior.data)) throw new Error("The earlier POWRA is unavailable for reassessment.");
    const decision = decidePowra(prestartChecks,hazards,{ linked: Boolean(linked.data), noHazards:text("no_hazards")==="yes", stop:text("manual_stop")==="yes" });
    const reason = text("decision_reason");
    if (decision === "pending") throw new Error("Confirm each check and complete the hazards and remaining-risk section.");
    if ((decision !== "safe_to_start" || priorId) && !reason) throw new Error("Record the reason for the decision or reassessment.");
    if (priorId && !supervisor) throw new Error("Select the supervisor who reviewed this reassessment.");
    if (reason.length > 3000 || text("additional_team_members").length > 1000 || text("work_area").length > 500 ||
      text("inspection_reference").length > 100 || text("linked_permit_reference").length > 100) throw new Error("One of the text fields exceeds its allowed length.");
    const hold = decision === "additional_controls";
    const storedDecision = hold ? "supervisor_review" : decision;
    const status = decision === "stop_work" ? "stopped" : decision === "safe_to_start" ? "open" : "supervisor_review";
    const pointOfWork = {
      zone, additional_controls:hold, reassessment_of:prior.data?.id ?? null,
      inspection_reference:text("inspection_reference") || null,
      no_additional_hazards:!hazards.length && text("no_hazards")==="yes",
    };
    const {data,error} = await supabase.from("hs_powra_assessments").insert({
      owner_id:user.id, organization_id:organization.id, task, assessment_date:assessmentDate,
      site_location:site.label || site.location_name, administration_location_id:site.id,
      work_area:[zone && [zone.reference,zone.name].join(" · "),text("work_area")].filter(Boolean).join(" · ") || null,
      completed_by:person.name, completed_by_person_id:person.id, team_member_ids:members.map(row=>row.id),
      team_members:[...members.map(row=>row.name),text("additional_team_members")].filter(Boolean).join("; ") || null,
      linked_assessment_id:linked.data?.id || null, linked_permit_reference:text("linked_permit_reference") || null,
      prestart_checks:prestartChecks, hazards, additional_controls:hazards.filter(row=>row.control),
      decision:storedDecision, decision_reason:reason || null, supervisor_name:supervisor?.name || null,
      end_review:{point_of_work:pointOfWork}, status,
    }).select("id").single();
    if (error) throw error;
    revalidatePath(POWRA_ROOT);
    revalidatePath("/portal/company/business-profile");
    savedId = data.id;
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return {error:error.message || "The POWRA could not be saved."};
  }
  redirect(POWRA_ROOT + "/" + savedId);
}
