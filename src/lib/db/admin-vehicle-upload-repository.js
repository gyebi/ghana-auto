import "server-only";

import { getPrismaClient } from "./prisma.js";
import { VEHICLE_MUTATION_LOCK } from "./vehicle-mutation-lock.js";

// Deliberately minimal: an upload signature needs only proof that this is an
// unpublished draft, plus the existing attached-image count.
const draftVehicleUploadSelect = { id: true, status: true, published: true };
const MAX_ATTACHMENT_TRANSACTION_RETRIES = 2;
const imageManagementSelect = {
  id: true,
  vehicleId: true,
  cloudinaryPublicId: true,
  imageUrl: true,
  altText: true,
  position: true,
  isCover: true,
};

function waitForTransactionRetry(attempt) {
  return new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
}

export async function findDraftVehicleForImageUpload(id) {
  const prisma = getPrismaClient();

  return prisma.vehicle.findFirst({
    where: {
      id,
      OR: [
        { status: "DRAFT", published: false },
        { status: "AVAILABLE", published: true },
      ],
    },
    select: draftVehicleUploadSelect,
  });
}

export async function countVehicleImagesForUpload(id) {
  const prisma = getPrismaClient();

  return prisma.vehicleImage.count({ where: { vehicleId: id } });
}

export async function findDraftVehicleImageForManagement(id) {
  const prisma = getPrismaClient();

  return prisma.vehicleImage.findFirst({
    where: {
      id,
      vehicle: {
        OR: [
          { status: "DRAFT", published: false },
          { status: "AVAILABLE", published: true },
        ],
      },
    },
    select: {
      id: true,
      vehicleId: true,
      cloudinaryPublicId: true,
      vehicle: { select: { status: true, published: true } },
    },
  });
}

function orderImages(images) {
  return [...images].sort(
    (left, right) => left.position - right.position || left.id.localeCompare(right.id)
  );
}

function selectCoverId(images) {
  return images.find((image) => image.isCover)?.id ?? images[0]?.id ?? null;
}

async function normalizeImages(transaction, vehicleId, images, coverId) {
  for (const [position, image] of images.entries()) {
    if (image.position !== position) {
      await transaction.vehicleImage.update({
        where: { id: image.id },
        data: { position },
      });
    }
  }

  await transaction.vehicleImage.updateMany({
    where: { vehicleId, isCover: true },
    data: { isCover: false },
  });

  if (coverId) {
    await transaction.vehicleImage.update({
      where: { id: coverId },
      data: { isCover: true },
    });
  }

  return images.map((image, position) => ({
    ...image,
    position,
    isCover: image.id === coverId,
  }));
}

function editableImageVehicleWhere(allowPublished) {
  return allowPublished
    ? { OR: [{ status: "DRAFT", published: false }, { status: "AVAILABLE", published: true }] }
    : { status: "DRAFT", published: false };
}

