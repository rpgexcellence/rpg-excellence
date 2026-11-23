import test from "node:test";
import assert from "node:assert/strict";
import { permitMatchesZone, permitOverlaps } from "../lib/permit-register.mjs";
import { canTransition, currentPermitControls, permitAuthorityWithControls, permitControlEvidence } from "../lib/permitLifecycle.js";

const from = "2026-11-23T10:00:00Z";
const until = "2026-11-23T12:00:00Z";
const permit = {
  id:"permit-a", organization_id:"company", administration_location_id:"site", work_area:"Plant A",
  status:"issued", issued_at:from, valid_from:from, valid_until:until, permit_type:"hot_work",
  issuer_declaration:true, receiver_declaration:true, emergency_arrangements:"Recorded",
  permit_specific_controls:{selected:["work_party_briefed"]},
};

test("authority starts and ends at the recorded boundaries and requires evidence", () => {
  const evidence = permitControlEvidence(permit);
  const status = (row, time) => permitAuthorityWithControls(row, currentPermitControls(evidence, Date.parse(time)), Date.parse(time));
  assert.equal(status(permit, "2026-11-23T09:59:59Z"), "scheduled");
  assert.equal(status(permit, from), "issued");
  assert.equal(status(permit, until), "expired");
  assert.equal(status({...permit,receiver_declaration:false}, from), "authority_unconfirmed");
  assert.equal(status({...permit,status:"suspended"}, from), "suspended");
  assert.equal(canTransition("expired", "awaiting_handback"), true);
  assert.equal(canTransition("expired", "closed"), false);
  assert.equal(canTransition("expired", "cancelled"), false);
});

test("expired gas evidence and unavailable controls prevent an active authority display", () => {
  const row = {...permit,hazards:["Hazardous atmosphere"]};
  const evidence = permitControlEvidence(row, [], [{parameter:"Oxygen",result:"pass",tested_at:from,expires_at:"2026-11-23T11:00:00Z"}]);
  const status = at => permitAuthorityWithControls(row, currentPermitControls(evidence, at), at);
  assert.equal(status(Date.parse(from)), "issued");
  assert.equal(status(Date.parse("2026-11-23T11:00:00Z")), "authority_unconfirmed");
  assert.equal(permitAuthorityWithControls(permit,currentPermitControls(permitControlEvidence(permit,[],[],false)),Date.parse(from)), "authority_unconfirmed");
});

test("overlaps require shared area or controlled asset and intersecting live time within the same company and site", () => {
  const other = {...permit,id:"permit-b",status:"awaiting_acceptance",work_area:" plant   a "};
  const foreign = {...other,id:"foreign",organization_id:"foreign"};
  const elsewhere = {...other,id:"elsewhere",administration_location_id:"other-site"};
  const separate = {...other,id:"separate",valid_from:until,valid_until:"2026-11-23T16:00:00Z"};
  assert.equal(permitOverlaps([permit,other,foreign,elsewhere,separate],Date.parse(from)).length,1);
  assert.equal(permitOverlaps([permit,other],Date.parse(until)).length,0);
  const asset = "shared";
  assert.equal(permitOverlaps([{...permit,organization_asset_id:asset},{...other,work_area:"other",organization_asset_id:asset}],Date.parse(from)).length,1);
});

test("zone matching requires the same company, site and recorded work area", () => {
  const zone = {organization_id:"company",site_id:"site",name:"plant a",reference:"ZONE-01"};
  assert.equal(permitMatchesZone(permit,zone),true);
  assert.equal(permitMatchesZone({...permit,work_area:"Plant A extension"},zone),false);
  assert.equal(permitMatchesZone({...permit,organization_id:"other"},zone),false);
});
