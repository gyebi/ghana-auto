"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { usePathname } from "next/navigation";
import "./WhatsAppFloat.css";

export default function WhatsAppFloat({ href }) {
  const pathname = usePathname();

  if (!href || pathname?.startsWith("/admin")) return null;

  return (
    <a
      className="whatsapp-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Ghana Auto on WhatsApp"
    >
      <FontAwesomeIcon icon={faWhatsapp} aria-hidden="true" />
    </a>
  );
}
