import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";

const MICROSOFT_BOOKING_URL =
  "https://bookings.cloud.microsoft/bookwithme/user/3e31957cbcf643eb8e7e828a5eac6aaa%40rpgexcellence.com?anonymous&ismsaljsauthenabled";

export default function Header({ locale, nav, variant = "default" }) {
  return (
    <header className={`header ${variant === "home" ? "homeHeader" : ""}`}>
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
          <a href={`/${locale}#iso`}>Standards</a>
          <a href={`/${locale}#solutions`}>Solutions</a>
          <Link href={`/${locale}/insights`}>Resources</Link>
          <Link href={`/${locale}/pricing`}>{nav.pricing}</Link>
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
        <LanguageSwitcher current={locale} />

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
