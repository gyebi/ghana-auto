import test, { mock } from "node:test";
import assert from "node:assert/strict";

const state = {
  advisoryLockQueries: [],
  baseImageCount: 0,
  created: [],
  images: [],
  editable: true,
  transactionConflicts: 0,
  transactionOptions: [],
};

let advisoryLockTail = Promise.resolve();

mock.module("server-only", {});

mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        $transaction: async (callback, options) => {
          state.transactionOptions.push(options);
          if (state.transactionConflicts > 0) {
            state.transactionConflicts -= 1;
            throw { code: "P2034" };
          }
          let releaseLock;
          const transaction = {
            async $queryRaw(strings, ...values) {
              state.advisoryLockQueries.push({ sql: strings.join("?"), values });
              const previousLock = advisoryLockTail;
              advisoryLockTail = new Promise((resolve) => {
                releaseLock = resolve;
              });
              await previousLock;
            },
            vehicle: {
              async findFirst() {
                return state.editable ? { id: "clxvehicle01" } : null;
              },
            },
            vehicleImage: {
              async count() {
                return state.images.length;
              },
              async findMany() {
                return state.images.map((image) => ({ ...image }));
              },
              async create(args) {
                if (
                  state.images.some(
                    (image) => image.cloudinaryPublicId === args.data.cloudinaryPublicId
                  )
                ) {
                  throw { code: "P2002" };
                }
                const created = {
                  ...args.data,
                  id: `image-${state.created.length + 1}`,
                };
                state.images.push(created);
                state.created.push(created);
                return {
                  id: created.id,
                  vehicleId: created.vehicleId,
                  cloudinaryPublicId: created.cloudinaryPublicId,
                  imageUrl: created.imageUrl,
                  altText: null,
                  position: created.position,
                  isCover: created.isCover,
                };
              },
              async update({ where, data }) {
                const image = state.images.find((candidate) => candidate.id === where.id);
                Object.assign(image, data);
                return image;
              },
              async updateMany({ where, data }) {
                for (const image of state.images) {
                  if (image.vehicleId === where.vehicleId && image.isCover === where.isCover) {
                    Object.assign(image, data);
                  }
                }
                return { count: 1 };
              },
            },
          };

          try {
            return await callback(transaction);
          } finally {
            releaseLock?.();
          }
        },
      };
    },
  },
});

const { attachVerifiedVehicleImage } = await import(
  "../src/lib/db/admin-vehicle-upload-repository.js"
);

function reset({ baseImageCount = 0, editable = true, transactionConflicts = 0 } = {}) {
  state.advisoryLockQueries = [];
  state.baseImageCount = baseImageCount;
  state.created = [];
  state.images = Array.from({ length: baseImageCount }, (_, index) => ({
    id: `existing-${index}`,
    vehicleId: "clxvehicle01",
    cloudinaryPublicId: `existing-public-id-${index}`,
    imageUrl: `https://example.test/existing-${index}.webp`,
    altText: null,
    position: index,
    isCover: index === 0,
  }));
  state.editable = editable;
  state.transactionConflicts = transactionConflicts;
  state.transactionOptions = [];
  advisoryLockTail = Promise.resolve();
}

function attach(index) {
  return attachVerifiedVehicleImage({
    vehicleId: "clxvehicle01",
    cloudinaryPublicId: `ghana-auto/dev/vehicles/clxvehicle01/nonce-${index}`,
    imageUrl: `https://res.cloudinary.com/ghana-auto/image/upload/nonce-${index}.webp`,
  });
}

test("concurrent attachment transactions serialize and cannot exceed ten photos", async () => {
  reset({ baseImageCount: 8 });

  const results = await Promise.all([attach(1), attach(2), attach(3)]);

  assert.deepEqual(
    results.map((result) => result.ok),
    [true, true, false]
  );
  assert.equal(results[2].reason, "image_limit_reached");
  assert.equal(state.created.length, 2);
  assert.deepEqual(state.created.map((image) => image.position), [8, 9]);
  assert.deepEqual(state.transactionOptions, [
    { isolationLevel: "Serializable" },
    { isolationLevel: "Serializable" },
    { isolationLevel: "Serializable" },
  ]);
  assert.equal(state.advisoryLockQueries.length, 3);
  assert.match(state.advisoryLockQueries[0].sql, /pg_advisory_xact_lock/);
  assert.match(state.advisoryLockQueries[0].sql, /hashtext\(\?\)/);
  assert.match(state.advisoryLockQueries[0].sql, /::text AS lock_result/);
});

test("the unique Cloudinary public-ID constraint rejects a repeated attachment", async () => {
  reset();

  const first = await attach(1);
  const repeat = await attach(1);

  assert.equal(first.ok, true);
  assert.deepEqual(repeat, { ok: false, reason: "already_attached" });
  assert.equal(state.created.length, 1);
});

test("attachment rechecks draft editability inside the transaction", async () => {
  reset({ editable: false });

  assert.deepEqual(await attach(1), { ok: false, reason: "not_editable" });
  assert.deepEqual(state.created, []);
});

test("attachment retries bounded serializable transaction conflicts", async () => {
  reset({ transactionConflicts: 1 });

  const result = await attach(1);

  assert.equal(result.ok, true);
  assert.equal(state.transactionOptions.length, 2);
  assert.equal(state.created.length, 1);
});
