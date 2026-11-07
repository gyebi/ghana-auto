import test, { mock } from "node:test";
import assert from "node:assert/strict";

const accessState = {
  authorizationError: null,
  listCalls: 0,
  staffUser: null,
};

mock.module("server-only", {});

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: {
    async requireActiveStaffSession() {
      if (accessState.authorizationError) {
        throw accessState.authorizationError;
      }

      return accessState.staffUser;
    },
  },
});

mock.module("../src/lib/db/admin-vehicle-repository.js", {
  namedExports: {
    async listAdminVehicles() {
      accessState.listCalls += 1;
      return { vehicles: [], total: 0 };
    },
  },
});

const { getAuthorizedAdminVehicleListing } = await import(
  "../src/lib/admin/vehicle-listing.js"
);

function resetAccess({ staffUser = null, authorizationError = null } = {}) {
  accessState.authorizationError = authorizationError;
  accessState.listCalls = 0;
  accessState.staffUser = staffUser;
}

test("active ADMIN and STAFF sessions can request inventory", async () => {
  for (const role of ["ADMIN", "STAFF"]) {
    const staffUser = {
      firebaseUid: `firebase-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@ghanaauto.example`,
      active: true,
      role,
    };
    resetAccess({ staffUser });

    const result = await getAuthorizedAdminVehicleListing({ page: "1" });

    assert.equal(result.staffUser, staffUser);
    assert.deepEqual(result.listing, { vehicles: [], total: 0 });
    assert.equal(accessState.listCalls, 1);
  }
});

test("unauthorized requests never reach the inventory repository", async () => {
  resetAccess({ authorizationError: new Error("staff access denied") });

  await assert.rejects(
    () => getAuthorizedAdminVehicleListing({ page: "1" }),
    /staff access denied/
  );
  assert.equal(accessState.listCalls, 0);
});
