import test, { mock } from "node:test";
import assert from "node:assert/strict";

class MockStaffAuthorizationError extends Error {}

const state = {
  authorizationError: null,
  destroyError: null,
  destroyCalls: [],
  findResult: null,
  managementCalls: [],
  resourceCalls: [],
};

const image = {
  id: "clximage001",
  vehicleId: "clxvehicle01",
  cloudinaryPublicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-12345678",
};

mock.module("server-only", {});

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: {
    async requireActiveStaffSession() {
      if (state.authorizationError) throw state.authorizationError;
      return { firebaseUid: "staff-1", role: "STAFF" };
    },
  },
});

mock.module("../src/lib/cloudinary/config.js", {
  namedExports: {
    getCloudinaryConfig() {
      return {
        cloudName: "ghana-auto-development",
        environment: "dev",
        folder: "ghana-auto/dev/vehicles",
        cloudinary: {
          api: {
            async resource(publicId) {
              state.resourceCalls.push(publicId);
              return {
                public_id: publicId,
                asset_folder: "ghana-auto/dev/vehicles",
                resource_type: "image",
                type: "upload",
                bytes: 500_000,
                format: "webp",
                context: {
                  custom: {
                    vehicle_id: "clxvehicle01",
                    media_env: "dev",
                    upload_nonce: "nonce-12345678",
                  },
                },
              };
            },
          },
          uploader: {
            async destroy(publicId) {
              state.destroyCalls.push(publicId);
              if (state.destroyError) throw state.destroyError;
              return { result: "ok" };
            },
          },
        },
      };
    },
  },
});

mock.module("../src/lib/db/admin-vehicle-upload-repository.js", {
  namedExports: {
    async findDraftVehicleForImageUpload() {
      return null;
    },
    async countVehicleImagesForUpload() {
      return 0;
    },
    async attachVerifiedVehicleImage() {
      return null;
    },
    async findDraftVehicleImageForManagement() {
      return state.findResult;
    },
    async setDraftVehicleImageCover(id) {
      state.managementCalls.push(["cover", id]);
      return { ok: true, images: [{ id, isCover: true, position: 0 }] };
    },
    async reorderDraftVehicleImage(id, direction) {
      state.managementCalls.push(["reorder", id, direction]);
      return { ok: true, images: [{ id, isCover: true, position: 0 }] };
    },
    async removeDraftVehicleImage(id) {
      state.managementCalls.push(["remove", id]);
      return { ok: true, images: [], removed: { ...image } };
    },
  },
});

const {
  DraftImageUploadError,
  manageDraftVehicleImage,
} = await import("../src/lib/admin/vehicle-image-upload-service.js");

function reset() {
  state.authorizationError = null;
  state.destroyError = null;
  state.destroyCalls = [];
  state.findResult = { ...image, vehicle: { status: "DRAFT", published: false } };
  state.managementCalls = [];
  state.resourceCalls = [];
}

test("cover and reorder requests use only the trusted attached image record", async () => {
  reset();
  await manageDraftVehicleImage({ action: "cover", imageId: "clximage001" });
  await manageDraftVehicleImage({ action: "reorder", imageId: "clximage001", direction: "right" });

  assert.deepEqual(state.managementCalls, [
    ["cover", "clximage001"],
    ["reorder", "clximage001", "right"],
  ]);
  assert.deepEqual(state.resourceCalls, []);
});

test("removal verifies the development asset before trusted database detachment and Cloudinary deletion", async () => {
  reset();
  const result = await manageDraftVehicleImage({ action: "remove", imageId: "clximage001" });

  assert.equal(result.ok, true);
  assert.deepEqual(state.resourceCalls, [image.cloudinaryPublicId]);
  assert.deepEqual(state.managementCalls, [["remove", "clximage001"]]);
  assert.deepEqual(state.destroyCalls, [image.cloudinaryPublicId]);
});

test("unauthorized, cross-environment, and Cloudinary cleanup failures are not reported as successful removal", async () => {
  reset();
  state.authorizationError = new MockStaffAuthorizationError();
  await assert.rejects(
    () => manageDraftVehicleImage({ action: "remove", imageId: "clximage001" }),
    MockStaffAuthorizationError
  );
  assert.deepEqual(state.managementCalls, []);

  reset();
  state.findResult = {
    ...image,
    vehicle: { status: "DRAFT", published: false },
    cloudinaryPublicId: "ghana-auto/prod/vehicles/clxvehicle01/nonce-12345678",
  };
  await assert.rejects(
    () => manageDraftVehicleImage({ action: "remove", imageId: "clximage001" }),
    (error) => error instanceof DraftImageUploadError && error.code === "invalid_managed_asset"
  );
  assert.deepEqual(state.resourceCalls, []);
  assert.deepEqual(state.managementCalls, []);

  reset();
  state.destroyError = new Error("Cloudinary unavailable");
  await assert.rejects(
    () => manageDraftVehicleImage({ action: "remove", imageId: "clximage001" }),
    (error) =>
      error instanceof DraftImageUploadError &&
      error.code === "cloudinary_cleanup_failed" &&
      error.detached === true
  );
  assert.deepEqual(state.managementCalls, [["remove", "clximage001"]]);
  assert.deepEqual(state.destroyCalls, [image.cloudinaryPublicId]);
});
