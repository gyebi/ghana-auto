export const MAX_CAR_PHOTO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_CAR_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateCarPhotoFiles(files, remainingSlots) {
  if (!files.length) return "Choose at least one image.";
  if (!Number.isInteger(remainingSlots) || remainingSlots < 1) {
    return "This car already has the maximum of 10 photos.";
  }
  if (files.length > remainingSlots) {
    return `You can attach ${remainingSlots} more ${remainingSlots === 1 ? "photo" : "photos"}.`;
  }

  for (const file of files) {
    if (!ACCEPTED_CAR_PHOTO_TYPES.has(file.type)) {
      return `${file.name} is not a JPEG, PNG, or WebP image.`;
    }
    if (file.size > MAX_CAR_PHOTO_BYTES) {
      return `${file.name} is larger than the 10 MB limit.`;
    }
  }

  return null;
}
