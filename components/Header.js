import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ locale, nav }) {
  return (
    <header className="header">
      <Link
        href={`/${locale}`}
        className="brand"
        aria-label="RPG Excellence home"
        style={{
          width: "230px",
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
            width: "230px",
            maxWidth: "230px",
            height: "70px",
            maxHeight: "70px",
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />
      </Link>

      <nav className="nav">
        <Link href={`/${locale}`}>
          {nav.home}
        </Link>

        <a href={`/${locale}#iso`}>
          {nav.services}
        </a>

        <Link href={`/${locale}/ai-tools`}>
          {nav.ai}
        </Link>

        <Link href={`/${locale}/pricing`}>
          {nav.pricing}
        </Link>

        <Link href={`/${locale}/about`}>
          {nav.about}
        </Link>

        <Link href={`/${locale}/contact`}>
          {nav.contact}
        </Link>
      </nav>

      <div className="headerActions">
        <LanguageSwitcher current={locale} />

        <a
          href="/portal/login"
          className="button buttonSmall"
          style={{
            background: "transparent",
            color: "#071A33",
            border: "1px solid #d8e0ea",
          }}
        >
          Sign in
        </a>

        <a
          className="button buttonSmall"
          href="YOUR_BOOKING_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          Book
        </a>
      </div>
    </header>
  );
}
