
import "server-only";

import {
  isValidPublicVehicleSlug,
  publicVehicleWhere,
  toPublicVehicle,
} from "./public-vehicle-policy.mjs";
import { getPrismaClient } from "./prisma";

// Only select fields approved for the public website.
const publicVehicleSelect = {
  stockCode: true,
  slug: true,
  make: true,
  model: true,
  year: true,
  price: true,
  currency: true,
  showPrice: true,
  bodyType: true,
  condition: true,
  transmission: true,
  fuelType: true,
  mileage: true,
  location: true,
  description: true,
  featured: true,
  status: true,
  inventoryType: true,
  originCountry: true,
  estimatedLeadTimeMinDays: true,
  estimatedLeadTimeMaxDays: true,
  images: {
    orderBy: [
      { position: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      imageUrl: true,
    },
  },
};
export async function getPublicVehicles() {
  const prisma = getPrismaClient();
  const vehicles = await prisma.vehicle.findMany({
    where: publicVehicleWhere,
    select: publicVehicleSelect,
    orderBy: [
      { featured: "desc" },
      { createdAt: "desc" },
    ],
  });

  return vehicles.map(toPublicVehicle);
}

export async function getPublicFeaturedVehicles() {
  const prisma = getPrismaClient();
  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...publicVehicleWhere,
      featured: true,
    },
    select: publicVehicleSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return vehicles.map(toPublicVehicle);
}

export async function getPublicVehicleBySlug(slug) {
  if (!isValidPublicVehicleSlug(slug)) {
    return null;
  }

  const prisma = getPrismaClient();

  const vehicle = await prisma.vehicle.findFirst({
     where: {
      ...publicVehicleWhere,
      slug,
    },
    select: {
      id: true,
    },
  });

  return vehicle !== null;
}


export async function publicVehicleExistsBySlug(slug) {
  // Reject malformed slugs before querying Neon.
  if (!isValidPublicVehicleSlug(slug)) {
    return false;
  }

  const prisma = getPrismaClient();

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      ...publicVehicleWhere,
      slug,
    },
    select: {
      id: true,
    },
  });

  return vehicle !== null;
}
