import test, { mock } from "node:test";
import assert from "node:assert/strict";

const state = {
  advisoryLockCalls: 0,
  advisoryLockQueries: [],
  allocationSnapshots: [],
  confirmationArgs: null,
  confirmationResult: null,
  createArgs: [],
  existingCodes: [],
  updateArgs: null,
};

let advisoryLockTail = Promise.resolve();

mock.module("server-only", {});

mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        $transaction: async (callback) => {
          let releaseAdvisoryLock = null;
          const transaction = {
            async $queryRaw(strings, ...values) {
              state.advisoryLockCalls += 1;
              state.advisoryLockQueries.push({
                sql: strings.join("?"),
                values,
              });
              const previousLock = advisoryLockTail;
              advisoryLockTail = new Promise((resolve) => {
                releaseAdvisoryLock = resolve;
              });
              await previousLock;
            },
            vehicle: {
              async findMany() {
                state.allocationSnapshots.push([...state.existingCodes]);
                return state.existingCodes.map((stockCode) => ({ stockCode }));
              },
              async create(args) {
                state.createArgs.push(args);
                state.existingCodes.push(args.data.stockCode);
                return { id: `clxvehicle${state.createArgs.length}`, slug: args.data.slug };
              },
            },
          };

          try {
            return await callback(transaction);
          } finally {
            releaseAdvisoryLock?.();
          }
        },
        vehicle: {
          findFirst(args) {
            state.confirmationArgs = args;
            return Promise.resolve(state.confirmationResult);
          },
          updateMany(args) {
            state.updateArgs = args;
            return Promise.resolve({ count: 1 });
          },
        },
      };
    },
  },
});

const {
  allocateNextStockCode,
  createDraftVehicle,
  findAdminVehicleForCreationConfirmation,
  findAdminVehicleForEdit,
  updateDraftVehicle,
} = await import("../src/lib/db/admin-vehicle-mutation-repository.js");

function reset(existingCodes = []) {
  state.advisoryLockCalls = 0;
  state.advisoryLockQueries = [];
  state.allocationSnapshots = [];
  state.confirmationArgs = null;
  state.confirmationResult = null;
  state.createArgs = [];
  state.existingCodes = [...existingCodes];
  state.updateArgs = null;
  advisoryLockTail = Promise.resolve();
}

function draftData(overrides = {}) {
  return {
    year: 2024,
    make: "Toyota",
    model: "Yaris",
    bodyType: "Hatchback",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    price: "120000.00",
    currency: "GHS",
    showPrice: true,
    inventoryType: "LOCAL_STOCK",
    ...overrides,
  };
}

test("stock-code allocation accounts for existing legacy and padded codes", () => {
  assert.equal(
    allocateNextStockCode(["GA-001", "GA-000006", "GA-42", "XX-999"]),
    "GA-000043"
  );
});

test("vehicle creation allocates a server-only stock code and slug with protected draft defaults", async () => {
  reset(["GA-001", "GA-000006"]);

  await createDraftVehicle(draftData({
    stockCode: "ATTACKER-CODE",
    slug: "attacker-slug",
    status: "AVAILABLE",
    published: true,
    featured: true,
  }));

  assert.equal(state.advisoryLockCalls, 1);
  assert.deepEqual(state.advisoryLockQueries, [{
    sql: "\n      SELECT pg_advisory_xact_lock(?)::text AS lock_result\n    ",
    values: [73_582_360],
  }]);
  assert.deepEqual(state.createArgs[0], {
    data: {
      ...draftData(),
      stockCode: "GA-000007",
      slug: "2024-toyota-yaris-ga-000007",
      status: "DRAFT",
      published: false,
      featured: false,
    },
    select: { id: true, slug: true },
  });
});

test("concurrent draft creates receive distinct sequential stock codes", async () => {
  reset(["GA-000006"]);

  await Promise.all([
    createDraftVehicle(draftData({ model: "Yaris" })),
    createDraftVehicle(draftData({ model: "Corolla" })),
  ]);

  assert.equal(state.advisoryLockCalls, 2);
  assert.deepEqual(
    state.createArgs.map((args) => args.data.stockCode).sort(),
    ["GA-000007", "GA-000008"]
  );
  assert.deepEqual(state.allocationSnapshots, [
    ["GA-000006"],
    ["GA-000006", "GA-000007"],
  ]);
  assert.equal(new Set(state.existingCodes).size, state.existingCodes.length);
});

test("confirmation lookup selects only the saved draft summary fields", async () => {
  reset();
  state.confirmationResult = {
    id: "clxvehicle01",
    year: 2024,
    make: "Toyota",
    model: "Yaris",
    stockCode: "GA-000007",
    status: "DRAFT",
    published: false,
  };

  const result = await findAdminVehicleForCreationConfirmation("clxvehicle01");

  assert.deepEqual(result, state.confirmationResult);
  assert.deepEqual(state.confirmationArgs, {
    where: {
      id: "clxvehicle01",
      status: "DRAFT",
      published: false,
    },
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      stockCode: true,
      status: true,
      published: true,
    },
  });
});

test("draft edit lookup includes only display-safe attached image fields in position order", async () => {
  reset();
  state.confirmationResult = {
    id: "clxvehicle01",
    price: null,
    images: [
      {
        id: "image-1",
        imageUrl: "https://res.cloudinary.com/test/image/upload/photo.webp",
        altText: null,
        position: 0,
        isCover: true,
      },
    ],
  };

  const result = await findAdminVehicleForEdit("clxvehicle01");

  assert.deepEqual(result.images, state.confirmationResult.images);
  assert.deepEqual(state.confirmationArgs.where, {
    id: "clxvehicle01",
    status: "DRAFT",
    published: false,
  });
  assert.deepEqual(state.confirmationArgs.select.images, {
    select: {
      id: true,
      imageUrl: true,
      altText: true,
      position: true,
      isCover: true,
    },
    orderBy: { position: "asc" },
  });
});

test("vehicle updates atomically require an unpublished draft", async () => {
  reset();
  const result = await updateDraftVehicle("clxvehicle01", { make: "Toyota" });

  assert.deepEqual(result, { id: "clxvehicle01" });
  assert.deepEqual(state.updateArgs, {
    where: {
      id: "clxvehicle01",
      status: "DRAFT",
      published: false,
    },
    data: { make: "Toyota" },
  });
});
