import Link from "next/link";

export default function Footer({ locale }) {
  return (
    <footer className="footer">
      <div>
        <div className="brand footerBrand">
          <span className="brandMark">RPG</span>

          <span className="brandWords">
            <strong>EXCELLENCE</strong>

            <small>
              MANAGEMENT SYSTEMS & BUSINESS ASSURANCE
            </small>
          </span>
        </div>

        <p className="footerNote">
          Quality • Safety • Environment • Security • Resilience
        </p>
      </div>

      <div className="footerLinks">
        <Link href={`/${locale}/insights`}>
          RPG Insights
        </Link>

        <Link href={`/${locale}/faq`}>
          FAQ
        </Link>

        <Link href={`/${locale}/terms`}>
          Terms
        </Link>

        <Link href={`/${locale}/privacy`}>
          Privacy
        </Link>

        <Link href={`/${locale}/cookies`}>
          Cookies
        </Link>
      </div>

      <small>
        © {new Date().getFullYear()} RPG Excellence. All rights reserved.
      </small>
    </footer>
  );
}
