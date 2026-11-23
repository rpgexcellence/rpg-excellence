import Link from "next/link";
import QRCode from "qrcode";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { getOrganizationAccess } from "../../../../../lib/organization-access";
import { riskMatrixPosition } from "../../../../../lib/health-safety-dashboard.mjs";
import { resolvePowraLink, permitRoot, inspectionRoot, riskAssessmentRoot as riskRoot } from "../../../../../lib/powra-links";
import { POWRA_ROOT } from "../../../../../lib/powra-workflow.mjs";
import { zoneUrl } from "../../../../../lib/site-zones";
import { UUID } from "../../../../../lib/zone-policy.mjs";
import HealthSafetyDashboardHeatMap from "../../../../../components/HealthSafetyDashboardHeatMap";
import { RecordIcon } from "../../../../../components/DocumentRecordTabs";
import { PowraFacts } from "../PowraUI";
import styles from "../powra.module.css";

const checkLabels = { yes:"Yes", no:"No", na:"Not applicable" };
const riskLabels = { low:["Low","safe"], medium:["Medium","controls"], high:["High","stop"] };

async function LinkedRiskHeatMap({ assessmentId, organizationId }) {
  if (!UUID.test(assessmentId || "")) return null;
  const access = await getOrganizationAccess("risk_management", "view");
  const org = access.organization?.id;
  if (!access.allowed || !org || (organizationId && org !== organizationId)) return null;
  const admin = createAdminClient();
  const assessment = await admin.from("hs_risk_assessments").select("assessment_reference")
    .eq("organization_id",org).eq("id",assessmentId).maybeSingle();
  if (assessment.error || !assessment.data) return null;
  const { data, error } = await admin.from("hs_risk_hazards")
    .select("id,hazard_description,hazard_category,current_likelihood,current_severity,residual_likelihood,residual_severity")
    .eq("organization_id",org).eq("assessment_id",assessmentId).order("display_order");
  if (error) return null;
  const href = riskRoot+"/"+assessmentId+"?tab=scope";
  const hazards = (data ?? []).map(hazard => ({
    id:hazard.id, href:href+"#hazard-"+hazard.id, assessmentLabel:"Open linked risk assessment hazard",
    label:hazard.hazard_description || hazard.hazard_category || "Hazard",
    current:[hazard.current_likelihood,hazard.current_severity],
    residual:[hazard.residual_likelihood,hazard.residual_severity],
  })).filter(hazard => riskMatrixPosition(...hazard.current) || riskMatrixPosition(...hazard.residual));
  if (!hazards.length) return null;
  const initialMode = hazards.some(hazard => riskMatrixPosition(...hazard.residual)) ? "residual" : "current";
  return <div className={styles.panel}>
    <p><strong>Source: <Link href={href}>{assessment.data.assessment_reference || "Linked risk assessment"}</Link></strong> · Matrix scores from the linked assessment</p>
    <HealthSafetyDashboardHeatMap hazards={hazards} registerHref={riskRoot} initialMode={initialMode}/>
  </div>;
}

async function WorkplaceQR({ item, zoneId }) {
  if (!UUID.test(zoneId || "") || !UUID.test(item.administration_location_id || "") || !item.organization_id) {
    return <p>No published workplace zone linked.</p>;
  }
  const access = await getOrganizationAccess();
  if (access.organization?.id !== item.organization_id) return <p>Workplace QR unavailable.</p>;
  const admin = createAdminClient();
  const [site, zone] = await Promise.all([
    admin.from("organization_sites").select("id").eq("id",item.administration_location_id)
      .eq("organization_id",item.organization_id).eq("status","active").maybeSingle(),
    admin.from("organization_zones").select("reference,name,public_token,access_mode")
      .eq("id",zoneId).eq("organization_id",item.organization_id).eq("site_id",item.administration_location_id)
      .eq("status","published").maybeSingle(),
  ]);
  if (site.error || zone.error) return <p>Workplace QR is temporarily unavailable.</p>;
  if (!site.data || !UUID.test(zone.data?.public_token || "")) return <p>No published workplace zone available.</p>;
  let url, qr;
  try {
    url = zoneUrl(zone.data.public_token);
    qr = await QRCode.toDataURL(url,{ width:360, margin:4, errorCorrectionLevel:"M" });
  } catch {
    return <p>Workplace QR is temporarily unavailable.</p>;
  }
  return <div className={styles.zoneQr}>
    <img src={qr} width={112} height={112} alt={"Workplace QR for "+zone.data.name}/>
    <div><strong>{zone.data.reference} · {zone.data.name}</strong>
      <p>{zone.data.access_mode === "company" ? "Company sign-in required" : "Employee zone page"}</p>
      <Link className={styles.button} href={url}><RecordIcon name="open"/>Open workplace zone</Link>
    </div>
  </div>;
}

