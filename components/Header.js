import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ locale, nav }) {
  return (
    <header className="header">
      <Link href={`/${locale}`} className="brand" aria-label="RPG Excellence home">
        <span className="brandMark">RPG</span>
        <span className="brandWords">
          <strong>EXCELLENCE</strong>
          <small>AI BUSINESS ASSURANCE</small>
        </span>
      </Link>

      <nav className="nav">
        <Link href={`/${locale}`}>{nav.home}</Link>
        <a href={`/${locale}#iso`}>{nav.services}</a>
        <Link href={`/${locale}/ai-tools`}>{nav.ai}</Link>
        <Link href={`/${locale}/pricing`}>{nav.pricing}</Link>
        <Link href={`/${locale}/about`}>{nav.about}</Link>
        <Link href={`/${locale}/contact`}>{nav.contact}</Link>
      </nav>

<div className="headerActions">
  <LanguageSwitcher current={locale} />

  <a
    className="button buttonSmall"
    href="https://outlook.office.com/bookwithme/user/3e31957cbcf643eb8e7e828a5eac6aaa@rpgexcellence.com/meetingtype/EUQpnH6tqUOohgd_4L5-8w2?anonymous&ismsaljsauthenabled&ep=mlink"
    target="_blank"
    rel="noopener noreferrer"
  >
    Book
  </a>
</div>
    </header>
  );
}
