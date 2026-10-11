export const PERMIT_STATUSES = {
  draft:{label:"Draft",tone:"neutral",workAllowed:false},
  awaiting_verification:{label:"Awaiting verification",tone:"blue",workAllowed:false},
  awaiting_acceptance:{label:"Awaiting acceptance",tone:"blue",workAllowed:false},
  issued:{label:"Active",tone:"green",workAllowed:true},
  suspended:{label:"Suspended",tone:"red",workAllowed:false},
  handover_required:{label:"Handover required",tone:"amber",workAllowed:false},
  expired:{label:"Expired",tone:"red",workAllowed:false},
  awaiting_handback:{label:"Work complete — awaiting hand-back",tone:"amber",workAllowed:false},
  closed:{label:"Closed",tone:"closed",workAllowed:false},
  cancelled:{label:"Cancelled",tone:"closed",workAllowed:false},
};

export const PERMIT_TRANSITIONS = {
  draft:["awaiting_verification","cancelled"],
  awaiting_verification:["awaiting_acceptance","draft","cancelled"],
  awaiting_acceptance:["issued","draft","cancelled"],
  issued:["suspended","handover_required","awaiting_handback"],
  suspended:["awaiting_verification","cancelled"],
  handover_required:["awaiting_acceptance","suspended","cancelled"],
  expired:["awaiting_verification","cancelled"],
  awaiting_handback:["closed","suspended"],
  closed:[],
  cancelled:[],
};

export function effectivePermitStatus(permit,now=new Date()){
  if(
    permit?.status==="issued"&&
    permit.valid_until&&
    new Date(permit.valid_until)<=now
  ){
    return "expired";
  }

  return permit?.status||"draft";
}

export function canTransition(from,to){
  return (PERMIT_TRANSITIONS[from]||[]).includes(to);
}

export function requireTransition(from,to){
  if(!canTransition(from,to)){
    throw new Error(
      `Permit cannot move from ${
        PERMIT_STATUSES[from]?.label||from
      } to ${
        PERMIT_STATUSES[to]?.label||to
      }.`
    );
  }
}

export function getAtmosphereValidity(tests=[],now=new Date()){
  if(!tests.length){
    return {
      valid:false,
      reason:"No atmospheric test has been recorded."
    };
  }

  const latestByParameter=new Map();

  [...tests]
    .sort(
      (a,b)=>
        new Date(b.tested_at||b.created_at||0)-
        new Date(a.tested_at||a.created_at||0)
    )
    .forEach(test=>{
      const parameter=String(test.parameter||"")
        .trim()
        .toLowerCase();

      if(parameter&&!latestByParameter.has(parameter)){
        latestByParameter.set(parameter,test);
      }
    });

  const current=[...latestByParameter.values()];

  const failed=current.find(test=>test.result!=="pass");

  if(failed){
    return {
      valid:false,
      reason:`${failed.parameter} has not passed.`
    };
  }

  const expired=current.find(
    test=>
      test.expires_at&&
      new Date(test.expires_at)<=now
  );

  if(expired){
    return {
      valid:false,
      reason:`The ${expired.parameter} test has expired.`
    };
  }

  return {
    valid:true,
    reason:"The latest atmospheric test for each recorded parameter remains acceptable."
  };
}

export function getIsolationReadiness(isolations=[]){
  if(!isolations.length){
    return {
      valid:false,
      reason:"No structured isolation has been recorded."
    };
  }

  const active=isolations.filter(item=>!item.reinstated_at);

  if(!active.length){
    return {
      valid:false,
      reason:"No active isolation remains in place. Record and verify the required isolation before issue."
    };
  }

  const incomplete=active.find(
    item=>
      !item.applied_at||
      !item.verified_at||
      !item.verification_method
  );

  if(incomplete){
    return {
      valid:false,
      reason:`Isolation ${
        incomplete.isolation_point||"record"
      } has not been independently verified.`
    };
  }

  const samePerson=active.find(
    item=>
      item.applied_by&&
      item.verified_by&&
      item.applied_by===item.verified_by
  );

  if(samePerson){
    return {
      valid:false,
      reason:`Isolation ${
        samePerson.isolation_point
      } requires independent verification.`
    };
  }

  return {
    valid:true,
    reason:"Every active isolation has been applied and independently verified."
  };
}

