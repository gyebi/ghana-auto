import "server-only";

import { getPrismaClient } from "./prisma.js";

// Deliberately minimal: an upload signature needs only proof that this is an
// unpublished draft, plus the existing attached-image count.
const draftVehicleUploadSelect = { id: true };
const VEHICLE_IMAGE_ATTACHMENT_LOCK = 519_730_211;
const MAX_ATTACHMENT_TRANSACTION_RETRIES = 2;

function waitForTransactionRetry(attempt) {
  return new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
}

export async function findDraftVehicleForImageUpload(id) {
  const prisma = getPrismaClient();

  return prisma.vehicle.findFirst({
    where: { id, status: "DRAFT", published: false },
    select: draftVehicleUploadSelect,
  });
}

export async function countVehicleImagesForUpload(id) {
  const prisma = getPrismaClient();

  return prisma.vehicleImage.count({ where: { vehicleId: id } });
}

// The transaction-scoped lock serializes every attachment for this car across
// all App Hosting instances. The unique public-ID constraint independently
// rejects a replay or cross-car attempt using the same Cloudinary asset.
export async function attachVerifiedVehicleImage({
  vehicleId,
  cloudinaryPublicId,
  imageUrl,
}) {
  const prisma = getPrismaClient();

  for (let attempt = 0; attempt <= MAX_ATTACHMENT_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(
            ${VEHICLE_IMAGE_ATTACHMENT_LOCK}, hashtext(${vehicleId})
          )::text AS lock_result
        `;

        const vehicle = await transaction.vehicle.findFirst({
          where: { id: vehicleId, status: "DRAFT", published: false },
          select: { id: true },
        });
        if (!vehicle) return { ok: false, reason: "not_editable" };

        const imageCount = await transaction.vehicleImage.count({
          where: { vehicleId },
        });
        if (imageCount >= 10) return { ok: false, reason: "image_limit_reached" };

        const image = await transaction.vehicleImage.create({
          data: {
            vehicleId,
            cloudinaryPublicId,
            imageUrl,
            position: imageCount,
            isCover: imageCount === 0,
          },
          select: {
            id: true,
            vehicleId: true,
            cloudinaryPublicId: true,
            imageUrl: true,
            altText: true,
            position: true,
            isCover: true,
          },
        });

          return { ok: true, image };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error?.code === "P2002") {
        return { ok: false, reason: "already_attached" };
      }
      if (error?.code === "P2034" && attempt < MAX_ATTACHMENT_TRANSACTION_RETRIES) {
        await waitForTransactionRetry(attempt);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Vehicle image attachment retry limit was unexpectedly exceeded.");
}
