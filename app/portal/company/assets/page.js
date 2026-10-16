import Link from "next/link";

import CompanyAssetRegister, {
  AssetMaintenanceForm,
} from "../../../../components/CompanyAssetRegister";

import {
  requireOrganizationAccess,
} from "../../../../lib/organization-access";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

import {
  loadAdministrationLocations,
} from "../../../../lib/rcaCompanyLinks";

import {
  changeCompanyAssetStatus,
} from "./actions";

export const metadata = {
  title:
    "Company Asset Register | RPG Excellence",
};

export const dynamic =
  "force-dynamic";

const title = value =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase(),
    );

const date = value =>
  value
    ? new Intl.DateTimeFormat(
        "en-GB",
        {
          dateStyle: "medium",
        },
      ).format(
        new Date(
          `${value}T12:00:00Z`,
        ),
      )
    : "—";

const personName = person =>
  person
    ? [
        person.first_name,
        person.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      person.email
    : "Unassigned";

export default async function CompanyAssetsPage({
  searchParams,
}) {
  const query =
    await searchParams;

  const {
    organization,
  } = await requireOrganizationAccess(
    "people_access",
    "admin",
    "/portal/company/assets",
  );

  const admin =
    createAdminClient();

  const locations =
    await loadAdministrationLocations(
      organization,
    );

  const [
    assetResult,
    peopleResult,
    maintenanceResult,
    mocResult,
    supplierResult,
    documentResult,
    documentLinkResult,
  ] = await Promise.all([
    admin
      .from(
        "organization_assets",
      )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .order(
        "operational_status",
      )
      .order(
        "asset_reference",
      ),

    admin
      .from(
        "organization_people",
      )
      .select(
        "id,first_name,last_name,email,position",
      )
      .eq(
        "organization_id",
        organization.id,
      )
      .eq(
        "account_status",
        "active",
      )
      .order("last_name"),

    admin
      .from(
        "organization_asset_maintenance",
      )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .order(
        "scheduled_date",
        {
          ascending: false,
        },
      )
      .limit(100),

    admin
      .from(
        "hs_moc_changes",
      )
      .select(
        "id,moc_reference,title,status,organization_asset_id",
      )
      .eq(
        "organization_id",
        organization.id,
      )
      .not(
        "organization_asset_id",
        "is",
        null,
      ),

    admin
      .from("suppliers")
      .select(
        "id,legal_name,approval_status",
      )
      .eq(
        "organization_id",
        organization.id,
      )
      .in(
        "approval_status",
        [
          "approved",
          "conditionally_approved",
        ],
      )
      .order("legal_name"),

    admin
      .from(
        "controlled_documents",
      )
      .select(
        "id,document_number,title,document_type,revision,status",
      )
      .eq(
        "status",
        "Current",
      )
      .in(
        "audience",
        [
          "Customer",
          "Both",
        ],
      )
      .order(
        "document_number",
      ),

    admin
      .from(
        "organization_asset_document_links",
      )
      .select(
        "asset_id,controlled_document_id",
      )
      .eq(
        "organization_id",
        organization.id,
      ),
  ]);

  for (
    const result of [
      assetResult,
      peopleResult,
      maintenanceResult,
      mocResult,
      supplierResult,
      documentResult,
      documentLinkResult,
    ]
  ) {
    if (result.error) {
      throw new Error(
        result.error.message,
      );
    }
  }

  const assets =
    assetResult.data || [];

  const people =
    peopleResult.data || [];

  const maintenance =
    maintenanceResult.data || [];

  const mocs =
    mocResult.data || [];

  const suppliers =
    supplierResult.data || [];

  const documents =
    documentResult.data || [];

  const documentLinks =
    documentLinkResult.data || [];

  const editAsset =
    assets.find(
      item =>
        item.id === query?.edit,
    ) || null;

  const peopleById =
    new Map(
      people.map(person => [
        person.id,
        person,
      ]),
    );

  const suppliersById =
    new Map(
      suppliers.map(
        supplier => [
          supplier.id,
          supplier,
        ],
      ),
    );

  const documentsById =
    new Map(
      documents.map(
        document => [
          document.id,
          document,
        ],
      ),
    );

  for (
    const record of maintenance
  ) {
    if (
      !record.evidence_storage_path
    ) {
      continue;
    }

    const { data } =
      await admin.storage
        .from(
          "asset-maintenance-evidence",
        )
        .createSignedUrl(
          record.evidence_storage_path,
          3600,
        );

    record.evidence_url =
      data?.signedUrl || null;
  }

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const soon =
    new Date(
      Date.now() +
        30 * 86400000,
    )
      .toISOString()
      .slice(0, 10);

  const active =
    assets.filter(
      item =>
        item.operational_status ===
        "active",
    ).length;

  const dueSoon =
    assets.filter(
      item =>
        item.ppm_required &&
        item.operational_status ===
          "active" &&
        item.next_maintenance_date >=
          today &&
        item.next_maintenance_date <=
          soon,
    ).length;

  const overdue =
    assets.filter(
      item =>
        item.ppm_required &&
        item.operational_status ===
          "active" &&
        item.next_maintenance_date <
          today,
    ).length;

  const maintenanceByAsset =
    new Map(
      assets.map(asset => [
        asset.id,
        maintenance.filter(
          item =>
            item.asset_id ===
            asset.id,
        ),
      ]),
    );

  const mocByAsset =
    new Map(
      assets.map(asset => [
        asset.id,
        mocs.filter(
          item =>
            item.organization_asset_id ===
            asset.id,
        ),
      ]),
    );

  const documentsByAsset =
    new Map(
      assets.map(asset => [
        asset.id,
        documentLinks
          .filter(
            link =>
              link.asset_id ===
              asset.id,
          )
          .map(link =>
            documentsById.get(
              link.controlled_document_id,
            ),
          )
          .filter(Boolean),
      ]),
    );

  return (
    <main className="arPage">
      <style>{styles}</style>

      <div className="arShell">
        <header className="arTop">
          <div>
            <small>
              ADMINISTRATION ·
              CONTROLLED COMPANY DATA
            </small>

            <h1>
              Company Asset Register
            </h1>

            <p>
              Control ownership,
              location, maintenance
              and change across the
              asset lifecycle.
            </p>
          </div>

          <nav>
            <Link
              className="arLink"
              href="/portal/company/business-profile"
            >
              Business Profile
            </Link>

            <Link
              className="arLink"
              href="/portal/health-safety/moc"
            >
              MOC Register
            </Link>

            <Link
              className="arLink"
              href="/portal/health-safety/permits"
            >
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

        <div className="arLayout">
          <div className="arForms">
            <CompanyAssetRegister
              locations={
                locations
              }
              people={people}
              suppliers={
                suppliers
              }
              documents={
                documents
              }
              asset={editAsset}
              linkedDocumentIds={
                editAsset
                  ? documentLinks
                      .filter(
                        link =>
                          link.asset_id ===
                          editAsset.id,
                      )
                      .map(
                        link =>
                          link.controlled_document_id,
                      )
                  : []
              }
            />

            <AssetMaintenanceForm
              assets={assets}
              people={people}
              suppliers={
                suppliers
              }
            />
          </div>

          <section className="arPanel">
            <h2>
              Current assets
            </h2>

            <p>
              Ownership, PPM and
              change status are
              visible at asset level.
              Retired assets remain
              in the controlled
              history.
            </p>

            <div className="arList">
              {assets.length ? (
                assets.map(asset => {
                  const owner =
                    peopleById.get(
                      asset.asset_owner_person_id,
                    );

                  const records =
                    maintenanceByAsset.get(
                      asset.id,
                    ) || [];

                  const linkedMocs =
                    mocByAsset.get(
                      asset.id,
                    ) || [];

                  const linkedDocuments =
                    documentsByAsset.get(
                      asset.id,
                    ) || [];

                  const maintenanceOwner =
                    peopleById.get(
                      asset.maintenance_owner_person_id,
                    );

                  const maintenanceSupplier =
                    suppliersById.get(
                      asset.maintenance_supplier_id,
                    );

                  const isOverdue =
                    asset.ppm_required &&
                    asset.next_maintenance_date <
                      today &&
                    asset.operational_status ===
                      "active";

                  return (
                    <article
                      className={`arAsset ${
                        isOverdue
                          ? "overdue"
                          : ""
                      }`}
                      key={asset.id}
                    >
                      <div className="arAssetTop">
                        <div>
                          <h3>
                            {
                              asset.asset_reference
                            }{" "}
                            —{" "}
                            {
                              asset.asset_name
                            }
                          </h3>

                          <p>
                            {title(
                              asset.asset_type,
                            )}{" "}
                            ·{" "}
                            {asset.site_location_label ||
                              "No site"}

                            {asset.area_department
                              ? ` · ${asset.area_department}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`arTag ${asset.operational_status}`}
                        >
                          {title(
                            asset.operational_status,
                          )}
                        </span>
                      </div>

                      <div className="arFacts">
                        <div>
                          <span>
                            OWNER
                          </span>

                          <strong>
                            {personName(
                              owner,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            CRITICALITY
                          </span>

                          <strong>
                            {title(
                              asset.criticality,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            PPM
                          </span>

                          <strong>
                            {asset.ppm_required
                              ? `Every ${asset.ppm_frequency_value} ${asset.ppm_frequency_unit}`
                              : "Not required"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            NEXT DUE
                          </span>

                          <strong
                            className={
                              isOverdue
                                ? "danger"
                                : ""
                            }
                          >
                            {asset.ppm_required
                              ? date(
                                  asset.next_maintenance_date,
                                )
                              : "—"}
                          </strong>
                        </div>
                      </div>

                      {asset.description && (
                        <p>
                          {
                            asset.description
                          }
                        </p>
                      )}

                      <div className="arHistory">
                        <details className="arPpmDetails">
                          <summary>
                            {
                              records.length
                            }{" "}
                            maintenance record
                            {records.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            - view PPM details
                          </summary>

                          <div className="arPpmBody">
                            <div className="arPpmMeta">
                              <span>
                                DELIVERY
                              </span>

                              <strong>
                                {asset.maintenance_owner_type ===
                                "supplier"
                                  ? "Approved supplier"
                                  : "Internal Facilities / Operations"}
                              </strong>
                            </div>

                            <div className="arPpmMeta">
                              <span>
                                INTERNAL
                                OWNER
                              </span>

                              <strong>
                                {personName(
                                  maintenanceOwner,
                                )}
                              </strong>
                            </div>

                            {maintenanceSupplier && (
                              <div className="arPpmMeta">
                                <span>
                                  SUPPLIER
                                </span>

                                <strong>
                                  {
                                    maintenanceSupplier.legal_name
                                  }
                                </strong>
                              </div>
                            )}

                            <div className="arPpmMeta">
                              <span>
                                REQUIREMENTS
                              </span>

                              <strong>
                                {asset.maintenance_notes ||
                                  "No additional requirements recorded"}
                              </strong>
                            </div>

                            {records.length ? (
                              <div className="arRecordList">
                                {records.map(
                                  record => (
                                    <article
                                      key={
                                        record.id
                                      }
                                    >
                                      <div>
                                        <strong>
                                          {
                                            record.maintenance_reference
                                          }
                                        </strong>

                                        <span>
                                          {title(
                                            record.maintenance_type,
                                          )}{" "}
                                          -{" "}
                                          {date(
                                            record.scheduled_date,
                                          )}{" "}
                                          -{" "}
                                          {title(
                                            record.status,
                                          )}
                                        </span>
                                      </div>

                                      <p>
                                        {record.work_completed ||
                                          "No scope or completion notes recorded."}
                                      </p>

                                      <div className="arRecordLinks">
                                        {record.evidence_reference && (
                                          <span>
                                            Reference:{" "}
                                            {
                                              record.evidence_reference
                                            }
                                          </span>
                                        )}

                                        {record.evidence_url && (
                                          <a
                                            href={
                                              record.evidence_url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Download{" "}
                                            {record.evidence_file_name ||
                                              "maintenance evidence"}
                                          </a>
                                        )}
                                      </div>
                                    </article>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p>
                                No PPM activity
                                has been planned
                                or completed for
                                this asset.
                              </p>
                            )}
                          </div>
                        </details>

                        <span>
                          {
                            linkedMocs.length
                          }{" "}
                          linked MOC
                          {linkedMocs.length ===
                          1
                            ? ""
                            : "s"}
                        </span>

                        {records[0] && (
                          <span>
                            Latest:{" "}
                            {
                              records[0]
                                .maintenance_reference
                            }
                          </span>
                        )}

                        <details className="arDocDetails">
                          <summary>
                            {
                              linkedDocuments.length
                            }{" "}
                            linked document
                            {linkedDocuments.length ===
                            1
                              ? ""
                              : "s"}
                          </summary>

                          <div>
                            {linkedDocuments.length ? (
                              linkedDocuments.map(
                                document => (
                                  <Link
                                    href="/portal/documents"
                                    key={
                                      document.id
                                    }
                                  >
                                    {
                                      document.document_number
                                    }{" "}
                                    -{" "}
                                    {
                                      document.title
                                    }
                                  </Link>
                                ),
                              )
                            ) : (
                              <p>
                                No controlled
                                work instruction
                                or manual linked.
                              </p>
                            )}
                          </div>
                        </details>
                      </div>

                      <div className="arControls">
                        <Link
                          href={`/portal/company/assets?edit=${asset.id}`}
                        >
                          Edit details
                        </Link>

                        <Link
                          href={`/portal/health-safety/moc/new?asset=${asset.id}`}
                        >
                          Start linked MOC
                        </Link>

                        {linkedMocs[0] && (
                          <Link
                            href={`/portal/health-safety/moc/${linkedMocs[0].id}`}
                          >
                            Open{" "}
                            {
                              linkedMocs[0]
                                .moc_reference
                            }
                          </Link>
                        )}

                        <form
                          action={
                            changeCompanyAssetStatus
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={
                              asset.id
                            }
                          />

                          <select
                            name="status"
                            defaultValue={
                              asset.operational_status
                            }
                            aria-label={`Status for ${asset.asset_reference}`}
                          >
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
                        </form>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="arEmpty">
                  No company assets
                  recorded yet. Add the
                  first controlled
                  asset.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const styles = `
*{
  box-sizing:border-box
}

.arPage{
  min-height:100vh;
  min-width:0;
  padding:28px clamp(20px,3vw,48px) 80px;
  background:#edf3f9;
  color:#071d3a;
  font-family:Arial,sans-serif
}

.arShell{
  width:100%;
  max-width:none;
  margin:0
}

.arTop{
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:flex-start;
  flex-wrap:wrap;
  margin-bottom:18px
}

.arTop small{
  color:#087f6c;
  font-weight:900;
  letter-spacing:.09em
}

.arTop h1{
  margin:6px 0;
  font-size:34px
}

.arTop p{
  margin:0;
  color:#627991
}

.arTop nav{
  display:flex;
  gap:8px;
  flex-wrap:wrap
}

.arLink{
  padding:11px 14px;
  border:1px solid #cad8e2;
  border-radius:9px;
  background:#fff;
  color:#173b59;
  text-decoration:none;
  font-weight:850
}

.arSummary{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
  margin:0 0 18px
}

.arMetric{
  padding:18px;
  border:1px solid #d4e1e9;
  border-top:4px solid #1762a3;
  border-radius:12px;
  background:#fff
}

.arMetric.amber{
  border-top-color:#d1840d
}

.arMetric.red{
  border-top-color:#bf4034
}

.arMetric span{
  display:block;
  font-size:11px;
  color:#6c8296;
  font-weight:900
}

.arMetric strong{
  display:block;
  margin-top:5px;
  font-size:25px
}

.arLayout{
  display:grid;
  grid-template-columns:minmax(430px,1fr) minmax(0,1.55fr);
  gap:18px;
  align-items:start
}

.arForms{
  display:grid;
  gap:16px
}

.arPanel{
  background:#fff;
  border:1px solid #d4e1e9;
  border-radius:16px;
  padding:22px
}

.arPanel h2{
  margin:0
}

.arPanel>p{
  margin:6px 0 17px;
  color:#627991
}

.arList{
  display:grid;
  gap:12px
}

.arAsset{
  padding:16px;
  border:1px solid #d8e3ea;
  border-left:5px solid #087f6c;
  border-radius:11px;
  background:#fbfdff
}

.arAsset.overdue{
  border-left-color:#bd4035;
  background:#fffafa
}

.arAssetTop{
  display:flex;
  justify-content:space-between;
  gap:12px
}

.arAsset h3{
  margin:0;
  font-size:16px
}

.arAsset p{
  margin:5px 0;
  color:#647b90;
  font-size:13px
}

.arTag{
  align-self:flex-start;
  padding:5px 8px;
  border-radius:999px;
  background:#e7f6f1;
  color:#08705f;
  font-size:10px;
  font-weight:900;
  white-space:nowrap
}

.arTag.out_of_service{
  background:#fff2d9;
  color:#925b0c
}

.arTag.retired{
  background:#eef1f4;
  color:#66798a
}

.arFacts{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  margin:12px 0
}

.arFacts div{
  padding:10px;
  border-radius:8px;
  background:#eef4f8
}

.arFacts span,
.arFacts strong{
  display:block
}

.arFacts span{
  color:#6a8195;
  font-size:9px;
  font-weight:900
}

.arFacts strong{
  margin-top:4px;
  font-size:12px;
  overflow-wrap:anywhere
}

.danger{
  color:#b52f27
}

.arHistory{
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  margin-top:10px
}

.arHistory span{
  padding:5px 8px;
  border-radius:999px;
  background:#e9f1f7;
  color:#42627e;
  font-size:10px;
  font-weight:850
}

.arPpmDetails,
.arDocDetails{
  position:relative;
  flex:0 1 auto
}

.arPpmDetails summary,
.arDocDetails summary{
  list-style:none;
  padding:5px 8px;
  border-radius:999px;
  background:#e9f1f7;
  color:#42627e;
  font-size:10px;
  font-weight:850;
  cursor:pointer
}

.arPpmDetails summary::-webkit-details-marker,
.arDocDetails summary::-webkit-details-marker{
  display:none
}

.arPpmDetails[open],
.arDocDetails[open]{
  flex-basis:100%
}

.arPpmDetails[open] summary,
.arDocDetails[open] summary{
  display:inline-block;
  background:#dceaf4;
  color:#173b59
}

.arPpmBody,
.arDocDetails>div{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:9px;
  margin-top:9px;
  padding:12px;
  border:1px solid #cedde7;
  border-radius:10px;
  background:#fff
}

.arPpmMeta{
  display:grid;
  gap:3px
}

.arPpmMeta span{
  padding:0;
  background:transparent;
  font-size:9px;
  color:#6a8195
}

.arPpmMeta strong{
  font-size:12px;
  overflow-wrap:anywhere
}

.arRecordList{
  display:grid;
  grid-column:1/-1;
  gap:8px
}

.arRecordList article{
  padding:10px;
  border-left:3px solid #087f6c;
  border-radius:7px;
  background:#f3f7fa
}

.arRecordList article>div:first-child{
  display:flex;
  justify-content:space-between;
  gap:10px
}

.arRecordList article span,
.arRecordLinks span{
  padding:0;
  background:transparent
}

.arRecordLinks{
  display:flex;
  gap:8px;
  flex-wrap:wrap
}

.arRecordLinks a,
.arDocDetails a{
  color:#1762a3;
  font-size:11px;
  font-weight:850
}

.arDocDetails>div{
  grid-template-columns:1fr
}

.arControls{
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  align-items:center;
  margin-top:12px
}

.arControls>a,
.arControls select,
.arControls button{
  min-height:36px;
  padding:8px 10px;
  border:1px solid #c6d5df;
  border-radius:8px;
  background:#fff;
  color:#173b59;
  text-decoration:none;
  font-weight:850;
  font-size:12px
}

.arControls>a:nth-child(2){
  background:#087f6c;
  color:#fff;
  border-color:#087f6c
}

.arControls form{
  display:flex;
  gap:6px;
  margin-left:auto
}

.arControls button{
  background:#173b59;
  color:#fff;
  border-color:#173b59;
  cursor:pointer
}

.arEmpty{
  padding:25px;
  border:1px dashed #b9ccd9;
  border-radius:11px;
  text-align:center;
  color:#647b90
}

@media(max-width:1150px){
  .arLayout{
    grid-template-columns:1fr
  }

  .arSummary{
    grid-template-columns:repeat(2,1fr)
  }
}

@media(max-width:700px){
  .arPage{
    padding:20px 14px 60px
  }

  .arTop h1{
    font-size:28px
  }

  .arTop nav,
  .arTop nav a{
    width:100%;
    text-align:center
  }

  .arSummary,
  .arFacts{
    grid-template-columns:1fr 1fr
  }

  .arAssetTop{
    display:block
  }

  .arTag{
    display:inline-block;
    margin-top:7px
  }

  .arControls,
  .arControls form{
    display:grid;
    width:100%;
    margin-left:0
  }

  .arControls>a{
    text-align:center
  }

  .arPpmBody{
    grid-template-columns:1fr
  }

  .arRecordList{
    grid-column:auto
  }
}

@media(max-width:430px){
  .arSummary,
  .arFacts{
    grid-template-columns:1fr
  }
}
`;
