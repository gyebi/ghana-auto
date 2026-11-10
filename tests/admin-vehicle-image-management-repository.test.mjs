import test, { mock } from "node:test";
import assert from "node:assert/strict";

const state = {
  images: [],
  lockTail: Promise.resolve(),
  transactionConflicts: 0,
  transactionCount: 0,
  transactionOptions: [],
};

mock.module("server-only", {});

mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        vehicleImage: {
          async findUnique({ where }) {
            const image = state.images.find((candidate) => candidate.id === where.id);
            return image ? { vehicleId: image.vehicleId } : null;
          },
        },
        $transaction: async (callback, options) => {
          state.transactionCount += 1;
          state.transactionOptions.push(options);
          if (state.transactionConflicts > 0) {
            state.transactionConflicts -= 1;
            throw { code: "P2034" };
          }

          const previousTransaction = state.lockTail;
          let releaseTransaction;
          state.lockTail = new Promise((resolve) => {
            releaseTransaction = resolve;
          });

          try {
            return await callback({
              async $queryRaw() {
                await previousTransaction;
              },
              vehicleImage: {
                async findFirst({ where }) {
                  const image = state.images.find(
                    (candidate) =>
                      candidate.id === where.id && candidate.vehicleId === where.vehicleId
                  );
                  return image ? { ...image } : null;
                },
                async findMany({ where }) {
                  return state.images
                    .filter((image) => image.vehicleId === where.vehicleId)
                    .map((image) => ({ ...image }));
                },
                async update({ where, data }) {
                  const image = state.images.find((candidate) => candidate.id === where.id);
                  Object.assign(image, data);
                  return { ...image };
                },
                async updateMany({ where, data }) {
                  for (const image of state.images) {
                    if (image.vehicleId === where.vehicleId && image.isCover === where.isCover) {
                      Object.assign(image, data);
                    }
                  }
                  return { count: 1 };
                },
                async delete({ where }) {
                  const index = state.images.findIndex((image) => image.id === where.id);
                  return state.images.splice(index, 1)[0];
                },
              },
              vehicle: {
                async findFirst() {
                  return { status: "DRAFT", published: false };
                },
              },
            });
          } finally {
            // Production acquires the advisory lock within the transaction.
            // This mock releases its matching serialized section only after
            // the transaction callback has finished updating state.
            releaseTransaction();
          }
        },
      };
    },
  },
});

const {
  removeDraftVehicleImage,
  reorderDraftVehicleImage,
  setDraftVehicleImageCover,
} = await import("../src/lib/db/admin-vehicle-upload-repository.js");

function reset() {
  state.images = [
    {
      id: "image-1",
      vehicleId: "clxvehicle01",
      cloudinaryPublicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-1",
      imageUrl: "https://example.test/1.webp",
      altText: null,
      position: 0,
      isCover: true,
    },
    {
      id: "image-2",
      vehicleId: "clxvehicle01",
      cloudinaryPublicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-2",
      imageUrl: "https://example.test/2.webp",
      altText: null,
      position: 1,
      isCover: false,
    },
    {
      id: "image-3",
      vehicleId: "clxvehicle01",
      cloudinaryPublicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-3",
      imageUrl: "https://example.test/3.webp",
      altText: null,
      position: 2,
      isCover: false,
    },
  ];
  state.lockTail = Promise.resolve();
  state.transactionConflicts = 0;
  state.transactionCount = 0;
  state.transactionOptions = [];
}

function orderedIds() {
  return [...state.images]
    .sort((left, right) => left.position - right.position)
    .map((image) => image.id);
}

function coverIds() {
  return state.images.filter((image) => image.isCover).map((image) => image.id);
}

test("setting a new cover leaves exactly one deterministic cover", async () => {
  reset();
  const result = await setDraftVehicleImageCover("image-3");

  assert.equal(result.ok, true);
  assert.deepEqual(coverIds(), ["image-3"]);
  assert.deepEqual(orderedIds(), ["image-1", "image-2", "image-3"]);
  assert.deepEqual(state.transactionOptions, [{ isolationLevel: "Serializable" }]);
});

test("reordering preserves cover state and unique contiguous positions", async () => {
  reset();
  const result = await reorderDraftVehicleImage("image-1", "right");

  assert.equal(result.ok, true);
  assert.deepEqual(orderedIds(), ["image-2", "image-1", "image-3"]);
  assert.deepEqual(coverIds(), ["image-1"]);
  assert.deepEqual(state.images.map((image) => image.position).sort(), [0, 1, 2]);
});

test("removing non-cover, cover, and final images repairs cover and positions", async () => {
  reset();
  await removeDraftVehicleImage("image-2");
  assert.deepEqual(orderedIds(), ["image-1", "image-3"]);
  assert.deepEqual(coverIds(), ["image-1"]);

  await removeDraftVehicleImage("image-1");
  assert.deepEqual(orderedIds(), ["image-3"]);
  assert.deepEqual(coverIds(), ["image-3"]);
  assert.equal(state.images[0].position, 0);

  await removeDraftVehicleImage("image-3");
  assert.deepEqual(state.images, []);
});

test("concurrent mutations serialize per car and retry serializable conflicts without duplicate positions", async () => {
  reset();
  state.transactionConflicts = 1;

  await Promise.all([
    reorderDraftVehicleImage("image-3", "left"),
    removeDraftVehicleImage("image-1"),
  ]);

  assert.ok(state.transactionCount >= 3, "one serializable conflict was retried");
  assert.deepEqual(orderedIds(), ["image-3", "image-2"]);
  assert.deepEqual(coverIds(), ["image-2"]);
  assert.deepEqual(state.images.map((image) => image.position).sort(), [0, 1]);
  assert.ok(
    state.transactionOptions.every((options) => options?.isolationLevel === "Serializable")
  );
});
