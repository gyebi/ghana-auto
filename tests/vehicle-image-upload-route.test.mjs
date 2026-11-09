import test, { mock } from "node:test";
import assert from "node:assert/strict";

class MockStaffAuthorizationError extends Error {}
class MockDraftImageUploadError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const state = {
  error: null,
  calls: [],
};

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: { StaffAuthorizationError: MockStaffAuthorizationError },
});

mock.module("../src/lib/admin/vehicle-image-upload-service.js", {
  namedExports: {
    DraftImageUploadError: MockDraftImageUploadError,
    async issueDraftVehicleImageUploadSignature(id) {
      state.calls.push(id);
      if (state.error) throw state.error;
      return { publicUploadValue: "safe" };
    },
  },
});

const { POST } = await import(
  "../src/app/api/admin/vehicles/[id]/image-upload-signature/route.js"
);

function request(headers = {}, body = "{}") {
  return new Request(
    "http://localhost:3000/api/admin/vehicles/clxvehicle01/image-upload-signature",
    {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    }
  );
}

function reset() {
  state.error = null;
  state.calls = [];
}

test("the signature endpoint rejects missing and spoofed origins before inventory access", async () => {
  for (const headers of [
    {},
    {
      origin: "https://attacker.example",
      "x-forwarded-host": "localhost:3000",
      "x-forwarded-proto": "http",
    },
  ]) {
    reset();
    const response = await POST(request(headers), { params: Promise.resolve({ id: "clxvehicle01" }) });
    assert.equal(response.status, 403);
    assert.deepEqual(state.calls, []);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
  }
});

test("the signature endpoint rejects malformed or client-controlled upload parameters", async () => {
  reset();
  const response = await POST(
    request({ origin: "http://localhost:3000" }, '{"folder":"attacker-folder"}'),
    { params: Promise.resolve({ id: "clxvehicle01" }) }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(state.calls, []);
});

test("the signature endpoint maps authorization and draft errors without exposing details", async () => {
  const cases = [
    [new MockStaffAuthorizationError(), 403],
    [new MockDraftImageUploadError("not_found"), 404],
    [new MockDraftImageUploadError("image_limit_reached"), 409],
  ];

  for (const [error, status] of cases) {
    reset();
    state.error = error;
    const response = await POST(request({ origin: "http://localhost:3000" }), {
      params: Promise.resolve({ id: "clxvehicle01" }),
    });
    assert.equal(response.status, status);
  }
});

test("the signature endpoint issues a private response only for a valid same-origin request", async () => {
  reset();
  const response = await POST(request({ origin: "http://localhost:3000" }), {
    params: Promise.resolve({ id: "clxvehicle01" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(state.calls, ["clxvehicle01"]);
  assert.deepEqual(await response.json(), { upload: { publicUploadValue: "safe" } });
  assert.equal(response.headers.get("vary"), "Cookie, Origin");
});
