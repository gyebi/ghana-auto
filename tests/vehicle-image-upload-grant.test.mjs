import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

mock.module("server-only", {});

const {
  createVehicleImageUploadGrant,
  verifyVehicleImageUploadGrant,
} = await import("../src/lib/admin/vehicle-image-upload-grant.js");

const secret = "test-only-grant-signing-secret";
const sign = (serialized) =>
  createHmac("sha256", secret)
    .update(`ghana-auto:vehicle-upload-grant:v1:${serialized}`)
    .digest("base64url");
const verify = (serialized, signature) => sign(serialized) === signature;

function createGrant(overrides = {}) {
  return createVehicleImageUploadGrant({
    staffUid: "firebase-staff-1",
    vehicleId: "clxvehicle01",
    publicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-1",
    assetFolder: "ghana-auto/dev/vehicles",
    cloudName: "ghana-auto-development",
    environment: "dev",
    nonce: "nonce-1",
    now: 1_700_000_000_000,
    sign,
    ...overrides,
  });
}

test("short-lived signed grants survive a second server instance without process-local state", () => {
  const grant = createGrant();

  // A fresh verifier represents another App Hosting instance. It needs only
  // the same server secret, not an in-process map or shared memory.
  assert.deepEqual(
    verifyVehicleImageUploadGrant({
      token: grant.token,
      verify,
      now: 1_700_000_000_001,
    }),
    {
      version: 1,
      staffUid: "firebase-staff-1",
      vehicleId: "clxvehicle01",
      publicId: "ghana-auto/dev/vehicles/clxvehicle01/nonce-1",
      assetFolder: "ghana-auto/dev/vehicles",
      cloudName: "ghana-auto-development",
      environment: "dev",
      nonce: "nonce-1",
      expiresAt: 1_700_000_300_000,
    }
  );
});

test("expired or tampered grants are rejected, including tampered staff, car, and environment claims", () => {
  const grant = createGrant();
  const [serialized, signature] = grant.token.split(".");
  const payload = JSON.parse(Buffer.from(serialized, "base64url").toString("utf8"));

  for (const changedClaim of ["staffUid", "vehicleId", "environment"]) {
    const altered = { ...payload, [changedClaim]: `attacker-${changedClaim}` };
    const alteredToken = `${Buffer.from(JSON.stringify(altered)).toString("base64url")}.${signature}`;
    assert.equal(
      verifyVehicleImageUploadGrant({
        token: alteredToken,
        verify,
        now: 1_700_000_000_001,
      }),
      null
    );
  }

  assert.equal(
    verifyVehicleImageUploadGrant({
      token: grant.token,
      verify,
      now: 1_700_000_300_000,
    }),
    null
  );
});

test("oversized grant strings are rejected before signature verification", () => {
  let verificationAttempted = false;

  assert.equal(
    verifyVehicleImageUploadGrant({
      token: `${"a".repeat(2_049)}.signature`,
      verify() {
        verificationAttempted = true;
        return true;
      },
    }),
    null
  );
  assert.equal(verificationAttempted, false);
});
