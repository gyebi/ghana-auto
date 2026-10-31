
export const publicVehicleWhere = {
  published: true,
  status: "AVAILABLE",
  inventoryType: {
    in: ["LOCAL_STOCK", "IMPORT_ORDER", "IN_TRANSIT"],
  },
};

export function isValidPublicVehicleSlug(slug) {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= 120 &&
    /^[a-z0-9-]+$/.test(slug)
  );
}

export function isValidPublicStockCode(stockCode) {
  return (
    typeof stockCode === "string" &&
    stockCode.length > 0 &&
    stockCode.length <= 40 &&
    /^[A-Z0-9-]+$/.test(stockCode)
  );
}

export function toPublicVehicle(vehicle) {
  if (!vehicle) return null;

  return {
    id: vehicle.stockCode,
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,

    price:
      vehicle.showPrice === true && vehicle.price != null
        ? String(vehicle.price)
        : null,

    showPrice: vehicle.showPrice,
    currency: vehicle.currency,
    bodyType: vehicle.bodyType,
    condition: vehicle.condition,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    mileage: vehicle.mileage,
    location: vehicle.location,
    description: vehicle.description,
    featured: vehicle.featured,
    status: vehicle.status,
    inventoryType: vehicle.inventoryType,
    originCountry: vehicle.originCountry,
    estimatedLeadTimeMinDays:
      vehicle.estimatedLeadTimeMinDays,
    estimatedLeadTimeMaxDays:
      vehicle.estimatedLeadTimeMaxDays,
    images: Array.isArray(vehicle.images)
      ? vehicle.images.map((image) => image.imageUrl)
      : [],
  };
}
