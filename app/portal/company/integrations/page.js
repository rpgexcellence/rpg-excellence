import Link from "next/link";
import { requirePeopleAdmin } from "../people/actions";
import IntegrationKeyManager from "./IntegrationKeyManager";

export const dynamic = "force-dynamic";

const ROOT = "/portal/company/integrations";
const TERMINAL_EVENTS = ["request_completed", "request_failed"];
const EXPORT_RESOURCES = ["audits", "findings", "capa-8d", "assets", "suppliers", "people", "security-incidents", "workplace-inspections", "inspection-programmes"];
const PERIODS = new Map([["24", "Last 24 hours"], ["168", "Last 7 days"]]);
const OUTCOMES = new Map([["all", "All outcomes"], ["success", "Successful (2xx)"], ["client", "Client errors (4xx, excluding 429)"], ["rate", "Rate limited (429)"], ["server", "Service errors (5xx)"]]);

function timeLabel(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }).format(date) + " UTC"
    : "Not recorded";
}

function outcomeQuery(query, outcome) {
  if (outcome === "success") return query.gte("response_status", 200).lt("response_status", 300);
  if (outcome === "client") return query.gte("response_status", 400).lt("response_status", 500).neq("response_status", 429);
  if (outcome === "rate") return query.eq("response_status", 429);
  if (outcome === "server") return query.gte("response_status", 500).lt("response_status", 600);
  return query;
}

function responseGuidance(status) {
  if (status === 401) return "Check key expiry and revocation.";
  if (status === 403) return "Check permission, source IP and organisation entitlement.";
  if (status === 410) return "Export cursor expired: complete and reconcile a fresh snapshot.";
  if (status === 429) return "Respect Retry-After before retrying.";
  if (status === 503) return "Check database and audit dependencies; quote the request ID.";
  if (status >= 500) return "Review the server log using this request ID.";
  if (status >= 400) return "Review the endpoint, parameters and resource reference.";
  if (status >= 200 && status < 300) return "Request completed. This does not confirm the receiving system applied the data.";
  return "Review the HTTP result.";
}

