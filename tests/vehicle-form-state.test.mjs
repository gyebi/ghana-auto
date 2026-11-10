import test from "node:test";
import assert from "node:assert/strict";

import {
  focusFirstInvalidVehicleFormField,
  getFirstInvalidVehicleFormField,
} from "../src/lib/admin/vehicle-form-state.js";

test("first invalid car form field follows the visual tab order", () => {
  assert.equal(
    getFirstInvalidVehicleFormField({
      price: "Price must be a non-negative amount.",
      make: "Make is required.",
      year: "Year is required.",
    }),
    "year"
  );
  assert.equal(getFirstInvalidVehicleFormField({}), null);
});

test("first invalid car form input is focused and scrolled into view", () => {
  const calls = [];
  const field = {
    focus(options) {
      calls.push(["focus", options]);
    },
    scrollIntoView(options) {
      calls.push(["scrollIntoView", options]);
    },
  };

  assert.equal(
    focusFirstInvalidVehicleFormField(
      { price: "Price must be valid.", make: "Make is required." },
      (id) => (id === "make" ? field : null)
    ),
    "make"
  );
  assert.deepEqual(calls, [
    ["focus", { preventScroll: true }],
    ["scrollIntoView", { block: "center" }],
  ]);
});
