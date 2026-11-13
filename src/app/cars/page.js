
import { Suspense } from "react";
import VehicleCard from "@/components/vehicles/VehicleCard";
import VehicleSearch from "@/components/vehicles/VehicleSearch";

import {
  hasVehicleSearchFilters,
  searchVehicles,
  getVehicleSearchOptions,
} from "@/lib/vehicle-search";
import { getPublicVehicles } from "@/lib/db/vehicle-repository";

import "./cars.css";

export const metadata = {
  title: "Browse Cars | Ghana Auto",
  description: "Explore available car listings at Ghana Auto.",
};

// This component runs when request parameters are available.
async function VehicleResults({ searchParams }) {
  const filters = await searchParams;
  const publicVehicles = await getPublicVehicles();

  const vehicles = searchVehicles(publicVehicles, filters);
  const searchOptions = getVehicleSearchOptions(publicVehicles);
  const hasFilters = hasVehicleSearchFilters(filters);

  return (
    <>
      <VehicleSearch
        key={JSON.stringify(filters)}
        searchOptions={searchOptions}
        initialFilters={filters}
      />

      <div className="cars-toolbar">
        <h2>
          {hasFilters ? "Search Results" : "Available Cars"}
        </h2>

        <span>
          {vehicles.length}{" "}
          {vehicles.length === 1 ? "car" : "cars"} found
        </span>
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
          <h2>No matching cars found</h2>
          <p>Try another make, model, or car type.</p>
        </div>
      )}

    </>
  );
}

// This page can provide a static shell during prerendering.
export default function CarsPage({ searchParams }) {
  return (
    <section className="cars-page">
      <div className="cars-container">
        <div className="cars-heading">
          <p className="cars-eyebrow">
            EXPLORE OUR COLLECTION
          </p>

          <h1>Find Your Next Car</h1>

          <p>
            Search our car collection by make,
            model, or car type.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="cars-loading" role="status">
              Loading car inventory...
            </div>
          }
        >
          <VehicleResults searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
