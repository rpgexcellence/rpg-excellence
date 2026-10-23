import test from 'node:test';
import assert from 'node:assert/strict';
import {canAdministerInspection,canStartInspection,canEditInspectionFieldwork,inspectionTimestamp,validateAppointmentIndependence,inspectionStageTitle} from '../lib/workplace-inspection-policy.mjs';
const inspector={person:{id:'igor'},level:'contribute'}, administrator={isOwner:true,person:{id:'rafal'},level:'owner'}, planned={lead_inspector_person_id:'igor',status:'planned'};
test('scheduling and administration do not grant fieldwork identity',()=>{
 assert.equal(canAdministerInspection(administrator),true);
 assert.equal(canStartInspection(administrator,planned),false);
 assert.equal(canEditInspectionFieldwork(administrator,{...planned,status:'in_progress'}),false);
 assert.equal(canStartInspection(inspector,planned),true);
 assert.equal(canEditInspectionFieldwork(inspector,planned),false);
 assert.equal(canEditInspectionFieldwork(inspector,{...planned,status:'in_progress'}),true);
 for(const status of ['awaiting_review','actions_open','completed','cancelled']) assert.equal(canEditInspectionFieldwork(inspector,{...planned,status}),false);
 assert.equal(canAdministerInspection({level:'review'}),false);
 assert.equal(canAdministerInspection({isPlatformAdministrator:true}),true);
 assert.equal(inspectionStageTitle('planned'),'Inspection scheduled');
});
test('reviewer independence includes previous assessors and duplicate accounts',()=>{
 const people=[{id:'igor',user_id:'i'},{id:'rafal',user_id:'r'},{id:'duplicate',user_id:'i'},{id:'other',user_id:'o'}];
 assert.doesNotThrow(()=>validateAppointmentIndependence(people,'igor','rafal'));
 assert.throws(()=>validateAppointmentIndependence(people,'igor','duplicate'));
 assert.throws(()=>validateAppointmentIndependence(people,'other','igor',['igor']));
 assert.throws(()=>validateAppointmentIndependence(people,'other','duplicate',['igor']));
});
test('UTC schedule validation rejects impossible dates and times',()=>{
 assert.equal(inspectionTimestamp('2027-01-19T09:00'),'2027-01-19T09:00:00.000Z');
 for(const value of ['2026-02-31T09:00','2027-01-19T25:00','2027-01-19T09:60','2027-1-19T09:00']) assert.throws(()=>inspectionTimestamp(value));
});
