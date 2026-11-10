import test from "node:test";
import assert from "node:assert/strict";

import {
  getCreatedVehicleConfirmationLinks,
  getCreatedVehicleConfirmationPath,
} from "../src/lib/admin/vehicle-creation-routing.js";

test("successful creation confirmation uses the dedicated car-draft URL", () => {
  assert.equal(
    getCreatedVehicleConfirmationPath("clxvehicle01"),
    "/admin/vehicles/clxvehicle01/created"
  );
});

test("confirmation action links use the existing new, edit, and inventory routes", () => {
  assert.deepEqual(getCreatedVehicleConfirmationLinks("clxvehicle01"), {
    addAnother: "/admin/vehicles/new",
    edit: "/admin/vehicles/clxvehicle01/edit",
    inventory: "/admin/vehicles",
  });
});
