import "server-only";

import { getPrismaClient } from "./prisma.js";

export const ADMIN_VEHICLE_PAGE_SIZE = 25;
const MAX_ADMIN_VEHICLE_PAGE = 10_000;
const MAX_ADMIN_VEHICLE_SEARCH_LENGTH = 100;
const adminVehicleStatuses = new Set([
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
]);

const adminVehicleSelect = {
  id: true,
  stockCode: true,
  make: true,
  model: true,
  year: true,
  price: true,
  currency: true,
  showPrice: true,
  status: true,
  inventoryType: true,
  published: true,
};

function getSingleQueryValue(value) {
  return typeof value === "string" ? value : undefined;
}

function getPage(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 5 ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return 1;
  }

  const page = Number(value);

  return Number.isSafeInteger(page) && page <= MAX_ADMIN_VEHICLE_PAGE
    ? page
    : 1;
}

export function parseAdminVehicleListParams(searchParams) {
  const searchValue = getSingleQueryValue(searchParams?.q);
  const statusValue = getSingleQueryValue(searchParams?.status);
  const search =
    typeof searchValue === "string" &&
    searchValue.length <= MAX_ADMIN_VEHICLE_SEARCH_LENGTH
      ? searchValue.trim()
      : "";

  return {
    search,
    status: adminVehicleStatuses.has(statusValue) ? statusValue : null,
    page: getPage(getSingleQueryValue(searchParams?.page)),
  };
}

function getAdminVehicleWhere({ search, status }) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { stockCode: { contains: search, mode: "insensitive" } },
      { make: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function toAdminVehicle(vehicle) {
  return {
    ...vehicle,
    price: vehicle.price == null ? null : String(vehicle.price),
  };
}

export async function listAdminVehicles(searchParams) {
  const filters = parseAdminVehicleListParams(searchParams);
  const where = getAdminVehicleWhere(filters);
  const prisma = getPrismaClient();

  const [vehicles, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      select: adminVehicleSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * ADMIN_VEHICLE_PAGE_SIZE,
      take: ADMIN_VEHICLE_PAGE_SIZE,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    ...filters,
    pageSize: ADMIN_VEHICLE_PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / ADMIN_VEHICLE_PAGE_SIZE),
    vehicles: vehicles.map(toAdminVehicle),
  };
}
