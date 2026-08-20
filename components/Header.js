import Link from "next/link";
import Image from "next/image";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ locale, nav }) {
  return (
    <header className="header">
      <Link
        href={`/${locale}`}
        aria-label="RPG Excellence home"
        style={{
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <Image
          src="/rpg-excellence-logo.png"
          alt="RPG Excellence"
          width={320}
          height={90}
          priority
          style={{
            width: "220px",
            height: "auto",
            objectFit: "contain",
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
