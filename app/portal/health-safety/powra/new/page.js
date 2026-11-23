import ControlledDeviceDrafts from "../../../../../components/ControlledDeviceDrafts";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createPowra } from "./actions";
import { loadPowraAdministrationOptions } from "../../../../../lib/powraCompanyOptions";
import { listPowraZones, resolvePowraZone } from "../../../../../lib/powra-zones";
import { POWRA_ROOT } from "../../../../../lib/powra-workflow.mjs";
import { UUID } from "../../../../../lib/zone-policy.mjs";
import { loadPowraLinkOptions } from "../../../../../lib/powra-links";
import PowraForm from "../../../../../components/PowraForm";
import { createClient } from "../../../../../lib/supabase/server";
import { PowraHero } from "../PowraUI";
import styles from "../powra.module.css";

export const metadata = { title: "New POWRA | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function NewPowraPage({ searchParams }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=" + POWRA_ROOT + "/new");
  const { data: organization, error } = await supabase.from("organizations").select("*").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!organization) redirect("/portal");
  const { sites, people } = await loadPowraAdministrationOptions(organization.id);
  const siteIds = sites.map(site => site.id);
  const zoneLink = typeof query?.zone === "string" ? query.zone.trim() : "";
  const token = zoneLink.match(/^(?:https?:\/\/[^/]+)?\/area\/([\da-f-]{36})(?:[?#].*)?$/i)?.[1] || zoneLink;
  const priorId = typeof query?.reassess === "string" && UUID.test(query.reassess) ? query.reassess : null;
  const [assessments, zones, initialZone, prior, linkOptions] = await Promise.all([
    supabase.from("hs_risk_assessments").select("id,assessment_reference,title").eq("owner_id",user.id).eq("organization_id",organization.id).in("status",["approved","communicated"]).order("updated_at",{ascending:false}),
    listPowraZones(organization.id, siteIds),
    zoneLink ? resolvePowraZone(organization.id, token, siteIds, true) : null,
    priorId ? supabase.from("hs_powra_assessments").select("id,task,powra_reference,administration_location_id,end_review").eq("id",priorId).eq("owner_id",user.id).eq("organization_id",organization.id).in("decision",["stop_work","supervisor_review"]).maybeSingle() : { data:null },
    loadPowraLinkOptions(organization.id, siteIds),
  ]);
  if (assessments.error || prior.error) throw assessments.error || prior.error;
  return <ControlledDeviceDrafts userId={user.id} organizationId={organization.id} recordKey={`powra:new:workflow:${prior.data?.id || initialZone?.id || "manual"}`} label="POWRA"
    baseline={{sites, people, assessments:assessments.data ?? [], zones}}>
    <main className={styles.page}>
      <PowraHero title="Start New POWRA" description="Point of Work Risk Assessment">
        <Link className={styles.button} href={POWRA_ROOT}>POWRA register</Link>
        <Link className={styles.button} href={POWRA_ROOT + "/new?scan=1" + (priorId ? "&reassess="+priorId : "")}>Use zone QR</Link>
      </PowraHero>
      {(query?.scan === "1" || (zoneLink && !initialZone)) && <section className={styles.panel} data-device-draft-exclude>
        <h2>Workplace zone QR</h2>
        <p>Scan the zone QR with your phone camera and select Start POWRA on the zone page, or paste the zone link here.</p>
        {zoneLink && !initialZone && <p role="alert">This zone could not be found among your company’s active sites and published zones.</p>}
        <form action={POWRA_ROOT+"/new"} className={styles.filters}>
          {priorId && <input type="hidden" name="reassess" value={priorId}/>}
          <label>Zone link or code<input name="zone" maxLength={350} required/></label><button className={styles.primary}>Use zone</button>
        </form>
      </section>}
      {initialZone && <p className={styles.notice}>Workplace zone selected · {initialZone.reference} · {initialZone.name}</p>}
      {!initialZone && prior.data?.end_review?.point_of_work?.zone?.id && !zones.some(zone => zone.id === prior.data.end_review.point_of_work.zone.id) &&
        <p className={styles.notice}>The earlier workplace zone is unavailable. Confirm the location before reassessment.</p>}
      <PowraForm action={createPowra} sites={sites} people={people} zones={zones} prior={prior.data}
        initialZone={initialZone || zones.find(zone => zone.id === prior.data?.end_review?.point_of_work?.zone?.id)}
        numbering={organization} {...linkOptions} assessments={assessments.data ?? []} today={new Date().toISOString().slice(0,10)}/>
    </main>
  </ControlledDeviceDrafts>;
}
