
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import VehicleGallery from "@/components/vehicles/VehicleGallery";
import { getPublicVehicleBySlug } from "@/lib/db/vehicle-repository";
import {
  formatVehiclePrice,
  formatMileage,
  getVehicleTitle,
} from "@/lib/vehicle-format";

import VehicleShare from "@/components/vehicles/VehicleShare";

import "./vehicle-detail.css";

export const metadata = {
  title: "Vehicle Details | Ghana Auto",
  robots: {
    index: false,
    follow: false,
  },
};

async function VehicleDetailContent({ params }) {
  const { slug } = await params;
  const vehicle = await getPublicVehicleBySlug(slug);

  if (!vehicle) notFound();

  const title = getVehicleTitle(vehicle);
  const isImportOrder = vehicle.inventoryType === "IMPORT_ORDER";
  const isInTransit = vehicle.inventoryType === "IN_TRANSIT";
  const availability = isImportOrder
    ? "Available to Order"
    : isInTransit
      ? "In Transit"
      : "Available";
  const leadTime =
    vehicle.estimatedLeadTimeMinDays != null &&
    vehicle.estimatedLeadTimeMaxDays != null
      ? `${vehicle.estimatedLeadTimeMinDays}–${vehicle.estimatedLeadTimeMaxDays} days`
      : vehicle.estimatedLeadTimeMinDays != null
        ? `from ${vehicle.estimatedLeadTimeMinDays} days`
        : vehicle.estimatedLeadTimeMaxDays != null
          ? `up to ${vehicle.estimatedLeadTimeMaxDays} days`
          : null;

  const specifications = [
    ["Make", vehicle.make],
    ["Model", vehicle.model],
    ["Year", vehicle.year],
    ["Body Type", vehicle.bodyType],
    ["Condition", vehicle.condition],
    ["Transmission", vehicle.transmission],
    ["Fuel", vehicle.fuelType],
    ["Mileage", formatMileage(vehicle.mileage)],
    [
      "Location",
      isImportOrder
        ? "Not currently in local inventory"
        : isInTransit
          ? "Currently in transit"
          : vehicle.location
            ? `${vehicle.location}, Ghana`
            : null,
    ],
    ["Stock ID", vehicle.id],
  ];

  return (
    <article className="vehicle-detail-container">
      <nav aria-label="Breadcrumb" className="vehicle-breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/cars">Browse Cars</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="vehicle-detail-heading">
        <div>
          <p className="vehicle-detail-eyebrow">
            {isImportOrder ? "IMPORT ORDER" : availability.toUpperCase()}
          </p>
          <h1>{title}</h1>
          <p>{vehicle.condition} · {vehicle.bodyType}</p>
        </div>
      </div>

      <div className="vehicle-detail-grid">
        <div className="vehicle-detail-left">
          <VehicleGallery
            images={vehicle.images}
            title={title}
          />

          <section className="vehicle-specifications">
            <h2>Vehicle Specifications</h2>

            <dl className="vehicle-spec-grid">
              {specifications.map(([label, value]) => (
                <div className="vehicle-spec" key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? "Not specified"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {vehicle.description && (
            <section className="vehicle-description">
              <h2>About This Vehicle</h2>
              <p>{vehicle.description}</p>
            </section>
          )}
        </div>

        <aside className="vehicle-detail-sidebar">
          <div className="vehicle-price-card">
            <p className="price-label">ASKING PRICE</p>

            <p className="vehicle-detail-price">
              {formatVehiclePrice(vehicle.price)}
            </p>

            <span className="vehicle-availability">
              {availability}
            </span>

            {isImportOrder && (
              <p className="vehicle-availability-note">
                This vehicle is available to order and is not
                currently in local stock.
                {leadTime && (
                  <> Estimated lead time: {leadTime}, subject to confirmation.</>
                )}
              </p>
            )}

            {isInTransit && (
              <p className="vehicle-availability-note">
                This vehicle is in transit. Arrival timing is an
                estimate and subject to confirmation.
              </p>
            )}

            <div className="vehicle-quick-specs">
              <p><strong>Year:</strong> {vehicle.year}</p>
              <p>
                <strong>Mileage:</strong>{" "}
                {formatMileage(vehicle.mileage)}
              </p>
              <p>
                <strong>Transmission:</strong>{" "}
                {vehicle.transmission}
              </p>
              <p>
                <strong>Location:</strong>{" "}
                {isImportOrder
                  ? "Not currently in local inventory"
                  : isInTransit
                    ? "Currently in transit"
                    : vehicle.location ?? "Not specified"}
              </p>
            </div>

            <Link
              href={`/contact?vehicle=${encodeURIComponent(vehicle.id)}`}
              className="vehicle-enquire-btn"
            >
              Enquire About This Car
            </Link>
            <VehicleShare title={title} />


            <p className="vehicle-detail-disclaimer">
              Demonstration listing only. Prices, specifications,
              and availability require confirmation.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

export default function VehicleDetailPage({ params }) {
  return (
    <main className="vehicle-detail-page">
      <Suspense
        fallback={
          <div className="vehicle-detail-loading" role="status">
            Loading vehicle details...
          </div>
        }
      >
        <VehicleDetailContent params={params} />
      </Suspense>
    </main>
  );
}
