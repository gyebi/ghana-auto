/** @type {import('next').NextConfig} */
const configuredStaffOrigin = process.env.STAFF_AUTH_ALLOWED_ORIGIN;
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
