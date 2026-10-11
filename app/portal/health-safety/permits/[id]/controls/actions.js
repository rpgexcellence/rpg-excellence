"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "../../../../../../lib/supabase/server";
import {getPermitAccess,mayEditPermit,mayVerifyPermit} from "../../../../../../lib/permitAccess";

const clean=value=>String(value||"").trim();
const name=person=>[person.first_name,person.last_name].filter(Boolean).join(" ").trim()||person.email;

async function context(formData){
  const permitId=clean(formData.get("permit_id"));
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  if(!user){
    redirect(`/portal/login?next=/portal/health-safety/permits/${permitId}/controls`);
  }

  const access=await getPermitAccess(user.id,permitId);

  if(!access.allowed||!mayEditPermit(access)){
    throw new Error("Contributor access to this permit is required.");
  }

  const {data:people,error}=await access.admin
    .from("organization_people")
    .select("id,first_name,last_name,email")
    .eq("organization_id",access.permit.organization_id)
    .eq("account_status","active");

  if(error)throw new Error(error.message);

  return {
    permitId,
    user,
    access,
    admin:access.admin,
    permit:access.permit,
    people:people||[],
    actor:name(access.person||{email:user.email})
  };
}

async function audit(ctx,eventType,eventData={}){
  const {error}=await ctx.admin
    .from("hs_permit_events")
    .insert({
      permit_id:ctx.permit.id,
      owner_id:ctx.permit.owner_id,
      organization_id:ctx.permit.organization_id,
      event_type:eventType,
      from_status:ctx.permit.status,
      to_status:ctx.permit.status,
      actor_id:ctx.user.id,
      actor_name:ctx.actor,
      permit_version:ctx.permit.version||1,
      event_data:eventData
    });

  if(error)throw new Error(error.message);
}

function refresh(id){
  revalidatePath(`/portal/health-safety/permits/${id}`);
  revalidatePath(`/portal/health-safety/permits/${id}/controls`);
}

export async function addIsolation(formData){
  const ctx=await context(formData);
  const text=key=>clean(formData.get(key));

  const applied=ctx.people.find(
    person=>person.id===text("applied_by")
  );

  const verified=ctx.people.find(
    person=>person.id===text("verified_by")
  );

  if(!applied||!verified){
    throw new Error(
      "Select the isolation applier and verifier from active company users."
    );
  }

  if(applied.id===verified.id){
    throw new Error(
      "Isolation must be independently verified by a different person."
    );
  }

  if(
    !text("energy_type")||
    !text("isolation_point")||
    !text("isolation_method")||
    !text("verification_method")
  ){
    throw new Error(
      "Complete all isolation and verification details."
    );
  }

  const row={
    permit_id:ctx.permit.id,
    owner_id:ctx.permit.owner_id,
    organization_id:ctx.permit.organization_id,
    energy_type:text("energy_type"),
    isolation_point:text("isolation_point"),
    isolation_method:text("isolation_method"),
    lock_tag_number:text("lock_tag_number")||null,
    applied_by:applied.id,
    applied_by_name:name(applied),
    applied_at:new Date(text("applied_at")).toISOString(),
    verified_by:verified.id,
    verified_by_name:name(verified),
    verified_at:new Date(text("verified_at")).toISOString(),
    verification_method:text("verification_method")
  };

  const {data,error}=await ctx.admin
    .from("hs_permit_isolations")
    .insert(row)
    .select("id")
    .single();

  if(error)throw new Error(error.message);

  await audit(ctx,"isolation_verified",{
    isolation_id:data.id,
    isolation_point:row.isolation_point
  });

  refresh(ctx.permitId);
}

export async function reinstateIsolation(formData){
  const ctx=await context(formData);
  const id=clean(formData.get("isolation_id"));

  const removed=ctx.people.find(
    person=>
      person.id===clean(formData.get("reinstated_by"))
  );

  const verified=ctx.people.find(
    person=>
      person.id===clean(
        formData.get("reinstatement_verified_by")
      )
  );

  if(!removed||!verified){
    throw new Error(
      "Select the person removing the isolation and the independent verifier."
    );
  }

  if(removed.id===verified.id){
    throw new Error(
      "Reinstatement must be independently verified by a different person."
    );
  }

  const now=new Date().toISOString();

  const {error}=await ctx.admin
    .from("hs_permit_isolations")
    .update({
      reinstated_by:removed.id,
      reinstated_by_name:name(removed),
      reinstated_at:now,
      reinstatement_verified_by:verified.id,
      reinstatement_verified_by_name:name(verified),
      reinstatement_verified_at:now
    })
    .eq("id",id)
    .eq("permit_id",ctx.permitId);

  if(error)throw new Error(error.message);

  await audit(ctx,"isolation_reinstated",{
    isolation_id:id
  });

  refresh(ctx.permitId);
}

