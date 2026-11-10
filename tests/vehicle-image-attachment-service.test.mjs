import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const state = {
  assetCalls: [],
  attachCalls: [],
  staffUid: "firebase-staff-1",
};

const secret = "test-upload-grant-secret";
const sign = (serialized) =>
  createHmac("sha256", secret)
    .update(`ghana-auto:vehicle-upload-grant:v1:${serialized}`)
    .digest("base64url");

mock.module("server-only", {});

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: {
    async requireActiveStaffSession() {
      return { firebaseUid: state.staffUid, role: "STAFF" };
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
        verifyUploadGrantSignature(serialized, signature) {
          return sign(serialized) === signature;
        },
        cloudinary: {
          api: {
            async resource(publicId) {
              state.assetCalls.push(publicId);
              return {
                public_id: publicId,
                asset_folder: "ghana-auto/dev/vehicles",
                resource_type: "image",
                type: "upload",
                bytes: 400_000,
                format: "webp",
                secure_url: `https://res.cloudinary.com/ghana-auto/image/upload/${publicId}.webp`,
                context: {
                  custom: {
                    vehicle_id: "clxvehicle01",
                    media_env: "dev",
                    upload_nonce: "nonce-1",
                  },
                },
              };
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
      return { id: "clxvehicle01", status: "DRAFT", published: false };
    },
    async countVehicleImagesForUpload() {
      return 0;
    },
    async attachVerifiedVehicleImage(input) {
      state.attachCalls.push(input);
      return { ok: true, image: { id: "image-1" } };
    },
    async findDraftVehicleImageForManagement() {
      return null;
    },
    async removeDraftVehicleImage() {
      return null;
    },
    async reorderDraftVehicleImage() {
      return null;
    },
    async setDraftVehicleImageCover() {
      return null;
    },
  },
});

const { createVehicleImageUploadGrant } = await import(
  "../src/lib/admin/vehicle-image-upload-grant.js"
);
const { attachIssuedDraftVehicleImage, DraftImageUploadError } = await import(
  "../src/lib/admin/vehicle-image-upload-service.js"
);

function reset() {
  state.assetCalls = [];
  state.attachCalls = [];
  state.staffUid = "firebase-staff-1";
}

function grant(overrides = {}) {
  return createVehicleImageUploadGrant({
    staffUid: "firebase-staff-1",
    vehicleId: "clxvehicle01",
    publicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-1",
    assetFolder: "ghana-auto/dev/vehicles",
    cloudName: "ghana-auto-development",
    environment: "dev",
    nonce: "nonce-1",
    sign,
    ...overrides,
  }).token;
}

test("attachment takes car ID, public ID, and image URL only from a verified grant and Cloudinary", async () => {
  reset();

  const result = await attachIssuedDraftVehicleImage(grant());

  assert.deepEqual(result, { ok: true, image: { id: "image-1" } });
  assert.deepEqual(state.assetCalls, ["ghana-auto/dev/vehicles/clxvehicle01/nonce-1"]);
  assert.deepEqual(state.attachCalls, [
    {
      vehicleId: "clxvehicle01",
      cloudinaryPublicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-1",
      imageUrl:
        "https://res.cloudinary.com/ghana-auto/image/upload/ghana-auto/dev/vehicles/clxvehicle01/nonce-1.webp",
      allowPublished: false,
    },
  ]);
});

test("attachment rejects expired, tampered, wrong-staff, and wrong-environment grants before asset lookup", async () => {
  const cases = [
    {
      token: () => grant({ now: Date.now() - 5 * 60 * 1000 }),
      staffUid: "firebase-staff-1",
    },
    { token: () => `${grant()}x`, staffUid: "firebase-staff-1" },
    { token: () => grant(), staffUid: "firebase-staff-2" },
    { token: () => grant({ environment: "prod" }), staffUid: "firebase-staff-1" },
  ];

  for (const item of cases) {
    reset();
    state.staffUid = item.staffUid;
    await assert.rejects(
      () => attachIssuedDraftVehicleImage(item.token()),
      (error) =>
        error instanceof DraftImageUploadError && error.code === "invalid_upload_grant"
    );
    assert.deepEqual(state.assetCalls, []);
    assert.deepEqual(state.attachCalls, []);
  }
});
