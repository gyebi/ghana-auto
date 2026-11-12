
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  faEnvelope,
  faLocationDot,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { getPublicVehicles } from "@/lib/db/vehicle-repository";
import { isValidPublicStockCode } from "@/lib/db/public-vehicle-policy.mjs";
import { getDealershipContactDetails } from "@/lib/dealership-contact";
import { getVehicleEnquiryContext } from "@/lib/vehicle-enquiry";
import {
  formatVehiclePrice,
} from "@/lib/vehicle-format";
import {
  getConfiguredWhatsAppNumber,
  getGeneralWhatsAppUrl,
  getWhatsAppUrl,
} from "@/lib/whatsapp";

import "./contact.css";

export const metadata = {
  title: "Contact Us | Ghana Auto",
  description: "Contact Ghana Auto about a car.",
};

async function ContactContent({ searchParams }) {
  const params = await searchParams;
  const stockId = params.vehicle;

  const publicVehicles = await getPublicVehicles();
  const vehicle =
    isValidPublicStockCode(stockId)
      ? publicVehicles.find(
          (item) => item.id === stockId
        )
      : undefined;
  const enquiry = getVehicleEnquiryContext(vehicle);
  const contact = getDealershipContactDetails();
  const whatsAppHref = getGeneralWhatsAppUrl();
  const sourcingWhatsAppHref = getWhatsAppUrl(
    getConfiguredWhatsAppNumber(),
    "Hello Ghana Auto, I would like to discuss sourcing a specific car."
  );

  return (
    <article className="contact-page">
      <header className="contact-hero">
        <div className="contact-container contact-hero-layout">
          <div className="contact-hero-copy">
            <p className="contact-eyebrow">CONTACT GHANA AUTO</p>
            <h1>Let&apos;s Talk About Your Next Car</h1>
            <p>
              Have a question about a car, looking for a particular model, or
              need help exploring your options? Get in touch with Ghana Auto
              and let&apos;s discuss your requirements.
            </p>
          </div>

          <div className="contact-photo contact-hero-photo">
            <Image
              src="/images/vehicles/honda-accord-2018.jpg"
              alt="2018 Honda Accord sedan photographed from the front side"
              fill
              priority
              sizes="(max-width: 900px) calc(100vw - 48px), 42vw"
            />
          </div>
        </div>
      </header>

      <div className="contact-container contact-content">
        <section className="contact-methods" aria-labelledby="contact-methods-title">
          <p className="contact-eyebrow">GET IN TOUCH</p>
          <h2 id="contact-methods-title">Contact Methods</h2>

          <div className="contact-method-grid">
            <article className="contact-method-card">
              <FontAwesomeIcon
                className="contact-method-watermark"
                icon={faWhatsapp}
                aria-hidden="true"
              />
              <div className="contact-method-content">
                <div className="contact-method-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={faWhatsapp} />
                </div>
                <h3>WhatsApp</h3>
                <p>Chat directly with the dealership for quick assistance.</p>
                {whatsAppHref ? (
                  <a
                    href={whatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat on WhatsApp
                  </a>
                ) : (
                  <p className="contact-method-unavailable" role="status">
                    WhatsApp is currently unavailable.
                  </p>
                )}
              </div>
            </article>

            <article className="contact-method-card">
              <FontAwesomeIcon
                className="contact-method-watermark"
                icon={faPhone}
                aria-hidden="true"
              />
              <div className="contact-method-content">
                <div className="contact-method-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={faPhone} />
                </div>
                <h3>Call or SMS</h3>
                <p>Speak with our team about available cars and enquiries.</p>
                {contact.phoneNumber ? (
                  <div className="contact-method-actions">
                    <a href={`tel:+${contact.phoneNumber}`}>Call Ghana Auto</a>
                    <a href={`sms:+${contact.phoneNumber}`}>SMS</a>
                  </div>
                ) : (
                  <p className="contact-method-unavailable" role="status">
                    Phone contact is currently unavailable.
                  </p>
                )}
              </div>
            </article>

            <article className="contact-method-card">
              <FontAwesomeIcon
                className="contact-method-watermark"
                icon={faEnvelope}
                aria-hidden="true"
              />
              <div className="contact-method-content">
                <div className="contact-method-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <h3>Email</h3>
                <p>Send us your enquiries or vehicle requirements.</p>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`}>Send an Email</a>
                ) : (
                  <p className="contact-method-unavailable" role="status">
                    Email contact is currently unavailable.
                  </p>
                )}
              </div>
            </article>

            <article className="contact-method-card">
              <FontAwesomeIcon
                className="contact-method-watermark"
                icon={faLocationDot}
                aria-hidden="true"
              />
              <div className="contact-method-content">
                <div className="contact-method-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={faLocationDot} />
                </div>
                <h3>Our Location</h3>
                <p>
                  {contact.address ||
                    "Find our dealership or office location."}
                </p>
                {contact.mapUrl ? (
                  <a
                    href={contact.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Location
                  </a>
                ) : (
                  <p className="contact-method-unavailable" role="status">
                    Location details are currently unavailable.
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>

        {enquiry && (
          <section className="contact-vehicle" aria-labelledby="vehicle-enquiry-title">
            <h2 id="vehicle-enquiry-title">Your Car Enquiry</h2>

            <p>You&apos;re interested in:</p>

            <h3>{enquiry.title}</h3>

            <p>
              <strong>Stock ID:</strong> {enquiry.stockCode}
            </p>

            <p>
              <strong>Price:</strong>{" "}
              {formatVehiclePrice(enquiry.price)}
            </p>

            {enquiry.type === "IMPORT_REQUEST" && (
              <p>
                <strong>Enquiry type:</strong> Import / sourcing request
              </p>
            )}

            <Link href={`/cars/${enquiry.slug}`}>
              ← View Car Again
            </Link>
          </section>
        )}

        <section className="contact-sourcing" aria-labelledby="sourcing-title">
          <div className="contact-sourcing-copy">
            <p className="contact-eyebrow">VEHICLE SOURCING</p>
            <h2 id="sourcing-title">LOOKING FOR A SPECIFIC CAR?</h2>
            <p>
              Tell us your preferred make, model, year, and budget. Ghana Auto
              can discuss available vehicles and possible sourcing or
              import-order options.
            </p>

            <div className="contact-sourcing-actions">
              {sourcingWhatsAppHref && (
                <a
                  className="contact-sourcing-primary"
                  href={sourcingWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chat on WhatsApp
                </a>
              )}
              <Link href="/cars">Browse Cars</Link>
            </div>
          </div>

          <div className="contact-photo contact-sourcing-photo">
            <Image
              src="/images/vehicles/kia-sportage-2021.jpg"
              alt="2021 Kia Sportage SUV exterior"
              fill
              sizes="(max-width: 900px) calc(100vw - 88px), 30vw"
            />
          </div>
        </section>

        <p className="contact-company">
          Ghana Auto is operated by CRESVIA TECHNOLOGIES, a registered company
          in Ghana.
        </p>
      </div>
    </article>
  );
}

export default function ContactPage({ searchParams }) {
  return (
    <Suspense fallback={
      <section className="contact-loading" role="status">
        Loading contact information...
      </section>
    }>
      <ContactContent searchParams={searchParams} />
    </Suspense>
  );
}
