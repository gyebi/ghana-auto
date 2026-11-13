import test from "node:test";
import assert from "node:assert/strict";

const cloudName = "ghana-auto-production";
const previousCloudName = process.env.CLOUDINARY_CLOUD_NAME;

process.env.CLOUDINARY_CLOUD_NAME = cloudName;
const { default: nextConfig } = await import("../next.config.mjs");

if (previousCloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
else process.env.CLOUDINARY_CLOUD_NAME = previousCloudName;

test("image optimization is restricted to the configured Cloudinary account", () => {
  assert.equal(nextConfig.images.maximumRedirects, 0);
  assert.deepEqual(nextConfig.images.remotePatterns, [
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      port: "",
      pathname: `/${cloudName}/**`,
      search: "",
    },
  ]);
});
