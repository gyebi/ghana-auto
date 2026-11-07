import test, { mock } from "node:test";
import assert from "node:assert/strict";

const prismaState = {
  countArgs: null,
  findManyArgs: null,
  vehicles: [],
  total: 0,
  error: null,
};

mock.module("server-only", {});

mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        vehicle: {
          findMany(args) {
            prismaState.findManyArgs = args;
            return prismaState.error
              ? Promise.reject(prismaState.error)
              : Promise.resolve(prismaState.vehicles);
          },
          count(args) {
            prismaState.countArgs = args;
            return Promise.resolve(prismaState.total);
          },
        },
        $transaction(operations) {
          return Promise.all(operations);
        },
      };
    },
  },
});

const {
  ADMIN_VEHICLE_PAGE_SIZE,
  listAdminVehicles,
  parseAdminVehicleListParams,
} = await import("../src/lib/db/admin-vehicle-repository.js");

function resetPrisma({ vehicles = [], total = 0, error = null } = {}) {
  prismaState.countArgs = null;
  prismaState.findManyArgs = null;
  prismaState.vehicles = vehicles;
  prismaState.total = total;
  prismaState.error = error;
}

const vehicle = {
  stockCode: "GA-001",
  make: "Toyota",
  model: "RAV4",
  year: 2019,
  price: "245000.00",
  currency: "GHS",
  showPrice: true,
  status: "AVAILABLE",
  inventoryType: "LOCAL_STOCK",
  published: true,
};

test("admin vehicle parameters are bounded and reject invalid values", () => {
  assert.deepEqual(
    parseAdminVehicleListParams({
      q: " Toyota ",
      status: "AVAILABLE",
      page: "2",
    }),
    { search: "Toyota", status: "AVAILABLE", page: 2 }
  );

  assert.deepEqual(
    parseAdminVehicleListParams({
      q: "x".repeat(101),
      status: "NOT_A_STATUS",
      page: "999999",
    }),
    { search: "", status: null, page: 1 }
  );

  assert.deepEqual(
    parseAdminVehicleListParams({
      q: ["Toyota", "Kia"],
      status: ["AVAILABLE"],
      page: "-1",
    }),
    { search: "", status: null, page: 1 }
  );
});

test("admin inventory search, status filtering, and pagination stay in Prisma", async () => {
  resetPrisma({ vehicles: [vehicle], total: 26 });

  const result = await listAdminVehicles({
    q: "Toyota",
    status: "AVAILABLE",
    page: "2",
  });

  assert.equal(ADMIN_VEHICLE_PAGE_SIZE, 25);
  assert.equal(result.total, 26);
  assert.equal(result.totalPages, 2);
  assert.equal(result.page, 2);
  assert.deepEqual(result.vehicles, [vehicle]);
  assert.deepEqual(prismaState.findManyArgs.where, {
    status: "AVAILABLE",
    OR: [
      { stockCode: { contains: "Toyota", mode: "insensitive" } },
      { make: { contains: "Toyota", mode: "insensitive" } },
      { model: { contains: "Toyota", mode: "insensitive" } },
    ],
  });
  assert.deepEqual(prismaState.countArgs, {
    where: prismaState.findManyArgs.where,
  });
  assert.equal(prismaState.findManyArgs.where.published, undefined);
  assert.equal(prismaState.findManyArgs.skip, 25);
  assert.equal(prismaState.findManyArgs.take, 25);
  assert.deepEqual(prismaState.findManyArgs.orderBy, [
    { createdAt: "desc" },
    { id: "asc" },
  ]);
  assert.deepEqual(prismaState.findManyArgs.select, {
    stockCode: true,
    make: true,
    model: true,
    year: true,
    price: true,
    currency: true,
    showPrice: true,
    status: true,
    inventoryType: true,
    published: true,
  });
});

test("admin inventory handles empty results without loading records in memory", async () => {
  resetPrisma();

  const result = await listAdminVehicles({ page: "1" });

  assert.deepEqual(result.vehicles, []);
  assert.equal(result.total, 0);
  assert.equal(result.totalPages, 0);
  assert.equal(prismaState.findManyArgs.skip, 0);
  assert.equal(prismaState.findManyArgs.take, 25);
});

test("admin inventory database failures reach the caller", async () => {
  const databaseError = new Error("database unavailable");
  resetPrisma({ error: databaseError });

  await assert.rejects(
    () => listAdminVehicles({}),
    databaseError
  );
});
