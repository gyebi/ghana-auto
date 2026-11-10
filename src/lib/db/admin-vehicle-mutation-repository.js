import "server-only";

import { generateVehicleSlug } from "../admin/vehicle-input.js";
import { getPrismaClient } from "./prisma.js";
import { VEHICLE_MUTATION_LOCK } from "./vehicle-mutation-lock.js";

const STOCK_CODE_PREFIX = "GA-";
const STOCK_CODE_MINIMUM_DIGITS = 6;
// A transaction-scoped PostgreSQL advisory-lock key dedicated to allocating
// Ghana Auto stock codes. PostgreSQL releases it at transaction completion.
const STOCK_CODE_ALLOCATION_LOCK = 73_582_360;
// Every state transition, publication check, published edit, and image mutation
// for a car takes this transaction-scoped lock.  It gives those operations one
// ordering across application instances while their conditional writes remain
// the final protection against a stale status.
const MAX_VEHICLE_MUTATION_TRANSACTION_ATTEMPTS = 3;

export class VehicleMutationConflictError extends Error {
  constructor() {
    super("The car was changed by another request. Please try again.");
    this.code = "VEHICLE_MUTATION_CONFLICT";
  }
}

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
  images: {
    select: {
      id: true,
      imageUrl: true,
      altText: true,
      position: true,
      isCover: true,
    },
    orderBy: { position: "asc" },
  },
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

export async function findAdminVehicleForPublishedEdit(id) {
  const prisma = getPrismaClient();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, status: "AVAILABLE", published: true },
    select: adminVehicleEditSelect,
  });

  return toEditableVehicle(vehicle);
}

export async function findAdminVehicleForReservedManagement(id) {
  const prisma = getPrismaClient();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, status: "RESERVED", published: false },
    select: adminVehicleEditSelect,
  });

  return toEditableVehicle(vehicle);
}

