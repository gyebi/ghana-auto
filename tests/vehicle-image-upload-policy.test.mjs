import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_VEHICLE_IMAGE_FORMATS,
  buildDraftVehicleImageUploadParams,
  MAX_VEHICLE_IMAGE_BYTES,
  verifyCloudinaryVehicleImageAsset,
} from "../src/lib/admin/vehicle-image-upload-policy.js";

function grant(overrides = {}) {
  return {
    vehicleId: "clxvehicle01",
    environment: "dev",
    uploadNonce: "bb3ba92c-1fcc-4d9a-a32d-e7b2f61c6010",
    expectedPublicId:
      "ghana-auto/dev/vehicles/clxvehicle01/bb3ba92c-1fcc-4d9a-a32d-e7b2f61c6010",
    expectedAssetFolder: "ghana-auto/dev/vehicles",
    ...overrides,
  };
}

function asset(overrides = {}) {
  return {
    public_id:
      "ghana-auto/dev/vehicles/clxvehicle01/bb3ba92c-1fcc-4d9a-a32d-e7b2f61c6010",
    asset_folder: "ghana-auto/dev/vehicles",
    resource_type: "image",
    type: "upload",
    bytes: 400_000,
    format: "webp",
    context: {
      custom: {
        vehicle_id: "clxvehicle01",
        media_env: "dev",
        upload_nonce: "bb3ba92c-1fcc-4d9a-a32d-e7b2f61c6010",
      },
    },
    ...overrides,
  };
}

test("public-ID convention is narrow and stable across Cloudinary folder modes", () => {
  const params = buildDraftVehicleImageUploadParams({
    vehicleId: "clxvehicle01",
    folder: "ghana-auto/prod/vehicles",
    environment: "prod",
    uploadNonce: "nonce-123",
    timestamp: 1_700_000_000,
    asset_folder: "ghana-auto/prod/vehicles",
  });

  assert.deepEqual(params, {
    timestamp: 1_700_000_000,
    asset_folder: "ghana-auto/prod/vehicles",
    public_id: "ghana-auto/prod/vehicles/clxvehicle01/nonce-123",
    type: "upload",
    overwrite: "false",
    allowed_formats: "jpg,jpeg,png,webp",
    context: "vehicle_id=clxvehicle01|media_env=prod|upload_nonce=nonce-123",
  });
  assert.equal("folder" in params, false);
  assert.deepEqual(ALLOWED_VEHICLE_IMAGE_FORMATS, ["jpg", "jpeg", "png", "webp"]);
});

test("asset verification rejects mismatched projects, environments, types, formats, and sizes", () => {
  assert.deepEqual(verifyCloudinaryVehicleImageAsset(asset(), grant()), { ok: true });

  for (const [overrides, reason] of [
    [{ public_id: "ghana-auto/prod/vehicles/clxvehicle01/other" }, "unexpected_public_id"],
    [{ asset_folder: "ghana-auto/prod/vehicles" }, "unexpected_asset_folder"],
    [{ resource_type: "video" }, "unsupported_resource"],
    [{ type: "private" }, "unsupported_resource"],
    [{ format: "gif" }, "unsupported_format"],
    [{ bytes: MAX_VEHICLE_IMAGE_BYTES + 1 }, "invalid_size"],
    [
      {
        context: {
          custom: {
            vehicle_id: "clxvehicle01",
            media_env: "prod",
            upload_nonce: "bb3ba92c-1fcc-4d9a-a32d-e7b2f61c6010",
          },
        },
      },
      "unexpected_context",
    ],
  ]) {
    assert.deepEqual(verifyCloudinaryVehicleImageAsset(asset(overrides), grant()), {
      ok: false,
      reason,
    });
  }
});
