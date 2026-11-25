import { createClient } from "../../../../../lib/supabase/server";
import QRCode from "qrcode";
import { assetRecordUrl } from "../../../../../lib/asset-label";
import Link from "next/link";
import { DocumentRecordPanel, DocumentRecordTabs, RecordIcon } from "../../../../../components/DocumentRecordTabs";
import shared from "../../../documents/documents.module.css";
import ui from "../../asset-management.module.css";
import { loadAssetControls } from "../../asset-record-links";
import CompleteWorkOrder from "../../CompleteWorkOrder";
import { requireAssetRecord, recordAssetAccess, recordPath, evidencePath } from "../../../../../lib/asset-record";
import { loadAssetRows } from "../../../../../lib/asset-management";
import { getOrganizationAccess } from "../../../../../lib/organization-access";
import { loadAssetAssurance, sameCompanyAccess } from "../../../../../lib/asset-assurance";
import { assuranceOpen } from "../../../../../lib/asset-assurance-model";
import { assetCategories, categoryLabel, CALIBRATION_RESULTS } from "../../../../../lib/asset-catalog";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Asset record | RPG Excellence",
  robots: {
    index: false,
    follow: false
  },
  referrer: "no-referrer"
};
const root = "/portal/asset-management";
const tabs = [["overview", "Overview"], ["details", "Maintenance & Calibration"], ["workflow", "NC, CAPA & MoC"], ["documents", "Documented Controls"], ["history", "Work History"]];
const words = value => String(value || "Not recorded").replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
const date = value => {
  const day = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) ? new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date("" + day + "T12:00:00Z")) : "Not recorded";
};
const text = value => value || "Not recorded";
function Fields({
  rows
}) {
  return <dl className={shared.recordFacts}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl>;
}
function Panel({ title, icon, children, action, id, teal = false, warn = false }) {
  return <section className={shared.recordPanel + " " + ui.assetDetailPanel} id={id} data-teal={teal} data-warn={warn}>
    <header><h2><RecordIcon name={icon}/> {title}</h2>{action}</header>{children}
  </section>;
}
function Badge({ children, tone }) {
  return <span className={ui.assetBadge} data-tone={tone}>{children}</span>;
}
function Table({ headers, rows, empty }) {
  return rows.length ? <div className={ui.assetRecordTable} role="region" aria-label={headers.join(", ")} tabIndex={0}>
    <table><thead><tr>{headers.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{rows.map(([id, ...cells]) => <tr key={id}>{cells.map((value, index) =>
        index === 0 ? <th key={headers[index]} scope="row">{value}</th> : <td key={headers[index]}>{value ?? "—"}</td>)}</tr>)}</tbody></table>
    </div> : <p>{empty}</p>;
}
const eventFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });
const timestamp = value => value ? eventFormat.format(new Date(value)) : "—";

