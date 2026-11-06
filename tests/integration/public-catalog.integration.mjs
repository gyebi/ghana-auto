
import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://127.0.0.1:3000";

// Explicitly target the local application.
// This test must not run against production.
async function getVehiclePage(slug) {
  const response = await fetch(
    `${BASE_URL}/cars/${encodeURIComponent(slug)}`,
    {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  return {
    status: response.status,
    html: await response.text(),
  };
}

test("published Toyota RAV4 is publicly accessible", async () => {
  const result = await getVehiclePage("2019-toyota-rav4");

  assert.equal(result.status, 200);
});

test("published Honda Accord is publicly accessible", async () => {
  const result = await getVehiclePage("2018-honda-accord");

  assert.equal(result.status, 200);
  assert.match(result.html, /Price on Request/i);

  // Internal price must not appear in the public response.
  assert.doesNotMatch(result.html, /190000(?:\.00)?/);
});

test("unpublished Hyundai Tucson returns 404", async () => {
  const result = await getVehiclePage("2020-hyundai-tucson");

  assert.equal(result.status, 404);
});

test("sold Toyota Corolla returns 404", async () => {
  const result = await getVehiclePage("2017-toyota-corolla");

  assert.equal(result.status, 404);
});

test("import-order Kia Sportage remains accessible", async () => {
  const result = await getVehiclePage("2021-kia-sportage");

  assert.equal(result.status, 200);
  assert.match(result.html, /Available to Order/i);
});

test("draft Nissan Rogue returns 404", async () => {
  const result = await getVehiclePage("2019-nissan-rogue");

  assert.equal(result.status, 404);
});

test("unknown vehicle returns 404", async () => {
  const result = await getVehiclePage("unknown-vehicle-999");

  assert.equal(result.status, 404);
});
