import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  browse: new URL("../src/app/cars/page.js", import.meta.url),
  detail: new URL("../src/app/cars/[slug]/page.js", import.meta.url),
  admin: new URL("../src/app/admin/page.js", import.meta.url),
  sitemap: new URL("../src/app/sitemap.js", import.meta.url),
  robots: new URL("../src/app/robots.js", import.meta.url),
};

test("public inventory is indexable while admin remains excluded", async () => {
  const [browse, detail, admin, sitemap, robots] = await Promise.all(
    Object.values(files).map((file) => readFile(file, "utf8"))
  );

  assert.doesNotMatch(browse, /robots:\s*\{\s*index:\s*false/);
  assert.doesNotMatch(detail, /robots:\s*\{\s*index:\s*false/);
  assert.match(admin, /robots:\s*\{\s*index:\s*false/);
  assert.match(sitemap, /getPublicVehicleSitemapEntries/);
  assert.match(sitemap, /await connection\(\);[\s\S]*getPublicSitePageUrl\("\/"\)/);
  assert.match(robots, /disallow:\s*\["\/admin", "\/admin\/", "\/api\/"\]/);
});
