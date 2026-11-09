import test, { mock } from "node:test";
import assert from "node:assert/strict";

class MockStaffAuthorizationError extends Error {}

const state = {
  authorizationError: null,
  count: 0,
  findCalls: [],
  vehicle: { id: "clxvehicle01" },
};

mock.module("server-only", {});

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: {
    StaffAuthorizationError: MockStaffAuthorizationError,
    async requireActiveStaffSession() {
      if (state.authorizationError) throw state.authorizationError;
      return { firebaseUid: "firebase-staff-1", active: true, role: "STAFF" };
    },
  },
});

mock.module("../src/lib/cloudinary/config.js", {
  namedExports: {
    getCloudinaryConfig() {
      return {
        apiKey: "public-api-key",
        cloudName: "development-cloud",
        environment: "dev",
        folder: "ghana-auto/dev/vehicles",
        signUploadParams(params) {
          return `signature:${params.public_id}`;
        },
        signUploadGrant(serializedGrant) {
          return `grant-signature:${serializedGrant}`;
        },
      };
    },
  },
});

mock.module("../src/lib/db/admin-vehicle-upload-repository.js", {
  namedExports: {
    async findDraftVehicleForImageUpload(id) {
      state.findCalls.push(id);
      return state.vehicle;
    },
    async countVehicleImagesForUpload() {
      return state.count;
    },
    async attachVerifiedVehicleImage() {
      throw new Error("Attachment is not exercised by this issuance test.");
    },
  },
});

const {
  DraftImageUploadError,
  issueDraftVehicleImageUploadSignature,
} = await import("../src/lib/admin/vehicle-image-upload-service.js");

function reset() {
  state.authorizationError = null;
  state.count = 0;
  state.findCalls = [];
  state.vehicle = { id: "clxvehicle01" };
}

test("active staff receive a server-scoped image upload signature without a secret", async () => {
  reset();
  const upload = await issueDraftVehicleImageUploadSignature("clxvehicle01");

  assert.equal(state.findCalls.length, 1);
  assert.equal(upload.uploadUrl, "https://api.cloudinary.com/v1_1/development-cloud/image/upload");
  assert.equal(upload.apiKey, "public-api-key");
  assert.match(upload.params.public_id, /^ghana-auto\/dev\/vehicles\/clxvehicle01\//);
  assert.equal("folder" in upload.params, false);
  assert.equal(upload.params.asset_folder, "ghana-auto/dev/vehicles");
  assert.equal(upload.params.allowed_formats, "jpg,jpeg,png,webp");
  assert.equal(upload.params.overwrite, "false");
  assert.equal(upload.params.type, "upload");
  assert.match(upload.params.context, /media_env=dev/);
  assert.equal(upload.remainingImageSlots, 10);
  assert.equal(upload.maxFileBytes, 10 * 1024 * 1024);
  assert.match(upload.signature, /^signature:ghana-auto\/dev\/vehicles\/clxvehicle01\//);
  assert.match(upload.uploadGrant, /\.grant-signature:/);
  assert.equal("authorizationToken" in upload, false);
  assert.equal("expiresAt" in upload, false);
  assert.equal(upload.attachmentGrantExpiresInSeconds, 5 * 60);
  assert.equal("apiSecret" in upload, false);
});

test("unauthorized, invalid, non-draft, and full cars cannot receive a signature", async () => {
  reset();
  state.authorizationError = new MockStaffAuthorizationError();
  await assert.rejects(
    () => issueDraftVehicleImageUploadSignature("clxvehicle01"),
    MockStaffAuthorizationError
  );
  assert.deepEqual(state.findCalls, []);

  reset();
  await assert.rejects(
    () => issueDraftVehicleImageUploadSignature("invalid id"),
    (error) => error instanceof DraftImageUploadError && error.code === "not_found"
  );
  assert.deepEqual(state.findCalls, []);

  reset();
  state.vehicle = null;
  await assert.rejects(
    () => issueDraftVehicleImageUploadSignature("clxvehicle01"),
    (error) => error instanceof DraftImageUploadError && error.code === "not_found"
  );

  reset();
  state.count = 10;
  await assert.rejects(
    () => issueDraftVehicleImageUploadSignature("clxvehicle01"),
    (error) =>
      error instanceof DraftImageUploadError && error.code === "image_limit_reached"
  );
});
