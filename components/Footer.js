import Link from "next/link";

export default function Footer({ locale }) {
  return (
    <footer className="footer">
      <div>
        <Link
          href={`/${locale}`}
          aria-label="RPG Excellence home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <img
            src="/rpg-excellence-logo.png"
            alt="RPG Excellence"
            style={{
              width: "250px",
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </Link>
      </div>

      <div className="footerLinks">
        <Link href={`/${locale}/insights`}>
          RPG Insights
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