async function loadWorkEvents(maintenance, organizationId) {
  if (!maintenance.length) return [];
  const client = await createClient();
  const events = [];
  for (let start = 0; start < maintenance.length; start += 100) {
    const { data, error } = await client.from("assurance_task_events").select("id,actor_person_id,created_at,event_type,source_id")
      .eq("organization_id", organizationId).eq("source_table", "organization_asset_maintenance")
      .in("source_id", maintenance.slice(start, start + 100).map(row => row.id))
      .order("created_at", { ascending: false }).order("id").limit(30);
    if (error) return null;
    events.push(...(data ?? []));
  }
  return events.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);
}
const interval = (value, unit) => value && unit ? "Every " + value + " " + unit : "Not recorded";
export default async function AssetRecord({
  params, searchParams
}) {
  const {
    id
  } = await params;
  const query = (await searchParams) ?? {};
  const context = await requireAssetRecord(id),
    {
      asset,
      access,
      admin
    } = context;
  const [people, allMaintenance, documentAccess, ncrAccess, mocAccess] = await Promise.all([loadAssetRows(admin, "organization_people", access.organization.id, "id,first_name,last_name,account_status"), loadAssetRows(admin, "organization_asset_maintenance", access.organization.id), getOrganizationAccess("documents", "view"),
    getOrganizationAccess("internal_audit", "contribute"),
    getOrganizationAccess("risk_management", "contribute"),
  ]);
  const canCreateNcr = sameCompanyAccess(ncrAccess, access);
  const canCreateMoc = sameCompanyAccess(mocAccess, access);
  const assetQuery = "?asset=" + encodeURIComponent(asset.id);
  const maintenance = allMaintenance.filter(r => r.asset_id === asset.id && r.owner_id === access.organization.owner_id).sort((a, b) => String(b.completed_date || b.scheduled_date || "").localeCompare(String(a.completed_date || a.scheduled_date || "")));
  const person = id => {
    const p = people.find(p => p.id === id);
    return p ? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "Name not recorded") + (p.account_status !== "active" ? " (inactive)" : "") : "Not recorded";
  };
  const canDocuments = sameCompanyAccess(documentAccess, access);
  let documents = [];
  if (canDocuments) {
    const {
      data: links,
      error
    } = await admin.from("organization_asset_document_links").select("controlled_document_id").eq("organization_id", access.organization.id).eq("asset_id", asset.id).eq("owner_id", access.organization.owner_id);
    if (error) throw new Error("Linked document information is unavailable. Please try again later.");
    const ids = [...new Set((links || []).map(r => r.controlled_document_id))];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const {
        data,
        error: documentError
      } = await (await createClient()).from("controlled_documents").select("id,document_number,title,revision,document_type").in("id", ids.slice(offset, offset + 100)).eq("status", "Current").in("audience", ["Customer", "Both"]);
      if (documentError) throw new Error("Linked document information is unavailable. Please try again later.");
      documents.push(...(data || []));
    }
  }
  const assurance = await loadAssetAssurance(access, maintenance);
  const linked = [...assurance.findings, ...assurance.cases, ...assurance.mocs].filter(row => row.asset_id === asset.id);
  const today = new Date().toISOString().slice(0, 10);
  const openWork = maintenance.filter(r => !["completed", "cancelled"].includes(r.status));
  const alerts = [];
  if (asset.operational_status === "out_of_service") alerts.push("Recorded as out of service. Follow the company isolation and release process.");
  if (asset.operational_status === "retired") alerts.push("Recorded as retired. This record is retained for history.");
  if (asset.ppm_required && !asset.next_maintenance_date) alerts.push("PPM is required but its next due date is missing.");
  if (asset.ppm_required && asset.next_maintenance_date && asset.next_maintenance_date < today) alerts.push("The recorded PPM due date has passed.");
  if (asset.calibration_required && !asset.next_calibration_date) alerts.push("Calibration is required but its next due date is missing.");
  if (asset.calibration_required && asset.next_calibration_date && asset.next_calibration_date < today) alerts.push("The recorded calibration due date has passed.");
  if (["out_of_tolerance", "conditional"].includes(asset.calibration_result)) alerts.push("The calibration result requires review before any decision about use.");
  if (asset.calibration_required && (!asset.calibration_result || asset.calibration_result === "not_assessed")) alerts.push("Calibration acceptance has not been assessed in this record.");
  const workOverdue = openWork.filter(r => r.scheduled_date && r.scheduled_date < today);
  if (workOverdue.length) alerts.push("" + workOverdue.length + " open maintenance or inspection record(s) have a scheduled date before today.");
  const latestService = maintenance.find(r => r.status === "completed" && r.maintenance_type !== "calibration");
  const statutory = maintenance.filter(r => ["inspection", "statutory"].includes(r.maintenance_type));
  let recordQr = null;
  try {
    recordQr = await QRCode.toDataURL(assetRecordUrl(asset.id), {
      width: 360,
      margin: 4,
      errorCorrectionLevel: "M",
      color: {
        dark: "#102d4e",
        light: "#ffffff"
      }
    });
  } catch {
    // A label configuration problem must not hide the authenticated asset record.
    recordQr = null;
  }
  await recordAssetAccess(context, "record_view");
  const path = recordPath(asset.id);
  const workUrl = root + "/maintenance?q=" + encodeURIComponent(asset.asset_reference) + "&asset=" + encodeURIComponent(asset.id);
  const recordWorkUrl = row => workUrl + "&record=" + encodeURIComponent(row.id) + "#maintenance-" + encodeURIComponent(row.id);
  const workLink = row => <Link href={["planned", "due", "overdue", "in_progress"].includes(row.status)
    ? path + "?tab=details&work=" + row.id + "#asset-order" : recordWorkUrl(row)} prefetch={false}>{row.maintenance_reference}</Link>;
  const evidence = maintenance.filter(row => row.evidence_storage_path || row.evidence_reference);
  const [controlRecords, auditEvents] = await Promise.all([
    loadAssetControls(admin, access.organization.id, [asset.id], assurance.canMoc),
    loadWorkEvents(maintenance, access.organization.id),
  ]);
  const maintenanceById = new Map(maintenance.map(row => [row.id, row]));
  const findings = linked.filter(row => row.kind === "Audit NC");
  const cases = linked.filter(row => row.kind === "CAPA / 8D");
  const changes = linked.filter(row => row.kind === "MOC");
  const actions = assurance.actions.filter(row => row.asset_id === asset.id);
  const verification = actions.filter(row => /effectiveness|verification/.test(row.status || "") && assuranceOpen(row));
  const completedOrder = maintenance.find(row => row.id === query.completed && row.status === "completed");
  const scheduled = openWork.find(row => row.id === query.work) || [...openWork].sort((a, b) => (a.scheduled_date || "9999").localeCompare(b.scheduled_date || "9999"))[0];
  const categories = assetCategories(asset).map(categoryLabel).join(" · ");
  const operationalStatus = asset.operational_status === "active" ? "Operational" : words(asset.operational_status);
  const ppm = asset.ppm_required ? interval(asset.ppm_frequency_value, asset.ppm_frequency_unit) : "Not required";
  const nextPpm = asset.ppm_required ? date(asset.next_maintenance_date) : "Not required";
  const tone = asset.operational_status === "active" ? "green" : "amber";
  const status = row => row.scheduled_date && row.scheduled_date < today && !["completed", "cancelled"].includes(row.status)
    ? <Badge tone="red">Overdue</Badge> : <Badge tone={row.status === "completed" ? "green" : "blue"}>{words(row.status)}</Badge>;
  const jump = (tab, name, anchor) => <Link href={path + "?tab=" + tab + (anchor ? "#" + anchor : "")} prefetch={false}>{name}</Link>;
  const openSource = row => <Link href={row.href} prefetch={false}>{row.reference || row.title}</Link>;
  const editUrl = root + "/register?edit=" + asset.id;
  const counts = [
    ["Maintenance records", maintenance.length, "calendar", "details", "asset-schedule"],
    ["Inspections", statutory.length, "clipboard", "documents", "asset-inspections"],
    ["Linked risks", controlRecords.risks?.length, "scope", "documents", "asset-risks"],
    ["Permits", controlRecords.permits?.length, "permit", "documents", "asset-permits"],
    ["MoC", assurance.canMoc ? changes.length : null, "workflow", "workflow", "asset-moc"],
    ["Documents", canDocuments ? documents.length : null, "overview", "documents", "asset-documents"],
    ["Evidence", evidence.length, "documents", "history", "asset-evidence"],
  ];
  const identity = <Fields rows={[
    ["Asset number", asset.asset_reference], ["Description", asset.description], ["Category", categories], ["Manufacturer", asset.manufacturer],
    ["Model", asset.model], ["Serial number", asset.serial_number], ["Area / department", asset.area_department], ["Location", asset.site_location_label],
  ]}/>;
  const ownership = <Fields rows={[
    ["Accountable owner", person(asset.asset_owner_person_id)], ["Maintenance coordinator", person(asset.maintenance_owner_person_id)],
    ["Delivery", words(asset.maintenance_owner_type)], ["Maintenance provider", asset.maintenance_provider],
  ]}/>;
  const workRows = rows => rows.map(row => [row.id, workLink(row), words(row.maintenance_type), row.work_completed || "—",
    date(row.scheduled_date), date(row.completed_date), row.performed_by || person(row.responsible_person_id), status(row),
    row.evidence_storage_path ? <a href={evidencePath(asset.id, row.id)}>Download evidence</a> : row.evidence_reference || "—"]);
  const workHeaders = ["Reference", "Work type", "Scope / work completed", "Scheduled", "Completed", "Responsible person", "Status", "Evidence"];
  const attachmentPanel = <Panel id="asset-evidence" icon="documents" title={"Attachments & evidence (" + evidence.length + ")"}>
    <Table headers={["Work record", "Evidence reference", "Attachment"]} rows={evidence.map(row => [
      row.id, workLink(row), row.evidence_reference || "—",
      row.evidence_storage_path ? <a href={evidencePath(asset.id, row.id)}>{row.evidence_file_name || "Download evidence"}</a> : "Reference only",
    ])} empty="No evidence references or attachments recorded."/>
  </Panel>;
  const auditPanel = <Panel id="asset-audit" icon="history" title="Audit history">
    <p>Recorded maintenance task changes available under your current access.</p>
    <Table headers={["Date and time", "Recorded by", "Event", "Work record"]} rows={(auditEvents ?? []).map(row => [
      row.id, timestamp(row.created_at), row.actor_person_id ? person(row.actor_person_id) : "Not recorded",
      words(row.event_type), workLink(maintenanceById.get(row.source_id)),
    ])} empty={auditEvents ? "No work-order audit events are available." : "Audit events could not be loaded."}/>
  </Panel>;
  const actionTable = <Table headers={["Action", "Description", "Status", "Due"]} rows={actions.map(row => [row.id, <Link href={row.href}>{row.case_reference}</Link>, row.title, words(row.status), date(row.due_date)])} empty="No linked corrective or preventive actions available."/>;
  const linkedTable = (rows, empty) => <Table headers={["Reference", "Description", "Status", "Target date"]}
    rows={rows.map(row => [row.source_id, openSource(row), row.title, words(row.status), date(row.due)])} empty={empty}/>;
  const chosen = tabs.some(([key]) => key === query?.tab) ? query.tab : "overview";
  return <main className={[shared.page, shared.registerPage, shared.recordPage, ui.assetRecord].join(" ")}><div className={shared.shell}>
    <p className={shared.recordBreadcrumb}><Link href={root}>Asset Management</Link> / <Link href={root + "/register"}>Asset Register</Link> / {asset.asset_reference}</p>
    <header className={ui.assetRecordHeader}>
      <div className={shared.recordTitle}><span className={shared.recordTitleIcon}><RecordIcon name="clipboard"/></span>
        <div><h1>{asset.asset_reference} — {asset.asset_name}</h1><p>{categories} · {text(asset.site_location_label)}{asset.area_department && " · " + asset.area_department}</p></div>
      </div>
      <div className={shared.recordHeaderActions}>
        <Link className={shared.recordButton} href={root + "/register"}>Asset Register</Link>
        {access.canWrite && <><Link className={shared.recordButton} href={editUrl}>Edit asset</Link>
          {asset.operational_status !== "retired" && <Link className={shared.recordButton} href={workUrl}><RecordIcon name="calendar"/>Record work</Link>}</>}
        <details className={ui.assetRecordMore}><summary className={shared.recordButton}>More</summary><div>
          {access.canWrite && <a href={path + "/label"}><RecordIcon name="qr"/> Printable QR label</a>}
          <Link href="/portal/tasks">My Tasks &amp; Approvals</Link>{jump("history", "Audit history", "asset-audit")}
        </div></details>
      </div>
    </header>
    <div className={ui.assetRecordBanner}>
      <div><h2>Asset assurance and lifecycle</h2><p>Recorded ownership, maintenance, inspection and controlled evidence.</p></div>
      <div className={ui.recordBanners}>
        <Badge tone={tone}>{operationalStatus}</Badge><Badge tone="amber">{words(asset.criticality)} criticality</Badge>
        {recordQr && <div className={ui.assetQr}><img src={recordQr} width={65} height={65} alt={"QR code for " + asset.asset_reference}/><span>Scan to open asset<br/>Sign-in required</span></div>}
      </div>
    </div>
    <div className={ui.recordMetrics}>
      {[
        ["PPM frequency", ppm, "details", "calendar", "blue", "asset-schedule"],
        ["Next recurring maintenance", nextPpm, "details", "calendar", "teal", "asset-schedule"],
        ["Overdue work orders", workOverdue.length, "details", "alert", workOverdue.length ? "red" : "blue", "asset-order"],
        ["Linked MoC records", assurance.canMoc ? changes.length : "N/A", "workflow", "workflow", "purple", "asset-moc"],
        ["Asset compliance", "Review recorded controls", "documents", "scope", "amber", "asset-controls"],
      ].map(([label, value, tab, icon, colour, anchor]) => <Link className={ui.recordMetric} data-tone={colour} href={path + "?tab=" + tab + "#" + anchor} prefetch={false} key={label}>
        <RecordIcon name={icon}/><span><small>{label}</small><strong>{value}</strong></span>
      </Link>)}
    </div>
    <DocumentRecordTabs key={chosen} initial={chosen} tabs={tabs} sectionLabel="Asset record sections">
      <div className={ui.assetRecordNotice}><strong>Recorded availability and evidence</strong><p>Before use, check current condition, task controls and any required release. Status changes use the authorised asset workflow.</p></div>
      {!!alerts.length && <Panel title="Attention required" icon="alert" warn><ul>{alerts.map(message => <li key={message}>{message}</li>)}</ul></Panel>}
      <DocumentRecordPanel name="overview">
        <div className={ui.assetRecordThree}>
          <Panel title="Asset identity and ownership" icon="clipboard">{identity}{ownership}</Panel>
          <Panel title="Lifecycle & status" icon="history">
            <Fields rows={[["Operational status", <Badge tone={tone}>{operationalStatus}</Badge>], ["Criticality", words(asset.criticality)],
              ["Created", date(asset.created_at)], ["Last updated", date(asset.updated_at)],
              ["Safe-use release", "Check the authorised release record"]]} />
          </Panel>
          <Panel title="Assurance summary" icon="scope"><ul className={ui.assetSummaryLinks}>
            {counts.map(([label, count, icon, tab, anchor]) => <li key={label}><Link href={path + "?tab=" + tab + "#" + anchor} prefetch={false}><RecordIcon name={icon}/>{label}<b>{count ?? "N/A"}</b></Link></li>)}
          </ul></Panel>
        </div>
        <div className={ui.assetRecordTwo}>
          <Panel title="Next actions" icon="alert"><ul>
            {workOverdue[0] && <li>{workLink(workOverdue[0])} · overdue since {date(workOverdue[0].scheduled_date)}</li>}
            <li>{jump("details", "Review recurring PPM", "asset-schedule")} · {nextPpm}</li>
            <li>{jump("documents", "Review documented controls", "asset-controls")}</li>
          </ul></Panel>
          <Panel title="Recent maintenance history" icon="calendar" action={jump("history", "View all", "asset-work")}>
            <Table headers={workHeaders} rows={workRows(maintenance.filter(row => row.status === "completed").slice(0, 3))} empty="No completed work records."/>
          </Panel>
        </div>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="details">
        <div className={ui.assetRecordThree}>
          <Panel title="Maintenance schedule" icon="calendar" id="asset-schedule"><Fields rows={[
            ["PPM requirement", asset.ppm_required ? "Required" : "Not required"], ["Frequency", ppm],
            ["Last recorded service", date(asset.last_maintenance_date)], ["Latest completed work type", latestService && words(latestService.maintenance_type)],
            ["Next recurring due date", nextPpm],
          ]}/></Panel>
          <Panel title="Scheduled work order" icon="alert" id="asset-order" warn={Boolean(scheduled?.scheduled_date && scheduled.scheduled_date < today)}>
            {completedOrder && <p className={ui.completeSuccess} role="status">
              <RecordIcon name="checkCircle"/> {completedOrder.maintenance_reference} closed on {date(completedOrder.completed_date)}.
            </p>}
            {scheduled ? <Fields rows={[["Work order", scheduled.maintenance_reference], ["Description", scheduled.work_completed],
              ["Scheduled date", date(scheduled.scheduled_date)], ["Status", status(scheduled)],
              ["Responsible person", person(scheduled.responsible_person_id)]]}/> : <p>No open work orders recorded.</p>}
            {access.canWrite && scheduled && ["planned", "due", "overdue", "in_progress"].includes(scheduled.status) &&
              <CompleteWorkOrder key={scheduled.id} assetId={asset.id} today={today}
                calibrationCriteria={scheduled.maintenance_type === "calibration" ? asset.calibration_acceptance_criteria : undefined}
                order={{ id: scheduled.id, maintenance_reference: scheduled.maintenance_reference,
                  maintenance_type: scheduled.maintenance_type, evidence_reference: scheduled.evidence_reference,
                  hasEvidence: Boolean(scheduled.evidence_storage_path),
                  calibration_acceptance_criteria: scheduled.calibration_acceptance_criteria }}/>}
          </Panel>
          <Panel title="Calibration" icon="testing"><Fields rows={[
            ["Requirement", asset.calibration_required ? "Required" : "Not marked as required"],
            ["Last calibration", date(asset.last_calibration_date)], ["Next calibration due", date(asset.next_calibration_date)],
            ["Interval", interval(asset.calibration_frequency_value, asset.calibration_frequency_unit)], ["Interval basis", asset.calibration_interval_basis],
            ["Provider", asset.calibration_provider], ["Certificate", asset.calibration_certificate_reference],
            ["Result", CALIBRATION_RESULTS.find(([key]) => key === asset.calibration_result)?.[1] || "Not assessed"],
            ["Scope", asset.calibration_scope], ["Acceptance criteria", asset.calibration_acceptance_criteria],
          ]}/></Panel>
        </div>
        <div className={ui.assetRecordTwo}>
          <Panel title="Latest inspection / calibration" icon="clipboard"><Table headers={workHeaders}
            rows={workRows(maintenance.filter(row => row.status === "completed" && ["inspection", "statutory", "calibration"].includes(row.maintenance_type)).slice(0, 1))} empty="No completed inspection or calibration available."/></Panel>
          <Panel title="Supporting documents" icon="documents">
            <div className={ui.assetEvidenceLinks}>
              {jump("history", evidence.length + " evidence records", "asset-evidence")}
              {jump("documents", "Open controlled documents", "asset-documents")}
            </div>
          </Panel>
        </div>
        <Panel title="Recent work history" icon="history" action={jump("history", "View full history", "asset-work")}><Table headers={workHeaders} rows={workRows(maintenance.slice(0, 5))} empty="No work records."/></Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="workflow">
        <div className={ui.recordMetrics}>{[
          ["Open NCs", assurance.canFindings && assurance.linksReady ? findings.filter(assuranceOpen).length : "N/A", "alert", "red", "asset-nc"],
          ["CAPA actions", assurance.canCapa && assurance.linksReady && assurance.actionsReady ? actions.length : "N/A", "checkCircle", "green", "asset-capa"],
          ["Management of Change", assurance.canMoc ? changes.length : "N/A", "workflow", "purple", "asset-moc"],
          ["Risk assessments", controlRecords.risks?.length ?? "N/A", "scope", "blue", "asset-change-risks"],
          ["Verification actions", assurance.canCapa && assurance.linksReady && assurance.actionsReady ? verification.length : "N/A", "testing", "amber", "asset-verification"],
        ].map(([label, value, icon, colour, anchor]) => <a href={"#" + anchor} className={ui.recordMetric} data-tone={colour} key={label}><RecordIcon name={icon}/><span><small>{label}</small><strong>{value}</strong></span></a>)}</div>
        {assurance.issues.map(issue => <p role="status" key={issue}>{issue}</p>)}
        <div className={ui.assetRecordTwo}>
          <Panel title="Nonconformances (NC)" icon="alert" id="asset-nc" teal action={canCreateNcr &&
            <Link className={ui.assetPanelAction} href={"/portal/internal-audit-actions/new" + assetQuery}>+ Create NCR</Link>
          }>{linkedTable(findings, assurance.canFindings ? "No linked nonconformances available." : "Audit source access is required.")}</Panel>
          <Panel title="Corrective & preventive actions (CAPA)" icon="clipboard" id="asset-capa" teal>
            {actionTable}
            {linkedTable(cases, "No linked CAPA cases available.")}
          </Panel>
          <Panel title="Management of Change" icon="workflow" id="asset-moc" teal action={canCreateMoc &&
            <Link className={ui.assetPanelAction} href={"/portal/health-safety/moc/new" + assetQuery}>+ Create MoC</Link>
          }>{linkedTable(changes, assurance.canMoc ? "No linked change records." : "Change source access is required.")}</Panel>
          <Panel title="Risk assessments" icon="scope" id="asset-change-risks" teal>{jump("documents", "View risk assessments linked through permits", "asset-risks")}</Panel>
          <Panel title="Approvals & effectiveness verification" icon="scope" id="asset-verification" teal>
            <Table headers={["Case", "Action", "Recorded status"]} rows={verification.map(row => [row.id, <Link href={row.href}>{row.case_reference}</Link>, row.title, words(row.status)])}
              empty="No linked verification actions available."/><p>Open the source case for approval and verification decisions.</p>
          </Panel>
          <Panel title="Key ownership and dates" icon="person" teal>{ownership}<Fields rows={[["Next PPM", nextPpm]]}/></Panel>
        </div>
        <Panel title="Audit trail" icon="history">{jump("history", "View work-order audit history", "asset-audit")}</Panel>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="documents">
        <div className={ui.assetRecordThree} id="asset-controls">
          <Panel title="Asset identity and ownership" icon="person">{identity}{ownership}</Panel>
          <Panel title="Linked risk assessments" icon="scope" id="asset-risks">
            <p>Risk assessments linked through the asset's permits.</p>
            <Table headers={["Reference", "Title", "Status", "Review date"]} rows={(controlRecords.risks ?? []).map(row =>
              [row.id,<Link href={row.href}>{row.assessment_reference}</Link>,row.title,words(row.status),date(row.review_date)])}
              empty={controlRecords.risks ? "No linked risk assessments." : "Risk source access is required or records are unavailable."}/>
          </Panel>
          <Panel title="Permits to work" icon="permit" id="asset-permits">
            <Table headers={["Permit", "Task", "Status", "Valid until"]} rows={(controlRecords.permits ?? []).map(row =>
              [row.id,<Link href={row.href}>{row.permit_reference}</Link>,row.task_description,words(row.status),date(row.valid_until)])}
              empty={controlRecords.permits ? "No linked permits." : "Permit source access is required or records are unavailable."}/>
          </Panel>
        </div>
        <div className={ui.assetRecordTwo}>
          <Panel title="Procedures, work instructions & controlled documents" icon="overview" id="asset-documents">
            <Table headers={["Reference", "Title", "Type", "Revision"]} rows={documents.map(row =>
              [row.id,<Link href={"/portal/documents/" + row.id}>{row.document_number}</Link>,row.title,row.document_type,row.revision])}
              empty={canDocuments ? "No linked current documents available." : "Document access is required."}/>
          </Panel>
          <Panel title="Inspection records" icon="clipboard" id="asset-inspections"><Table headers={workHeaders} rows={workRows(statutory)} empty="No inspection records."/></Panel>
          <Panel title="Maintenance evidence" icon="documents">{jump("history", evidence.length + " evidence records", "asset-evidence")}</Panel>
          <Panel title="Document summary" icon="overview"><Fields rows={[["Current linked documents", canDocuments ? String(documents.length) : "Unavailable"],
            ["Change screening", asset.change_control_required ? "Material changes require MoC screening" : "Not marked as required"]]}/></Panel>
        </div>
      </DocumentRecordPanel>
      <DocumentRecordPanel name="history">
        <div className={ui.assetRecordTwo}>
          <Panel title="Asset lifecycle & work history" icon="history"><ol className={ui.assetActivity}>
            {maintenance.map(row => <li key={row.id}><RecordIcon name={row.maintenance_type === "inspection" ? "clipboard" : "calendar"}/>
              <div>{workLink(row)}<small>{date(row.completed_date || row.scheduled_date)} · {words(row.maintenance_type)}</small></div>{status(row)}</li>)}
            {asset.created_at && <li><RecordIcon name="clipboard"/><div>Asset recorded<small>{date(asset.created_at)}</small></div></li>}
          </ol></Panel>
          <Panel title="Work orders, PPM and inspections" icon="calendar" id="asset-work"
            action={access.canWrite && asset.operational_status !== "retired" && <Link href={workUrl}>Record work</Link>}>
            <Table headers={workHeaders} rows={workRows(maintenance)} empty="No work orders recorded."/>
          </Panel>
        </div>
        <div className={ui.assetRecordTwo}>
          <Panel title="Findings, corrective actions and MoC" icon="workflow">{linkedTable(linked, "No linked assurance records available.")}{actionTable}</Panel>
          {attachmentPanel}
        </div>
        {auditPanel}
      </DocumentRecordPanel>
    </DocumentRecordTabs>
  </div></main>;
}