export async function findAdminVehicleForReadOnlyView(id) {
  const prisma = getPrismaClient();
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
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

async function lockVehicleMutation(transaction, vehicleId) {
  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(
      ${VEHICLE_MUTATION_LOCK}, hashtext(${vehicleId})
    )::text AS lock_result
  `;
}

function waitForVehicleMutationRetry(attempt) {
  return new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
}

// P2034 means PostgreSQL aborted this serializable transaction. Retrying the
// whole callback is essential: it reacquires the advisory lock and re-reads
// status, eligibility, and photos rather than replaying a stale decision.
async function withVehicleMutationTransaction(prisma, vehicleId, callback) {
  for (let attempt = 0; attempt < MAX_VEHICLE_MUTATION_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          await lockVehicleMutation(transaction, vehicleId);
          return callback(transaction);
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error?.code !== "P2034") throw error;
      if (attempt + 1 === MAX_VEHICLE_MUTATION_TRANSACTION_ATTEMPTS) {
        throw new VehicleMutationConflictError();
      }
      await waitForVehicleMutationRetry(attempt);
    }
  }

  throw new VehicleMutationConflictError();
}

export async function updateDraftVehicle(id, data) {
  const prisma = getPrismaClient();
  return withVehicleMutationTransaction(prisma, id, async (transaction) => {
    const result = await transaction.vehicle.updateMany({
      where: { id, status: "DRAFT", published: false },
      data,
    });
    return result.count === 1 ? { id } : null;
  });
}

async function updateVehicleWithState(id, data, where) {
  const prisma = getPrismaClient();
  return withVehicleMutationTransaction(prisma, id, async (transaction) => {
    const result = await transaction.vehicle.updateMany({ where: { id, ...where }, data });
    return result.count === 1 ? { id } : null;
  });
}

// Kept separate from draft editing: this operation can only target an already
// live record and never writes its visibility or identifier fields.
export function updateReservedVehicle(id, data) {
  return updateVehicleWithState(id, data, { status: "RESERVED", published: false });
}

function publicationProblems(vehicle) {
  const problems = [];
  const requiredText = [
    "make",
    "model",
    "bodyType",
    "condition",
    "transmission",
    "fuelType",
  ];

  if (!Number.isInteger(vehicle.year)) problems.push("a valid year");
  if (requiredText.some((field) => !String(vehicle[field] ?? "").trim())) {
    problems.push("all required car details");
  }
  if (!["LOCAL_STOCK", "IMPORT_ORDER", "IN_TRANSIT"].includes(vehicle.inventoryType)) {
    problems.push("a valid inventory type");
  }
  if (vehicle.showPrice && vehicle.price == null) problems.push("a public price");
  if (vehicle.inventoryType !== "LOCAL_STOCK") {
    if (
      !String(vehicle.originCountry ?? "").trim() ||
      !Number.isInteger(vehicle.estimatedLeadTimeMinDays) ||
      !Number.isInteger(vehicle.estimatedLeadTimeMaxDays) ||
      vehicle.estimatedLeadTimeMinDays > vehicle.estimatedLeadTimeMaxDays
    ) {
      problems.push("origin country and an accurate lead-time range for this import car");
    }
  }

  const images = vehicle.images ?? [];
  if (images.length === 0) problems.push("at least one photograph");
  if (images.filter((image) => image.isCover).length !== 1) {
    problems.push("exactly one cover photograph");
  }
  return problems;
}

const publicationEligibilitySelect = {
  make: true, model: true, year: true, price: true, showPrice: true,
  bodyType: true, condition: true, transmission: true, fuelType: true,
  inventoryType: true, originCountry: true, estimatedLeadTimeMinDays: true,
  estimatedLeadTimeMaxDays: true,
  images: { select: { isCover: true } },
};

export async function updatePublishedVehicle(id, data) {
  const prisma = getPrismaClient();
  return withVehicleMutationTransaction(prisma, id, async (transaction) => {
    const current = await transaction.vehicle.findFirst({
      where: { id, status: "AVAILABLE", published: true },
      select: publicationEligibilitySelect,
    });
    if (!current) return null;

    const problems = publicationProblems({ ...current, ...data });
    if (problems.length) return { ok: false, reason: "ineligible", problems };

    const result = await transaction.vehicle.updateMany({
      where: { id, status: "AVAILABLE", published: true },
      data,
    });
    return result.count === 1 ? { id } : null;
  });
}

export async function publishDraftVehicle(id) {
  const prisma = getPrismaClient();

  return withVehicleMutationTransaction(prisma, id, async (transaction) => {
      const vehicle = await transaction.vehicle.findFirst({
        where: { id, status: "DRAFT", published: false },
        select: publicationEligibilitySelect,
      });
      if (!vehicle) return { ok: false, reason: "not_publishable" };

      const problems = publicationProblems(vehicle);
      if (problems.length) return { ok: false, reason: "ineligible", problems };

      const result = await transaction.vehicle.updateMany({
        where: { id, status: "DRAFT", published: false },
        data: { status: "AVAILABLE", published: true },
      });
      return result.count === 1
        ? { ok: true }
        : { ok: false, reason: "not_publishable" };
  });
}

const transitionDefinitions = {
  unpublish: { from: { status: "AVAILABLE", published: true }, to: { status: "DRAFT", published: false } },
  reserve: { from: { status: "AVAILABLE", published: true }, to: { status: "RESERVED", published: false } },
  sold: { from: [{ status: "AVAILABLE", published: true }, { status: "RESERVED", published: false }], to: { status: "SOLD", published: false } },
  archive: { from: [{ status: "DRAFT", published: false }, { status: "RESERVED", published: false }], to: { status: "ARCHIVED", published: false } },
};

export async function transitionVehicleStatus(id, action) {
  const definition = transitionDefinitions[action];
  if (!definition) return { ok: false, reason: "invalid_transition" };
  const prisma = getPrismaClient();

  return withVehicleMutationTransaction(prisma, id, async (transaction) => {
      const where = Array.isArray(definition.from)
        ? { id, OR: definition.from }
        : { id, ...definition.from };
      const result = await transaction.vehicle.updateMany({ where, data: definition.to });
      return result.count === 1
        ? { ok: true }
        : { ok: false, reason: "invalid_transition" };
  });
}
