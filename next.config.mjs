/** @type {import('next').NextConfig} */
const configuredStaffOrigin = process.env.STAFF_AUTH_ALLOWED_ORIGIN;
const configuredCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const hasValidCloudName =
  typeof configuredCloudName === "string" &&
  /^[A-Za-z0-9_-]{1,255}$/.test(configuredCloudName);
let staffActionAllowedOrigins = [];

try {
  const origin = new URL(configuredStaffOrigin);

  if (
    configuredStaffOrigin === origin.origin &&
    origin.protocol === "https:"
  ) {
    staffActionAllowedOrigins = [origin.host];
  }
} catch {}

const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      allowedOrigins: staffActionAllowedOrigins,
    },
  },
  images: hasValidCloudName
    ? {
      // The image optimizer must be limited to this application's Cloudinary
      // account and must not follow a permitted URL to another origin.
      maximumRedirects: 0,
      remotePatterns: [
        {
          protocol: "https",
          hostname: "res.cloudinary.com",
          port: "",
          pathname: `/${configuredCloudName}/**`,
          search: "",
        },
      ],
    }
    : undefined,
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
