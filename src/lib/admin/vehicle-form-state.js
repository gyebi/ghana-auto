export const vehicleFormFieldOrder = [
  "year",
  "make",
  "model",
  "bodyType",
  "condition",
  "transmission",
  "fuelType",
  "mileage",
  "location",
  "price",
  "currency",
  "inventoryType",
  "originCountry",
  "estimatedLeadTimeMinDays",
  "estimatedLeadTimeMaxDays",
  "shippingCostEstimate",
  "clearingCostEstimate",
  "otherImportCostEstimate",
  "importCurrency",
  "importNotes",
  "description",
];

export function getFirstInvalidVehicleFormField(errors = {}) {
  return vehicleFormFieldOrder.find((name) => errors[name]) ?? null;
}

export function focusFirstInvalidVehicleFormField(errors, getElementById) {
  const fieldName = getFirstInvalidVehicleFormField(errors);
  if (!fieldName) return null;

  const field = getElementById(fieldName);
  field?.focus({ preventScroll: true });
  field?.scrollIntoView({ block: "center" });

  return fieldName;
}