export async function addAtmosphereTest(formData){
  const ctx=await context(formData);
  const text=key=>clean(formData.get(key));

  const tester=ctx.people.find(
    person=>person.id===text("tested_by")
  );

  if(!tester){
    throw new Error(
      "Select the competent tester from active company users."
    );
  }

  const parameter=text("parameter");
  const unit=text("unit");
  const actual=Number(text("actual_reading"));

  let minimum=
    text("minimum_limit")===""
      ?null
      :Number(text("minimum_limit"));

  let maximum=
    text("maximum_limit")===""
      ?null
      :Number(text("maximum_limit"));

  if(parameter==="Oxygen"){
    if(unit!=="% volume"){
      throw new Error(
        "Oxygen must be recorded as % volume."
      );
    }

    minimum=19.5;
    maximum=23.5;
  }

  if(
    !parameter||
    !unit||
    !Number.isFinite(actual)||
    !text("instrument_id")
  ){
    throw new Error(
      "Complete the atmospheric test details."
    );
  }

  const pass=
    (minimum===null||actual>=minimum)&&
    (maximum===null||actual<=maximum);

  const testedAt=
    new Date(text("tested_at")).toISOString();

  const interval=
    Number(text("retest_interval_minutes"));

  const expiresAt=
    Number.isFinite(interval)&&interval>0
      ?new Date(
          new Date(testedAt).getTime()+
          interval*60000
        ).toISOString()
      :null;

  const row={
    permit_id:ctx.permit.id,
    owner_id:ctx.permit.owner_id,
    organization_id:ctx.permit.organization_id,
    parameter,
    unit,
    minimum_limit:minimum,
    maximum_limit:maximum,
    actual_reading:actual,
    result:pass?"pass":"fail",
    instrument_id:text("instrument_id"),
    calibration_due:text("calibration_due")||null,
    tested_by:tester.id,
    tested_by_name:name(tester),
    tested_at:testedAt,
    retest_interval_minutes:interval||null,
    expires_at:expiresAt
  };

  const {data,error}=await ctx.admin
    .from("hs_permit_atmosphere_tests")
    .insert(row)
    .select("id")
    .single();

  if(error)throw new Error(error.message);

  await audit(
    ctx,
    pass
      ?"atmosphere_test_passed"
      :"atmosphere_test_failed",
    {
      test_id:data.id,
      parameter:row.parameter,
      reading:actual,
      unit:row.unit
    }
  );

  refresh(ctx.permitId);
}

export async function recordHandover(formData){
  const ctx=await context(formData);

  if(!mayVerifyPermit(ctx.access)){
    throw new Error(
      "Issuer or reviewer authority is required to approve handover."
    );
  }

  const text=key=>clean(formData.get(key));

  const outgoing=ctx.people.find(
    person=>person.id===text("outgoing_person_id")
  );

  const incoming=ctx.people.find(
    person=>person.id===text("incoming_person_id")
  );

  if(
    !outgoing||
    !incoming||
    outgoing.id===incoming.id
  ){
    throw new Error(
      "Select different outgoing and incoming company users."
    );
  }

  if(!text("work_status")){
    throw new Error(
      "Record the current work status."
    );
  }

  const now=new Date().toISOString();

  const row={
    permit_id:ctx.permit.id,
    owner_id:ctx.permit.owner_id,
    organization_id:ctx.permit.organization_id,
    outgoing_person_id:outgoing.id,
    outgoing_person_name:name(outgoing),
    incoming_person_id:incoming.id,
    incoming_person_name:name(incoming),
    work_status:text("work_status"),
    outstanding_hazards:
      text("outstanding_hazards")||null,
    isolations_remaining:
      text("isolations_remaining")||null,
    handed_over_at:now,
    accepted_at:now,
    authorised_by:ctx.access.person?.id||null,
    authorised_by_name:ctx.actor,
    authorised_at:now,
    revised_valid_until:
      text("revised_valid_until")
        ?new Date(
            text("revised_valid_until")
          ).toISOString()
        :null
  };

  const {data,error}=await ctx.admin
    .from("hs_permit_handovers")
    .insert(row)
    .select("id")
    .single();

  if(error)throw new Error(error.message);

  const update={
    receiver_person_id:incoming.id,
    receiver_name:name(incoming),
    receiver_contact_snapshot:{
      name:name(incoming),
      company:ctx.access.organization?.name||"",
      email:incoming.email||"",
      telephone:""
    },
    handover_required:false,
    status:"awaiting_acceptance",
    receiver_declaration:false,
    receiver_accepted_at:null,
    updated_at:now
  };

  if(row.revised_valid_until){
    update.valid_until=row.revised_valid_until;
  }

  const result=await ctx.admin
    .from("hs_permits")
    .update(update)
    .eq("id",ctx.permitId);

  if(result.error){
    throw new Error(result.error.message);
  }

  await audit(ctx,"handover_recorded",{
    handover_id:data.id,
    incoming_person:row.incoming_person_name
  });

  refresh(ctx.permitId);
}
