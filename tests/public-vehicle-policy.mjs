
import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidPublicVehicleSlug,
  publicVehicleWhere,
  toPublicVehicle,
} from "../src/lib/db/public-vehicle-policy.mjs";
import {
  getVehicleSearchOptions,
  searchVehicles,
} from "../src/lib/vehicle-search.js";
import { formatVehiclePrice } from "../src/lib/vehicle-format.js";
import { getVehicleEnquiryContext } from "../src/lib/vehicle-enquiry.js";

const sampleVehicle = {
  stockCode: "GA-001",
  slug: "2019-toyota-rav4",
  make: "Toyota",
  model: "RAV4",
  year: 2019,
  price: "245000.00",
  currency: "GHS",
  showPrice: true,
  bodyType: "SUV",
  condition: "Foreign Used",
  transmission: "Automatic",
  fuelType: "Petrol",
  mileage: 65000,
  location: "Accra",
  description: "Demo vehicle",
  featured: true,
  published: true,
  status: "AVAILABLE",
  inventoryType: "LOCAL_STOCK",
  originCountry: null,
  estimatedLeadTimeMinDays: null,
  estimatedLeadTimeMaxDays: null,
  estimatedArrivalDate: null,
  images: [
    {
      imageUrl: "/images/vehicles/toyota-rav4-2019.jpg",
    },
  ],
};

test("public queries require published vehicles", () => {
  assert.equal(publicVehicleWhere.published, true);
});

test("public queries exclude sold and draft vehicles", () => {
  assert.equal(publicVehicleWhere.status, "AVAILABLE");
});

test("import-order vehicles are supported", () => {
  assert.ok(
    publicVehicleWhere.inventoryType.in.includes(
      "IMPORT_ORDER"
    )
  );
});

test("visible vehicle prices remain available", () => {
  const result = toPublicVehicle(sampleVehicle);

  assert.equal(result.price, "245000.00");
  assert.equal(result.id, "GA-001");
});

test("vehicle prices format numeric and Prisma decimal values", () => {
  assert.equal(formatVehiclePrice(245000), "GH₵245,000");
  assert.equal(formatVehiclePrice("245000.00"), "GH₵245,000");
});

test("hidden, missing, invalid, and negative prices are safe", () => {
  for (const price of [null, undefined, "not-a-price", -1]) {
    assert.equal(formatVehiclePrice(price), "Price on Request");
  }
});

test("hidden prices are removed from public output", () => {
  const result = toPublicVehicle({
    ...sampleVehicle,
    showPrice: false,
  });

  assert.equal(result.price, null);
  assert.equal(result.showPrice, false);
  assert.equal(
    JSON.stringify(result).includes("245000.00"),
    false
  );
});

test("public output excludes internal database fields", () => {
  const result = toPublicVehicle({
    ...sampleVehicle,
    firebaseUid: "private-uid",
    shippingCostEstimate: "15000.00",
  });

  assert.equal("firebaseUid" in result, false);
  assert.equal("shippingCostEstimate" in result, false);
  assert.equal("clearingCostEstimate" in result, false);
});

test("image paths retain their ordering", () => {
  const result = toPublicVehicle({
    ...sampleVehicle,
    images: [
      { imageUrl: "/first.jpg" },
      { imageUrl: "/second.jpg" },
    ],
  });

  assert.deepEqual(result.images, [
    "/first.jpg",
    "/second.jpg",
  ]);
});

test("unknown vehicle slugs are rejected", () => {
  assert.equal(isValidPublicVehicleSlug("2019-toyota-rav4"), true);
  assert.equal(isValidPublicVehicleSlug("../private"), false);
  assert.equal(isValidPublicVehicleSlug("UPPERCASE"), false);
  assert.equal(isValidPublicVehicleSlug(""), false);
});

const publicSearchVehicles = [
  toPublicVehicle(sampleVehicle),
  toPublicVehicle({
    ...sampleVehicle,
    stockCode: "GA-005",
    slug: "2021-kia-sportage",
    make: "Kia",
    model: "Sportage",
    bodyType: "SUV",
    inventoryType: "IMPORT_ORDER",
  }),
];

test("search filters public vehicles by make, model, and type", () => {
  assert.deepEqual(
    searchVehicles(publicSearchVehicles, { make: "kia" }).map(
      (vehicle) => vehicle.id
    ),
    ["GA-005"]
  );
  assert.deepEqual(
    searchVehicles(publicSearchVehicles, { model: "rav4", type: "suv" }).map(
      (vehicle) => vehicle.id
    ),
    ["GA-001"]
  );
});

test("invalid or repeated search query values fail safely", () => {
  assert.deepEqual(
    searchVehicles(publicSearchVehicles, { make: ["Toyota", "Kia"] }),
    []
  );
  assert.deepEqual(
    searchVehicles(publicSearchVehicles, { type: "x".repeat(81) }),
    []
  );
});

test("search options are built only from the supplied public vehicles", () => {
  const options = getVehicleSearchOptions(publicSearchVehicles);

  assert.deepEqual(options.makes, ["Kia", "Toyota"]);
  assert.deepEqual(options.modelsByMake.Kia, ["Sportage"]);
  assert.deepEqual(options.types, ["SUV"]);
});

test("vehicle enquiry context does not expose a hidden price", () => {
  const context = getVehicleEnquiryContext(
    toPublicVehicle({ ...sampleVehicle, showPrice: false })
  );

  assert.deepEqual(context, {
    stockCode: "GA-001",
    slug: "2019-toyota-rav4",
    title: "2019 Toyota RAV4",
    price: null,
    showPrice: false,
    type: "VEHICLE_ENQUIRY",
  });
});
