import { connection } from "next/server";

import { getPublicVehicleSitemapEntries } from "@/lib/db/vehicle-repository";
import { getPublicSitePageUrl } from "@/lib/site-url";

const staticPages = [
  { pathname: "/", changeFrequency: "weekly", priority: 1 },
  { pathname: "/cars", changeFrequency: "daily", priority: 0.9 },
  { pathname: "/about", changeFrequency: "monthly", priority: 0.5 },
  { pathname: "/contact", changeFrequency: "monthly", priority: 0.5 },
];

export default async function sitemap() {
  // Metadata routes are cached by default. This request-time boundary keeps
  // the database-derived sitemap current and prevents build-time database use,
  // even when the deployment origin is not configured correctly.
  await connection();

  const rootUrl = getPublicSitePageUrl("/");
  if (!rootUrl) return [];

  const vehicles = await getPublicVehicleSitemapEntries();

  return [
    ...staticPages.map(({ pathname, ...entry }) => ({
      url: getPublicSitePageUrl(pathname),
      ...entry,
    })),
    ...vehicles.map((vehicle) => ({
      url: getPublicSitePageUrl(`/cars/${vehicle.slug}`),
      lastModified: vehicle.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ];
}
