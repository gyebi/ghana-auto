

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-GH");

export function formatVehiclePrice(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "Price on request";
  }

  return currencyFormatter.format(value);
}

export function formatMileage(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "Mileage unavailable";
  }

  return `${numberFormatter.format(value)} km`;
}

export function getVehicleTitle(vehicle) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}