export default async function EnterpriseIntegrationsPage({ searchParams } = {}) {
  const { admin, organization } = await requirePeopleAdmin();
  const query = (await searchParams) || {};
  const param = name => typeof query[name] === "string" ? query[name] : "";
  const now = new Date();
  const period = param("hours") || "24";
  const outcome = param("outcome") || "all";
  const clientId = param("client");
  const pageText = param("page") || "1";
  const page = /^[1-9][0-9]{0,5}$/.test(pageText) && Number(pageText) <= 100000 ? Number(pageText) : 1;
  const suppliedUntil = param("until");
  const untilDate = suppliedUntil ? new Date(suppliedUntil) : now;
  const validUntil = !suppliedUntil || (Number.isFinite(untilDate.getTime()) && untilDate.toISOString() === suppliedUntil && untilDate <= now && untilDate.getTime() >= now.getTime() - 30 * 86400000);
  const until = validUntil ? untilDate.toISOString() : now.toISOString();
  const since = new Date(Date.parse(until) - (PERIODS.has(period) ? Number(period) : 24) * 3600000).toISOString();

  const clientResult = await admin.from("integration_api_clients")
    .select("id,client_name,key_prefix,environment,permissions,active,expires_at,last_used_at,revoked_at,created_at", { count: "exact" })
    .eq("organization_id", organization.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(0, 999);
  if (clientResult.error) throw new Error("The organisation's API key register could not be loaded. Refresh the page or contact the administrator.");
  const clients = clientResult.data || [];
  const clientListLimited = typeof clientResult.count === "number" && clientResult.count > clients.length;
  const invalidFilters = !PERIODS.has(period) || !OUTCOMES.has(outcome) || !validUntil || pageText !== String(page) ||
    Boolean(clientId && !clients.some(client => client.id === clientId)) ||
    ["hours", "outcome", "client", "page", "until"].some(name => Array.isArray(query[name]));
  const clientNames = new Map(clients.map(client => [client.id, client.client_name + " · " + client.key_prefix]));
  // Build select first: Supabase's table query builder exposes filters after select.
  const terminalQuery = (columns, options) => {
    let result = admin.from("integration_events").select(columns, options)
      .eq("organization_id", organization.id).in("event_type", TERMINAL_EVENTS)
      .gte("occurred_at", since).lt("occurred_at", until);
    if (clientId) result = result.eq("api_client_id", clientId);
    return result;
  };
  const unavailable = { data: [], count: null, error: { message: "Invalid filters" } };
  const operations = invalidFilters ? [] : [
    outcomeQuery(terminalQuery("id,api_client_id,event_type,http_method,endpoint,response_status,request_id,occurred_at", { count: "exact" }), outcome)
      .order("occurred_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 25, page * 25 - 1),
    ...["all", "success", "client", "rate", "server"].map(band => outcomeQuery(terminalQuery("id", { count: "exact", head: true }), band)),
  ];
  const [eventResults, activityResult, captureResult, unassignedResult] = await Promise.all([
    operations.length ? Promise.all(operations) : Promise.resolve(Array(6).fill(unavailable)),
    admin.from("integration_events").select("id,api_client_id,event_type,resource_id,occurred_at")
      .eq("organization_id", organization.id).in("event_type", ["key_created", "key_revoked", "key_rotation_started", "key_rotation_completed"])
      .order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(20),
    admin.from("integration_export_sources").select("resource,initialized_at").order("resource"),
    admin.from("internal_audit_findings").select("id", { count: "exact", head: true }).eq("owner_id", organization.owner_id).is("organization_id", null),
  ]);
  const [eventsResult, ...counts] = eventResults;
  const events = eventsResult.data || [];
  const metricsAvailable = counts.every(result => !result.error && Number.isSafeInteger(result.count) && result.count >= 0);
  const [total, successful, clientErrors, limited, serviceErrors] = counts.map(result => result.count);
  const captureByResource = new Map((captureResult.data || []).map(item => [item.resource, item]));
  const requestCount = eventsResult.error || !Number.isSafeInteger(eventsResult.count) ? null : eventsResult.count;
  const pages = requestCount === null ? null : Math.max(1, Math.ceil(requestCount / 25));
  const requestHref = (nextPage = 1, refresh = false) => {
    const values = new URLSearchParams({ hours: PERIODS.has(period) ? period : "24", outcome: OUTCOMES.has(outcome) ? outcome : "all" });
    if (clientId && clients.some(client => client.id === clientId)) values.set("client", clientId);
    if (!refresh) values.set("until", until);
    if (nextPage > 1) values.set("page", String(nextPage));
    return ROOT + "?" + values.toString() + "#monitoring";
  };

  return (
    <main className="integrationPage">
      <style>{`
        .integrationPage *{box-sizing:border-box}.integrationPage{min-height:100vh;padding:34px clamp(18px,4vw,64px) 70px;background:#edf3f9;color:#071b35}.integrationShell{max-width:none;width:100%;margin:0}.integrationTop{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:23px}.integrationTop small{display:block;margin-bottom:7px;color:#5a45df;font-size:11px;font-weight:950;letter-spacing:.12em}.integrationTop h1{margin:0;color:#071b35;font-size:clamp(32px,4vw,49px);letter-spacing:-.045em}.integrationTop p{max-width:820px;margin:9px 0 0;color:#58708a;line-height:1.55}.integrationBack{display:inline-flex;padding:12px 16px;border:1px solid #c7d6e6;border-radius:10px;background:#fff;color:#0a2c52;text-decoration:none;font-weight:900;white-space:nowrap}.integrationHero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.6fr);gap:25px;padding:33px 35px;border-radius:21px;background:linear-gradient(120deg,#071b38,#0b4279);color:#fff;box-shadow:0 18px 45px #061a3520}.integrationHero:after{content:"";position:absolute;right:-80px;top:-120px;width:360px;height:360px;border:1px solid #58e0d445;border-radius:50%}.integrationHero span{color:#5ce3d8;font-size:11px;font-weight:950;letter-spacing:.11em}.integrationHero h2{margin:7px 0 10px;color:#fff;font-size:29px}.integrationHero p{max-width:760px;margin:0;color:#d1e0ef;line-height:1.6}.integrationEndpoint{position:relative;z-index:1;padding:20px;border:1px solid #ffffff25;border-radius:15px;background:#ffffff0d}.integrationEndpoint strong,.integrationEndpoint code,.integrationEndpoint small{display:block}.integrationEndpoint strong{margin-bottom:11px}.integrationEndpoint code{overflow-wrap:anywhere;padding:11px;border-radius:8px;background:#031329;color:#66e8dd}.integrationEndpoint small{margin-top:10px;color:#b9cee1}.integrationPrinciples{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:16px 0}.integrationPrinciples article{padding:19px 21px;border:1px solid #d2dfeb;border-radius:14px;background:#fff}.integrationPrinciples strong,.integrationPrinciples span{display:block}.integrationPrinciples strong{margin-bottom:5px}.integrationPrinciples span{color:#6a7e93;font-size:13px;line-height:1.45}.integrationPanel{margin-top:17px;overflow:hidden;border:1px solid #d2dfeb;border-radius:19px;background:#fff;box-shadow:0 12px 34px #071b350a}.integrationPanelHead{display:flex;justify-content:space-between;gap:24px;padding:25px 28px;border-bottom:1px solid #e3eaf2;background:linear-gradient(115deg,#fff,#f4f8fd)}.integrationPanelHead span{color:#1761e8;font-size:10px;font-weight:950;letter-spacing:.12em}.integrationPanelHead h2{margin:5px 0;color:#071b35;font-size:24px}.integrationPanelHead p{max-width:780px;margin:0;color:#647a91}.integrationPanelHead>b{align-self:flex-start;padding:8px 11px;border-radius:999px;background:#e9f0ff;color:#1555c6;font-size:11px;text-transform:uppercase}.integrationForm{display:grid;grid-template-columns:1.4fr .8fr .8fr;gap:16px;padding:27px}.integrationForm>label{display:flex;flex-direction:column;gap:7px;color:#17324f;font-size:12px;font-weight:900}.integrationForm input,.integrationForm select,.integrationForm textarea{width:100%;min-height:46px;padding:11px 12px;border:1px solid #c7d6e5;border-radius:9px;background:#fff;color:#071b35;font:inherit}.integrationForm label small{color:#75889b;font-weight:500;line-height:1.4}.integrationPermissions{grid-column:1/-1;margin:2px 0 0;padding:20px;border:1px solid #ccdaea;border-radius:13px}.integrationPermissions legend{padding:0 7px;font-weight:950}.integrationPermissions>p{margin:0 0 16px;color:#63788e;font-size:13px}.integrationPermissionGrid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.integrationPermissionGroup{display:grid;gap:9px;padding:17px;border-radius:11px;background:#f3f7fb}.integrationPermissionGroup>strong{margin-bottom:3px}.integrationPermissionGroup label{display:flex;align-items:center;gap:9px;color:#29435d;font-size:13px}.integrationPermissionGroup input{width:17px;min-height:17px;margin:0}.integrationPrimary{justify-self:start;min-height:47px;padding:0 19px;border:0;border-radius:9px;background:#315fe8;color:#fff;font-weight:950;cursor:pointer}.integrationPrimary:disabled{opacity:.55}.integrationMessage{grid-column:1/-1;padding:12px 14px;border-radius:9px}.integrationMessage.error,.integrationInlineError{background:#fff0ee;color:#ac2b20}.integrationSecret{margin:0 27px 27px;padding:22px;border:1px solid #74cdbd;border-radius:14px;background:#eafaf6}.integrationSecret span{color:#08725e;font-size:10px;font-weight:950;letter-spacing:.12em}.integrationSecret h3{margin:5px 0}.integrationSecret p{margin:0;color:#476b65}.integrationSecret code{display:block;overflow-wrap:anywhere;margin:17px 0;padding:14px;border-radius:8px;background:#071b35;color:#67e5d7}.integrationSecret button{padding:10px 15px;border:0;border-radius:8px;background:#07836c;color:#fff;font-weight:900;cursor:pointer}.integrationClientList{display:grid}.integrationClient{display:grid;grid-template-columns:minmax(280px,1.3fr) minmax(170px,.6fr) auto;gap:20px;align-items:center;padding:21px 27px;border-top:1px solid #e7edf3}.integrationClient:first-child{border-top:0}.integrationClient strong,.integrationClient code,.integrationClient small{display:block}.integrationClient code{margin:7px 0;color:#275580}.integrationClient small{color:#718497;line-height:1.45}.integrationClientMeta{display:grid;gap:5px}.integrationClientMeta>span{justify-self:start;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:950;text-transform:uppercase}.integrationClientMeta .active{background:#e8f8ef;color:#08704a}.integrationClientMeta .revoked{background:#f1f2f4;color:#697481}.integrationRevokeForm{text-align:right}.integrationDanger{padding:10px 13px;border:1px solid #f0b8b2;border-radius:8px;background:#fff4f2;color:#ac2b20;font-weight:900;cursor:pointer}.integrationDanger:disabled{border-color:#d9e0e6;background:#f2f4f6;color:#87929d;cursor:not-allowed}.integrationInlineError{display:block;margin-top:6px;padding:5px;border-radius:5px}.integrationPanel table th,.integrationPanel table td{padding:12px;text-align:left;border-bottom:1px solid #dce5ee;font-size:12px;vertical-align:top}.integrationPanel table th{background:#edf3f8}.integrationPanel td code{overflow-wrap:anywhere}.integrationEmpty{padding:37px;text-align:center;color:#6b8095}.integrationGuide{margin-top:17px;padding:28px;border:1px solid #d2dfeb;border-radius:19px;background:#071b35;color:#dce8f4;box-shadow:0 12px 34px #071b3515}.integrationGuide>header span{color:#5ce3d8;font-size:10px;font-weight:950;letter-spacing:.12em}.integrationGuide>header h2{margin:6px 0;color:#fff;font-size:25px}.integrationGuide>header p{max-width:850px;margin:0;color:#b9cadb;line-height:1.55}.integrationGuideGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:21px}.integrationGuide details{overflow:hidden;border:1px solid #ffffff20;border-radius:12px;background:#ffffff08}.integrationGuide summary{padding:16px 18px;color:#fff;font-weight:900;cursor:pointer}.integrationGuide details>div{padding:0 18px 18px;color:#c9d8e7}.integrationGuide p{line-height:1.55}.integrationGuide code{overflow-wrap:anywhere;color:#66e8dd}.integrationGuide pre{overflow:auto;padding:14px;border-radius:9px;background:#031126;color:#dce8f4;font-size:12px;line-height:1.55}.integrationGuide ul{padding-left:19px;line-height:1.75}.integrationGuideWarning{margin-top:15px;padding:14px;border-left:4px solid #f3ba36;border-radius:8px;background:#ffffff0b;color:#f3dfad}
        @media(max-width:900px){.integrationHero{grid-template-columns:1fr}.integrationPrinciples,.integrationGuideGrid{grid-template-columns:1fr}.integrationForm{grid-template-columns:1fr 1fr}.integrationForm>label:first-child{grid-column:1/-1}.integrationClient{grid-template-columns:1fr 1fr}.integrationRevokeForm{grid-column:1/-1;text-align:left}}
        @media(max-width:620px){.integrationPage{padding:22px 13px 55px}.integrationTop{display:block}.integrationBack{margin-top:15px}.integrationHero{padding:25px 21px}.integrationPanelHead{display:block;padding:21px}.integrationPanelHead>b{display:inline-block;margin-top:12px}.integrationForm,.integrationPermissionGrid,.integrationClient{grid-template-columns:1fr}.integrationForm{padding:21px}.integrationForm>label:first-child{grid-column:auto}.integrationSecret{margin:0 20px 20px}.integrationClient{padding:20px}.integrationRevokeForm{grid-column:auto}}
.integrationMonitoringBody{padding:24px 28px}.integrationMonitorFilters{display:grid;grid-template-columns:180px minmax(180px,1fr) minmax(180px,1fr) auto;gap:12px;align-items:end}.integrationMonitorFilters label{display:grid;gap:7px;font-size:12px;font-weight:800;color:#17324f}.integrationMonitorFilters select{width:100%;min-width:0;min-height:46px;border:1px solid #c7d6e5;border-radius:9px;padding:10px;color:#17324f;background:white;font:inherit}.integrationMonitorNote{font-size:12px;line-height:1.6;color:#647a91}.integrationMonitorMetrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:18px 0}.integrationMonitorMetrics article{padding:17px;border:1px solid #d6e2ed;border-radius:12px;background:#f6f9fd;min-width:0}.integrationMonitorMetrics span,.integrationMonitorMetrics strong,.integrationMonitorMetrics small{display:block}.integrationMonitorMetrics span{font-size:11px;color:#58708a;font-weight:800}.integrationMonitorMetrics strong{font-size:clamp(18px,2vw,29px);line-height:1.3;margin:9px 0;overflow-wrap:anywhere}.integrationMonitorMetrics small{font-size:11px;color:#647a91;line-height:1.45}.integrationGood{color:#087354}.integrationWarn{color:#9c6400}.integrationBad{color:#af3024}.integrationTableScroll{overflow-x:auto}.integrationTableScroll table{min-width:760px}.integrationTableCaption{text-align:left;padding:10px 0 14px;color:#536b83;font-size:13px}.integrationResultGuidance{display:block;min-width:200px;margin-top:5px;line-height:1.5;color:#647a91}.integrationMonitorPager{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:20px;font-size:13px}.integrationMonitorPager a{padding:9px 12px;border:1px solid #c7d6e5;border-radius:8px;color:#1254b5;text-decoration:none;font-weight:800}.integrationMonitorPager>span{color:#647a91}.integrationExportReadiness{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.integrationExportReadiness article{display:grid;gap:7px;padding:16px;border:1px solid #d6e2ed;border-radius:11px;min-width:0}.integrationExportReadiness strong{overflow-wrap:anywhere}.integrationExportReadiness span{font-size:12px;font-weight:800}.integrationExportReadiness small{color:#647a91;font-size:11px}.integrationMonitorFilters :focus-visible,.integrationMonitorPager a:focus-visible{outline:3px solid #5b9cff;outline-offset:3px}
@media(max-width:1100px){.integrationMonitorFilters{grid-template-columns:1fr 1fr}.integrationMonitorMetrics{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:620px){.integrationMonitoringBody{padding:20px}.integrationMonitorFilters,.integrationExportReadiness{grid-template-columns:1fr}.integrationMonitorMetrics{grid-template-columns:1fr 1fr}.integrationMonitorPager{flex-wrap:wrap}}
      `}</style>
      <div className="integrationShell">
        <header className="integrationTop">
          <div>
            <small>ADMINISTRATION · ENTERPRISE INTEGRATIONS</small>
            <h1>Enterprise Integration</h1>
            <p>Connect approved business systems to RPG Excellence through controlled, organisation-scoped API credentials and an auditable integration trail.</p>
          </div>
          <Link href="/portal" className="integrationBack">← Dashboard</Link>
        </header>

        <section className="integrationHero">
          <div>
            <span>VENDOR-NEUTRAL FOUNDATION</span>
            <h2>Controlled read access</h2>
            <p>The integration layer establishes governed API access for ERP, maintenance, audit and business-intelligence platforms. It does not grant unrestricted database access and it does not change existing Company User permissions.</p>
          </div>
          <div className="integrationEndpoint">
            <strong>API v1 status endpoint</strong>
            <code>/api/v1/integration/health</code>
            <small>Authenticate with an RPG Bearer API key.</small>
          </div>
        </section>

        <section className="integrationPrinciples">
          <article><strong>Organisation isolated</strong><span>Every credential is bound to one controlled organisation.</span></article>
          <article><strong>Least privilege</strong><span>Read permissions are granted independently by module.</span></article>
          <article><strong>Traceable use</strong><span>Requests record client, endpoint, status, timestamp and source metadata.</span></article>
        </section>

        {clientListLimited ? <p role="alert">This view contains the newest {clients.length} of {clientResult.count} keys. The key selector and displayed active-key count cover this list only. Request totals without a key filter still cover all organisation keys.</p> : null}
        <IntegrationKeyManager clients={clients} />

        <section className="integrationPanel" id="monitoring">
          <div className="integrationPanelHead">
            <div><span>REQUEST HEALTH</span><h2>Integration monitoring</h2><p>Recorded credential-bound request outcomes for this organisation. Summary cards cover all outcomes in the selected period and key; the outcome filter applies to the table.</p></div>
            <a className="integrationBack" href={requestHref(1, true)}>Refresh monitoring</a>
          </div>
          <div className="integrationMonitoringBody">
            <form method="get" action={ROOT + "#monitoring"} className="integrationMonitorFilters">
              <label>Period<select name="hours" defaultValue={PERIODS.has(period) ? period : "24"}>{[...PERIODS].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>API key<select name="client" defaultValue={clients.some(client => client.id === clientId) ? clientId : ""}><option value="">All organisation keys</option>{clients.map(client => <option key={client.id} value={client.id}>{client.client_name} · {client.key_prefix}</option>)}</select></label>
              <label>Table outcome<select name="outcome" defaultValue={OUTCOMES.has(outcome) ? outcome : "all"}>{[...OUTCOMES].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <button className="integrationPrimary">Apply filters</button>
            </form>
            <p className="integrationMonitorNote">Window: {timeLabel(since)} to {timeLabel(until)}. This view updates when refreshed.</p>
            {invalidFilters ? <p role="alert" className="integrationMessage error">The monitoring filters are invalid or the selected key is unavailable in this register view. Apply the filters again. No request data has been displayed for that selection.</p> : null}
            <div className="integrationMonitorMetrics" aria-label="Recorded request totals">
              <article><span>Requests recorded</span><strong>{metricsAvailable ? total : "Unavailable"}</strong><small>Completed outcomes, not admission events</small></article>
              <article><span>Successful</span><strong className="integrationGood">{metricsAvailable ? successful : "Unavailable"}</strong><small>{metricsAvailable && total > 0 ? (successful / total * 100).toFixed(1) + "% returned 2xx" : "No success rate calculated"}</small></article>
              <article><span>Client errors</span><strong className="integrationWarn">{metricsAvailable ? clientErrors : "Unavailable"}</strong><small>4xx, excluding rate limits</small></article>
              <article><span>Rate limited</span><strong className="integrationWarn">{metricsAvailable ? limited : "Unavailable"}</strong><small>429 · respect Retry-After</small></article>
              <article><span>Service errors</span><strong className="integrationBad">{metricsAvailable ? serviceErrors : "Unavailable"}</strong><small>5xx · review the request reference</small></article>
            </div>
            {!metricsAvailable && !invalidFilters ? <p role="alert">Request totals are unavailable. No incomplete totals have been presented.</p> : null}
            <p className="integrationMonitorNote">Unidentified credentials, failed audit writes and requests without a recorded final outcome are not included in these totals. Check hosting logs when investigating gaps. A successful export response does not confirm receipt or application by another system.</p>
            {eventsResult.error && !invalidFilters ? <p role="alert">The request list is temporarily unavailable. Review hosting logs or retry.</p> : !invalidFilters ? <>
              <div className="integrationTableScroll"><table style={{ width: "100%", borderCollapse: "collapse" }}><caption className="integrationTableCaption">{requestCount === null ? "Available request rows" : requestCount + " matching request outcome(s)"}</caption><thead><tr><th scope="col">Time</th><th scope="col">Key</th><th scope="col">Request</th><th scope="col">Result and next step</th><th scope="col">Request ID</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{timeLabel(event.occurred_at)}</td><td>{clientNames.get(event.api_client_id) || "Unavailable key label"}</td><td><code>{event.http_method} {event.endpoint}</code></td><td><strong className={event.response_status >= 500 ? "integrationBad" : event.response_status >= 400 ? "integrationWarn" : "integrationGood"}>{event.response_status || "Unknown"}</strong><small className="integrationResultGuidance">{responseGuidance(event.response_status)}</small></td><td><code>{event.request_id || "Not recorded"}</code></td></tr>)}</tbody></table></div>
              {!events.length ? <p>{page > 1 ? "No requests on this page. Return to the first page or refresh the window." : "No request outcomes recorded for these filters."}</p> : null}
              <nav className="integrationMonitorPager" aria-label="Request pages">
                {page > 1 ? <a href={requestHref(page - 1)}>← Previous</a> : <span>Previous</span>}
                <span>Page {page}{pages === null ? "" : " of " + pages} · 25 per page</span>
                {pages !== null && page < pages && page < 100000 ? <a href={requestHref(page + 1)}>Next →</a> : <span>Next</span>}
              </nav>
            </> : null}
            {unassignedResult.error ? <p>Legacy finding assignment could not be checked.</p> : unassignedResult.count > 0 ? <p className="integrationGuideWarning"><strong>{unassignedResult.count} legacy finding(s) under the organisation owner's account have no confirmed organisation.</strong> They remain excluded from API export. Review their source before assigning them; do not allocate them automatically.</p> : null}
          </div>
        </section>

        <section className="integrationPanel">
          <div className="integrationPanelHead"><div><span>CREDENTIAL HISTORY</span><h2>Recent key activity</h2><p>Latest 20 recorded creation, revocation and rotation events for this organisation. No API secrets are displayed.</p></div></div>
          <div className="integrationMonitoringBody">
            {activityResult.error ? <p role="alert">Credential activity is temporarily unavailable.</p> : !(activityResult.data || []).length ? <p>No credential activity recorded yet.</p> : <div className="integrationTableScroll"><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th scope="col">Time</th><th scope="col">Activity</th><th scope="col">Key</th><th scope="col">Original key for rotation</th></tr></thead><tbody>{(activityResult.data || []).map(event => <tr key={event.id}><td>{timeLabel(event.occurred_at)}</td><td>{{ key_created: "Key created", key_revoked: "Key revoked", key_rotation_started: "Replacement created; original remains active", key_rotation_completed: "Rotation completed; original revoked" }[event.event_type]}</td><td>{clientNames.get(event.api_client_id) || "Unavailable key label"}</td><td>{event.event_type.startsWith("key_rotation_") ? clientNames.get(event.resource_id) || "Unavailable original-key label" : "—"}</td></tr>)}</tbody></table></div>}
          </div>
        </section>

        <section className="integrationPanel">
          <div className="integrationPanelHead"><div><span>EXPORT CAPTURE</span><h2>Resumable export readiness</h2><p>Checks that each export capture source is initialised. This does not confirm a connected system has synchronised or that all legacy records have valid organisation assignments.</p></div></div>
          <div className="integrationMonitoringBody">
            {captureResult.error ? <p role="alert">Export capture readiness is unavailable. Check that the export-foundation migration was applied.</p> : <div className="integrationExportReadiness">{EXPORT_RESOURCES.map(resource => { const item = captureByResource.get(resource); return <article key={resource}><strong>{resource}</strong><span className={item?.initialized_at ? "integrationGood" : "integrationBad"}>{item?.initialized_at ? "Capture initialised" : "Review required"}</span><small>{item?.initialized_at ? timeLabel(item.initialized_at) : "Capture source missing or not initialised"}</small></article>; })}</div>}
            <p><a href="/api/v1/integration/openapi">Download the API contract</a> for cursor handling, permissions, deletion records and receiver reconciliation.</p>
          </div>
        </section>
        <section className="integrationGuide">
          <header>
            <span>API V1 · QUICK START</span>
            <h2>Connect and verify an approved system</h2>
            <p>Use a test credential first. Replace the example host and key locally, never in source control, support messages or screenshots.</p>
          </header>
          <div className="integrationGuideGrid">
            <details open>
              <summary>1. Authentication</summary>
              <div>
                <p>Send the complete key in the HTTP Authorization header:</p>
                <pre>{`Authorization: Bearer rpg_test_…`}</pre>
                <p>The complete secret is displayed once. RPG Excellence stores only its cryptographic digest.</p>
              </div>
            </details>
            <details>
              <summary>2. Verify the connection</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/health" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>A valid key returns the API version, client, organisation, permissions and request reference without exposing customer records.</p>
              </div>
            </details>
            <details>
              <summary>3. Read controlled audits</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/audits?page=1&page_size=25" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>audits:read</code>. Filters include <code>status</code>, <code>audit_type</code>, <code>planned_from</code> and <code>planned_to</code>.</p>
              </div>
            </details>
            <details>
              <summary>4. Read controlled CAPA-8D cases</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/capa-8d?page=1&page_size=25&case_type=capa" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>capa:read</code>. Filters include <code>case_type</code>, <code>status</code>, <code>severity</code>, <code>source_type</code> and <code>target_before</code>.</p>
              </div>
            </details>
            <details>
              <summary>5. Read controlled assets</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/assets?page=1&page_size=25&ppm_status=overdue" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>assets:read</code>. Filters include <code>asset_type</code>, <code>status</code>, <code>criticality</code> and <code>ppm_status</code>.</p>
              </div>
            </details>
            <details>
              <summary>6. Read controlled suppliers</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/suppliers?page=1&page_size=25&approval_status=approved" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>suppliers:read</code>. Filters include <code>approval_status</code>, <code>criticality</code> and <code>review_status</code>.</p>
              </div>
            </details>
            <details>
              <summary>7. Read controlled Company Users</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/people?page=1&page_size=25&account_status=active" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>people:read</code>. Filters include <code>account_status</code>, <code>site</code> and <code>department</code>. Authentication and invitation data are never returned.</p>
              </div>
            </details>
            <details>
              <summary>8. Read controlled findings</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/findings?page=1&page_size=25&finding_type=major_nc" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>findings:read</code>. Supported finding types are <code>major_nc</code> and <code>minor_nc</code>.</p>
              </div>
            </details>
            <details>
              <summary>9. Read security incidents</summary>
              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/security-incidents?page=1&page_size=25&severity=critical" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>
                <p>The credential requires <code>security_incidents:read</code>. Filters are <code>status</code>, <code>severity</code> and <code>verification_result</code>. Summaries exclude investigation and notification narratives. To request these explicitly use <code>include_details=true</code> with the additional <code>security_incidents:detail</code> permission. Evidence files are not returned.</p>
              </div>
            </details>
            <details>
              <summary>10. Read workplace inspections</summary>
              <div>
                <p>Use <code>workplace_inspections:read</code> for <code>/workplace-inspections</code>, <code>/workplace-inspections/programmes</code> and <code>/workplace-inspections/INSPECTION_ID</code>.</p>
                <p>Risk bands: <code>routine</code>, <code>medium</code>, <code>high</code>, <code>critical</code>. Legacy <code>low</code> and <code>moderate</code> filters map to routine and medium. Responses use <code>comments_actions</code>.</p>
                <p>Default limits are 60 requests per key and 300 per organisation per minute. The health check consumes this budget too.</p>
              </div>
            </details>
            <details>
              <summary>11. Resumable snapshots and change exports</summary>
              <div>
                <p>Use a scoped live key with <code>/api/v1/integration/exports/audits?page_size=25</code> to start an audit snapshot. Other resources include findings, capa-8d, assets, suppliers, people, security-incidents, workplace-inspections and inspection-programmes.</p>
                <p>Follow <code>next_cursor</code> using the <code>cursor</code> query parameter. Save the final <code>checkpoint</code> only after all pages have been applied. On the next poll, pass that checkpoint as the cursor to receive changes and deletion records. Always retain the new final checkpoint, even for an empty batch.</p>
                <p>Deduplicate by record identity and apply <code>change_id</code> as a per-record integer version. Keep deletion versions. Never use a global highest change ID as your sync position. Page sessions expire after 48 hours; checkpoints after 30 days. A <code>410</code> requires a fresh, completed snapshot and destination reconciliation.</p>
                <p>Snapshots must also reconcile records absent from the completed snapshot. The receiving system handles this; the API does not update it automatically. Export capture contains no historical deletions from before installation. Security-incident exports contain summaries only.</p>
                <p>For rotation, create the replacement under API clients, update all connected systems, make a successful data request with the replacement, then complete rotation. Existing cursors can be resumed by an appropriately scoped replacement key in the same organisation.</p>
              </div>
            </details>
            <details>
              <summary>12. Filters, responses and errors</summary>
              <div>
                <ul>
                  <li><code>page</code>: 1 or greater</li>
                  <li><code>page_size</code>: 1–100</li>
                  <li><code>status</code>: open, assigned, in_progress, submitted, returned or closed</li>
                  <li><code>401</code>: invalid, expired or revoked key</li>
                  <li><code>403</code>: missing permission, blocked source, test-data restriction or inactive organisation entitlement</li>
                  <li><code>429</code>: request budget exceeded; respect <code>Retry-After</code></li>
                  <li><code>503</code>: a required database or audit service is unavailable; no successful data response is released</li>
                  <li><code>400</code>: unsupported filter value</li>
                </ul>
              </div>
            </details>
          </div>
          <div className="integrationGuideWarning"><strong>Credential control:</strong> test keys can call the health endpoint only and cannot read customer registers. Live keys require an active organisation subscription on every request. Grant minimum permissions, set an expiry and revoke credentials when access ends. Write routes, sandbox datasets and outbound webhooks are not available in this release.</div>
        </section>
      </div>
    </main>
  );
}
