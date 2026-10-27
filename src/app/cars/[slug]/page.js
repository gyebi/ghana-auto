

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import VehicleGallery from "@/components/vehicles/VehicleGallery";
import {
  vehicles,
  getVehicleBySlug,
} from "@/data/vehicles";
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

// Known demo vehicles can be prerendered.
export function generateStaticParams() {
  return vehicles
    .filter((vehicle) => vehicle.status === "AVAILABLE")
    .map((vehicle) => ({
      slug: vehicle.slug,
    }));
}

async function VehicleDetailContent({ params }) {
  const { slug } = await params;

  if (
    typeof slug !== "string" ||
    slug.length > 120 ||
    !/^[a-z0-9-]+$/.test(slug)
  ) {
    notFound();
  }

  const vehicle = getVehicleBySlug(slug);

  // Don't advertise sold or unavailable vehicles.
  if (!vehicle || vehicle.status !== "AVAILABLE") {
    notFound();
  }

  const title = getVehicleTitle(vehicle);

  const specifications = [
    ["Make", vehicle.make],
    ["Model", vehicle.model],
    ["Year", vehicle.year],
    ["Body Type", vehicle.bodyType],
    ["Condition", vehicle.condition],
    ["Transmission", vehicle.transmission],
    ["Fuel", vehicle.fuelType],
    ["Mileage", formatMileage(vehicle.mileage)],
    ["Location", `${vehicle.location}, Ghana`],
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
            AVAILABLE VEHICLE
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
              Available
            </span>

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
                {vehicle.location}
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
              Demo listing only. Prices, specifications,
              and availability are fictional.
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
