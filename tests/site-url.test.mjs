import test from "node:test";
import assert from "node:assert/strict";

import { getPublicSitePageUrl, getPublicSiteUrl } from "../src/lib/site-url.js";

test("public site URLs accept HTTPS origins and local development HTTP", () => {
  assert.equal(
    getPublicSiteUrl("https://ghanaauto.example/anything", "production"),
    "https://ghanaauto.example"
  );
  assert.equal(
    getPublicSitePageUrl(
      "/cars/2024-toyota-corolla",
      "https://ghanaauto.example",
      "production"
    ),
    "https://ghanaauto.example/cars/2024-toyota-corolla"
  );
  assert.equal(
    getPublicSiteUrl("http://localhost:3000", "development"),
    "http://localhost:3000"
  );
  assert.equal(
    getPublicSiteUrl("http://127.0.0.1:3000", "test"),
    "http://127.0.0.1:3000"
  );
});

test("production never emits HTTP or localhost sitemap origins", () => {
  for (const invalidProductionUrl of [
    "http://ghanaauto.example",
    "http://localhost:3000",
    "https://localhost",
    "http://127.0.0.1:3000",
  ]) {
    assert.equal(getPublicSiteUrl(invalidProductionUrl, "production"), null);
  }
  assert.equal(
    getPublicSitePageUrl("/sitemap.xml", "http://localhost:3000", "production"),
    null
  );
});

test("public site URLs reject unsafe or malformed inputs", () => {
  for (const unsafeUrl of [
    "javascript:alert(1)",
    "https://user:pass@ghanaauto.example",
    "not a URL",
    "",
  ]) {
    assert.equal(getPublicSiteUrl(unsafeUrl, "production"), null);
  }
  assert.equal(
    getPublicSitePageUrl("cars", "https://ghanaauto.example", "production"),
    null
  );
});
