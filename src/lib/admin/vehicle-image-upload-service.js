import "server-only";

import { randomUUID } from "node:crypto";

import { requireActiveStaffSession } from "../auth/staff-session.js";
import { getCloudinaryConfig } from "../cloudinary/config.js";
import {
  countVehicleImagesForUpload,
  findDraftVehicleForImageUpload,
  findDraftVehicleImageForManagement,
  removeDraftVehicleImage,
  reorderDraftVehicleImage,
  setDraftVehicleImageCover,
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
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    Object.assign(this, details);
  }
}

function isPublishedVehicle(vehicle) {
  return vehicle?.status === "AVAILABLE" && vehicle?.published === true;
}

function canManageVehicleImages(staffUser, vehicle) {
  return (
    (vehicle?.status === "DRAFT" && vehicle?.published === false) ||
    (staffUser.role === "ADMIN" && isPublishedVehicle(vehicle))
  );
}

export async function issueDraftVehicleImageUploadSignature(id) {
  const staffUser = await requireActiveStaffSession();

  if (!isValidAdminVehicleId(id)) {
    throw new DraftImageUploadError("not_found");
  }

  const vehicle = await findDraftVehicleForImageUpload(id);
  if (!vehicle || !canManageVehicleImages(staffUser, vehicle)) {
    throw new DraftImageUploadError("not_found");
  }

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

  // A grant is not authority to attach after a status change. Re-read the
  // record, then pass the role-derived constraint into the locked attachment.
  const vehicle = await findDraftVehicleForImageUpload(grant.vehicleId);
  if (!vehicle || !canManageVehicleImages(staffUser, vehicle)) {
    throw new DraftImageUploadError("not_editable");
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
    allowPublished: staffUser.role === "ADMIN",
  });
}

function getCloudinaryImageIdentity({ cloudinaryPublicId, vehicleId, folder }) {
  if (typeof cloudinaryPublicId !== "string") return null;

  const prefix = `${folder}/${vehicleId}/`;
  if (!cloudinaryPublicId.startsWith(prefix)) return null;

  const uploadNonce = cloudinaryPublicId.slice(prefix.length);
  if (!/^[A-Za-z0-9-]{8,128}$/.test(uploadNonce)) return null;

  return { publicId: cloudinaryPublicId, uploadNonce };
}

async function verifyManagedCloudinaryImage(image) {
  const cloudinary = getCloudinaryConfig();
  const identity = getCloudinaryImageIdentity({
    cloudinaryPublicId: image.cloudinaryPublicId,
    vehicleId: image.vehicleId,
    folder: cloudinary.folder,
  });
  if (!identity) throw new DraftImageUploadError("invalid_managed_asset");

  let asset;
  try {
    asset = await cloudinary.cloudinary.api.resource(identity.publicId, {
      resource_type: "image",
      type: "upload",
      context: true,
    });
  } catch {
    throw new DraftImageUploadError("managed_asset_not_found");
  }

  const verification = verifyCloudinaryVehicleImageAsset(asset, {
    vehicleId: image.vehicleId,
    environment: cloudinary.environment,
    uploadNonce: identity.uploadNonce,
    expectedPublicId: identity.publicId,
    expectedAssetFolder: cloudinary.folder,
  });
  if (!verification.ok) throw new DraftImageUploadError("invalid_managed_asset");

  return { cloudinary, identity };
}

function validateImageManagementInput({ action, imageId, direction }) {
  if (!isValidAdminVehicleId(imageId)) return false;
  if (action === "cover" || action === "remove") return direction === undefined;
  return action === "reorder" && (direction === "left" || direction === "right");
}

// This service owns every photo-management mutation. The browser submits only
// an attached Neon image ID and an allowlisted operation; Cloudinary IDs and
// folders always come from trusted database records and server configuration.
export async function manageDraftVehicleImage(input) {
  const staffUser = await requireActiveStaffSession();
  if (!validateImageManagementInput(input)) {
    throw new DraftImageUploadError("invalid_management_request");
  }

  const image = await findDraftVehicleImageForManagement(input.imageId);
  if (!image || !canManageVehicleImages(staffUser, image.vehicle)) {
    throw new DraftImageUploadError("not_found_or_not_editable");
  }
  const allowPublished = staffUser.role === "ADMIN";

  if (input.action === "cover") {
    return setDraftVehicleImageCover(image.id, allowPublished);
  }
  if (input.action === "reorder") {
    return reorderDraftVehicleImage(image.id, input.direction, allowPublished);
  }

  // Verify the Cloudinary asset before detaching it from Neon. If deletion
  // later fails, Neon has already removed the reference, avoiding a broken
  // public record; the caller receives an explicit cleanup-failure response.
  const { cloudinary, identity } = await verifyManagedCloudinaryImage(image);
  const result = await removeDraftVehicleImage(image.id, allowPublished);
  if (!result.ok) return result;

  try {
    const deletion = await cloudinary.cloudinary.uploader.destroy(identity.publicId, {
      resource_type: "image",
      type: "upload",
      invalidate: true,
    });
    if (!["ok", "not found"].includes(deletion?.result)) {
      throw new Error("Cloudinary did not confirm deletion.");
    }
  } catch {
    throw new DraftImageUploadError("cloudinary_cleanup_failed", {
      detached: true,
      images: result.images,
    });
  }

  return result;
}
