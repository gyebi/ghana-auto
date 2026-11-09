import "server-only";

import { randomUUID } from "node:crypto";

import { requireActiveStaffSession } from "../auth/staff-session.js";
import { getCloudinaryConfig } from "../cloudinary/config.js";
import {
  countVehicleImagesForUpload,
  findDraftVehicleForImageUpload,
} from "../db/admin-vehicle-upload-repository.js";
import { isValidAdminVehicleId } from "./vehicle-input.js";
import {
  buildDraftVehicleImageUploadParams,
  IMAGE_UPLOAD_TTL_SECONDS,
  MAX_DRAFT_VEHICLE_IMAGES,
  MAX_VEHICLE_IMAGE_BYTES,
  verifyCloudinaryVehicleImageAsset,
} from "./vehicle-image-upload-policy.js";
import {
  createVehicleImageUploadGrant,
  verifyVehicleImageUploadGrant,
} from "./vehicle-image-upload-grant.js";
import { attachVerifiedVehicleImage } from "../db/admin-vehicle-upload-repository.js";

export class DraftImageUploadError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export async function issueDraftVehicleImageUploadSignature(id) {
  const staffUser = await requireActiveStaffSession();

  if (!isValidAdminVehicleId(id)) {
    throw new DraftImageUploadError("not_found");
  }

  const vehicle = await findDraftVehicleForImageUpload(id);
  if (!vehicle) throw new DraftImageUploadError("not_found");

  const imageCount = await countVehicleImagesForUpload(id);
  if (imageCount >= MAX_DRAFT_VEHICLE_IMAGES) {
    throw new DraftImageUploadError("image_limit_reached");
  }

  const cloudinary = getCloudinaryConfig();
  const uploadNonce = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = buildDraftVehicleImageUploadParams({
    vehicleId: vehicle.id,
    folder: cloudinary.folder,
    environment: cloudinary.environment,
    uploadNonce,
    timestamp,
  });
  const expectedPublicId = params.public_id;
  const grant = createVehicleImageUploadGrant({
    staffUid: staffUser.firebaseUid,
    vehicleId: vehicle.id,
    publicId: expectedPublicId,
    assetFolder: cloudinary.folder,
    cloudName: cloudinary.cloudName,
    environment: cloudinary.environment,
    nonce: uploadNonce,
    sign: cloudinary.signUploadGrant,
  });

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    apiKey: cloudinary.apiKey,
    signature: cloudinary.signUploadParams(params),
    params,
    uploadGrant: grant.token,
    attachmentGrantExpiresAt: new Date(grant.expiresAt).toISOString(),
    attachmentGrantExpiresInSeconds: IMAGE_UPLOAD_TTL_SECONDS,
    // Cloudinary controls upload-signature validity. This shorter value is
    // exclusively the deadline for our later Neon attachment authorization.
    maxFileBytes: MAX_VEHICLE_IMAGE_BYTES,
    remainingImageSlots: MAX_DRAFT_VEHICLE_IMAGES - imageCount,
  };
}

// This server operation is intentionally not exposed as a route yet. The
// future attachment endpoint must submit only `uploadGrant`; car IDs, public
// IDs, and URLs are recovered from the signed grant and Cloudinary Admin API.
export async function attachIssuedDraftVehicleImage(uploadGrant) {
  const staffUser = await requireActiveStaffSession();
  const cloudinary = getCloudinaryConfig();
  const grant = verifyVehicleImageUploadGrant({
    token: uploadGrant,
    verify: cloudinary.verifyUploadGrantSignature,
  });

  if (
    !grant ||
    grant.staffUid !== staffUser.firebaseUid ||
    grant.environment !== cloudinary.environment ||
    grant.cloudName !== cloudinary.cloudName ||
    grant.assetFolder !== cloudinary.folder
  ) {
    throw new DraftImageUploadError("invalid_upload_grant");
  }

  let asset;
  try {
    asset = await cloudinary.cloudinary.api.resource(grant.publicId, {
      resource_type: "image",
      type: "upload",
      context: true,
    });
  } catch {
    throw new DraftImageUploadError("asset_not_found");
  }

  const verifiedAsset = verifyCloudinaryVehicleImageAsset(asset, {
    vehicleId: grant.vehicleId,
    environment: grant.environment,
    uploadNonce: grant.nonce,
    expectedPublicId: grant.publicId,
    expectedAssetFolder: grant.assetFolder,
  });
  if (!verifiedAsset.ok || typeof asset.secure_url !== "string") {
    throw new DraftImageUploadError("invalid_uploaded_asset");
  }

  return attachVerifiedVehicleImage({
    vehicleId: grant.vehicleId,
    cloudinaryPublicId: grant.publicId,
    imageUrl: asset.secure_url,
  });
}
