
import VehicleCard from "@/components/vehicles/VehicleCard";
import { getAvailableVehicles } from "@/data/vehicles";
import "./cars.css";

export const metadata = {
  title: "Browse Cars | Ghana Auto",
  description:
    "Explore available vehicle listings at Ghana Auto.",
};

export default function CarsPage() {
  const vehicles = getAvailableVehicles();

  return (
    <section className="cars-page">
      <div className="cars-container">
        <div className="cars-heading">
          <p className="cars-eyebrow">EXPLORE OUR COLLECTION</p>

          <h1>Find Your Next Vehicle</h1>

          <p>
            Browse our selection of vehicles and discover
            options that match your needs.
          </p>
        </div>

        <div className="cars-toolbar">
          <h2>Available Vehicles</h2>
          <span>{vehicles.length} vehicles</span>
        </div>

        {vehicles.length > 0 ? (
          <div className="vehicle-grid">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
              />
            ))}
          </div>
        ) : (
          <div className="cars-empty">
            <h2>No vehicles available</h2>
            <p>Please check back for new listings.</p>
          </div>
        )}

        <p className="cars-demo-notice">
          Demonstration inventory — vehicle details,
          pricing, and availability are fictional.
        </p>
      </div>
    </section>
  );
}
