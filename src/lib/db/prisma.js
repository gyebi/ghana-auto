
import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Reuse one Prisma instance per application process. This prevents every
// repository call from opening another PostgreSQL pool in production while
// still allowing each serverless instance to own its bounded pool.
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

  globalForPrisma.ghanaAutoPrisma = createPrismaClient();

  return globalForPrisma.ghanaAutoPrisma;
}
