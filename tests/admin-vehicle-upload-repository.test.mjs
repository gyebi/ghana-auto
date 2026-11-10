import test, { mock } from "node:test";
import assert from "node:assert/strict";

const state = {
  countArgs: null,
  countResult: 3,
  findArgs: null,
  findResult: { id: "clxvehicle01", status: "DRAFT", published: false },
};

mock.module("server-only", {});

mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        vehicle: {
          async findFirst(args) {
            state.findArgs = args;
            return state.findResult;
          },
        },
        vehicleImage: {
          async count(args) {
            state.countArgs = args;
            return state.countResult;
          },
        },
      };
    },
  },
});

const {
  countVehicleImagesForUpload,
  findDraftVehicleForImageUpload,
} = await import("../src/lib/db/admin-vehicle-upload-repository.js");

test("image upload repository selects an editable car and counts only that car's images", async () => {
  assert.deepEqual(await findDraftVehicleForImageUpload("clxvehicle01"), {
    id: "clxvehicle01", status: "DRAFT", published: false,
  });
  assert.deepEqual(state.findArgs, {
    where: {
      id: "clxvehicle01",
      OR: [
        { status: "DRAFT", published: false },
        { status: "AVAILABLE", published: true },
      ],
    },
    select: { id: true, status: true, published: true },
  });

  assert.equal(await countVehicleImagesForUpload("clxvehicle01"), 3);
  assert.deepEqual(state.countArgs, { where: { vehicleId: "clxvehicle01" } });
});
