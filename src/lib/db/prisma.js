
import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Reuse one Prisma instance during development
// to avoid unnecessary database connection pools.
const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Check your environment configuration."
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 5,
  });

  return new PrismaClient({
    adapter,
  });
}

// Do not create a database client at module evaluation time. Public pages are
// prerendered without database credentials in CI, and only create the client
// when a request actually reaches a repository method.
export function getPrismaClient() {
  if (globalForPrisma.ghanaAutoPrisma) {
    return globalForPrisma.ghanaAutoPrisma;
  }

  const prisma = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.ghanaAutoPrisma = prisma;
  }

  return prisma;
}
