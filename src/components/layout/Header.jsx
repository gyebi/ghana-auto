

"use client";

import { useState } from "react";
import Link from "next/link";
import "./Header.css";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Browse Cars", href: "/cars" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-container">
        <Link
          href="/"
          className="site-logo"
          onClick={() => setMenuOpen(false)}
        >
          GHANA <span>AUTO</span>
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

          <Link
            href="/contact"
            className="header-cta"
            onClick={() => setMenuOpen(false)}
          >
            Enquire Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
