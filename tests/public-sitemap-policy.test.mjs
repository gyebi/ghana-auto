import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { publicVehicleWhere } from "../src/lib/db/public-vehicle-policy.mjs";

const calls = [];

mock.module("server-only", {});
mock.module("../src/lib/db/prisma.js", {
  namedExports: {
    getPrismaClient() {
      return {
        vehicle: {
          async findMany(query) {
            calls.push(query);
            return [{ slug: "2024-toyota-corolla", updatedAt: new Date("2026-01-01") }];
          },
        },
      };
    },
  },
});

const { getPublicVehicleSitemapEntries } = await import(
  "../src/lib/db/vehicle-repository.js"
);

test("the public sitemap queries only the established public-visibility policy", async () => {
  calls.length = 0;

  const vehicles = await getPublicVehicleSitemapEntries();

  assert.deepEqual(vehicles, [
    { slug: "2024-toyota-corolla", updatedAt: new Date("2026-01-01") },
  ]);
  assert.deepEqual(calls, [
    {
      where: publicVehicleWhere,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    },
  ]);
});

test("the sitemap visibility policy requires published available vehicles with cover images", () => {
  assert.deepEqual(publicVehicleWhere, {
    published: true,
    status: "AVAILABLE",
    inventoryType: { in: ["LOCAL_STOCK", "IMPORT_ORDER", "IN_TRANSIT"] },
    images: { some: { isCover: true } },
  });
});
