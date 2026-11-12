import {
  isValidPublicStockCode,
  isValidPublicVehicleSlug,
} from "./db/public-vehicle-policy.mjs";

const WHATSAPP_NUMBER_PATTERN = /^[1-9][0-9]{7,14}$/;
const GENERAL_ENQUIRY_MESSAGE =
  "Hello Ghana Auto, I would like to make a general dealership enquiry.";

function getSafeText(value, maxLength) {
  if (typeof value !== "string") return null;

  const text = value.trim().replace(/\s+/g, " ");
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export function getConfiguredWhatsAppNumber(value = process.env.WHATSAPP_PHONE_NUMBER) {
  return typeof value === "string" && WHATSAPP_NUMBER_PATTERN.test(value)
    ? value
    : null;
}

export function getWhatsAppUrl(phoneNumber, message) {
  const number = getConfiguredWhatsAppNumber(phoneNumber);
  const text = getSafeText(message, 1000);

  if (!number || !text) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function getGeneralWhatsAppUrl() {
  return getWhatsAppUrl(
    getConfiguredWhatsAppNumber(),
    GENERAL_ENQUIRY_MESSAGE
  );
}

export function getPublicVehicleListingUrl(slug, siteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  if (!isValidPublicVehicleSlug(slug) || typeof siteUrl !== "string") {
    return null;
  }

  try {
    const origin = new URL(siteUrl);

    if (
      (origin.protocol !== "http:" && origin.protocol !== "https:") ||
      !origin.hostname ||
      origin.username ||
      origin.password
    ) {
      return null;
    }

    return new URL(`/cars/${slug}`, origin).toString();
  } catch {
    return null;
  }
}

export function getVehicleWhatsAppMessage(vehicle, siteUrl) {
  if (!vehicle || typeof vehicle !== "object") return null;

  const make = getSafeText(vehicle.make, 80);
  const model = getSafeText(vehicle.model, 80);
  const stockCode = vehicle.id;
  const listingUrl = getPublicVehicleListingUrl(vehicle.slug, siteUrl);
  const isValidYear =
    typeof vehicle.year === "number" &&
    Number.isInteger(vehicle.year) &&
    vehicle.year >= 1886 &&
    vehicle.year <= 2100;

  if (
    !make ||
    !model ||
    !isValidYear ||
    !isValidPublicStockCode(stockCode) ||
    !listingUrl
  ) {
    return null;
  }

  const availability =
    vehicle.inventoryType === "IMPORT_ORDER"
      ? " This vehicle is available to order and is not currently in local stock."
      : "";

  return `Hello Ghana Auto, I’m interested in the ${vehicle.year} ${make} ${model} (Stock Code: ${stockCode}).${availability}\n\nListing: ${listingUrl}`;
}
