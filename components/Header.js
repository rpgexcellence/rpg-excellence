import Link from "next/link";
import ISO9001ReleaseBar from "./ISO9001ReleaseBar";

const ISO_AT_A_GLANCE = [
["ISO/IEC 17025:2017", "Testing and calibration laboratories", "iso-17025", "LAB"],
["ISO 9001:2015", "Quality management — Amendment 1:2024", "iso-9001-2015", "Q15"],
["ISO 9001:2026", "Quality management — 2026 edition", "iso-9001", "Q"],
["ISO 14001", "Environmental management", "iso-14001", "E"],
["ISO 45001", "Occupational health & safety", "iso-45001", "S"],
["ISO 22301", "Business continuity", "iso-22301", "B"],
["ISO 27001", "Information security", "iso-27001", "IS"],
];

export default function Header({ locale, nav, variant = "default" }) {
return (
<>
<header className={header ${variant === "home" ? "homeHeader" : ""}}>
<style>{          .isoAtGlance{position:relative;margin:0}
          .isoAtGlance>summary{display:flex;align-items:center;gap:6px;list-style:none;cursor:pointer;color:inherit;font:inherit;font-weight:800;white-space:nowrap}
          .isoAtGlance>summary::-webkit-details-marker{display:none}
          .isoAtGlance>summary:after{content:"⌄";font-size:12px;transition:transform .18s ease}
          .isoAtGlance[open]>summary:after{transform:rotate(180deg)}
          .isoAtGlanceMenu{position:absolute;top:calc(100% + 18px);left:50%;width:370px;padding:10px;border:1px solid #d7e2ed;border-radius:14px;background:#fff;color:#0a2342;box-shadow:0 22px 55px rgba(4,31,64,.22);opacity:0;visibility:hidden;transform:translate(-50%,-7px);transition:opacity .16s ease,transform .16s ease,visibility .16s;z-index:80}
          .isoAtGlance:hover .isoAtGlanceMenu,.isoAtGlance:focus-within .isoAtGlanceMenu,.isoAtGlance[open] .isoAtGlanceMenu{opacity:1;visibility:visible;transform:translate(-50%,0)}
          .isoAtGlanceMenu:before{content:"";position:absolute;left:0;right:0;top:-20px;height:20px}
          .isoAtGlanceTitle{display:block;padding:7px 9px 9px;color:#607a95;font-size:10px;font-weight:950;letter-spacing:.14em}
          .isoAtGlanceMenu>a{display:grid!important;grid-template-columns:38px 1fr 18px;gap:10px;align-items:center;padding:10px!important;border-radius:9px;color:#12385f!important;opacity:1!important}
          .isoAtGlanceMenu>a:hover,.isoAtGlanceMenu>a:focus{background:#edf4ff;color:#174fbc!important;outline:none}
          .isoAtGlanceMenu>a>i{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#e7efff;color:#245ee8;font-style:normal;font-size:11px;font-weight:950}
          .isoAtGlanceMenu>a span{display:grid;gap:2px}
          .isoAtGlanceMenu>a strong{font-size:13px}
          .isoAtGlanceMenu>a small{color:#6b8298;font-size:10px;font-weight:600}
          .isoAtGlanceMenu>a>b{color:#245ee8;font-size:15px}
          .mobileNav{display:none;position:relative;margin-left:auto}
          .mobileNav>summary{display:grid;width:44px;height:44px;place-items:center;border:1px solid ${variant === "home" ? "#6783a5" : "#d2dce7"};border-radius:11px;background:${variant === "home" ? "#ffffff12" : "#fff"};color:inherit;list-style:none;cursor:pointer}
          .mobileNav>summary::-webkit-details-marker{display:none}
          .mobileNavIcon,.mobileNavIcon:before,.mobileNavIcon:after{display:block;width:20px;height:2px;border-radius:3px;background:currentColor;content:""}
          .mobileNavIcon{position:relative}
          .mobileNavIcon:before{position:absolute;top:-6px}
          .mobileNavIcon:after{position:absolute;top:6px}
          .mobileNav[open] .mobileNavIcon{background:transparent}
          .mobileNav[open] .mobileNavIcon:before{top:0;transform:rotate(45deg)}
          .mobileNav[open] .mobileNavIcon:after{top:0;transform:rotate(-45deg)}
          .mobileNavPanel{position:fixed;z-index:200;top:72px;left:12px;right:12px;max-height:calc(100vh - 88px);overflow:auto;padding:12px;border:1px solid #d6e1ec;border-radius:16px;background:#fff;color:#0a2342;box-shadow:0 24px 65px #03152d40}
          .mobileNavPanel>a,.mobileIso>summary{display:flex;align-items:center;justify-content:space-between;min-height:48px;padding:12px 13px;border-radius:10px;color:#12385f;font-size:14px;font-weight:850;cursor:pointer;list-style:none}
          .mobileNavPanel>a:after,.mobileIso>summary:after{content:"→";color:#1761e8}
          .mobileNavPanel>a:hover,.mobileNavPanel>a:focus,.mobileIso>summary:hover{background:#edf4ff;outline:0}
          .mobileIso>summary::-webkit-details-marker{display:none}
          .mobileIsoLinks{display:grid;gap:3px;padding:4px 7px 9px 17px;border-left:2px solid #dbe7f4;margin-left:13px}
          .mobileIsoLinks>a{padding:9px 10px;border-radius:8px;color:#365570;font-size:13px;font-weight:750}
          .mobileIsoLinks>a:hover{background:#f1f6fc}
          .mobileNavActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;padding-top:12px;border-top:1px solid #e2e9f0}
          .mobileNavActions a{min-height:44px;padding:11px;border-radius:10px;text-align:center;font-size:13px;font-weight:900}
          .mobileSignIn{border:1px solid #cad7e4;color:#12385f}
          .mobileStart{background:#1761e8;color:#fff}
          .mobileYouTube{grid-column:1/-1;background:#fff1f3;color:#c70028}
          @media(max-width:900px){
            .isoAtGlanceMenu{left:auto;right:0;transform:translate(0,-7px)}
            .isoAtGlance:hover .isoAtGlanceMenu,.isoAtGlance:focus-within .isoAtGlanceMenu,.isoAtGlance[open] .isoAtGlanceMenu{transform:translate(0,0)}
          }
          @media(min-width:1401px) and (max-width:1500px){
            .header:not(.homeHeader) .brand,.header:not(.homeHeader) .brand img{width:220px!important}
          }
          @media(max-width:1400px){
            .header .nav{display:none!important}
            .mobileNav{display:block}
            .headerActions{display:none!important}
            .header .brand{width:190px!important;height:60px!important}
            .header .brand img{width:190px!important;height:60px!important}
          }
       }</style>

    <Link
      href={`/${locale}`}
      className="brand"
      aria-label="RPG Excellence home"
      style={{
        width: "260px",
        height: "70px",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        textDecoration: "none",
      }}
    >
      <img
        src="/rpg-excellence-logo.png"
        alt="RPG Excellence"
        style={{
          display: "block",
          width: "260px",
          maxWidth: "260px",
          height: "70px",
          maxHeight: "70px",
          objectFit: "contain",
          objectPosition: "left center",
        }}
      />
    </Link>

    <nav className="nav homeNav">
      <Link href={`/${locale}/ai-tools`}>Platform &amp; Resources</Link>

      <details className="isoAtGlance">
        <summary>ISO at a Glance</summary>

        <div
          className="isoAtGlanceMenu"
          aria-label="ISO standards at a glance"
        >
          <span className="isoAtGlanceTitle">SELECT A STANDARD</span>

          {ISO_AT_A_GLANCE.map(([code, name, slug, icon]) => (
            <Link href={`/${locale}/${slug}`} key={code}>
              <i>{icon}</i>

              <span>
                <strong>{code}</strong>
                <small>{name}</small>
              </span>

              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </details>

      <a href={`/${locale}#solutions`}>Solutions</a>
      <Link href={`/${locale}/insights`}>Insights</Link>
      <Link href={`/${locale}/publications`}>Publications</Link>
      <Link href={`/${locale}/insights#newsletter`}>Newsletter</Link>
      <Link href={`/${locale}/pricing`}>{nav.pricing}</Link>
      <Link href={`/${locale}/about`}>{nav.about}</Link>
      <Link href={`/${locale}/contact`}>{nav.contact}</Link>
    </nav>

    <details className="mobileNav">
      <summary aria-label="Open website menu">
        <span className="mobileNavIcon" />
      </summary>

      <div
        className="mobileNavPanel"
        aria-label="Mobile website navigation"
      >
        <Link href={`/${locale}`}>Home</Link>
        <Link href={`/${locale}/ai-tools`}>Platform &amp; Resources</Link>

        <details className="mobileIso">
          <summary>ISO at a Glance</summary>

          <div className="mobileIsoLinks">
            {ISO_AT_A_GLANCE.map(([code, name, slug]) => (
              <Link href={`/${locale}/${slug}`} key={code}>
                <strong>{code}</strong> · {name}
              </Link>
            ))}
          </div>
        </details>

        <a href={`/${locale}#solutions`}>Solutions</a>
        <Link href={`/${locale}/insights`}>Insights</Link>
        <Link href={`/${locale}/publications`}>Publications</Link>
        <Link href={`/${locale}/insights#newsletter`}>Newsletter</Link>
        <Link href={`/${locale}/pricing`}>{nav.pricing}</Link>
        <Link href={`/${locale}/about`}>{nav.about}</Link>
        <Link href={`/${locale}/contact`}>{nav.contact}</Link>

        <div className="mobileNavActions">
          <a className="mobileSignIn" href="/portal/login">
            Sign in
          </a>

          <a className="mobileStart" href="/portal">
            Start assessment
          </a>

          <a
            className="mobileYouTube"
            href="https://www.youtube.com/channel/UCZsXSCzL4ebrKafO2515Sow"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch RPG Excellence on YouTube
          </a>
        </div>
      </div>
    </details>

    <div className="headerActions">
      <a
        className={`headerYouTube ${
          variant === "home" ? "headerYouTubeHome" : ""
        }`}
        href="https://www.youtube.com/channel/UCZsXSCzL4ebrKafO2515Sow"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit RPG Excellence on YouTube"
        title="Visit RPG Excellence on YouTube"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            className="youtubeBody"
            d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z"
          />

          <path
            className="youtubePlay"
            d="m9.6 15.6 6.2-3.6-6.2-3.6v7.2Z"
          />
        </svg>
      </a>

      <a
        href="/portal/login"
        className={`button buttonSmall ${
          variant === "home" ? "headerSignIn" : ""
        }`}
        style={
          variant === "home"
            ? undefined
            : {
                background: "transparent",
                color: "#071A33",
                border: "1px solid #d8e0ea",
              }
        }
      >
        Sign in
      </a>

      <a
        className={`button buttonSmall ${
          variant === "home" ? "headerPrimary" : ""
        }`}
        href="/portal"
        aria-label="Start an RPG Excellence assessment"
      >
        Start assessment →
      </a>
    </div>
  </header>

  <ISO9001ReleaseBar locale={locale} />
</>

);
}
