import { isValidPublicVehicleSlug } from "./db/public-vehicle-policy.mjs";

function isSafeHomepagePhotoSource(source) {
  if (typeof source !== "string" || source.trim() !== source || source === "") {
    return false;
  }

  if (source.startsWith("/") && !source.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(source);

    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function getHomepagePhotoCardData(vehicle) {
  const image = vehicle?.images?.[0];

  if (
    !isSafeHomepagePhotoSource(image) ||
    !isValidPublicVehicleSlug(vehicle?.slug)
  ) {
    return null;
  }

  return {
    image,
    href: `/cars/${encodeURIComponent(vehicle.slug)}`,
  };
}
