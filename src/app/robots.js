import { getPublicSitePageUrl } from "@/lib/site-url";

export default function robots() {
  const sitemap = getPublicSitePageUrl("/sitemap.xml");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/"],
    },
    ...(sitemap ? { sitemap } : {}),
  };
}
