
import { Suspense } from "react";
import Link from "next/link";
import { getPublicVehicles } from "@/lib/db/vehicle-repository";
import { isValidPublicStockCode } from "@/lib/db/public-vehicle-policy.mjs";
import { getVehicleEnquiryContext } from "@/lib/vehicle-enquiry";
import {
  formatVehiclePrice,
} from "@/lib/vehicle-format";

import "./contact.css";

export const metadata = {
  title: "Contact Us | Ghana Auto",
  description: "Contact Ghana Auto about a vehicle.",
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

  return (
    <section className="page-container">
      <h1>Contact Ghana Auto</h1>

      {enquiry ? (
        <div className="contact-vehicle">
          <h2>Your Vehicle Enquiry</h2>

          <p>
            You&apos;re interested in:
          </p>

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
            ← View Vehicle Again
          </Link>
        </div>
      ) : (
        <p>
          Browse our available vehicles or contact
          our dealership for more information.
        </p>
      )}

      <div className="contact-information">
        <h2>Get in Touch</h2>

        <p>
          Official dealership contact details
          will be provided soon.
        </p>

        <p>
          WhatsApp, telephone, and enquiry submissions
          will be enabled after the business
          contact details are confirmed.
        </p>
      </div>
    </section>
  );
}

export default function ContactPage({ searchParams }) {
  return (
    <Suspense fallback={
      <section className="page-container" role="status">
        Loading contact details...
      </section>
    }>
      <ContactContent searchParams={searchParams} />
    </Suspense>
  );
}
