import "server-only";

import { generateVehicleSlug } from "../admin/vehicle-input.js";
import { getPrismaClient } from "./prisma.js";

const STOCK_CODE_PREFIX = "GA-";
const STOCK_CODE_MINIMUM_DIGITS = 6;
// A transaction-scoped PostgreSQL advisory-lock key dedicated to allocating
// Ghana Auto stock codes. PostgreSQL releases it at transaction completion.
const STOCK_CODE_ALLOCATION_LOCK = 73_582_360;

const adminVehicleEditSelect = {
  id: true,
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
  status: true,
  published: true,
  inventoryType: true,
  originCountry: true,
  estimatedLeadTimeMinDays: true,
  estimatedLeadTimeMaxDays: true,
  shippingCostEstimate: true,
  clearingCostEstimate: true,
  otherImportCostEstimate: true,
  importCurrency: true,
  importNotes: true,
};

const adminVehicleConfirmationSelect = {
  id: true,
  year: true,
  make: true,
  model: true,
  stockCode: true,
  status: true,
  published: true,
};

function toEditableVehicle(vehicle) {
  if (!vehicle) return null;

  return {
    ...vehicle,
    price: vehicle.price == null ? null : String(vehicle.price),
    shippingCostEstimate:
      vehicle.shippingCostEstimate == null ? null : String(vehicle.shippingCostEstimate),
    clearingCostEstimate:
      vehicle.clearingCostEstimate == null ? null : String(vehicle.clearingCostEstimate),
    otherImportCostEstimate:
      vehicle.otherImportCostEstimate == null
        ? null
        : String(vehicle.otherImportCostEstimate),
  };
}

export function allocateNextStockCode(existingCodes) {
  let highest = 0n;

  for (const stockCode of existingCodes) {
    const match = /^GA-(\d+)$/.exec(stockCode);
    if (!match) continue;

    const sequence = BigInt(match[1]);
    if (sequence > highest) highest = sequence;
  }

  const nextSequence = (highest + 1n).toString();
  const stockCode = `${STOCK_CODE_PREFIX}${nextSequence.padStart(
    STOCK_CODE_MINIMUM_DIGITS,
    "0"
  )}`;

  if (stockCode.length > 40) {
    throw new Error("The next stock-code sequence exceeds the supported length.");
  }

  return stockCode;
}

export async function findAdminVehicleForEdit(id) {
  const prisma = getPrismaClient();
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      status: "DRAFT",
      published: false,
    },
    select: adminVehicleEditSelect,
  });

  return toEditableVehicle(vehicle);
}

export async function findAdminVehicleForCreationConfirmation(id) {
  const prisma = getPrismaClient();

  return prisma.vehicle.findFirst({
    where: {
      id,
      status: "DRAFT",
      published: false,
    },
    select: adminVehicleConfirmationSelect,
  });
}

export async function createDraftVehicle(data) {
  const prisma = getPrismaClient();

  // The advisory lock means this scan and insert are serialized across all
  // application instances. The unique model constraints remain the final
  // database integrity check.
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(${STOCK_CODE_ALLOCATION_LOCK})::text AS lock_result
    `;

    const existingCodes = await transaction.vehicle.findMany({
      where: { stockCode: { startsWith: STOCK_CODE_PREFIX } },
      select: { stockCode: true },
    });
    const stockCode = allocateNextStockCode(
      existingCodes.map((vehicle) => vehicle.stockCode)
    );
    const {
      featured: _featured,
      id: _id,
      published: _published,
      slug: _slug,
      status: _status,
      stockCode: _stockCode,
      ...vehicleData
    } = data;

    return transaction.vehicle.create({
      data: {
        ...vehicleData,
        stockCode,
        slug: generateVehicleSlug({ ...vehicleData, stockCode }),
        status: "DRAFT",
        published: false,
        featured: false,
      },
      select: { id: true, slug: true },
    });
  });
}

export async function updateDraftVehicle(id, data) {
  const prisma = getPrismaClient();

  const result = await prisma.vehicle.updateMany({
    where: {
      id,
      status: "DRAFT",
      published: false,
    },
    data,
  });

  return result.count === 1 ? { id } : null;
}
