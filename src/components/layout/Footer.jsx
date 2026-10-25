

import Link from "next/link";
import "./Footer.css";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Browse Cars", href: "/cars" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="footer-logo">
              GHANA <span>AUTO</span>
            </Link>

            <p>
              Explore our vehicle collection and find
              the right car for your needs.
            </p>
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>

            <nav aria-label="Footer navigation">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="footer-column">
            <h3>Our Vehicles</h3>
            <p>
              Browse our selection of available cars,
              SUVs, and other vehicles.
            </p>

            <Link href="/cars" className="footer-action">
              View Inventory
            </Link>
          </div>

          <div className="footer-column">
            <h3>Contact Us</h3>

            <p>
              Interested in a vehicle? Contact our
              dealership for more information.
            </p>

            <Link href="/contact" className="footer-action">
              Get in Touch
            </Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © 2026 Ghana Auto. All rights reserved.
          </p>

          <p>Built for the Ghanaian automotive market.</p>
        </div>
      </div>
    </footer>
  );
}