async function mutateDraftVehicleImage(imageId, mutation, allowPublished = false) {
  const prisma = getPrismaClient();
  const initialImage = await prisma.vehicleImage.findUnique({
    where: { id: imageId },
    select: { vehicleId: true },
  });

  if (!initialImage) return { ok: false, reason: "not_found_or_not_editable" };

  for (let attempt = 0; attempt <= MAX_ATTACHMENT_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT pg_advisory_xact_lock(
              ${VEHICLE_MUTATION_LOCK}, hashtext(${initialImage.vehicleId})
            )::text AS lock_result
          `;

          const target = await transaction.vehicleImage.findFirst({
            where: {
              id: imageId,
              vehicleId: initialImage.vehicleId,
              vehicle: editableImageVehicleWhere(allowPublished),
            },
            select: imageManagementSelect,
          });
          if (!target) return { ok: false, reason: "not_found_or_not_editable" };

          const currentImages = orderImages(
            await transaction.vehicleImage.findMany({
              where: { vehicleId: initialImage.vehicleId },
              select: imageManagementSelect,
            })
          );
          const result = mutation(currentImages, target);
          if (!result) return { ok: false, reason: "invalid_operation" };

          const vehicle = await transaction.vehicle.findFirst({
            where: { id: initialImage.vehicleId },
            select: { status: true, published: true },
          });
          if (
            result.removed &&
            currentImages.length === 1 &&
            vehicle?.status === "AVAILABLE" &&
            vehicle.published === true
          ) {
            return { ok: false, reason: "final_published_photo" };
          }

          if (result.removed) {
            await transaction.vehicleImage.delete({ where: { id: target.id } });
          }

          const images = await normalizeImages(
            transaction,
            initialImage.vehicleId,
            result.images,
            result.coverId
          );

          return {
            ok: true,
            images,
            removed: result.removed ? target : null,
          };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error?.code === "P2034" && attempt < MAX_ATTACHMENT_TRANSACTION_RETRIES) {
        await waitForTransactionRetry(attempt);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Vehicle image management retry limit was unexpectedly exceeded.");
}

export function setDraftVehicleImageCover(imageId, allowPublished = false) {
  return mutateDraftVehicleImage(imageId, (images, target) => ({
    images,
    coverId: target.id,
  }), allowPublished);
}

export function reorderDraftVehicleImage(imageId, direction, allowPublished = false) {
  return mutateDraftVehicleImage(imageId, (images, target) => {
    const currentIndex = images.findIndex((image) => image.id === target.id);
    const offset = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const targetIndex = currentIndex + offset;
    if (targetIndex < 0 || targetIndex >= images.length) return null;

    const reordered = [...images];
    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];

    return { images: reordered, coverId: selectCoverId(images) };
  }, allowPublished);
}

export function removeDraftVehicleImage(imageId, allowPublished = false) {
  return mutateDraftVehicleImage(imageId, (images, target) => {
    const removedIndex = images.findIndex((image) => image.id === target.id);
    const remainingImages = images.filter((image) => image.id !== target.id);
    const previousCoverId = selectCoverId(images);
    const coverId =
      previousCoverId === target.id
        ? remainingImages[Math.min(removedIndex, remainingImages.length - 1)]?.id ?? null
        : previousCoverId;

    return { images: remainingImages, coverId, removed: true };
  }, allowPublished);
}

// The transaction-scoped lock serializes every attachment for this car across
// all App Hosting instances. The unique public-ID constraint independently
// rejects a replay or cross-car attempt using the same Cloudinary asset.
export async function attachVerifiedVehicleImage({
  vehicleId,
  cloudinaryPublicId,
  imageUrl,
  allowPublished = false,
}) {
  const prisma = getPrismaClient();

  for (let attempt = 0; attempt <= MAX_ATTACHMENT_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT pg_advisory_xact_lock(
              ${VEHICLE_MUTATION_LOCK}, hashtext(${vehicleId})
            )::text AS lock_result
          `;

          const vehicle = await transaction.vehicle.findFirst({
            where: { id: vehicleId, ...editableImageVehicleWhere(allowPublished) },
            select: { id: true },
          });
          if (!vehicle) return { ok: false, reason: "not_editable" };

          const currentImages = orderImages(
            await transaction.vehicleImage.findMany({
              where: { vehicleId },
              select: imageManagementSelect,
            })
          );
          if (currentImages.length >= 10) {
            return { ok: false, reason: "image_limit_reached" };
          }

          const image = await transaction.vehicleImage.create({
            data: {
              vehicleId,
              cloudinaryPublicId,
              imageUrl,
              position: currentImages.length,
              isCover: false,
            },
            select: imageManagementSelect,
          });
          const coverId = selectCoverId([...currentImages, image]);
          const images = await normalizeImages(
            transaction,
            vehicleId,
            [...currentImages, image],
            coverId
          );

          return {
            ok: true,
            image: images.find((attachedImage) => attachedImage.id === image.id),
          };
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
