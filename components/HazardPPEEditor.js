// VERIFIED_SOURCE_20261021: ordinary strings and explicit object properties.
'use client';

import { useDeviceDraftState } from "./DeviceDraftWorkspace";
import { useActionState, useState, useRef, useEffect } from 'react';
import HazardPPEFields from './HazardPPEFields';
export default function HazardPPEEditor({
  hazard,
  zones,
  action
}) {
  const formRef = useRef(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const preserve = event => event.preventDefault();
    form.addEventListener('reset', preserve);
    return () => form.removeEventListener('reset', preserve);
  }, []);
  const [enabled, setEnabled] = useDeviceDraftState("HazardPPEEditor_enabled" + "_" + hazard.id, (hazard.control_hierarchy || []).includes('PPE')),
    [items, setItems] = useDeviceDraftState("HazardPPEEditor_items" + "_" + hazard.id, hazard.ppe_requirements || []);
  const [state, formAction, pending] = useActionState(action, null);
  return <details style={{
    "gridColumn": '1 / -1',
    "width": '100%',
    "marginTop": 10
  }}><summary style={{
      "cursor": 'pointer',
      "fontWeight": 700
    }}>Edit PPE requirements for this hazard</summary><form ref={formRef} action={formAction}><input type="hidden" name="expected_ppe" value={JSON.stringify(hazard.ppe_requirements || [])} /><input type="hidden" name="hazard_id" value={hazard.id} /><input type="hidden" name="assessment_id" value={hazard.assessment_id} /><input type="hidden" name="ppe_requirements" value={JSON.stringify(enabled ? items : [])} /><label style={{
        "display": 'flex',
        "gap": 9,
        "margin": '15px 0'
      }}><input type="checkbox" name="ppe_required" checked={enabled} onChange={event => setEnabled(event.target.checked)} />PPE is a required control for this hazard</label>{enabled && <HazardPPEFields category={hazard.hazard_category} value={items} onChange={setItems} zones={zones} />}<p>Removing PPE here requires the assessor to reconsider the controls and residual-risk decision before review.</p>{state?.error && <p role="alert" style={{
        "color": '#a22c26'
      }}>{state.error}</p>}{state?.success && <p role="status">{state.success}</p>}<button type="submit" disabled={pending} style={{
        "padding": 12,
        "background": '#087f6c',
        "color": 'white',
        "border": 0,
        "borderRadius": 7
      }}>{pending ? 'Saving…' : 'Save hazard PPE'}</button></form></details>;
}