export default async function PowraRecordContext({ tab,item,hazards,checks,work,review }) {
  if (tab === "hazards") return <>
    <section className={styles.panel}>
      <h2><RecordIcon name="alert"/>Hazards and risk decisions</h2>
      {hazards.length ? hazards.map((hazard,index) => {
        const [label,tone] = Object.hasOwn(riskLabels,hazard.remaining_risk) ? riskLabels[hazard.remaining_risk] : ["Not recorded","neutral"];
        return <article key={index} className={styles.hazardCard}>
          <div className={styles.hazardSummary}>
            <div className={styles.factIcon}><span className={styles.hazardIcon}><RecordIcon name="alert"/></span><strong>{hazard.name || "Hazard"}</strong></div>
            <div className={styles.decisionTile+" "+styles.recordedDecision+" "+styles[tone]}><span>Remaining risk</span><strong>{label}</strong></div>
          </div>
          <details><summary><RecordIcon name="scope"/>Controls &amp; verification</summary>
            <PowraFacts rows={[
              ["Control measures",hazard.control,"scope"],
              ["Verification",hazard.verified === true ? "Control verified" : hazard.verified === false ? "Verification outstanding" : "Verification not recorded","checkCircle"],
              ...(hazard.changed ? [["Change","New or significantly changed hazard","history"]] : []),
            ]}/>
          </details>
        </article>;
      }) : <p>{work.no_additional_hazards ? "No additional hazards identified at the point of work." : "No hazards recorded."}</p>}
      <p className={styles.empty}>POWRA records qualitative risk ratings. A scored heat map appears below when the linked risk assessment provides likelihood and severity scores.</p>
    </section>
    <LinkedRiskHeatMap assessmentId={item.linked_assessment_id} organizationId={item.organization_id}/>
    <section className={styles.panel}>
      <h2><RecordIcon name="clipboard"/>Pre-start checks</h2>
      {checks.length ? <PowraFacts rows={checks.map(row => [row.question,checkLabels[row.answer],row.answer === "no" ? "alert" : "clipboard"])}/> : <p>No pre-start checks recorded.</p>}
    </section>
  </>;
  const reference = item.linked_assessment_id;
  const access = await getOrganizationAccess("risk_management", "view");
  const org = access.allowed && access.organization?.id === item.organization_id ? item.organization_id : null;
  const resolveDocument = (kind, key, reference) => Object.hasOwn(work,key)
    ? work[key] ? resolvePowraLink(kind,org,item.administration_location_id,{id:work[key]}) : null
    : resolvePowraLink(kind,org,item.administration_location_id,{reference});
  const [permit, inspection] = await Promise.all([
    resolveDocument("permit","permit_id",item.linked_permit_reference),
    resolveDocument("inspection","inspection_id",work.inspection_reference),
  ]);
  const related = [
    ["Risk assessment","overview", reference ? riskRoot+"/"+reference : riskRoot, reference ? "Open linked assessment" : null],
    ["Permit to work","permit",permit ? permitRoot+"/"+permit.id : permitRoot,item.linked_permit_reference,Boolean(permit)],
    ["Workplace inspection","clipboard",inspection ? inspectionRoot+"/"+inspection.id : inspectionRoot,work.inspection_reference,Boolean(inspection)],
    ["Incident reporting","alert","/portal/incidents",review.incident_reference],
  ];
  if (work.reassessment_of && UUID.test(work.reassessment_of)) {
    related.push(["Earlier POWRA","history",POWRA_ROOT+"/"+work.reassessment_of,"Open earlier POWRA"]);
  }
  return <section className={styles.panel}>
    <h2><RecordIcon name="documents"/>Documents &amp; Applicability</h2>
    <div className={styles.documentsLayout}>
      <div>
        <h3>Linked documents</h3>
        <ul className={styles.questions}>{related.map(([label,icon,url,record,direct=true]) => <li key={label}>
          <strong className={styles.factIcon}><RecordIcon name={icon}/>{label}</strong>
          <p>{!record && <><small>No reference recorded</small> · </>}
            {record && !direct && <><span>{record}</span> · </>}
            <Link href={url}>{record && direct ? record : record ? "Open register" : "Open module"}</Link>
            {label === "Risk assessment" && reference && <><span> · </span><a href={url+"/report"} download>Download PDF</a></>}
          </p>
        </li>)}</ul>
        <h3 className={styles.factIcon}><RecordIcon name="pin"/>Applicability</h3>
        <PowraFacts rows={[
          ["Location",item.site_location,"pin"],["Work area",item.work_area,"pin"],
          ["Workplace zone",[work.zone?.reference,work.zone?.name].filter(Boolean).join(" · "),"qr"],
        ]}/>
      </div>
      <section className={styles.qrPanel}>
        <h3 className={styles.factIcon}><RecordIcon name="qr"/>Workplace access (QR)</h3>
        <WorkplaceQR item={item} zoneId={work.zone?.id}/>
      </section>
    </div>
  </section>;
}
