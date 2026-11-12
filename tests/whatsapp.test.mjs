import test from "node:test";
import assert from "node:assert/strict";

import {
  getConfiguredWhatsAppNumber,
  getPublicVehicleListingUrl,
  getVehicleWhatsAppMessage,
  getWhatsAppUrl,
} from "../src/lib/whatsapp.js";

test("WhatsApp links use a valid digits-only number and encode their message", () => {
  const href = getWhatsAppUrl("233201234567", "Hello Ghana Auto & thank you!");
  const url = new URL(href);

  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/233201234567");
  assert.equal(url.searchParams.get("text"), "Hello Ghana Auto & thank you!");
});

test("invalid WhatsApp numbers and messages do not create links", () => {
  for (const number of [undefined, "", "+233201234567", "233 201234567", "abc"]) {
    assert.equal(getConfiguredWhatsAppNumber(number), null);
    assert.equal(getWhatsAppUrl(number, "Hello"), null);
  }

  assert.equal(getWhatsAppUrl("233201234567", ""), null);
});

test("vehicle messages use only valid public listing details", () => {
  const vehicle = {
    id: "GA-042",
    slug: "2021-kia-sportage",
    year: 2021,
    make: "Kia",
    model: "Sportage",
    inventoryType: "IMPORT_ORDER",
  };

  assert.equal(
    getPublicVehicleListingUrl(vehicle.slug, "https://ghanaauto.example/"),
    "https://ghanaauto.example/cars/2021-kia-sportage"
  );

  const message = getVehicleWhatsAppMessage(
    vehicle,
    "https://ghanaauto.example"
  );

  assert.match(message, /2021 Kia Sportage/);
  assert.match(message, /Stock Code: GA-042/);
  assert.match(message, /available to order and is not currently in local stock/);
  assert.match(message, /https:\/\/ghanaauto\.example\/cars\/2021-kia-sportage/);

  assert.equal(
    getVehicleWhatsAppMessage({ ...vehicle, id: "internal_123" }, "https://ghanaauto.example"),
    null
  );
  assert.equal(
    getVehicleWhatsAppMessage(vehicle, "javascript:alert(1)"), null);
});
