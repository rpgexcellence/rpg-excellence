import Link from "next/link";

export default function Footer({ locale }) {
  return (
    <footer>
      <div className="footer">
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

        <a
          className="footerSaasBadge"
          href="https://saasbrowser.com/en/saas/1646002/rpg-intelligence"
          target="_blank"
          rel="nofollow noopener noreferrer"
          aria-label="View RPG Intelligence in the SaaS Browser product directory (opens in a new tab)"
          title="RPG Intelligence — SaaS product directory"
        >
          <img
            src="https://static-files.saasbrowser.com/saas-browser-badge-14.svg"
            alt="RPG Intelligence - SaaS product directory"
            width="200"
            height="54"
          />
        </a>

        <a
          className="footerLinkedIn"
          href="https://www.linkedin.com/in/rpg-excellence-b8971942b"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow RPG Excellence on LinkedIn (opens in a new tab)"
          title="Follow RPG Excellence on LinkedIn"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5.3 7.8H1.7V19h3.6V7.8ZM3.5 2.2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2ZM11.1 7.8H7.7V19h3.6v-5.5c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V19h3.6v-6.1c0-3-0.6-5.4-4.2-5.4-1.7 0-2.9.9-3.4 1.8h-.1V7.8Z" />
          </svg>
          <span>LinkedIn</span>
        </a>

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
      </div>
    </footer>
  );
}