export function getIssueReadiness({
  permit,
  rule,
  isolations=[],
  atmosphereTests=[],
  relatedConflicts=[]
}){
  const blockers=[];

  if(!permit){
    blockers.push("Permit record is unavailable.");
  }

  if(!permit?.issuer_declaration){
    blockers.push("Issuer declaration is outstanding.");
  }

  if(!permit?.receiver_declaration){
    blockers.push("Receiver acceptance is outstanding.");
  }

  if(!permit?.issuer_person_id){
    blockers.push("An authorised permit issuer has not been selected.");
  }

  if(!permit?.receiver_name){
    blockers.push("A person in charge has not been identified.");
  }

  if(!permit?.scope_limits){
    blockers.push("Permit scope limits are missing.");
  }

  if(!permit?.asset_reference){
    blockers.push("Asset or equipment reference is missing.");
  }

  if(!permit?.stop_work_conditions){
    blockers.push("Stop-work conditions are missing.");
  }

  if(new Date(permit?.valid_until)<=new Date(permit?.valid_from)){
    blockers.push("The validity period is invalid.");
  }

  if(new Date(permit?.valid_until)<=new Date()){
    blockers.push("The proposed permit validity has already expired.");
  }

  if(rule?.requiresIsolation){
    const result=getIsolationReadiness(isolations);

    if(!result.valid){
      blockers.push(result.reason);
    }
  }

  if(rule?.requiresAtmosphere){
    const result=getAtmosphereValidity(atmosphereTests);

    if(!result.valid){
      blockers.push(result.reason);
    }
  }

  if(relatedConflicts.length){
    blockers.push(
      `${relatedConflicts.length} conflicting active permit${
        relatedConflicts.length===1?"":"s"
      } require coordination.`
    );
  }

  return {
    ready:blockers.length===0,
    blockers
  };
}

export function getCloseReadiness({
  permit,
  isolations=[]
}){
  const blockers=[];

  if(!permit?.completion_declared_at){
    blockers.push(
      "The person in charge has not declared the work complete."
    );
  }

  const liveIsolation=isolations.find(
    item=>
      !item.reinstated_at||
      !item.reinstatement_verified_at
  );

  if(liveIsolation){
    blockers.push(
      `Isolation ${
        liveIsolation.isolation_point||"record"
      } has not been removed and independently verified.`
    );
  }

  if(!permit?.reinstatement_confirmation){
    blockers.push(
      "Plant/area reinstatement has not been confirmed."
    );
  }

  if(!permit?.handback_accepted_at){
    blockers.push(
      "Operations has not accepted the plant or area back."
    );
  }

  return {
    ready:blockers.length===0,
    blockers
  };
}

export function statusMessage(status,permit){
  switch(status){
    case "draft":
      return "Not valid for work. Complete the controls and submit for verification.";

    case "awaiting_verification":
      return "Critical controls, isolations and tests require verification.";

    case "awaiting_acceptance":
      return "Verification is complete. The issuer and person in charge must accept the permit.";

    case "issued":
      return `Work is authorised only within the recorded limits until ${
        permit?.valid_until
          ?new Date(permit.valid_until).toLocaleString("en-GB")
          :"the stated expiry"
      }.`;

    case "suspended":
      return permit?.suspension_reason||
        "Work authority has been withdrawn. Leave the area safe.";

    case "handover_required":
      return "Work must not continue until the incoming person accepts the handover and the issuer reauthorises it.";

    case "expired":
      return "The permit has expired. Stop work and complete controlled reassessment before reissue.";

    case "awaiting_handback":
      return "Work is complete, but the plant or area has not yet been accepted back by Operations.";

    case "closed":
      return "The permit is closed and its authority to work has ended.";

    case "cancelled":
      return permit?.cancellation_reason||
        "The permit was cancelled and work is not authorised.";

    default:
      return "Permit status requires review.";
  }
}
