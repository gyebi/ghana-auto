import test, { mock } from "node:test";
import assert from "node:assert/strict";

class MockVehicleMutationConflictError extends Error {}

const state = {
  authorizationError: null,
  createError: null,
  createCalls: [],
  createImplementation: null,
  confirmationCalls: [],
  confirmationResult: null,
  originError: null,
  originCalls: 0,
  staffUser: null,
  updateCalls: [],
  updateResult: undefined,
  publishedUpdateCalls: [],
  publishedUpdateError: null,
  publishResult: { ok: true },
  transitionCalls: [],
  transitionResult: { ok: true },
};

mock.module("server-only", {});

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: {
    async requireActiveStaffSession() {
      if (state.authorizationError) throw state.authorizationError;
      return state.staffUser;
    },
  },
});

mock.module("../src/lib/auth/staff-mutation-origin.js", {
  namedExports: {
    async requireAllowedStaffMutationOrigin() {
      state.originCalls += 1;
      if (state.originError) throw state.originError;
    },
  },
});

mock.module("../src/lib/db/admin-vehicle-mutation-repository.js", {
  namedExports: {
    async createDraftVehicle(data) {
      state.createCalls.push(data);
      if (state.createImplementation) {
        return state.createImplementation(data);
      }
      if (state.createError) throw state.createError;
      return { id: "clxvehicle01", slug: "2024-toyota-corolla-ga-000007" };
    },
    async findAdminVehicleForEdit() {
      return null;
    },
    async findAdminVehicleForPublishedEdit() {
      return null;
    },
    async findAdminVehicleForReadOnlyView() {
      return null;
    },
    async findAdminVehicleForReservedManagement() {
      return null;
    },
    async findAdminVehicleForCreationConfirmation(id) {
      state.confirmationCalls.push(id);
      return state.confirmationResult;
    },
    async updateDraftVehicle(id, data) {
      state.updateCalls.push({ id, data });
      if (state.updateResult !== undefined) return state.updateResult;
      return { id, slug: "stable-slug" };
    },
    async updatePublishedVehicle(id, data) {
      state.publishedUpdateCalls.push({ id, data });
      if (state.publishedUpdateError) throw state.publishedUpdateError;
      return { id };
    },
    async updateReservedVehicle(id, data) {
      state.publishedUpdateCalls.push({ id, data, reserved: true });
      return { id };
    },
    async publishDraftVehicle(id) {
      state.publishCall = id;
      if (state.publishError) throw state.publishError;
      return state.publishResult;
    },
    async transitionVehicleStatus(id, action) {
      state.transitionCalls.push({ id, action });
      if (state.transitionError) throw state.transitionError;
      return state.transitionResult;
    },
    VehicleMutationConflictError: MockVehicleMutationConflictError,
  },
});

const {
  createAdminVehicle,
  getAuthorizedVehicleCreationConfirmation,
  publishAdminVehicle,
  transitionAdminVehicle,
  updateAdminVehicle,
  updatePublishedAdminVehicle,
} = await import("../src/lib/admin/vehicle-mutation-service.js");

function formData(overrides = {}) {
  const values = {
    year: "2024",
    make: "Toyota",
    model: "Corolla",
    bodyType: "Sedan",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "10000",
    price: "150000.00",
    currency: "GHS",
    inventoryType: "LOCAL_STOCK",
    ...overrides,
  };
  const value = new FormData();

  for (const [key, entry] of Object.entries(values)) {
    if (entry !== undefined) value.set(key, entry);
  }

  return value;
}

