
import { getAvailableVehicles } from "@/data/vehicles";

const MAX_FILTER_LENGTH = 80;

function normalizeFilter(value) {
  if (value === undefined || value === "") return "";

  if (
    typeof value !== "string" ||
    value.length > MAX_FILTER_LENGTH
  ) {
    return null;
  }

  return value.trim().toLowerCase();
}

export function getVehicleSearchOptions() {
  const vehicles = getAvailableVehicles();

  const makes = [
    ...new Set(vehicles.map((vehicle) => vehicle.make)),
  ].sort();

  const modelsByMake = {};

  for (const make of makes) {
    modelsByMake[make] = [
      ...new Set(
        vehicles
          .filter((vehicle) => vehicle.make === make)
          .map((vehicle) => vehicle.model)
      ),
    ].sort();
  }

  const types = [
    ...new Set(vehicles.map((vehicle) => vehicle.bodyType)),
  ].sort();

  return { makes, modelsByMake, types };
}

export function searchVehicles(params = {}) {
  const make = normalizeFilter(params.make);
  const model = normalizeFilter(params.model);
  const type = normalizeFilter(params.type);

  if ([make, model, type].includes(null)) {
    return [];
  }

  return getAvailableVehicles().filter((vehicle) => {
    return (
      (!make || vehicle.make.toLowerCase() === make) &&
      (!model || vehicle.model.toLowerCase() === model) &&
      (!type || vehicle.bodyType.toLowerCase() === type)
    );
  });
}
