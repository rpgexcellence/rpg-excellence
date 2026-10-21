import 'server-only';
import {createHash,randomUUID} from 'node';
import {stableDraftJSON} from '../lib/device-drafts.mjs';
import DeviceDraftWorkspace from './DeviceDraftWorkspace';

export default function ControlledDeviceDrafts({children,baseline,userId,organizationId,recordKey,label}){
if(!userId||!organizationId)return children;
const fingerprint=createHash('sha256').update(stableDraftJSON(baseline)).digest('hex');
return <DeviceDraftWorkspace key={${userId}:${organizationId}:${recordKey}} userId={userId} organizationId={organizationId} recordKey={recordKey} label={label} fingerprint={fingerprint} refreshToken={randomUUID()}>{children}</DeviceDraftWorkspace>;
}