function reset({ authorizationError = null, originError = null, role = "STAFF" } = {}) {
  state.authorizationError = authorizationError;
  state.createError = null;
  state.createCalls = [];
  state.createImplementation = null;
  state.confirmationCalls = [];
  state.confirmationResult = null;
  state.originError = originError;
  state.originCalls = 0;
  state.staffUser = {
    firebaseUid: "firebase-staff-1",
    email: "staff@ghanaauto.example",
    active: true,
    role,
  };
  state.updateCalls = [];
  state.updateResult = undefined;
  state.publishedUpdateCalls = [];
  state.publishedUpdateError = null;
  state.publishCall = null;
  state.publishResult = { ok: true };
  state.publishError = null;
  state.transitionCalls = [];
  state.transitionResult = { ok: true };
  state.transitionError = null;
}

test("active ADMIN and STAFF users can create car drafts without supplying stock codes", async () => {
  for (const role of ["ADMIN", "STAFF"]) {
    reset({ role });

    const result = await createAdminVehicle(formData());

    assert.equal(result.ok, true);
    assert.equal(state.originCalls, 1);
    assert.equal(state.createCalls.length, 1);
    assert.equal("stockCode" in state.createCalls[0], false);
    assert.equal("slug" in state.createCalls[0], false);
  }
});

test("unauthenticated, inactive, and cross-origin requests do not mutate inventory", async () => {
  for (const error of [
    new Error("unauthenticated"),
    new Error("inactive staff"),
  ]) {
    reset({ authorizationError: error });

    await assert.rejects(() => createAdminVehicle(formData()), error);
    assert.equal(state.createCalls.length, 0);
    assert.equal(state.originCalls, 0);
  }

  reset({ originError: new Error("cross-origin denied") });
  await assert.rejects(() => createAdminVehicle(formData()), /cross-origin denied/);
  assert.equal(state.createCalls.length, 0);
});

test("only an active staff session can retrieve a created car confirmation", async () => {
  reset({ authorizationError: new Error("staff access denied") });

  await assert.rejects(
    () => getAuthorizedVehicleCreationConfirmation("clxvehicle01"),
    /staff access denied/
  );
  assert.deepEqual(state.confirmationCalls, []);

  reset();
  assert.equal(await getAuthorizedVehicleCreationConfirmation("invalid id"), null);
  assert.deepEqual(state.confirmationCalls, []);

  state.confirmationResult = {
    id: "clxvehicle01",
    year: 2024,
    make: "Toyota",
    model: "Corolla",
    stockCode: "GA-000007",
    status: "DRAFT",
    published: false,
  };
  assert.deepEqual(
    await getAuthorizedVehicleCreationConfirmation("clxvehicle01"),
    state.confirmationResult
  );
  assert.deepEqual(state.confirmationCalls, ["clxvehicle01"]);

  state.confirmationResult = null;
  assert.equal(
    await getAuthorizedVehicleCreationConfirmation("clxvehicle02"),
    null
  );
});

test("protected fields are ignored and updates preserve the existing stock code and slug", async () => {
  reset();
  const submission = formData({
    stockCode: "ATTACKER-CODE",
    status: "AVAILABLE",
    published: "true",
    featured: "true",
    id: "replacement-id",
    slug: "replacement-slug",
  });

  const result = await updateAdminVehicle("clxvehicle01", submission);

  assert.equal(result.ok, true);
  assert.deepEqual(state.updateCalls[0], {
    id: "clxvehicle01",
    data: {
      make: "Toyota",
      model: "Corolla",
      year: 2024,
      price: "150000.00",
      currency: "GHS",
      showPrice: false,
      bodyType: "Sedan",
      condition: "Foreign Used",
      transmission: "Automatic",
      fuelType: "Petrol",
      mileage: 10000,
      location: null,
      description: null,
      inventoryType: "LOCAL_STOCK",
      originCountry: null,
      estimatedLeadTimeMinDays: null,
      estimatedLeadTimeMaxDays: null,
      shippingCostEstimate: null,
      clearingCostEstimate: null,
      otherImportCostEstimate: null,
      importCurrency: null,
      importNotes: null,
    },
  });
  assert.equal("stockCode" in state.updateCalls[0].data, false);
  assert.equal("slug" in state.updateCalls[0].data, false);
  assert.equal("status" in state.updateCalls[0].data, false);
});

