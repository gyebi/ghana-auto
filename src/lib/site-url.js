const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function getPublicSiteUrl(
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
  environment = process.env.NODE_ENV
) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) return null;

  try {
    const url = new URL(siteUrl);
    const localHostname = LOCAL_HOSTNAMES.has(url.hostname);
    const production = environment === "production";

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.hostname ||
      url.username ||
      url.password ||
      (url.protocol === "http:" && (production || !localHostname)) ||
      (production && localHostname)
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicSitePageUrl(pathname, siteUrl, environment) {
  const origin = getPublicSiteUrl(siteUrl, environment);

  if (typeof pathname !== "string" || !pathname.startsWith("/") || !origin) {
    return null;
  }

  return new URL(pathname, origin).toString();
}
