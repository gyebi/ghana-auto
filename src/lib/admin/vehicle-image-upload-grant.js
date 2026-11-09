import "server-only";

import { IMAGE_UPLOAD_TTL_SECONDS } from "./vehicle-image-upload-policy.js";

const GRANT_VERSION = 1;
const MAX_UPLOAD_GRANT_TOKEN_LENGTH = 2_048;
const MAX_UPLOAD_GRANT_SERIALIZED_LENGTH = 1_536;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function isBoundString(value, maximumLength) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

function isValidGrantPayload(payload) {
  return (
    payload &&
    payload.version === GRANT_VERSION &&
    isBoundString(payload.staffUid, 256) &&
    isBoundString(payload.vehicleId, 64) &&
    isBoundString(payload.publicId, 512) &&
    isBoundString(payload.assetFolder, 255) &&
    isBoundString(payload.cloudName, 255) &&
    (payload.environment === "dev" || payload.environment === "prod") &&
    isBoundString(payload.nonce, 128) &&
    Number.isSafeInteger(payload.expiresAt) &&
    payload.expiresAt > 0
  );
}

export function createVehicleImageUploadGrant({
  staffUid,
  vehicleId,
  publicId,
  assetFolder,
  cloudName,
  environment,
  nonce,
  now = Date.now(),
  sign,
}) {
  const payload = {
    version: GRANT_VERSION,
    staffUid,
    vehicleId,
    publicId,
    assetFolder,
    cloudName,
    environment,
    nonce,
    expiresAt: now + IMAGE_UPLOAD_TTL_SECONDS * 1000,
  };

  if (!isValidGrantPayload(payload) || typeof sign !== "function") {
    throw new Error("Cannot create an invalid vehicle image upload grant.");
  }

  const serializedGrant = encode(payload);
  return {
    token: `${serializedGrant}.${sign(serializedGrant)}`,
    expiresAt: payload.expiresAt,
  };
}

// Stateless grants are intentionally not described as one-time. Replay is
// stopped at attachment time by the unique cloudinaryPublicId constraint and
// a per-car transactional lock, both shared by every app instance.
export function verifyVehicleImageUploadGrant({ token, verify, now = Date.now() }) {
  if (
    typeof token !== "string" ||
    token.length > MAX_UPLOAD_GRANT_TOKEN_LENGTH ||
    typeof verify !== "function"
  ) {
    return null;
  }

  const separator = token.indexOf(".");
  if (separator < 1 || separator !== token.lastIndexOf(".")) return null;

  const serializedGrant = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (
    serializedGrant.length > MAX_UPLOAD_GRANT_SERIALIZED_LENGTH ||
    !signature ||
    !verify(serializedGrant, signature)
  ) {
    return null;
  }

  const payload = decode(serializedGrant);
  if (!isValidGrantPayload(payload) || payload.expiresAt <= now) return null;

  return payload;
}
