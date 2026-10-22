import { loadZonePPE } from "../../../../../../../lib/zone-ppe";
import Link from "next/link";
import { signsNeedReview } from "../../../../../../../lib/safety-signs.mjs";
import { siteToday } from "../../../../../../../lib/zone-policy.mjs";
import QRCode from "qrcode";
import ZoneEditor from "../../../../../../../components/ZoneEditor";
import ZoneSmallForm from "../../../../../../../components/ZoneSmallForm";
import {
  loadZoneEditor,
  zoneRoot,
  zoneUrl,
  unwrap,
  displayDate,
} from "../../../../../../../lib/site-zones";
import {
  saveZone,
  confirmZonePosterDisplayed,
  previewZonePPE,
} from "../../../zones-actions";
import "../../../zones.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Zone setup | RPG Excellence" };
export default async function ZonePage({ params, searchParams }) {
  const { siteId, zoneId } = await params,
    query = await searchParams;
  const data = await loadZoneEditor(siteId, zoneId === "new" ? null : zoneId);
  const { zone, admin, access } = data;
  const derivedPPE = zone
    ? await loadZonePPE(admin, zone, data.site)
    : { needsReview: false };
  const signReviewDue =
    derivedPPE.needsReview ||
    (zone
      ? signsNeedReview(zone, data.assessments, siteToday(data.site.timezone))
      : false);
  let url = null,
    qr = null,
    posterError = "";
  if (zone) {
    try {
      url = zoneUrl(zone.public_token);
      qr = await QRCode.toDataURL(url, {
        width: 350,
        margin: 4,
        errorCorrectionLevel: "M",
      });
    } catch (e) {
      posterError = e.message;
    }
  }
  const concerns = zone
    ? unwrap(
        await admin
          .from("organization_zone_concerns")
          .select("id,description,status,resolution,created_at")
          .eq("zone_id", zone.id)
          .eq("organization_id", access.organization.id)
          .order("created_at", { ascending: false }),
      )
    : [];
  return (
    <main className="zone-page">
      <div className="zone-shell">
        <header className="zone-header">
          <div>
            <small>
              ADMINISTRATION / {data.site.site_name} / BUILDINGS &amp; ZONES
            </small>
            <h1>{zone ? `Manage ${zone.reference}` : "Create zone"}</h1>
            <p>Give this work area a permanent home for safety information.</p>
          </div>
          <Link className="zone-link" href={zoneRoot(siteId)}>
            ← Buildings &amp; zones
          </Link>
        </header>
        {query?.saved && (
          <p className="zone-notice" role="status">
            Zone saved. Updates appear on the employee page according to its
            publication and access settings.
          </p>
        )}
        <ZoneEditor
          previewPPEAction={previewZonePPE}
          ppeCandidate={data.ppeCandidate}
          action={saveZone}
          site={data.site}
          zone={zone}
          buildings={data.buildings}
          people={data.people}
          programmes={data.programmes}
          inspections={data.inspections}
          assessments={data.assessments}
          assessmentIds={data.assessmentIds}
        />
        {zone && (
          <section className="zone-panel">
            <h2>Permanent zone connection</h2>
            {signReviewDue && (
              <p className="zone-review-warning">
                Safety signs require review. Confirm the current assessment
                links and reviewer approval before downloading a new poster.
              </p>
            )}
            <p>
              Current poster revision:{" "}
              <strong>{zone.poster_revision || 1}</strong>
            </p>
            {zone.poster_displayed_revision === zone.poster_revision &&
            zone.poster_displayed_at ? (
              <p className="zone-notice">
                Revision {zone.poster_displayed_revision} confirmed displayed on{" "}
                {displayDate(zone.poster_displayed_at)}.
              </p>
            ) : (
              <p className="zone-review-warning">
                {zone.poster_displayed_revision
                  ? "Poster needs reprinting."
                  : "Current poster not confirmed displayed."}{" "}
                Download the current poster, replace the physical copies and
                then confirm below.
              </p>
            )}
            {url && (
              <>
                <code>{url}</code>
                <img
                  className="zone-qr"
                  src={qr}
                  alt={`QR code for ${zone.name}`}
                  width="190"
                  height="190"
                />
              </>
            )}
            {posterError && <p className="zone-error">{posterError}</p>}
            <div className="zone-buttons">
              {zone.status === "published" && (
                <Link
                  className="zone-link"
                  href={`/area/${zone.public_token}/concerns`}
                >
                  Open anonymous report form
                </Link>
              )}
              {zone.status !== "archived" && (
                <Link
                  className="zone-link"
                  href={`/area/${zone.public_token}?preview=1`}
                >
                  Preview employee page
                </Link>
              )}
              {zone.status === "published" &&
                data.site.status === "active" &&
                url &&
                !signReviewDue && (
                  <>
                    <a
                      className="zone-button"
                      href={`${zoneRoot(siteId)}/${zone.id}/poster?size=A4`}
                    >
                      Download A4 poster
                    </a>
                    <a
                      className="zone-link"
                      href={`${zoneRoot(siteId)}/${zone.id}/poster?size=A3`}
                    >
                      Download A3 poster
                    </a>
                  </>
                )}
            </div>
            {zone.status === "published" &&
              data.site.status === "active" &&
              !signReviewDue && (
                <ZoneSmallForm
                  action={confirmZonePosterDisplayed}
                  label="Confirm current poster is displayed"
                >
                  <input type="hidden" name="site_id" value={siteId} />
                  <input type="hidden" name="zone_id" value={zone.id} />
                  <input
                    type="hidden"
                    name="poster_revision"
                    value={zone.poster_revision || 1}
                  />
                  <label className="zone-check">
                    <input type="checkbox" name="confirm_displayed" required />I
                    have displayed the current poster and replaced outdated
                    copies at this zone.
                  </label>
                </ZoneSmallForm>
              )}
            <p>
              Posters are available for published zones at active sites. NFC
              tags can use the same permanent link; a physical tag must be
              programmed separately.
            </p>
          </section>
        )}
        {zone && (
          <section className="zone-panel">
            <h2>Incidents &amp; concerns</h2>
            <p>
              <Link href={`/portal/incidents?zone=${zone.id}`}>
                Open this zone in the Accident, Incident &amp; Near Misses
                register →
              </Link>
            </p>
            <p>
              New public reports, investigations, resources and verified actions
              are managed in the unified register. Historic concerns below are
              retained as source records and imported for triage.
            </p>
            {!concerns.length && (
              <p>No historic concerns were recorded in this zone.</p>
            )}
            {concerns.map((c) => (
              <article className="zone-card" key={c.id}>
                <small>
                  {displayDate(c.created_at)} · {c.status.replaceAll("_", " ")}
                </small>
                <p className="zone-pre">{c.description}</p>
                <p className="zone-pre">
                  {c.resolution || "No historic response recorded."}
                </p>
                <small>
                  Source record retained. Manage the imported case in the
                  incident register.
                </small>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
