import Link from "next/link";

const MICROSOFT_BOOKING_URL =
  "https://bookings.cloud.microsoft/bookwithme/user/3e31957cbcf643eb8e7e828a5eac6aaa%40rpgexcellence.com?anonymous&ismsaljsauthenabled";

const ISO_AT_A_GLANCE = [
  ["ISO 9001", "Quality management", "iso-9001", "Q"],
  ["ISO 14001", "Environmental management", "iso-14001", "E"],
  ["ISO 45001", "Occupational health & safety", "iso-45001", "S"],
  ["ISO 22301", "Business continuity", "iso-22301", "B"],
  ["ISO 27001", "Information security", "iso-27001", "IS"],
];

export default function Header({ locale, nav, variant = "default" }) {
  return (
    <header className={`header ${variant === "home" ? "homeHeader" : ""}`}>
      <style>{`
        .isoAtGlance{position:relative;margin:0}
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
        @media(max-width:900px){.isoAtGlanceMenu{left:auto;right:0;transform:translate(0,-7px)}.isoAtGlance:hover .isoAtGlanceMenu,.isoAtGlance:focus-within .isoAtGlanceMenu,.isoAtGlance[open] .isoAtGlanceMenu{transform:translate(0,0)}}
      `}</style>
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
        {variant === "home" ? <>
          <a href={`/${locale}#platform`}>Platform</a>
          <details className="isoAtGlance">
            <summary>ISO at a Glance</summary>
            <div className="isoAtGlanceMenu" aria-label="ISO standards at a glance">
              <span className="isoAtGlanceTitle">SELECT A STANDARD</span>
              {ISO_AT_A_GLANCE.map(([code, name, slug, icon]) => <Link href={`/${locale}/${slug}`} key={code}><i>{icon}</i><span><strong>{code}</strong><small>{name}</small></span><b aria-hidden="true">→</b></Link>)}
            </div>
          </details>
          <a href={`/${locale}#solutions`}>Solutions</a>
          <Link href={`/${locale}/insights`}>Resources</Link>
          <Link href={`/${locale}/insights#newsletter`}>Newsletter</Link>
          <Link href={`/${locale}/pricing`}>{nav.pricing}</Link>
          <Link href={`/${locale}/contact`}>{nav.contact}</Link>
          <Link href={`/${locale}/insights#newsletter`}>Newsletter</Link>
        </> : <>
          <Link href={`/${locale}`}>{nav.home}</Link>
          <a href={`/${locale}#iso`}>{nav.services}</a>
          <Link href={`/${locale}/ai-tools`}>{nav.ai}</Link>
          <Link href={`/${locale}/pricing`}>{nav.pricing}</Link>
          <Link href={`/${locale}/about`}>{nav.about}</Link>
          <Link href={`/${locale}/contact`}>{nav.contact}</Link>
        </>}
      </nav>

      <div className="headerActions">
        <a
          href="/portal/login"
          className={`button buttonSmall ${variant === "home" ? "headerSignIn" : ""}`}
          style={variant === "home" ? undefined : { background: "transparent", color: "#071A33", border: "1px solid #d8e0ea" }}
        >
          Sign in
        </a>

        <a
          className={`button buttonSmall ${variant === "home" ? "headerPrimary" : ""}`}
          href={variant === "home" ? "/portal" : MICROSOFT_BOOKING_URL}
          target={variant === "home" ? undefined : "_blank"}
          rel={variant === "home" ? undefined : "noopener noreferrer"}
          aria-label={variant === "home" ? "Start an RPG Excellence assessment" : "Book an appointment with RPG Excellence"}
        >
          {variant === "home" ? "Start assessment →" : "Book"}
        </a>
      </div>
    </header>
  );
}
