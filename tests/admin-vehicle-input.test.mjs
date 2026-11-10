import test from "node:test";
import assert from "node:assert/strict";

import {
  generateVehicleSlug,
  getSubmittedVehicleFormValues,
  validateVehicleFormData,
} from "../src/lib/admin/vehicle-input.js";

function vehicleFormData(overrides = {}) {
  const values = {
    year: "2024",
    make: "Toyota",
    model: "RAV4",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "12000",
    location: "Accra",
    price: "245000.50",
    currency: "ghs",
    inventoryType: "IMPORT_ORDER",
    originCountry: "Japan",
    estimatedLeadTimeMinDays: "30",
    estimatedLeadTimeMaxDays: "60",
    shippingCostEstimate: "12000.00",
    clearingCostEstimate: "8000.50",
    otherImportCostEstimate: "500",
    importCurrency: "GHS",
    importNotes: "Subject to confirmation.",
    description: "A well-maintained SUV.",
    showPrice: "on",
    ...overrides,
  };
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) formData.set(key, value);
  }

  return formData;
}

test("valid vehicle form data uses Decimal-compatible monetary strings", () => {
  const result = validateVehicleFormData(vehicleFormData());

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    make: "Toyota",
    model: "RAV4",
    year: 2024,
    price: "245000.50",
    currency: "GHS",
    showPrice: true,
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 12000,
    location: "Accra",
    description: "A well-maintained SUV.",
    inventoryType: "IMPORT_ORDER",
    originCountry: "Japan",
    estimatedLeadTimeMinDays: 30,
    estimatedLeadTimeMaxDays: 60,
    shippingCostEstimate: "12000.00",
    clearingCostEstimate: "8000.50",
    otherImportCostEstimate: "500",
    importCurrency: "GHS",
    importNotes: "Subject to confirmation.",
  });
});

test("client-supplied stock codes are ignored while editable values are preserved", () => {
  const formData = vehicleFormData({
    stockCode: "ATTACKER-CODE",
    slug: "attacker-slug",
    status: "AVAILABLE",
    published: "true",
    make: "Toyota ",
    showPrice: undefined,
  });

  const result = validateVehicleFormData(formData);

  assert.equal(result.ok, true);
  assert.equal("stockCode" in result.data, false);
  assert.equal("slug" in result.data, false);
  assert.deepEqual(getSubmittedVehicleFormValues(formData), {
    make: "Toyota ",
    model: "RAV4",
    year: "2024",
    price: "245000.50",
    currency: "ghs",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "12000",
    location: "Accra",
    description: "A well-maintained SUV.",
    inventoryType: "IMPORT_ORDER",
    originCountry: "Japan",
    estimatedLeadTimeMinDays: "30",
    estimatedLeadTimeMaxDays: "60",
    shippingCostEstimate: "12000.00",
    clearingCostEstimate: "8000.50",
    otherImportCostEstimate: "500",
    importCurrency: "GHS",
    importNotes: "Subject to confirmation.",
    showPrice: false,
  });
});

test("invalid vehicle year, price, mileage, currency, and import estimates are rejected", () => {
  const result = validateVehicleFormData(vehicleFormData({
    year: "1800",
    price: "12.345",
    mileage: "-1",
    currency: "Ghana cedi",
    estimatedLeadTimeMinDays: "90",
    estimatedLeadTimeMaxDays: "30",
    shippingCostEstimate: "-10",
    importCurrency: "C",
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.year, /between/);
  assert.match(result.errors.price, /non-negative/);
  assert.match(result.errors.mileage, /whole number/);
  assert.match(result.errors.currency, /three-letter/);
  assert.match(result.errors.estimatedLeadTimeMaxDays, /cannot be less/);
  assert.match(result.errors.shippingCostEstimate, /non-negative/);
  assert.match(result.errors.importCurrency, /three-letter/);
});

test("local stock clears import-only values and ignores protected form fields", () => {
  const result = validateVehicleFormData(vehicleFormData({
    inventoryType: "LOCAL_STOCK",
    status: "AVAILABLE",
    published: "true",
    featured: "true",
    id: "attacker-id",
    slug: "attacker-slug",
  }));

  assert.equal(result.ok, true);
  assert.equal(result.data.originCountry, null);
  assert.equal(result.data.shippingCostEstimate, null);
  assert.equal(result.data.importCurrency, null);
  assert.equal("status" in result.data, false);
  assert.equal("published" in result.data, false);
  assert.equal("featured" in result.data, false);
  assert.equal("id" in result.data, false);
  assert.equal("slug" in result.data, false);
});

test("generated slugs include stable vehicle identity information", () => {
  assert.equal(
    generateVehicleSlug({
      year: 2024,
      make: "Toyota",
      model: "RAV4 Adventure",
      stockCode: "GA-100",
    }),
    "2024-toyota-rav4-adventure-ga-100"
  );
});
