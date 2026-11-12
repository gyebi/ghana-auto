

"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WhatsAppFloat from "./WhatsAppFloat";
import "./Header.css";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Browse Cars", href: "/cars" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header({ whatsAppHref }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <Link
            href="/"
            className="site-logo"
            aria-label="Ghana Auto home"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              className="site-logo-image"
              src="/images/branding/ghana-auto-logo-with-flag-stripe.png"
              alt="Ghana Auto"
              width={1774}
              height={887}
              priority
            />
          </Link>

          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((previous) => !previous)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <nav
            id="primary-navigation"
            aria-label="Main navigation"
            className={`header-nav ${menuOpen ? "is-open" : ""}`}
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <Suspense fallback={null}>
        <WhatsAppFloat href={whatsAppHref} />
      </Suspense>
    </>
  );
}