test("a status or publication race cannot bypass draft-only editing", async () => {
  reset();
  state.updateResult = null;

  const result = await updateAdminVehicle(
    "clxvehicle01",
    formData({
      status: "AVAILABLE",
      published: "true",
      slug: "attempted-slug-change",
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.form, /no longer be edited/);
  assert.equal(result.values.make, "Toyota");
  assert.equal(state.updateCalls.length, 1);
  assert.equal("status" in state.updateCalls[0].data, false);
  assert.equal("published" in state.updateCalls[0].data, false);
  assert.equal("slug" in state.updateCalls[0].data, false);
});

test("server validation errors preserve every editable submitted value", async () => {
  reset();
  const result = await createAdminVehicle(formData({
    stockCode: "ATTACKER-CODE",
    price: "12.345",
    inventoryType: "IMPORT_ORDER",
    originCountry: "Japan",
    estimatedLeadTimeMinDays: "90",
    estimatedLeadTimeMaxDays: "30",
    shippingCostEstimate: "12000.00",
    clearingCostEstimate: "8000.00",
    otherImportCostEstimate: "500.00",
    importCurrency: "USD",
    importNotes: "Keep this note",
    description: "Keep this description",
    showPrice: "on",
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.price, /up to two decimal places/);
  assert.match(result.errors.estimatedLeadTimeMaxDays, /cannot be less/);
  assert.deepEqual(result.values, {
    make: "Toyota",
    model: "Corolla",
    year: "2024",
    price: "12.345",
    currency: "GHS",
    bodyType: "Sedan",
    condition: "Foreign Used",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "10000",
    location: "",
    description: "Keep this description",
    inventoryType: "IMPORT_ORDER",
    originCountry: "Japan",
    estimatedLeadTimeMinDays: "90",
    estimatedLeadTimeMaxDays: "30",
    shippingCostEstimate: "12000.00",
    clearingCostEstimate: "8000.00",
    otherImportCostEstimate: "500.00",
    importCurrency: "USD",
    importNotes: "Keep this note",
    showPrice: true,
  });
  assert.equal("stockCode" in result.values, false);
});

test("required-field failures preserve the entered selects, checkbox, and import values", async () => {
  reset();
  const result = await updateAdminVehicle("clxvehicle01", formData({
    make: "",
    model: "Still here",
    inventoryType: "IN_TRANSIT",
    originCountry: "United Kingdom",
    estimatedLeadTimeMinDays: "14",
    estimatedLeadTimeMaxDays: "28",
    shippingCostEstimate: "1000.00",
    clearingCostEstimate: "2000.00",
    otherImportCostEstimate: "300.00",
    importCurrency: "USD",
    importNotes: "Keep every import value",
    showPrice: "on",
  }));

  assert.equal(result.ok, false);
  assert.match(result.errors.make, /required/);
  assert.equal(state.updateCalls.length, 0);
  assert.equal(result.values.make, "");
  assert.equal(result.values.model, "Still here");
  assert.equal(result.values.inventoryType, "IN_TRANSIT");
  assert.equal(result.values.originCountry, "United Kingdom");
  assert.equal(result.values.estimatedLeadTimeMinDays, "14");
  assert.equal(result.values.estimatedLeadTimeMaxDays, "28");
  assert.equal(result.values.shippingCostEstimate, "1000.00");
  assert.equal(result.values.clearingCostEstimate, "2000.00");
  assert.equal(result.values.otherImportCostEstimate, "300.00");
  assert.equal(result.values.importCurrency, "USD");
  assert.equal(result.values.importNotes, "Keep every import value");
  assert.equal(result.values.showPrice, true);
});

test("unique conflicts return a safe form error while preserving editable values", async () => {
  reset();
  state.createError = {
    code: "P2002",
    meta: { target: ["stockCode"] },
  };

  const duplicate = await createAdminVehicle(formData());

  assert.equal(duplicate.ok, false);
  assert.match(duplicate.errors.form, /already exists/);
  assert.equal(duplicate.values.make, "Toyota");

  state.createError = {
    code: "P2002",
    meta: { target: ["slug"] },
  };
  const duplicateSlug = await createAdminVehicle(formData());

  assert.equal(duplicateSlug.ok, false);
  assert.match(duplicateSlug.errors.form, /already exists/);
});

test("unexpected database failures are never returned as successful saves", async () => {
  reset();
  const databaseError = new Error("database unavailable");
  state.createError = databaseError;

  await assert.rejects(() => createAdminVehicle(formData()), databaseError);
});

test("only ADMIN may publish, change stock status, or update a published car", async () => {
  reset({ role: "STAFF" });
  await assert.rejects(() => publishAdminVehicle("clxvehicle01"), /Administrator authorization/);
  await assert.rejects(
    () => updatePublishedAdminVehicle("clxvehicle01", formData()),
    /Administrator authorization/
  );
  await assert.rejects(
    () => transitionAdminVehicle("clxvehicle01", "sold"),
    /Administrator authorization/
  );

  reset({ role: "ADMIN" });
  const update = await updatePublishedAdminVehicle("clxvehicle01", formData({
    stockCode: "ATTACKER", slug: "attacker", status: "DRAFT", published: "false",
  }));
  assert.equal(update.ok, true);
  assert.equal(state.publishedUpdateCalls.length, 1);
  assert.equal("stockCode" in state.publishedUpdateCalls[0].data, false);
  assert.equal("slug" in state.publishedUpdateCalls[0].data, false);
  assert.equal("status" in state.publishedUpdateCalls[0].data, false);
  assert.equal("published" in state.publishedUpdateCalls[0].data, false);

  assert.deepEqual(await publishAdminVehicle("clxvehicle01"), { ok: true });
  assert.equal(state.publishCall, "clxvehicle01");
  assert.deepEqual(await transitionAdminVehicle("clxvehicle01", "reserve"), { ok: true });
  assert.deepEqual(state.transitionCalls, [{ id: "clxvehicle01", action: "reserve" }]);
});

test("publication and transition failures return safe, actionable errors", async () => {
  reset({ role: "ADMIN" });
  state.publishResult = { ok: false, reason: "ineligible", problems: ["at least one photograph"] };
  const publication = await publishAdminVehicle("clxvehicle01");
  assert.equal(publication.ok, false);
  assert.match(publication.message, /at least one photograph/);

  state.transitionResult = { ok: false, reason: "invalid_transition" };
  const transition = await transitionAdminVehicle("clxvehicle01", "archive");
  assert.equal(transition.ok, false);
  assert.match(transition.message, /no longer available/);
  assert.equal((await transitionAdminVehicle("clxvehicle01", "publish")).ok, false);
  assert.deepEqual(state.transitionCalls, [{ id: "clxvehicle01", action: "archive" }]);
});

test("exhausted transaction conflicts are returned without database details", async () => {
  reset({ role: "ADMIN" });
  state.publishedUpdateError = new MockVehicleMutationConflictError("internal conflict");
  const edit = await updatePublishedAdminVehicle("clxvehicle01", formData());
  assert.equal(edit.ok, false);
  assert.match(edit.errors.form, /changed by another request/);

  state.publishError = new MockVehicleMutationConflictError("internal conflict");
  const publish = await publishAdminVehicle("clxvehicle01");
  assert.equal(publish.ok, false);
  assert.match(publish.message, /changed by another request/);

  state.transitionError = new MockVehicleMutationConflictError("internal conflict");
  const transition = await transitionAdminVehicle("clxvehicle01", "sold");
  assert.equal(transition.ok, false);
  assert.match(transition.message, /changed by another request/);
});
