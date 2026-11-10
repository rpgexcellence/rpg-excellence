import { createClient } from "../../../lib/supabase/server";
import { assetCategories, categoryLabel } from "../../../lib/asset-catalog";
import { filterCompanyAssets, assetFilters } from "../../../lib/asset-dashboard";
import { requireAssetAccess, loadAssetRows } from "../../../lib/asset-management";
import Link from "next/link";
import CompanyAssetRegister, { AssetMaintenanceForm } from "../../../components/CompanyAssetRegister";
import { requireOrganizationAccess, getOrganizationAccess } from "../../../lib/organization-access";
import { createAdminClient } from "../../../lib/supabase/admin";
import { loadAdministrationLocations } from "../../../lib/rcaCompanyLinks";
import { changeCompanyAssetStatus } from "../company/assets/actions";
export const metadata = {
  title: "Company Asset Register | RPG Excellence"
};
export const dynamic = "force-dynamic";
const title = value => String(value || "").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const date = value => value ? new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium"
}).format(new Date("".concat(value, "T12:00:00Z"))) : "—";
const personName = person => person ? [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email : "Unassigned";

// Match the current customer-facing document register, without its default row limit.
async function loadRegisterDocuments(admin) {
  const documents = [];
  for (let offset = 0;; offset += 500) {
    const {
      data,
      error
    } = await admin.from("controlled_documents").select("id,document_number,title,document_type,standard,revision,status,description").eq("status", "Current").in("audience", ["Customer", "Both"]).order("document_number").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    documents.push(...(data || []));
    if (!data || data.length < 500) return documents;
  }
}
export default async function AssetWorkspace({
  searchParams,
  mode = "register",
  draftEnabled = false
}) {
  const query = await searchParams;
  const assetAccess = await requireAssetAccess(mode === "new" ? "contribute" : "view");
  const {
    organization,
    canWrite
  } = assetAccess;
  const [documentAccess, riskAccess] = await Promise.all([getOrganizationAccess("documents"), getOrganizationAccess("risk_management")]);
  const sameCompany = context => context.allowed && context.user?.id === assetAccess.user.id && context.organization?.id === organization.id && context.organization?.owner_id === organization.owner_id;
  const canDocuments = sameCompany(documentAccess),
    canMoc = sameCompany(riskAccess);
  const canCreateMoc = canMoc && ["contribute", "review", "approve", "admin", "owner"].includes(riskAccess.level);
  const admin = createAdminClient();
  const locations = await loadAdministrationLocations(organization);
  const [assetResult, peopleResult, maintenanceResult, mocResult, supplierResult, documentResult, documentLinkResult] = await Promise.all([loadAssetRows(admin, "organization_assets", organization.id).then(data => ({
    data
  })), admin.from("organization_people").select("id,first_name,last_name,email,position").eq("organization_id", organization.id).eq("account_status", "active").order("last_name"), loadAssetRows(admin, "organization_asset_maintenance", organization.id).then(data => ({
    data
  })), canMoc ? admin.from("hs_moc_changes").select("id,moc_reference,title,status,organization_asset_id").eq("organization_id", organization.id).not("organization_asset_id", "is", null) : Promise.resolve({
    data: []
  }), admin.from("suppliers").select("id,legal_name,approval_status").eq("organization_id", organization.id).in("approval_status", ["approved", "conditionally_approved"]).order("legal_name"), canDocuments ? loadRegisterDocuments(await createClient()).then(data => ({
    data
  })) : Promise.resolve({
    data: []
  }), admin.from("organization_asset_document_links").select("asset_id,controlled_document_id").eq("organization_id", organization.id)]);
  for (const result of [assetResult, peopleResult, maintenanceResult, mocResult, supplierResult, documentResult, documentLinkResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
  const allAssets = assetResult.data || [];
  const filters = assetFilters(query);
  const assets = filterCompanyAssets(allAssets, query);
  const people = peopleResult.data || [];
  const maintenance = (maintenanceResult.data || []).sort((a, b) => String(b.scheduled_date || "").localeCompare(String(a.scheduled_date || "")));
  const mocs = mocResult.data || [];
  const suppliers = supplierResult.data || [];
  const documents = documentResult.data || [];
  const documentLinks = documentLinkResult.data || [];
  const editAsset = canWrite ? assets.find(item => item.id === query?.edit) || null : null;
  const peopleById = new Map(people.map(person => [person.id, person]));
  const suppliersById = new Map(suppliers.map(supplier => [supplier.id, supplier]));
  const documentsById = new Map(documents.map(document => [document.id, document]));

  // These URLs contain record identifiers only. Downloads recheck current permissions.
  for (const record of maintenance) record.evidence_url = record.evidence_storage_path ? "/portal/asset-management/records/".concat(record.asset_id, "/evidence/").concat(record.id, "") : null;
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const active = assets.filter(item => item.operational_status === "active").length;
  const dueSoon = assets.filter(item => item.ppm_required && item.operational_status === "active" && item.next_maintenance_date >= today && item.next_maintenance_date <= soon).length;
  const overdue = assets.filter(item => item.ppm_required && item.operational_status === "active" && item.next_maintenance_date < today).length;
  const maintenanceByAsset = new Map(assets.map(asset => [asset.id, maintenance.filter(item => item.asset_id === asset.id)]));
  const mocByAsset = new Map(assets.map(asset => [asset.id, mocs.filter(item => item.organization_asset_id === asset.id)]));
  const documentsByAsset = new Map(assets.map(asset => [asset.id, documentLinks.filter(link => link.asset_id === asset.id).map(link => documentsById.get(link.controlled_document_id)).filter(Boolean)]));
  return <main className="arPage">
      <style>{styles}</style>

      <div className="arShell">
        <header className="arTop">
          <div>
            <small>
              ASSET MANAGEMENT ·
              CONTROLLED LIFECYCLE
            </small>

            <h1>
              {mode === "new" ? "Create New Asset" : mode === "maintenance" ? "Maintenance & PPM" : "Asset Register"}
            </h1>

            <p>
              Control ownership,
              location, maintenance
              and change across the
              asset lifecycle.
            </p>
          </div>

          <nav>
            <Link className="arLink" href="/portal/company/business-profile">
              Business Profile
            </Link>

            <Link className="arLink" href="/portal/health-safety/moc">
              MOC Register
            </Link>

            <Link className="arLink" href="/portal/health-safety/permits">
              Permit Register
            </Link>
          </nav>
        </header>

        <section className="arSummary">
          <div className="arMetric">
            <span>
              ACTIVE ASSETS
            </span>

            <strong>
              {active}
            </strong>
          </div>

          <div className="arMetric amber">
            <span>
              PPM DUE IN 30 DAYS
            </span>

            <strong>
              {dueSoon}
            </strong>
          </div>

          <div className="arMetric red">
            <span>
              PPM OVERDUE
            </span>

            <strong>
              {overdue}
            </strong>
          </div>

          <div className="arMetric">
            <span>
              LINKED MOC RECORDS
            </span>

            <strong>
              {mocs.length}
            </strong>
          </div>
        </section>

        <div className="arLayout" style={{
        gridTemplateColumns: "minmax(0,1fr)"
      }}>
          {canWrite && (mode === "new" || mode === "maintenance" || editAsset) && <div className="arForms">
            {(mode === "new" || editAsset) && <CompanyAssetRegister key={editAsset?.id || "new"} locations={locations} people={people} suppliers={suppliers} documents={documents} draftEnabled={draftEnabled && mode === "new" && !editAsset} asset={editAsset} linkedDocumentIds={editAsset ? documentLinks.filter(link => link.asset_id === editAsset.id).map(link => link.controlled_document_id) : []} />}
            {mode === "maintenance" && <AssetMaintenanceForm assets={assets} people={people} suppliers={suppliers} />}</div>}

          {mode !== "new" && <section className="arPanel">
            <form method="get" className="arFilters" role="search" aria-label="Search and filter company assets">
  <input type="hidden" name="site" value={filters.site} />
  <input type="hidden" name="type" value={filters.type} />
  <input type="hidden" name="owner" value={filters.owner} />
  <input type="hidden" name="days" value={filters.days} />
  <input type="hidden" name="focus" value={String(query?.focus || "")} />
  <div className="arFilterField arFilterSearch"><label htmlFor={"asset-search-" + mode}>Search assets</label><input id={"asset-search-" + mode} type="search" name="q" defaultValue={query?.q || ""} placeholder="Reference, name, serial number or site" /></div>
  <div className="arFilterField"><label htmlFor={"asset-filter-status-" + mode}>Operational status</label><select id={"asset-filter-status-" + mode} name="status" defaultValue={query?.status || ""}><option value="">All statuses</option><option value="active">Active</option><option value="out_of_service">Out of service</option><option value="retired">Retired</option></select></div>
  <div className="arFilterActions"><button type="submit">Apply filters</button><Link href={mode === "maintenance" ? "/portal/asset-management/maintenance" : "/portal/asset-management/register"}>Clear filters</Link></div>
          </form>
            {(filters.site || filters.type || filters.owner || query?.focus) && <p style={{
            padding: 12,
            background: "#edf6ff",
            borderRadius: 8
          }}>Dashboard selection applied{query?.focus ? " \xB7 ".concat(String(query.focus).replaceAll("_", " "), "") : ""}. Use Clear to show all company assets.</p>}
            <h2>{mode === "maintenance" ? "Asset maintenance history & evidence" : "Current assets"}</h2>

            <p>
              Ownership, PPM and
              change status are
              visible at asset level.
              Retired assets remain
              in the controlled
              history.
            </p>

            <div className="arList">
              {assets.length ? assets.map(asset => {
              const owner = peopleById.get(asset.asset_owner_person_id);
              const records = maintenanceByAsset.get(asset.id) || [];
              const openPlanned = records.filter(record => record.status === "planned").sort((a, b) => String(a.scheduled_date || "9999").localeCompare(String(b.scheduled_date || "9999")));
              const maintenanceDates = [...openPlanned.map(record => record.scheduled_date), ...(asset.ppm_required ? [asset.next_maintenance_date] : [])].filter(Boolean).sort();
              const nextMaintenance = maintenanceDates[0] || null;
              const linkedMocs = mocByAsset.get(asset.id) || [];
              const linkedDocuments = documentsByAsset.get(asset.id) || [];
              const maintenanceOwner = peopleById.get(asset.maintenance_owner_person_id);
              const maintenanceSupplier = suppliersById.get(asset.maintenance_supplier_id);
              const isOverdue = asset.ppm_required && asset.next_maintenance_date < today && asset.operational_status === "active";
              return <article className={"arAsset arRegisterCard " + (isOverdue ? "overdue" : "")} key={asset.id}>
  <header className="arCardHeading">
    <div className="arCardIdentity">
      <div className="arCardReference"><strong>{asset.asset_reference}</strong><span>{assetCategories(asset).map(categoryLabel).join(" · ")}</span></div>
      <h3>{asset.asset_name}</h3>
      <p className="arCardLocation">{asset.site_location_label || "Location not recorded"}</p>
      {asset.area_department && <p className="arCardArea">Area / department: {asset.area_department}</p>}
    </div>
    <span className={"arOperationalStatus " + asset.operational_status}>Operational status: {title(asset.operational_status)}</span>
  </header>

  <dl className="arCardFacts">
    <div><dt>Accountable owner</dt><dd>{personName(owner)}</dd></div>
    <div><dt>Criticality</dt><dd>{title(asset.criticality) || "Not recorded"}</dd></div>
    <div><dt>PPM requirement</dt><dd>{asset.ppm_required ? "Every " + asset.ppm_frequency_value + " " + asset.ppm_frequency_unit : "Not required"}</dd></div>
    <div><dt>Next maintenance</dt><dd className={nextMaintenance && nextMaintenance < today ? "danger" : ""}>{nextMaintenance ? date(nextMaintenance) : "Not recorded"}</dd></div>
  </dl>

  {asset.description && <p className="arCardDescription">{asset.description}</p>}

  {openPlanned.length > 0 && <p className={"arWorkNotice " + (openPlanned[0].scheduled_date && openPlanned[0].scheduled_date < today ? "attention" : "")}>
    <strong>{openPlanned[0].scheduled_date && openPlanned[0].scheduled_date < today ? "Scheduled work overdue" : "Next scheduled work"}</strong>
    <span>{openPlanned[0].maintenance_reference} · {title(openPlanned[0].maintenance_type)} · {date(openPlanned[0].scheduled_date)} · {personName(peopleById.get(openPlanned[0].responsible_person_id))}</span>
    {openPlanned.length > 1 && <small>{openPlanned.length} open planned records</small>}
  </p>}

  {asset.calibration_required && <p className="arCalibrationNotice">
    <strong>Calibration required</strong>
    <span>Next: {asset.next_calibration_date ? date(asset.next_calibration_date) : "Date not recorded"} · Result: {title(asset.calibration_result || "not_assessed")}</span>
    <small>Provider, certificate and interval basis are in Linked records.</small>
  </p>}

  <div className="arCardFooter">
    <details className="arLinkedRecords" open={mode === "maintenance" || records.some(record => record.id === query?.record)}>
      <summary>
        <strong>Linked records <span className="arDisclosureArrow" aria-hidden="true">⌄</span></strong>
        <span className="arLinkedCounts">{records.length} maintenance {records.length === 1 ? "record" : "records"} · {canMoc ? linkedMocs.length + " MOC" : "MOC access required"} · {canDocuments ? linkedDocuments.length + " documents" : "Document access required"}</span>
      </summary>
      <div className="arLinkedBody">
        <div className="arLinkedOverview">
          <section><h4>Maintenance</h4><p>{records.length ? records.length + " recorded work items" : "No records yet"}</p><a href={"#asset-maintenance-" + asset.id}>View maintenance history</a></section>
          <section><h4>Management of Change</h4>{!canMoc ? <p>Source module access is required.</p> : linkedMocs.length ? <ul>{linkedMocs.map(moc => <li key={moc.id}><Link prefetch={false} href={"/portal/health-safety/moc/" + moc.id}>{moc.moc_reference}</Link><small>{moc.title} · {title(moc.status)}</small></li>)}</ul> : <p>No linked MOC records.</p>}</section>
          <section><h4>Documents</h4>{!canDocuments ? <p>Document module access is required.</p> : linkedDocuments.length ? <ul>{linkedDocuments.map(document => <li key={document.id}><Link prefetch={false} href="/portal/documents">{document.document_number} — {document.title}</Link><small>{document.document_type} · Revision {document.revision || "Not recorded"}</small></li>)}</ul> : <p>No current controlled work instruction or manual linked.</p>}</section>
        </div>

        {asset.calibration_required && <section className="arLinkedCalibration"><h4>Calibration controls and evidence</h4><dl>
          <div><dt>Last calibration</dt><dd>{date(asset.last_calibration_date)}</dd></div>
          <div><dt>Next calibration</dt><dd>{date(asset.next_calibration_date)}</dd></div>
          <div><dt>Recorded result</dt><dd>{title(asset.calibration_result || "not_assessed")}</dd></div>
          <div><dt>Provider</dt><dd>{asset.calibration_provider || "Not recorded"}</dd></div>
          <div><dt>Certificate reference</dt><dd>{asset.calibration_certificate_reference || "Not recorded"}</dd></div>
          <div><dt>Interval basis</dt><dd>{asset.calibration_interval_basis || "Review required"}</dd></div>
        </dl><p>Review the certificate scope and acceptance criteria in the full asset record. A due date or certificate alone does not authorise use.</p></section>}

        <details className="arMaintenanceHistory" id={"asset-maintenance-" + asset.id} open={mode === "maintenance" || records.some(record => record.id === query?.record)}>
          <summary>Maintenance history and evidence <span>{records.length} {records.length === 1 ? "record" : "records"}</span></summary>
          <div className="arMaintenanceBody">
            <dl className="arDeliveryFacts"><div><dt>Delivery</dt><dd>{asset.maintenance_owner_type === "supplier" ? "Approved supplier" : "Internal Facilities / Operations"}</dd></div><div><dt>Internal owner</dt><dd>{personName(maintenanceOwner)}</dd></div>{maintenanceSupplier && <div><dt>Supplier</dt><dd>{maintenanceSupplier.legal_name}</dd></div>}<div><dt>Requirements</dt><dd>{asset.maintenance_notes || "No additional requirements recorded"}</dd></div></dl>
            {records[0] && <p className="arLatestRecord">Latest scheduled record: {records[0].maintenance_reference}</p>}
            {records.length ? <div className="arRecordList">{records.map(record => <article id={"maintenance-" + record.id} key={record.id} className="arWorkRecord">
              <div><strong>{record.maintenance_reference}</strong><span>{title(record.maintenance_type)} · {title(record.status)}</span></div>
              <p>Scheduled: {date(record.scheduled_date)}{record.completed_date ? " · Completed: " + date(record.completed_date) : ""} · Responsible person: {personName(peopleById.get(record.responsible_person_id))}</p>
              <p>{record.work_completed || "No scope or completion notes recorded."}</p>
              {record.maintenance_type === "calibration" && <p>Calibration result: {title(record.calibration_result || "not_assessed")} · Next calibration due: {date(record.next_due_date)}</p>}
              <div className="arRecordLinks">{record.evidence_reference && <span>Reference: {record.evidence_reference}</span>}{record.evidence_url && <a href={record.evidence_url}>Download {record.evidence_file_name || "maintenance evidence"}</a>}<Link prefetch={false} href={"/portal/asset-management/maintenance?q=" + encodeURIComponent(asset.asset_reference) + "&record=" + encodeURIComponent(record.id) + "#maintenance-" + encodeURIComponent(record.id)}>Open maintenance record →</Link></div>
            </article>)}</div> : <p>No PPM activity has been planned or completed for this asset.</p>}
          </div>
        </details>
      </div>
    </details>

    <div className="arPrimaryActions">
      <Link className="arOpenRecord" href={"/portal/asset-management/records/" + asset.id} prefetch={false}>Open asset record <span aria-hidden="true">→</span></Link>
      {(canWrite || canCreateMoc) && <details className="arMoreActions" name="asset-register-actions">
        <summary aria-label={"More actions for " + asset.asset_reference}>More actions <span aria-hidden="true">⋯</span></summary>
        <div className="arMorePanel" aria-label={"Asset actions for " + asset.asset_reference}>
          {canWrite && <><Link prefetch={false} href={"/portal/asset-management/register?edit=" + asset.id}>Edit asset details</Link><a href={"/portal/asset-management/records/" + asset.id + "/label"}>Download QR label</a></>}
          {canCreateMoc && <Link prefetch={false} href={"/portal/health-safety/moc/new?asset=" + asset.id}>Start linked MOC</Link>}
          {canWrite && <details className="arStatusEditor"><summary>Change operational status</summary><form action={changeCompanyAssetStatus}><input type="hidden" name="id" value={asset.id} /><label htmlFor={"asset-status-" + asset.id}>New recorded status</label><select id={"asset-status-" + asset.id} name="status" defaultValue={asset.operational_status}><option value="active">Active</option><option value="out_of_service">Out of service</option><option value="retired">Retired</option></select><button type="submit">Update status</button></form></details>}
        </div>
      </details>}
    </div>
  </div>
              </article>;
            }) : <div className="arEmpty">
                  No matching company assets. Clear the filters or create a new controlled
                  asset.
                </div>}
            </div>
          </section>}
        </div>
      </div>
    </main>;
}
const styles = "\n*{\n  box-sizing:border-box\n}\n\n.arPage{\n  min-height:100vh;\n  min-width:0;\n  padding:28px clamp(20px,3vw,48px) 80px;\n  background:#edf3f9;\n  color:#071d3a;\n  font-family:Arial,sans-serif\n}\n\n.arShell{\n  width:100%;\n  max-width:none;\n  margin:0\n}\n\n.arTop{\n  display:flex;\n  justify-content:space-between;\n  gap:18px;\n  align-items:flex-start;\n  flex-wrap:wrap;\n  margin-bottom:18px\n}\n\n.arTop small{\n  color:#087f6c;\n  font-weight:900;\n  letter-spacing:.09em\n}\n\n.arTop h1{\n  margin:6px 0;\n  font-size:34px\n}\n\n.arTop p{\n  margin:0;\n  color:#627991\n}\n\n.arTop nav{\n  display:flex;\n  gap:8px;\n  flex-wrap:wrap\n}\n\n.arLink{\n  padding:11px 14px;\n  border:1px solid #cad8e2;\n  border-radius:9px;\n  background:#fff;\n  color:#173b59;\n  text-decoration:none;\n  font-weight:850\n}\n\n.arSummary{\n  display:grid;\n  grid-template-columns:repeat(4,minmax(0,1fr));\n  gap:12px;\n  margin:0 0 18px\n}\n\n.arMetric{\n  padding:18px;\n  border:1px solid #d4e1e9;\n  border-top:4px solid #1762a3;\n  border-radius:12px;\n  background:#fff\n}\n\n.arMetric.amber{\n  border-top-color:#d1840d\n}\n\n.arMetric.red{\n  border-top-color:#bf4034\n}\n\n.arMetric span{\n  display:block;\n  font-size:11px;\n  color:#6c8296;\n  font-weight:900\n}\n\n.arMetric strong{\n  display:block;\n  margin-top:5px;\n  font-size:25px\n}\n\n.arLayout{\n  display:grid;\n  grid-template-columns:minmax(430px,1fr) minmax(0,1.55fr);\n  gap:18px;\n  align-items:start\n}\n\n.arForms{\n  display:grid;\n  gap:16px\n}\n\n.arPanel{\n  background:#fff;\n  border:1px solid #d4e1e9;\n  border-radius:16px;\n  padding:22px\n}\n\n.arPanel h2{\n  margin:0\n}\n\n.arPanel>p{\n  margin:6px 0 17px;\n  color:#627991\n}\n\n.arList{\n  display:grid;\n  gap:12px\n}\n\n.arAsset{\n  padding:16px;\n  border:1px solid #d8e3ea;\n  border-left:5px solid #087f6c;\n  border-radius:11px;\n  background:#fbfdff\n}\n\n.arAsset.overdue{\n  border-left-color:#bd4035;\n  background:#fffafa\n}\n\n.arAssetTop{\n  display:flex;\n  justify-content:space-between;\n  gap:12px\n}\n\n.arAsset h3{\n  margin:0;\n  font-size:16px\n}\n\n.arAsset p{\n  margin:5px 0;\n  color:#647b90;\n  font-size:13px\n}\n\n.arTag{\n  align-self:flex-start;\n  padding:5px 8px;\n  border-radius:999px;\n  background:#e7f6f1;\n  color:#08705f;\n  font-size:10px;\n  font-weight:900;\n  white-space:nowrap\n}\n\n.arTag.out_of_service{\n  background:#fff2d9;\n  color:#925b0c\n}\n\n.arTag.retired{\n  background:#eef1f4;\n  color:#66798a\n}\n\n.arFacts{\n  display:grid;\n  grid-template-columns:repeat(4,minmax(0,1fr));\n  gap:8px;\n  margin:12px 0\n}\n\n.arFacts div{\n  padding:10px;\n  border-radius:8px;\n  background:#eef4f8\n}\n\n.arFacts span,\n.arFacts strong{\n  display:block\n}\n\n.arFacts span{\n  color:#6a8195;\n  font-size:9px;\n  font-weight:900\n}\n\n.arFacts strong{\n  margin-top:4px;\n  font-size:12px;\n  overflow-wrap:anywhere\n}\n\n.danger{\n  color:#b52f27\n}\n\n.arHistory{\n  display:flex;\n  gap:7px;\n  flex-wrap:wrap;\n  margin-top:10px\n}\n\n.arHistory span{\n  padding:5px 8px;\n  border-radius:999px;\n  background:#e9f1f7;\n  color:#42627e;\n  font-size:10px;\n  font-weight:850\n}\n\n.arPpmDetails,\n.arDocDetails{\n  position:relative;\n  flex:0 1 auto\n}\n\n.arPpmDetails summary,\n.arDocDetails summary{\n  list-style:none;\n  padding:5px 8px;\n  border-radius:999px;\n  background:#e9f1f7;\n  color:#42627e;\n  font-size:10px;\n  font-weight:850;\n  cursor:pointer\n}\n\n.arPpmDetails summary::-webkit-details-marker,\n.arDocDetails summary::-webkit-details-marker{\n  display:none\n}\n\n.arPpmDetails[open],\n.arDocDetails[open]{\n  flex-basis:100%\n}\n\n.arPpmDetails[open] summary,\n.arDocDetails[open] summary{\n  display:inline-block;\n  background:#dceaf4;\n  color:#173b59\n}\n\n.arPpmBody,\n.arDocDetails>div{\n  display:grid;\n  grid-template-columns:repeat(2,minmax(0,1fr));\n  gap:9px;\n  margin-top:9px;\n  padding:12px;\n  border:1px solid #cedde7;\n  border-radius:10px;\n  background:#fff\n}\n\n.arPpmMeta{\n  display:grid;\n  gap:3px\n}\n\n.arPpmMeta span{\n  padding:0;\n  background:transparent;\n  font-size:9px;\n  color:#6a8195\n}\n\n.arPpmMeta strong{\n  font-size:12px;\n  overflow-wrap:anywhere\n}\n\n.arRecordList{\n  display:grid;\n  grid-column:1/-1;\n  gap:8px\n}\n\n.arRecordList article{\n  padding:10px;\n  border-left:3px solid #087f6c;\n  border-radius:7px;\n  background:#f3f7fa\n}\n\n.arRecordList article>div:first-child{\n  display:flex;\n  justify-content:space-between;\n  gap:10px\n}\n\n.arRecordList article span,\n.arRecordLinks span{\n  padding:0;\n  background:transparent\n}\n\n.arRecordLinks{\n  display:flex;\n  gap:8px;\n  flex-wrap:wrap\n}\n\n.arRecordLinks a,\n.arDocDetails a{\n  color:#1762a3;\n  font-size:11px;\n  font-weight:850\n}\n\n.arDocDetails>div{\n  grid-template-columns:1fr\n}\n\n.arControls{\n  display:flex;\n  gap:7px;\n  flex-wrap:wrap;\n  align-items:center;\n  margin-top:12px\n}\n\n.arControls>a,\n.arControls select,\n.arControls button{\n  min-height:36px;\n  padding:8px 10px;\n  border:1px solid #c6d5df;\n  border-radius:8px;\n  background:#fff;\n  color:#173b59;\n  text-decoration:none;\n  font-weight:850;\n  font-size:12px\n}\n\n.arControls>a:nth-child(2){\n  background:#087f6c;\n  color:#fff;\n  border-color:#087f6c\n}\n\n.arControls form{\n  display:flex;\n  gap:6px;\n  margin-left:auto\n}\n\n.arControls button{\n  background:#173b59;\n  color:#fff;\n  border-color:#173b59;\n  cursor:pointer\n}\n\n.arEmpty{\n  padding:25px;\n  border:1px dashed #b9ccd9;\n  border-radius:11px;\n  text-align:center;\n  color:#647b90\n}\n\n@media(max-width:1150px){\n  .arLayout{\n    grid-template-columns:1fr\n  }\n\n  .arSummary{\n    grid-template-columns:repeat(2,1fr)\n  }\n}\n\n@media(max-width:700px){\n  .arPage{\n    padding:20px 14px 60px\n  }\n\n  .arTop h1{\n    font-size:28px\n  }\n\n  .arTop nav,\n  .arTop nav a{\n    width:100%;\n    text-align:center\n  }\n\n  .arSummary,\n  .arFacts{\n    grid-template-columns:1fr 1fr\n  }\n\n  .arAssetTop{\n    display:block\n  }\n\n  .arTag{\n    display:inline-block;\n    margin-top:7px\n  }\n\n  .arControls,\n  .arControls form{\n    display:grid;\n    width:100%;\n    margin-left:0\n  }\n\n  .arControls>a{\n    text-align:center\n  }\n\n  .arPpmBody{\n    grid-template-columns:1fr\n  }\n\n  .arRecordList{\n    grid-column:auto\n  }\n}\n\n@media(max-width:430px){\n  .arSummary,\n  .arFacts{\n    grid-template-columns:1fr\n  }\n}\n\n/* Asset register cards: essential facts first, records and actions on demand. */\n.arList{gap:18px}\n.arRegisterCard{padding:22px 24px;background:#fff;border-radius:14px;border-left-width:4px;box-shadow:0 4px 14px #102d4e05;min-width:0}\n.arRegisterCard.overdue{background:#fff}\n.arCardHeading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}\n.arCardIdentity{min-width:0;flex:1}\n.arCardReference{display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12px;line-height:1.5}\n.arCardReference strong{color:#143754;letter-spacing:.035em}\n.arCardReference span{color:#60758a;border-left:1px solid #cad7e2;padding-left:14px}\n.arRegisterCard h3{font-size:25px;line-height:1.25;margin:8px 0;color:#0b2846}\n.arRegisterCard .arCardLocation{margin:5px 0 0;color:#38536e;font-size:13px;line-height:1.5;overflow-wrap:anywhere}\n.arRegisterCard .arCardArea{margin:3px 0 0;color:#647a8d;font-size:12px}\n.arOperationalStatus{display:inline-block;flex:0 0 auto;font-size:11px;font-weight:750;line-height:1.4;border:1px solid #81beb2;color:#166354;background:#f6fcfa;border-radius:7px;padding:7px 10px;max-width:100%}\n.arOperationalStatus.out_of_service{color:#865508;border-color:#dfc28e;background:#fffaf0}\n.arOperationalStatus.retired{color:#5b6e7d;border-color:#c7d1d9;background:#f5f7f9}\n.arCardFacts{display:grid;grid-template-columns:1.3fr .85fr 1fr 1fr;gap:0;margin:22px 0 17px}\n.arCardFacts>div{padding:0 18px;border-left:1px solid #dae3eb;min-width:0}\n.arCardFacts>div:first-child{padding-left:0;border-left:0}\n.arCardFacts dt{font-size:11px;color:#657b8e;line-height:1.4}\n.arCardFacts dd{font-size:14px;line-height:1.5;color:#102d4e;font-weight:750;margin:5px 0 0;overflow-wrap:anywhere}\n.arCardFacts dd.danger{color:#b52f27}\n.arRegisterCard .arCardDescription{margin:0 0 14px;padding:9px 12px;background:#f4f7fa;border-radius:7px;font-size:12px;line-height:1.5;color:#536b7e;overflow-wrap:anywhere}\n.arRegisterCard .arWorkNotice,.arRegisterCard .arCalibrationNotice{display:flex;gap:5px 12px;align-items:baseline;flex-wrap:wrap;margin:10px 0 14px;padding:10px 12px;border-radius:7px;font-size:12px;line-height:1.5;border-left:3px solid #729cb4;background:#f4f8fc;color:#355773}\n.arRegisterCard .arWorkNotice.attention{border-left-color:#c94d42;background:#fff6f3;color:#993b2f}\n.arCalibrationNotice small{flex-basis:100%;font-size:11px;color:#63798c}\n.arCardFooter{position:relative;border-top:1px solid #e0e7ee;padding-top:14px;margin-top:16px;min-height:62px}\n.arLinkedRecords>summary{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;list-style:none;min-height:44px;padding:8px 340px 8px 0;cursor:pointer;font-size:12px;line-height:1.5;color:#173b59}\n.arLinkedRecords>summary::-webkit-details-marker,.arMoreActions>summary::-webkit-details-marker,.arStatusEditor>summary::-webkit-details-marker{display:none}\n.arLinkedRecords>summary>strong{font-size:13px;white-space:nowrap}\n.arLinkedCounts{font-size:11px;color:#6a7f91}\n.arDisclosureArrow{display:inline-block;margin-left:4px;transition:transform .15s}\n.arLinkedRecords[open]>summary .arDisclosureArrow{transform:rotate(180deg)}\n.arLinkedBody{padding:20px 0 0}\n.arLinkedOverview{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0}\n.arLinkedOverview>section{padding:0 20px;border-left:1px solid #e0e7ee;min-width:0}\n.arLinkedOverview>section:first-child{padding-left:0;border-left:0}\n.arLinkedBody h4{margin:0 0 8px;font-size:14px;line-height:1.4;color:#153652}\n.arLinkedBody p{font-size:12px;line-height:1.6;margin:4px 0 8px}\n.arLinkedBody a{color:#1556b4;font-size:12px;font-weight:700;text-underline-offset:3px;overflow-wrap:anywhere}\n.arLinkedBody ul{margin:0;padding:0;list-style:none}\n.arLinkedBody li+li{margin-top:11px}\n.arLinkedBody li small{display:block;font-size:11px;color:#667d91;margin-top:4px;line-height:1.5;overflow-wrap:anywhere}\n.arLinkedCalibration{padding:18px 0 0;margin-top:18px;border-top:1px solid #e0e7ee}\n.arLinkedCalibration dl,.arDeliveryFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px 20px;margin:0 0 12px}\n.arLinkedCalibration dt,.arDeliveryFacts dt{font-size:10px;color:#657c90;font-weight:700}\n.arLinkedCalibration dd,.arDeliveryFacts dd{margin:4px 0 0;font-size:12px;line-height:1.5;overflow-wrap:anywhere;color:#25465e}\n.arMaintenanceHistory{margin-top:20px;border-top:1px solid #e0e7ee;padding-top:14px;scroll-margin-top:110px}\n.arMaintenanceHistory>summary{font-size:13px;font-weight:750;color:#173b59;cursor:pointer;padding:7px 0}\n.arMaintenanceHistory>summary>span{font-size:11px;color:#738698;font-weight:400;margin-left:8px}\n.arMaintenanceBody{padding:14px 0 0}\n.arLatestRecord{font-size:11px!important;color:#6d8193!important}\n.arWorkRecord{scroll-margin-top:110px}\n.arWorkRecord>div:first-child>span{font-size:11px;color:#657c90}\n.arWorkRecord>div:first-child{flex-wrap:wrap}\n.arWorkRecord .arRecordLinks{align-items:baseline;margin-top:8px}\n.arWorkRecord .arRecordLinks>span{font-size:11px}\n.arPrimaryActions{position:absolute;top:14px;right:0;display:flex;align-items:flex-start;gap:9px}\n.arOpenRecord,.arMoreActions>summary{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:10px 13px;border-radius:8px;font-size:12px;font-weight:750;line-height:1.5;text-decoration:none;white-space:nowrap}\n.arOpenRecord{background:#1762ef;border:1px solid #1762ef;color:#fff!important}\n.arOpenRecord:hover{background:#1052cf}\n.arMoreActions{position:relative}\n.arMoreActions>summary{border:1px solid #bacbda;background:#fff;color:#173b59;cursor:pointer;list-style:none}\n.arMoreActions[open]>summary{background:#f2f7fc;border-color:#7298b8}\n.arMorePanel{position:absolute;top:calc(100% + 8px);right:0;width:270px;max-width:calc(100vw - 48px);border:1px solid #c9d7e2;border-radius:10px;padding:6px;background:#fff;box-shadow:0 9px 28px #102d4e24;z-index:30}\n.arMoreActions[open]{z-index:30}\n.arMorePanel>a,.arStatusEditor>summary{display:block;color:#173b59;text-decoration:none;font-size:12px;font-weight:650;line-height:1.5;border-radius:6px;min-height:40px;padding:10px 12px;cursor:pointer;list-style:none}\n.arMorePanel>a:hover,.arStatusEditor>summary:hover{background:#edf5fc}\n.arStatusEditor{border-top:1px solid #e1e8ee;margin-top:4px;padding-top:4px}\n.arStatusEditor form{display:grid;gap:8px;padding:8px 12px 12px}\n.arStatusEditor label{font-size:11px;color:#5c7388}\n.arStatusEditor select{width:100%;min-height:38px;padding:8px;border:1px solid #c0d0de;border-radius:6px;background:#fff;color:#153652;font:inherit;font-size:12px}\n.arStatusEditor button{min-height:38px;padding:8px 12px;border:0;border-radius:6px;background:#173b59;color:#fff;font-size:12px;font-weight:700;cursor:pointer}\n.arRegisterCard a:focus-visible,.arRegisterCard summary:focus-visible,.arRegisterCard button:focus-visible,.arRegisterCard select:focus-visible{outline:3px solid #e3ab32;outline-offset:3px}\n@media(max-width:1100px){.arPrimaryActions{position:relative;top:auto;right:auto;justify-content:flex-end;margin-top:10px}.arLinkedRecords>summary{padding-right:0}.arCardFacts{grid-template-columns:1.2fr .8fr 1fr 1fr}.arLinkedOverview>section{padding:0 14px}}\n@media(max-width:700px){.arRegisterCard{padding:18px}.arCardHeading{flex-direction:column;gap:12px}.arRegisterCard h3{font-size:22px}.arCardFacts{grid-template-columns:1fr 1fr;gap:18px 0;margin:20px 0}.arCardFacts>div:nth-child(odd){padding-left:0;border-left:0}.arLinkedOverview{grid-template-columns:1fr;gap:18px}.arLinkedOverview>section{padding:0;border-left:0}.arLinkedOverview>section+section{border-top:1px solid #e4ebf1;padding-top:16px}.arLinkedCalibration dl,.arDeliveryFacts{grid-template-columns:1fr 1fr}.arPrimaryActions{justify-content:stretch;flex-wrap:wrap}.arOpenRecord{flex:1}.arMoreActions>summary{width:100%}.arLinkedRecords>summary{gap:5px}.arLinkedCounts{flex-basis:100%}.arRegisterCard .arWorkNotice,.arRegisterCard .arCalibrationNotice{display:block}.arWorkNotice>span,.arCalibrationNotice>span,.arCalibrationNotice>small{display:block;margin-top:4px}}\n@media(max-width:430px){.arLinkedCalibration dl,.arDeliveryFacts{grid-template-columns:1fr}.arMorePanel{width:250px}.arPrimaryActions{gap:8px}.arOpenRecord,.arMoreActions>summary{padding:9px 10px;font-size:11px}}\n\n\n/* Search and status controls share the register's spacing and type scale. */\n.arFilters{display:grid;grid-template-columns:minmax(240px,1fr) minmax(160px,220px) auto;gap:14px;align-items:end;padding:16px;margin:0 0 24px;border:1px solid #d8e4ed;border-radius:11px;background:#f6f9fc;min-width:0}\n.arFilterField{display:grid;gap:7px;min-width:0}\n.arFilterField label{display:block;font-size:12px;line-height:1.4;font-weight:750;color:#254760}\n.arFilterField input,.arFilterField select{display:block;width:100%;min-width:0;height:44px;padding:10px 12px;border:1px solid #bfcfdd;border-radius:8px;background:#fff;color:#153652;font-family:inherit;font-size:14px;line-height:1.4;box-sizing:border-box}\n.arFilterField input::placeholder{color:#788c9f;opacity:1}\n.arFilterActions{display:flex;gap:9px;align-items:center;min-width:0}\n.arFilterActions button,.arFilterActions a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 15px;border:1px solid #1762ef;border-radius:8px;font-family:inherit;font-size:12px;line-height:1.4;font-weight:750;text-decoration:none;white-space:nowrap;box-sizing:border-box;cursor:pointer}\n.arFilterActions button{background:#1762ef;color:#fff}\n.arFilterActions button:hover{background:#1052cf}\n.arFilterActions a{background:#fff;border-color:#bdcddd;color:#244c70}\n.arFilterActions a:hover{background:#edf4fa}\n.arFilters input:focus-visible,.arFilters select:focus-visible,.arFilterActions button:focus-visible,.arFilterActions a:focus-visible{outline:3px solid #e3ab32;outline-offset:2px}\n@media(max-width:1050px){.arFilters{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}.arFilterActions{grid-column:1/-1;justify-content:flex-end}}\n@media(max-width:600px){.arFilters{grid-template-columns:minmax(0,1fr);gap:13px;padding:14px}.arFilterActions{grid-column:auto;justify-content:stretch}.arFilterActions button,.arFilterActions a{flex:1;padding:10px 12px}.arFilterField input,.arFilterField select{font-size:16px}}\n";
