
import { Suspense } from "react";
import Link from "next/link";
import { getAvailableVehicles } from "@/data/vehicles";
import {
  formatVehiclePrice,
  getVehicleTitle,
} from "@/lib/vehicle-format";

import "./contact.css";

export const metadata = {
  title: "Contact Us | Ghana Auto",
  description: "Contact Ghana Auto about a vehicle.",
};

async function ContactContent({ searchParams }) {
  const params = await searchParams;
  const stockId = params.vehicle;

  const vehicle =
    typeof stockId === "string" && stockId.length <= 40
      ? getAvailableVehicles().find(
          (item) => item.id === stockId
        )
      : undefined;

  return (
    <section className="page-container">
      <h1>Contact Ghana Auto</h1>

      {vehicle ? (
        <div className="contact-vehicle">
          <h2>Your Vehicle Enquiry</h2>

          <p>
            You&apos;re interested in:
          </p>

          <h3>{getVehicleTitle(vehicle)}</h3>

          <p>
            <strong>Stock ID:</strong> {vehicle.id}
          </p>

          <p>
            <strong>Price:</strong>{" "}
            {formatVehiclePrice(vehicle.price)}
          </p>

          <Link href={`/cars/${vehicle.slug}`}>
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
