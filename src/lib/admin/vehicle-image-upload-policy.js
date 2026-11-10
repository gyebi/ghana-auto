export const MAX_DRAFT_VEHICLE_IMAGES = 10;
export const MAX_VEHICLE_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_UPLOAD_TTL_SECONDS = 5 * 60;
export const ALLOWED_VEHICLE_IMAGE_FORMATS = Object.freeze([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

function normalizeContext(context) {
  if (!context || typeof context !== "object") return {};

  // Cloudinary Admin API responses use `context.custom`; accepting the direct
  // object too makes this check robust across SDK response shapes.
  return context.custom && typeof context.custom === "object"
    ? context.custom
    : context;
}

export function buildDraftVehicleImageUploadParams({
  vehicleId,
  folder,
  environment,
  uploadNonce,
  timestamp,
}) {
  // Keep the entire environment prefix inside public_id. For this dynamic
  // folder account, asset_folder controls only Media Library placement while
  // this explicit public ID remains the delivery and verification identity.
  const publicId = `${folder}/${vehicleId}/${uploadNonce}`;

  return {
    timestamp,
    asset_folder: folder,
    public_id: publicId,
    type: "upload",
    overwrite: "false",
    allowed_formats: ALLOWED_VEHICLE_IMAGE_FORMATS.join(","),
    context: [
      `vehicle_id=${vehicleId}`,
      `media_env=${environment}`,
      `upload_nonce=${uploadNonce}`,
    ].join("|"),
  };
}

// Before a future VehicleImage write, its server operation must retrieve this
// exact `expectedPublicId` through the currently configured Cloudinary Admin
// API, pass that response here, then atomically re-check the car is still an
// unpublished draft and has fewer than ten attached images. Folder names are
// not treated as authorization: every property is tied to the short-lived
// server-issued grant and the expected environment-specific public ID.
export function verifyCloudinaryVehicleImageAsset(asset, grant) {
  if (!asset || typeof asset !== "object" || !grant || typeof grant !== "object") {
    return { ok: false, reason: "invalid_asset" };
  }

  const context = normalizeContext(asset.context);
  const format = typeof asset.format === "string" ? asset.format.toLowerCase() : "";

  if (asset.public_id !== grant.expectedPublicId) {
    return { ok: false, reason: "unexpected_public_id" };
  }
  if (asset.asset_folder !== grant.expectedAssetFolder) {
    return { ok: false, reason: "unexpected_asset_folder" };
  }
  if (asset.resource_type !== "image" || asset.type !== "upload") {
    return { ok: false, reason: "unsupported_resource" };
  }
  if (
    !Number.isSafeInteger(asset.bytes) ||
    asset.bytes < 1 ||
    asset.bytes > MAX_VEHICLE_IMAGE_BYTES
  ) {
    return { ok: false, reason: "invalid_size" };
  }
  if (!ALLOWED_VEHICLE_IMAGE_FORMATS.includes(format)) {
    return { ok: false, reason: "unsupported_format" };
  }
  if (context.vehicle_id !== grant.vehicleId || context.media_env !== grant.environment) {
    return { ok: false, reason: "unexpected_context" };
  }
  if (context.upload_nonce !== grant.uploadNonce) {
    return { ok: false, reason: "unexpected_nonce" };
  }

  return { ok: true };
}
