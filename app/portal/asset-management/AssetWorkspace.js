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
  }), admin.from("suppliers").select("id,legal_name,approval_status").eq("organization_id", organization.id).in("approval_status", ["approved", "conditionally_approved"]).order("legal_name"), canDocuments ? loadRegisterDocuments(admin).then(data => ({
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
            <form method="get" style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18
          }}><input type="hidden" name="site" value={filters.site} /><input type="hidden" name="type" value={filters.type} /><input type="hidden" name="owner" value={filters.owner} /><input type="hidden" name="days" value={filters.days} /><input type="hidden" name="focus" value={String(query?.focus || "")} /><label>Search assets<input name="q" defaultValue={query?.q || ""} placeholder="Reference, name, serial or site" /></label><label>Status<select name="status" defaultValue={query?.status || ""}><option value="">All statuses</option><option value="active">Active</option><option value="out_of_service">Out of service</option><option value="retired">Retired</option></select></label><button type="submit">Apply filters</button><Link href={mode === "maintenance" ? "/portal/asset-management/maintenance" : "/portal/asset-management/register"}>Clear</Link></form>
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
              return <article className={"arAsset ".concat(isOverdue ? "overdue" : "", "")} key={asset.id}>
                      <div className="arAssetTop">
                        <div>
                          <h3>
                            {asset.asset_reference}{" "}
                            —{" "}
                            {asset.asset_name}
                          </h3>

                          <p>
                            {assetCategories(asset).map(categoryLabel).join(" · ")}{" "}
                            ·{" "}
                            {asset.site_location_label || "No site"}

                            {asset.area_department ? " \xB7 ".concat(asset.area_department, "") : ""}
                          </p>
                        </div>

                        <span className={"arTag ".concat(asset.operational_status, "")}>
                          {title(asset.operational_status)}
                        </span>
                      </div>

                      {asset.calibration_required && <div style={{
                  padding: "12px 14px",
                  margin: "12px 0",
                  border: "1px solid #b9dcd7",
                  background: "#effaf7",
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.7
                }}><strong>Calibration required</strong> · Last: {date(asset.last_calibration_date)} · Next: {date(asset.next_calibration_date)} · Result: {title(asset.calibration_result || "not_assessed")}<br />Provider: {asset.calibration_provider || "Not recorded"} · Certificate: {asset.calibration_certificate_reference || "Not recorded"}<br />Interval basis: {asset.calibration_interval_basis || "Review required"}</div>}
                      <div className="arFacts">
                        <div>
                          <span>
                            OWNER
                          </span>

                          <strong>
                            {personName(owner)}
                          </strong>
                        </div>

                        <div>
                          <span>
                            CRITICALITY
                          </span>

                          <strong>
                            {title(asset.criticality)}
                          </strong>
                        </div>

                        <div>
                          <span>
                            PPM
                          </span>

                          <strong>
                            {asset.ppm_required ? "Every ".concat(asset.ppm_frequency_value, " ").concat(asset.ppm_frequency_unit, "") : "Not required"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            NEXT MAINTENANCE
                          </span>

                          <strong className={nextMaintenance && nextMaintenance < today ? "danger" : ""}>
                            {date(nextMaintenance)}
                          </strong>
                        </div>
                      </div>

                      {asset.description && <p>
                          {asset.description}
                        </p>}

                      {openPlanned.length > 0 && <section aria-label={"Planned maintenance for ".concat(asset.asset_reference, "")} style={{
                  margin: "14px 0",
                  padding: 14,
                  border: "1px solid #bcd8ec",
                  borderLeft: "4px solid #1762ef",
                  borderRadius: 8,
                  background: "#f0f7ff"
                }}>
                        <strong style={{
                    display: "block",
                    fontSize: 13,
                    marginBottom: 10
                  }}>Planned maintenance · {openPlanned.length} open {openPlanned.length === 1 ? "record" : "records"}</strong>
                        {openPlanned.slice(0, 3).map(record => <div key={record.id} style={{
                    padding: "9px 0",
                    borderTop: "1px solid #d8e6f2"
                  }}><div style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      fontSize: 12
                    }}><strong>{record.maintenance_reference}</strong><strong style={{
                        color: record.scheduled_date < today ? "#ba2937" : "#1658b1"
                      }}>{date(record.scheduled_date)} · {record.scheduled_date < today ? "Overdue" : "Planned"}</strong></div><p style={{
                      margin: "5px 0",
                      fontSize: 12
                    }}>{title(record.maintenance_type)} · {personName(peopleById.get(record.responsible_person_id))}</p>{record.work_completed && <p style={{
                      fontSize: 12,
                      margin: "5px 0"
                    }}>{record.work_completed}</p>}<Link href={"/portal/asset-management/maintenance?q=".concat(encodeURIComponent(asset.asset_reference), "&record=").concat(encodeURIComponent(record.id), "#maintenance-").concat(encodeURIComponent(record.id), "")} style={{
                      fontSize: 11,
                      fontWeight: 700
                    }}>Open maintenance record →</Link></div>)}
                        {openPlanned.length > 3 && <p style={{
                    fontSize: 11,
                    margin: "7px 0 0"
                  }}>Showing the next 3 planned records. All {openPlanned.length} are included in maintenance history below.</p>}
                      </section>}

                      <div className="arHistory">
                        <details className="arPpmDetails" open={mode === "maintenance" || records.some(record => record.id === query?.record)}>
                          <summary>
                            {records.length}{" "}
                            maintenance record
                            {records.length === 1 ? "" : "s"}{" "}
                            - view PPM details
                          </summary>

                          <div className="arPpmBody">
                            <div className="arPpmMeta">
                              <span>
                                DELIVERY
                              </span>

                              <strong>
                                {asset.maintenance_owner_type === "supplier" ? "Approved supplier" : "Internal Facilities / Operations"}
                              </strong>
                            </div>

                            <div className="arPpmMeta">
                              <span>
                                INTERNAL
                                OWNER
                              </span>

                              <strong>
                                {personName(maintenanceOwner)}
                              </strong>
                            </div>

                            {maintenanceSupplier && <div className="arPpmMeta">
                                <span>
                                  SUPPLIER
                                </span>

                                <strong>
                                  {maintenanceSupplier.legal_name}
                                </strong>
                              </div>}

                            <div className="arPpmMeta">
                              <span>
                                REQUIREMENTS
                              </span>

                              <strong>
                                {asset.maintenance_notes || "No additional requirements recorded"}
                              </strong>
                            </div>

                            {records.length ? <div className="arRecordList">
                                {records.map(record => <article id={"maintenance-".concat(record.id, "")} style={{
                          scrollMarginTop: 110
                        }} key={record.id}>
                                      <div>
                                        <strong>
                                          {record.maintenance_reference}
                                        </strong>

                                        <span>
                                          {title(record.maintenance_type)}{" "}
                                          -{" "}
                                          {date(record.scheduled_date)}{" "}
                                          -{" "}
                                          {title(record.status)}
                                        </span>
                                      </div>

                                      <p>
                                        {record.work_completed || "No scope or completion notes recorded."}
                                      </p>

                                      <div className="arRecordLinks">
                                        {record.maintenance_type === "calibration" && <p>Calibration result: {title(record.calibration_result || "not_assessed")} · Next calibration due: {date(record.next_due_date)}</p>}
                                        {record.evidence_reference && <span>
                                            Reference:{" "}
                                            {record.evidence_reference}
                                          </span>}

                                        {record.evidence_url && <a href={record.evidence_url} target="_blank" rel="noreferrer">
                                            Download{" "}
                                            {record.evidence_file_name || "maintenance evidence"}
                                          </a>}
                                      </div>
                                    </article>)}
                              </div> : <p>
                                No PPM activity
                                has been planned
                                or completed for
                                this asset.
                              </p>}
                          </div>
                        </details>

                        <span>
                          {canMoc ? linkedMocs.length : "Unavailable:"}{" "}
                          linked MOC
                          {linkedMocs.length === 1 ? "" : "s"}
                        </span>

                        {records[0] && <span>
                            Latest:{" "}
                            {records[0].maintenance_reference}
                          </span>}

                        <details className="arDocDetails">
                          <summary>
                            {canDocuments ? linkedDocuments.length : "Permission required:"}{" "}
                            linked document
                            {linkedDocuments.length === 1 ? "" : "s"}
                          </summary>

                          <div>
                            {linkedDocuments.length ? linkedDocuments.map(document => <Link href="/portal/documents" key={document.id}>
                                    {document.document_number}{" "}
                                    -{" "}
                                    {document.title}
                                  </Link>) : <p>{canDocuments ? "No current controlled work instruction or manual linked." : "Document module access is required to view linked information."}</p>}
                          </div>
                        </details>
                      </div>

                      <div className="arControls">
                        <Link href={"/portal/asset-management/records/".concat(asset.id, "")} prefetch={false}>View full asset card</Link>
                        {canWrite && <a href={"/portal/asset-management/records/".concat(asset.id, "/label")}>Download QR label</a>}
                        {canWrite && <>
                        <Link href={"/portal/asset-management/register?edit=".concat(asset.id, "")}>
                          Edit details
                        </Link>

                        </>}
                        {canCreateMoc && <Link href={"/portal/health-safety/moc/new?asset=".concat(asset.id, "")}>
                          Start linked MOC
                        </Link>}

                        {linkedMocs[0] && <Link href={"/portal/health-safety/moc/".concat(linkedMocs[0].id, "")}>
                            Open{" "}
                            {linkedMocs[0].moc_reference}
                          </Link>}

                        {canWrite && <form action={changeCompanyAssetStatus}>
                          <input type="hidden" name="id" value={asset.id} />

                          <select name="status" defaultValue={asset.operational_status} aria-label={"Status for ".concat(asset.asset_reference, "")}>
                            <option value="active">
                              Active
                            </option>

                            <option value="out_of_service">
                              Out of service
                            </option>

                            <option value="retired">
                              Retired
                            </option>
                          </select>

                          <button>
                            Update status
                          </button>
                        </form>}
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
const styles = "\n*{\n  box-sizing:border-box\n}\n\n.arPage{\n  min-height:100vh;\n  min-width:0;\n  padding:28px clamp(20px,3vw,48px) 80px;\n  background:#edf3f9;\n  color:#071d3a;\n  font-family:Arial,sans-serif\n}\n\n.arShell{\n  width:100%;\n  max-width:none;\n  margin:0\n}\n\n.arTop{\n  display:flex;\n  justify-content:space-between;\n  gap:18px;\n  align-items:flex-start;\n  flex-wrap:wrap;\n  margin-bottom:18px\n}\n\n.arTop small{\n  color:#087f6c;\n  font-weight:900;\n  letter-spacing:.09em\n}\n\n.arTop h1{\n  margin:6px 0;\n  font-size:34px\n}\n\n.arTop p{\n  margin:0;\n  color:#627991\n}\n\n.arTop nav{\n  display:flex;\n  gap:8px;\n  flex-wrap:wrap\n}\n\n.arLink{\n  padding:11px 14px;\n  border:1px solid #cad8e2;\n  border-radius:9px;\n  background:#fff;\n  color:#173b59;\n  text-decoration:none;\n  font-weight:850\n}\n\n.arSummary{\n  display:grid;\n  grid-template-columns:repeat(4,minmax(0,1fr));\n  gap:12px;\n  margin:0 0 18px\n}\n\n.arMetric{\n  padding:18px;\n  border:1px solid #d4e1e9;\n  border-top:4px solid #1762a3;\n  border-radius:12px;\n  background:#fff\n}\n\n.arMetric.amber{\n  border-top-color:#d1840d\n}\n\n.arMetric.red{\n  border-top-color:#bf4034\n}\n\n.arMetric span{\n  display:block;\n  font-size:11px;\n  color:#6c8296;\n  font-weight:900\n}\n\n.arMetric strong{\n  display:block;\n  margin-top:5px;\n  font-size:25px\n}\n\n.arLayout{\n  display:grid;\n  grid-template-columns:minmax(430px,1fr) minmax(0,1.55fr);\n  gap:18px;\n  align-items:start\n}\n\n.arForms{\n  display:grid;\n  gap:16px\n}\n\n.arPanel{\n  background:#fff;\n  border:1px solid #d4e1e9;\n  border-radius:16px;\n  padding:22px\n}\n\n.arPanel h2{\n  margin:0\n}\n\n.arPanel>p{\n  margin:6px 0 17px;\n  color:#627991\n}\n\n.arList{\n  display:grid;\n  gap:12px\n}\n\n.arAsset{\n  padding:16px;\n  border:1px solid #d8e3ea;\n  border-left:5px solid #087f6c;\n  border-radius:11px;\n  background:#fbfdff\n}\n\n.arAsset.overdue{\n  border-left-color:#bd4035;\n  background:#fffafa\n}\n\n.arAssetTop{\n  display:flex;\n  justify-content:space-between;\n  gap:12px\n}\n\n.arAsset h3{\n  margin:0;\n  font-size:16px\n}\n\n.arAsset p{\n  margin:5px 0;\n  color:#647b90;\n  font-size:13px\n}\n\n.arTag{\n  align-self:flex-start;\n  padding:5px 8px;\n  border-radius:999px;\n  background:#e7f6f1;\n  color:#08705f;\n  font-size:10px;\n  font-weight:900;\n  white-space:nowrap\n}\n\n.arTag.out_of_service{\n  background:#fff2d9;\n  color:#925b0c\n}\n\n.arTag.retired{\n  background:#eef1f4;\n  color:#66798a\n}\n\n.arFacts{\n  display:grid;\n  grid-template-columns:repeat(4,minmax(0,1fr));\n  gap:8px;\n  margin:12px 0\n}\n\n.arFacts div{\n  padding:10px;\n  border-radius:8px;\n  background:#eef4f8\n}\n\n.arFacts span,\n.arFacts strong{\n  display:block\n}\n\n.arFacts span{\n  color:#6a8195;\n  font-size:9px;\n  font-weight:900\n}\n\n.arFacts strong{\n  margin-top:4px;\n  font-size:12px;\n  overflow-wrap:anywhere\n}\n\n.danger{\n  color:#b52f27\n}\n\n.arHistory{\n  display:flex;\n  gap:7px;\n  flex-wrap:wrap;\n  margin-top:10px\n}\n\n.arHistory span{\n  padding:5px 8px;\n  border-radius:999px;\n  background:#e9f1f7;\n  color:#42627e;\n  font-size:10px;\n  font-weight:850\n}\n\n.arPpmDetails,\n.arDocDetails{\n  position:relative;\n  flex:0 1 auto\n}\n\n.arPpmDetails summary,\n.arDocDetails summary{\n  list-style:none;\n  padding:5px 8px;\n  border-radius:999px;\n  background:#e9f1f7;\n  color:#42627e;\n  font-size:10px;\n  font-weight:850;\n  cursor:pointer\n}\n\n.arPpmDetails summary::-webkit-details-marker,\n.arDocDetails summary::-webkit-details-marker{\n  display:none\n}\n\n.arPpmDetails[open],\n.arDocDetails[open]{\n  flex-basis:100%\n}\n\n.arPpmDetails[open] summary,\n.arDocDetails[open] summary{\n  display:inline-block;\n  background:#dceaf4;\n  color:#173b59\n}\n\n.arPpmBody,\n.arDocDetails>div{\n  display:grid;\n  grid-template-columns:repeat(2,minmax(0,1fr));\n  gap:9px;\n  margin-top:9px;\n  padding:12px;\n  border:1px solid #cedde7;\n  border-radius:10px;\n  background:#fff\n}\n\n.arPpmMeta{\n  display:grid;\n  gap:3px\n}\n\n.arPpmMeta span{\n  padding:0;\n  background:transparent;\n  font-size:9px;\n  color:#6a8195\n}\n\n.arPpmMeta strong{\n  font-size:12px;\n  overflow-wrap:anywhere\n}\n\n.arRecordList{\n  display:grid;\n  grid-column:1/-1;\n  gap:8px\n}\n\n.arRecordList article{\n  padding:10px;\n  border-left:3px solid #087f6c;\n  border-radius:7px;\n  background:#f3f7fa\n}\n\n.arRecordList article>div:first-child{\n  display:flex;\n  justify-content:space-between;\n  gap:10px\n}\n\n.arRecordList article span,\n.arRecordLinks span{\n  padding:0;\n  background:transparent\n}\n\n.arRecordLinks{\n  display:flex;\n  gap:8px;\n  flex-wrap:wrap\n}\n\n.arRecordLinks a,\n.arDocDetails a{\n  color:#1762a3;\n  font-size:11px;\n  font-weight:850\n}\n\n.arDocDetails>div{\n  grid-template-columns:1fr\n}\n\n.arControls{\n  display:flex;\n  gap:7px;\n  flex-wrap:wrap;\n  align-items:center;\n  margin-top:12px\n}\n\n.arControls>a,\n.arControls select,\n.arControls button{\n  min-height:36px;\n  padding:8px 10px;\n  border:1px solid #c6d5df;\n  border-radius:8px;\n  background:#fff;\n  color:#173b59;\n  text-decoration:none;\n  font-weight:850;\n  font-size:12px\n}\n\n.arControls>a:nth-child(2){\n  background:#087f6c;\n  color:#fff;\n  border-color:#087f6c\n}\n\n.arControls form{\n  display:flex;\n  gap:6px;\n  margin-left:auto\n}\n\n.arControls button{\n  background:#173b59;\n  color:#fff;\n  border-color:#173b59;\n  cursor:pointer\n}\n\n.arEmpty{\n  padding:25px;\n  border:1px dashed #b9ccd9;\n  border-radius:11px;\n  text-align:center;\n  color:#647b90\n}\n\n@media(max-width:1150px){\n  .arLayout{\n    grid-template-columns:1fr\n  }\n\n  .arSummary{\n    grid-template-columns:repeat(2,1fr)\n  }\n}\n\n@media(max-width:700px){\n  .arPage{\n    padding:20px 14px 60px\n  }\n\n  .arTop h1{\n    font-size:28px\n  }\n\n  .arTop nav,\n  .arTop nav a{\n    width:100%;\n    text-align:center\n  }\n\n  .arSummary,\n  .arFacts{\n    grid-template-columns:1fr 1fr\n  }\n\n  .arAssetTop{\n    display:block\n  }\n\n  .arTag{\n    display:inline-block;\n    margin-top:7px\n  }\n\n  .arControls,\n  .arControls form{\n    display:grid;\n    width:100%;\n    margin-left:0\n  }\n\n  .arControls>a{\n    text-align:center\n  }\n\n  .arPpmBody{\n    grid-template-columns:1fr\n  }\n\n  .arRecordList{\n    grid-column:auto\n  }\n}\n\n@media(max-width:430px){\n  .arSummary,\n  .arFacts{\n    grid-template-columns:1fr\n  }\n}\n";
