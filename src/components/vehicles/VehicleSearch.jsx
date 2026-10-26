

"use client";

import { useState } from "react";
import Link from "next/link";
import "./VehicleSearch.css";

export default function VehicleSearch({
  searchOptions,
  initialFilters = {},
}) {
  const { makes, modelsByMake, types } = searchOptions;

  const validMake = makes.includes(initialFilters.make)
    ? initialFilters.make
    : "";

  const validModel = (
    modelsByMake[validMake] || []
  ).includes(initialFilters.model)
    ? initialFilters.model
    : "";

  const validType = types.includes(initialFilters.type)
    ? initialFilters.type
    : "";

  const [make, setMake] = useState(validMake);
  const [model, setModel] = useState(validModel);
  const [type, setType] = useState(validType);

  function handleMakeChange(event) {
    setMake(event.target.value);
    setModel("");
  }

  const models = modelsByMake[make] || [];

  return (
    <section
      className="vehicle-search-section"
      aria-label="Vehicle search filters"
    >
      <form
        action="/cars"
        method="GET"
        className="vehicle-search-form"
      >
        <div className="vehicle-search-field">
          <label htmlFor="vehicle-make">Make</label>

          <select
            id="vehicle-make"
            name="make"
            value={make}
            onChange={handleMakeChange}
          >
            <option value="">All Makes</option>

            {makes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="vehicle-search-field">
          <label htmlFor="vehicle-model">Model</label>

          <select
            id="vehicle-model"
            name="model"
            value={model}
            disabled={!make}
            onChange={(event) => setModel(event.target.value)}
          >
            <option value="">All Models</option>

            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="vehicle-search-field">
          <label htmlFor="vehicle-type">Vehicle Type</label>

          <select
            id="vehicle-type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">All Types</option>

            {types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="vehicle-search-actions">
          <button type="submit" className="vehicle-search-button">
            Search Vehicles
            <span aria-hidden="true">→</span>
          </button>

          <Link href="/cars" className="vehicle-search-reset">
            Reset Filters
          </Link>
        </div>
      </form>
    </section>
  );
}
