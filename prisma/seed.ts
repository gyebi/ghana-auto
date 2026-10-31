
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL;

if (process.env.GHANA_AUTO_SEED_CONFIRM !== "development") {
  throw new Error(
    "Development seed not authorized. Set GHANA_AUTO_SEED_CONFIRM=development."
  );
}

if (!connectionString) {
  throw new Error("DIRECT_URL is missing.");
}

const databaseUrl = new URL(connectionString);

if (
  !databaseUrl.hostname.endsWith(".neon.tech") ||
  databaseUrl.pathname !== "/ghana-auto"
) {
  throw new Error("Unexpected database target. Seed cancelled.");
}

const adapter = new PrismaPg({
  connectionString,
  max: 2,
});

const prisma = new PrismaClient({ adapter });

const demoVehicles = [
  {
    stockCode: "GA-001",
    slug: "2019-toyota-rav4",
    make: "Toyota",
    model: "RAV4",
    year: 2019,
    price: "245000.00",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 65000,
    location: "Accra",
    status: "AVAILABLE",
    inventoryType: "LOCAL_STOCK",
    published: true,
    showPrice: true,
    featured: true,
    image: "/images/vehicles/toyota-rav4-2019.jpg",
  },
  {
    stockCode: "GA-002",
    slug: "2018-honda-accord",
    make: "Honda",
    model: "Accord",
    year: 2018,
    price: "190000.00",
    bodyType: "Sedan",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 82000,
    location: "Tema",
    status: "AVAILABLE",
    inventoryType: "LOCAL_STOCK",
    published: true,
    showPrice: false,
    featured: true,
    image: "/images/vehicles/honda-accord-2018.jpg",
  },
  {
    stockCode: "GA-003",
    slug: "2020-hyundai-tucson",
    make: "Hyundai",
    model: "Tucson",
    year: 2020,
    price: "220000.00",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 54000,
    location: "Kumasi",
    status: "AVAILABLE",
    inventoryType: "LOCAL_STOCK",
    published: false,
    showPrice: true,
    featured: true,
    image: "/images/vehicles/hyundai-tucson-2020.jpg",
  },
  {
    stockCode: "GA-004",
    slug: "2017-toyota-corolla",
    make: "Toyota",
    model: "Corolla",
    year: 2017,
    price: "135000.00",
    bodyType: "Sedan",
    condition: "Locally Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 110000,
    location: "Accra",
    status: "SOLD",
    inventoryType: "LOCAL_STOCK",
    published: true,
    showPrice: true,
    featured: false,
    image: "/images/vehicles/toyota-corolla-2017.jpg",
  },
  {
    stockCode: "GA-005",
    slug: "2021-kia-sportage",
    make: "Kia",
    model: "Sportage",
    year: 2021,
    price: "275000.00",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 39000,
    location: "Accra",
    status: "AVAILABLE",
    inventoryType: "IMPORT_ORDER",
    published: true,
    showPrice: true,
    featured: true,
    originCountry: "United States",
    estimatedLeadTimeMinDays: 42,
    estimatedLeadTimeMaxDays: 70,
    importCurrency: "GHS",
    importNotes:
      "Demonstration import listing. Shipping and clearing estimates require confirmation.",
    image: "/images/vehicles/kia-sportage-2021.jpg",
  },
  {
    stockCode: "GA-006",
    slug: "2019-nissan-rogue",
    make: "Nissan",
    model: "Rogue",
    year: 2019,
    price: "205000.00",
    bodyType: "SUV",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: 72000,
    location: "Accra",
    status: "DRAFT",
    inventoryType: "LOCAL_STOCK",
    published: false,
    showPrice: true,
    featured: false,
    image: "/images/vehicles/nissan-rogue-2019.jpg",
  },
] as const;

async function main() {
  const database = await prisma.$queryRaw<
    Array<{ database_name: string }>
  >`SELECT current_database() AS database_name`;

  if (database[0]?.database_name !== "ghana-auto") {
    throw new Error("Unexpected PostgreSQL database. Seed cancelled.");
  }

  // Refuse to alter an existing inventory.
  const existingCount = await prisma.vehicle.count();

  if (existingCount !== 0) {
    throw new Error(
      `Found ${existingCount} existing vehicles. Seed cancelled to protect existing data.`
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const vehicle of demoVehicles) {
      const { image, ...data } = vehicle;

      await tx.vehicle.create({
        data: {
          ...data,
          currency: "GHS",
          description:
            "Fictional demonstration vehicle. Not an actual dealership offer.",
          images: {
            create: {
              imageUrl: image,
              position: 0,
              isCover: true,
              altText: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            },
          },
        },
      });
    }
  });

  console.log("Development seed completed: 6 demo vehicles.");
}

main()
  .catch((error) => {
    console.error("Development seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
