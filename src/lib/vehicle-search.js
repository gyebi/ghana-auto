
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

function getSearchableVehicles(vehicles) {
  return Array.isArray(vehicles)
    ? vehicles.filter((vehicle) => vehicle && typeof vehicle === "object")
    : [];
}

function matchesFilter(value, filter) {
  return (
    typeof value === "string" &&
    value.toLowerCase() === filter
  );
}

export function getVehicleSearchOptions(vehicles) {
  const searchableVehicles = getSearchableVehicles(vehicles);

  const makes = [
    ...new Set(
      searchableVehicles
        .map((vehicle) => vehicle.make)
        .filter((make) => typeof make === "string" && make.length > 0)
    ),
  ].sort();

  const modelsByMake = {};

  for (const make of makes) {
    modelsByMake[make] = [
      ...new Set(
        searchableVehicles
          .filter((vehicle) => vehicle.make === make)
          .map((vehicle) => vehicle.model)
          .filter(
            (model) => typeof model === "string" && model.length > 0
          )
      ),
    ].sort();
  }

  const types = [
    ...new Set(
      searchableVehicles
        .map((vehicle) => vehicle.bodyType)
        .filter((type) => typeof type === "string" && type.length > 0)
    ),
  ].sort();

  return { makes, modelsByMake, types };
}

export function searchVehicles(vehicles, params = {}) {
  const make = normalizeFilter(params.make);
  const model = normalizeFilter(params.model);
  const type = normalizeFilter(params.type);

  if ([make, model, type].includes(null)) {
    return [];
  }

  return getSearchableVehicles(vehicles).filter((vehicle) => {
    return (
      (!make || matchesFilter(vehicle.make, make)) &&
      (!model || matchesFilter(vehicle.model, model)) &&
      (!type || matchesFilter(vehicle.bodyType, type))
    );
  });
}

export function hasVehicleSearchFilters(params = {}) {
  return ["make", "model", "type"].some((key) => {
    const value = params[key];

    return (
      (typeof value === "string" && value.trim() !== "") ||
      Array.isArray(value)
    );
  });
}
