import test, { mock } from "node:test";
import assert from "node:assert/strict";

const prismaCalls = [];
let nextVehicle = null;
let nextVehicles = [];

mock.module("server-only", {});

mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        vehicle: {
          async findFirst(args) {
            prismaCalls.push(args);
            return nextVehicle;
          },
          async findMany(args) {
            prismaCalls.push(args);
            return nextVehicles;
          },
        },
      };
    },
  },
});

const {
  getPublicHomepageVehicles,
  getPublicVehicleBySlug,
  publicVehicleExistsBySlug,
} = await import("../src/lib/db/vehicle-repository.js");

const publicVehicleRecord = {
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
  status: "AVAILABLE",
  inventoryType: "LOCAL_STOCK",
  originCountry: null,
  estimatedLeadTimeMinDays: null,
  estimatedLeadTimeMaxDays: null,
  images: [
    { imageUrl: "/images/first.jpg" },
    { imageUrl: "/images/second.jpg" },
  ],
};

function resetPrisma(vehicle = null, vehicles = []) {
  prismaCalls.length = 0;
  nextVehicle = vehicle;
  nextVehicles = vehicles;
}

test("homepage retrieval fetches only three eligible cars, featured first", async () => {
  resetPrisma(null, [
    publicVehicleRecord,
    {
      ...publicVehicleRecord,
      stockCode: "GA-002",
      slug: "2020-hyundai-tucson",
      featured: false,
    },
  ]);

  const vehicles = await getPublicHomepageVehicles();

  assert.deepEqual(
    vehicles.map((vehicle) => vehicle.id),
    ["GA-001", "GA-002"]
  );
  assert.equal(prismaCalls.length, 1);
  assert.deepEqual(prismaCalls[0].where, {
    published: true,
    status: "AVAILABLE",
    inventoryType: {
      in: ["LOCAL_STOCK", "IMPORT_ORDER", "IN_TRANSIT"],
    },
    images: { some: { isCover: true } },
  });
  assert.equal(prismaCalls[0].take, 3);
  assert.deepEqual(prismaCalls[0].orderBy, [
    { featured: "desc" },
    { createdAt: "desc" },
  ]);
  assert.deepEqual(prismaCalls[0].select.images, {
    orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    select: { imageUrl: true, isCover: true },
  });
});

test("public detail retrieval uses the approved selection and maps its result", async () => {
  resetPrisma(publicVehicleRecord);

  const vehicle = await getPublicVehicleBySlug("2019-toyota-rav4");

  assert.deepEqual(vehicle, {
    id: "GA-001",
    slug: "2019-toyota-rav4",
    make: "Toyota",
    model: "RAV4",
    year: 2019,
    price: "245000.00",
    showPrice: true,
    currency: "GHS",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 65000,
    location: "Accra",
    description: "Demo vehicle",
    featured: true,
    status: "AVAILABLE",
    inventoryType: "LOCAL_STOCK",
    originCountry: null,
    estimatedLeadTimeMinDays: null,
    estimatedLeadTimeMaxDays: null,
    images: ["/images/first.jpg", "/images/second.jpg"],
  });

  assert.equal(prismaCalls.length, 1);
  assert.deepEqual(prismaCalls[0].where, {
    published: true,
    status: "AVAILABLE",
    inventoryType: {
      in: ["LOCAL_STOCK", "IMPORT_ORDER", "IN_TRANSIT"],
    },
    images: { some: { isCover: true } },
    slug: "2019-toyota-rav4",
  });
  assert.equal(prismaCalls[0].select.stockCode, true);
  assert.equal(prismaCalls[0].select.id, undefined);
  assert.deepEqual(prismaCalls[0].select.images, {
    orderBy: [{ isCover: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    select: { imageUrl: true, isCover: true },
  });
});

test("public detail retrieval hides prices when showPrice is false", async () => {
  resetPrisma({ ...publicVehicleRecord, showPrice: false });

  const vehicle = await getPublicVehicleBySlug("2019-toyota-rav4");

  assert.equal(vehicle.price, null);
  assert.equal(vehicle.showPrice, false);
});

test("invalid, missing, and non-public vehicle details return null", async () => {
  resetPrisma();

  assert.equal(await getPublicVehicleBySlug("../private"), null);
  assert.equal(prismaCalls.length, 0);

  for (const slug of [
    "unpublished-vehicle",
    "reserved-vehicle",
    "sold-vehicle",
    "archived-vehicle",
    "draft-vehicle",
  ]) {
    assert.equal(await getPublicVehicleBySlug(slug), null);
  }

  assert.equal(prismaCalls.length, 5);
  for (const call of prismaCalls) {
    assert.equal(call.where.published, true);
    assert.equal(call.where.status, "AVAILABLE");
  }
});

test("the proxy existence query remains a lightweight boolean lookup", async () => {
  resetPrisma({ id: "database-id" });

  assert.equal(
    await publicVehicleExistsBySlug("2019-toyota-rav4"),
    true
  );
  assert.deepEqual(prismaCalls[0].select, { id: true });

  resetPrisma();
  assert.equal(await publicVehicleExistsBySlug("../private"), false);
  assert.equal(prismaCalls.length, 0);
});
