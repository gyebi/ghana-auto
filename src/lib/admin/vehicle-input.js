const MAX_YEAR = new Date().getFullYear() + 1;
const MIN_YEAR = 1886;
const MAX_MILEAGE = 2_000_000;
const MAX_LEAD_TIME_DAYS = 730;
const INVENTORY_TYPES = new Set([
  "LOCAL_STOCK",
  "IMPORT_ORDER",
  "IN_TRANSIT",
]);

const FORM_VALUE_LIMITS = {
  make: 80,
  model: 80,
  year: 16,
  price: 32,
  currency: 16,
  bodyType: 60,
  condition: 60,
  transmission: 60,
  fuelType: 60,
  mileage: 32,
  location: 100,
  description: 5_000,
  inventoryType: 32,
  originCountry: 80,
  estimatedLeadTimeMinDays: 32,
  estimatedLeadTimeMaxDays: 32,
  shippingCostEstimate: 32,
  clearingCostEstimate: 32,
  otherImportCostEstimate: 32,
  importCurrency: 16,
  importNotes: 2_000,
};

function getFormString(formData, name) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

// Only user-editable fields are returned to the client after an unsuccessful
// action. This keeps protected properties out of both the mutation and the
// Server Action response while bounding a malicious action payload.
export function getSubmittedVehicleFormValues(formData) {
  return {
    ...Object.fromEntries(
      Object.entries(FORM_VALUE_LIMITS).map(([name, maxLength]) => [
        name,
        getFormString(formData, name).slice(0, maxLength),
      ])
    ),
    showPrice: formData.get("showPrice") === "on",
  };
}

function getRequiredText(formData, name, label, maxLength, errors) {
  const value = getFormString(formData, name).trim();

  if (!value) {
    errors[name] = `${label} is required.`;
  } else if (value.length > maxLength) {
    errors[name] = `${label} must be ${maxLength} characters or fewer.`;
  }

  return value;
}

function getOptionalText(formData, name, label, maxLength, errors) {
  const value = getFormString(formData, name).trim();

  if (value.length > maxLength) {
    errors[name] = `${label} must be ${maxLength} characters or fewer.`;
  }

  return value || null;
}

function getOptionalInteger(
  formData,
  name,
  label,
  minimum,
  maximum,
  errors
) {
  const value = getFormString(formData, name).trim();

  if (!value) return null;

  if (!/^\d+$/.test(value)) {
    errors[name] = `${label} must be a whole number.`;
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    errors[name] = `${label} must be between ${minimum} and ${maximum}.`;
    return null;
  }

  return number;
}

function getOptionalDecimal(formData, name, label, errors) {
  const value = getFormString(formData, name).trim();

  if (!value) return null;

  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) {
    errors[name] = `${label} must be a non-negative amount with up to two decimal places.`;
    return null;
  }

  const [whole, fraction] = value.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");

  return fraction === undefined
    ? normalizedWhole
    : `${normalizedWhole}.${fraction}`;
}

function getCurrency(formData, name, label, fallback, errors) {
  const value = getFormString(formData, name).trim().toUpperCase() || fallback;

  if (!/^[A-Z]{3}$/.test(value)) {
    errors[name] = `${label} must be a three-letter currency code.`;
    return fallback;
  }

  return value;
}

function getInventoryType(formData, errors) {
  const value = getFormString(formData, "inventoryType");

  if (!INVENTORY_TYPES.has(value)) {
    errors.inventoryType = "Choose a valid inventory type.";
    return "LOCAL_STOCK";
  }

  return value;
}

function slugPart(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateVehicleSlug({ year, make, model, stockCode }) {
  return [year, slugPart(make), slugPart(model), slugPart(stockCode)]
    .filter(Boolean)
    .join("-")
    .slice(0, 120);
}

export function validateVehicleFormData(formData) {
  const errors = {};
  const make = getRequiredText(formData, "make", "Make", 80, errors);
  const model = getRequiredText(formData, "model", "Model", 80, errors);
  const year = getOptionalInteger(
    formData,
    "year",
    "Year",
    MIN_YEAR,
    MAX_YEAR,
    errors
  );
  const price = getOptionalDecimal(formData, "price", "Price", errors);
  const currency = getCurrency(formData, "currency", "Currency", "GHS", errors);
  const inventoryType = getInventoryType(formData, errors);
  const isImportVehicle = inventoryType !== "LOCAL_STOCK";
  const estimatedLeadTimeMinDays = isImportVehicle
    ? getOptionalInteger(
      formData,
      "estimatedLeadTimeMinDays",
      "Minimum lead time",
      1,
      MAX_LEAD_TIME_DAYS,
      errors
    )
    : null;
  const estimatedLeadTimeMaxDays = isImportVehicle
    ? getOptionalInteger(
      formData,
      "estimatedLeadTimeMaxDays",
      "Maximum lead time",
      1,
      MAX_LEAD_TIME_DAYS,
      errors
    )
    : null;

  if (
    estimatedLeadTimeMinDays != null &&
    estimatedLeadTimeMaxDays != null &&
    estimatedLeadTimeMinDays > estimatedLeadTimeMaxDays
  ) {
    errors.estimatedLeadTimeMaxDays =
      "Maximum lead time cannot be less than the minimum.";
  }

  const data = {
    make,
    model,
    year,
    price,
    currency,
    showPrice: formData.get("showPrice") === "on",
    bodyType: getRequiredText(formData, "bodyType", "Body type", 60, errors),
    condition: getRequiredText(formData, "condition", "Condition", 60, errors),
    transmission: getRequiredText(
      formData,
      "transmission",
      "Transmission",
      60,
      errors
    ),
    fuelType: getRequiredText(formData, "fuelType", "Fuel type", 60, errors),
    mileage: getOptionalInteger(
      formData,
      "mileage",
      "Mileage",
      0,
      MAX_MILEAGE,
      errors
    ),
    location: getOptionalText(formData, "location", "Location", 100, errors),
    description: getOptionalText(
      formData,
      "description",
      "Description",
      5_000,
      errors
    ),
    inventoryType,
    originCountry: isImportVehicle
      ? getOptionalText(formData, "originCountry", "Origin country", 80, errors)
      : null,
    estimatedLeadTimeMinDays,
    estimatedLeadTimeMaxDays,
    shippingCostEstimate: isImportVehicle
      ? getOptionalDecimal(formData, "shippingCostEstimate", "Shipping estimate", errors)
      : null,
    clearingCostEstimate: isImportVehicle
      ? getOptionalDecimal(formData, "clearingCostEstimate", "Clearing estimate", errors)
      : null,
    otherImportCostEstimate: isImportVehicle
      ? getOptionalDecimal(formData, "otherImportCostEstimate", "Other import estimate", errors)
      : null,
    importCurrency: isImportVehicle
      ? getCurrency(formData, "importCurrency", "Import currency", currency, errors)
      : null,
    importNotes: isImportVehicle
      ? getOptionalText(formData, "importNotes", "Import notes", 2_000, errors)
      : null,
  };

  if (!Number.isInteger(year)) {
    errors.year ??= `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function isValidAdminVehicleId(id) {
  return (
    typeof id === "string" &&
    id.length >= 10 &&
    id.length <= 64 &&
    /^[A-Za-z0-9_-]+$/.test(id)
  );
}
