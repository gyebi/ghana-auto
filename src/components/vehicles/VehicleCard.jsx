
import Link from "next/link";
import Image from "next/image";
import {
  formatVehiclePrice,
  formatMileage,
  getVehicleTitle,
} from "@/lib/vehicle-format";
import "./VehicleCard.css";

export default function VehicleCard({ vehicle }) {
  const title = getVehicleTitle(vehicle);
  const image = vehicle.images?.[0];
  const isImportOrder = vehicle.inventoryType === "IMPORT_ORDER";
  const isInTransit = vehicle.inventoryType === "IN_TRANSIT";
  const leadTime =
    vehicle.estimatedLeadTimeMinDays != null &&
    vehicle.estimatedLeadTimeMaxDays != null
      ? `${vehicle.estimatedLeadTimeMinDays}–${vehicle.estimatedLeadTimeMaxDays} days`
      : vehicle.estimatedLeadTimeMinDays != null
        ? `from ${vehicle.estimatedLeadTimeMinDays} days`
        : vehicle.estimatedLeadTimeMaxDays != null
          ? `up to ${vehicle.estimatedLeadTimeMaxDays} days`
          : null;

  return (
    <article className="vehicle-card">
      <div className="vehicle-card-media">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
            className="vehicle-card-image"
          />
        ) : (
          <div className="vehicle-card-placeholder">
            <span aria-hidden="true">🚘</span>
            <p>Vehicle image coming soon</p>
          </div>
        )}

        <span className="vehicle-card-condition">
          {vehicle.condition}
        </span>
      </div>

      <div className="vehicle-card-body">
        <p className="vehicle-card-stock">
          Stock #{vehicle.id}
        </p>

        <h2 className="vehicle-card-title">
          {title}
        </h2>

        <p className="vehicle-card-price">
          {formatVehiclePrice(vehicle.price)}
        </p>

        <p className="vehicle-card-availability">
          {isImportOrder
            ? "Available to Order"
            : isInTransit
              ? "In Transit"
              : "Available"}
        </p>

        <div className="vehicle-card-specs">
          <span>{vehicle.bodyType}</span>
          <span>{vehicle.transmission}</span>
          <span>{formatMileage(vehicle.mileage)}</span>
        </div>

        {isImportOrder ? (
          <p className="vehicle-card-location">
            Available to order — not currently in local stock.
            {leadTime && <> Estimated lead time: {leadTime}.</>}
          </p>
        ) : isInTransit ? (
          <p className="vehicle-card-location">
            Currently in transit. Arrival timing is subject to confirmation.
          </p>
        ) : (
          <p className="vehicle-card-location">
            <span aria-hidden="true">📍</span>
            {vehicle.location
              ? `${vehicle.location}, Ghana`
              : "Location available on request"}
          </p>
        )}


        <Link
          className="vehicle-card-button"
          href={`/cars/${encodeURIComponent(vehicle.slug)}`}
        >
          View Vehicle Details
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
