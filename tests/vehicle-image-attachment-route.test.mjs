import test, { mock } from "node:test";
import assert from "node:assert/strict";

class MockStaffAuthorizationError extends Error {}
class MockDraftImageUploadError extends Error {}

const state = { calls: [], error: null, result: { ok: true, image: { id: "image-1" } } };

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: { StaffAuthorizationError: MockStaffAuthorizationError },
});

mock.module("../src/lib/admin/vehicle-image-upload-service.js", {
  namedExports: {
    DraftImageUploadError: MockDraftImageUploadError,
    async attachIssuedDraftVehicleImage(uploadGrant) {
      state.calls.push(uploadGrant);
      if (state.error) throw state.error;
      return state.result;
    },
  },
});

const { POST } = await import("../src/app/api/admin/vehicle-images/attach/route.js");

function request(headers = {}, body = JSON.stringify({ uploadGrant: "valid-grant" })) {
  return new Request("http://localhost:3000/api/admin/vehicle-images/attach", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

function reset() {
  state.calls = [];
  state.error = null;
  state.result = { ok: true, image: { id: "image-1" } };
}

test("attachment route rejects cross-origin requests before attachment", async () => {
  for (const headers of [
    {},
    {
      origin: "https://attacker.example",
      "x-forwarded-host": "localhost:3000",
      "x-forwarded-proto": "http",
    },
  ]) {
    reset();
    const response = await POST(request(headers));
    assert.equal(response.status, 403);
    assert.deepEqual(state.calls, []);
  }
});

test("attachment route accepts only a bounded upload grant, never client asset metadata", async () => {
  reset();
  const rejected = await POST(
    request(
      { origin: "http://localhost:3000" },
      JSON.stringify({
        uploadGrant: "valid-grant",
        imageUrl: "https://attacker.example/image.jpg",
        publicId: "attacker-public-id",
      })
    )
  );
  assert.equal(rejected.status, 400);
  assert.deepEqual(state.calls, []);

  const oversized = await POST(
    request(
      { origin: "http://localhost:3000" },
      JSON.stringify({ uploadGrant: "a".repeat(2_049) })
    )
  );
  assert.equal(oversized.status, 400);
  assert.deepEqual(state.calls, []);
});

test("attachment route handles verified success, safe duplicates, limits, and authorization failures", async () => {
  reset();
  let response = await POST(request({ origin: "http://localhost:3000" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, image: { id: "image-1" } });
  assert.deepEqual(state.calls, ["valid-grant"]);

  reset();
  state.result = { ok: false, reason: "already_attached" };
  response = await POST(request({ origin: "http://localhost:3000" }));
  assert.deepEqual(await response.json(), { ok: true, alreadyAttached: true });

  reset();
  state.result = { ok: false, reason: "image_limit_reached" };
  response = await POST(request({ origin: "http://localhost:3000" }));
  assert.equal(response.status, 409);

  reset();
  state.error = new MockStaffAuthorizationError();
  response = await POST(request({ origin: "http://localhost:3000" }));
  assert.equal(response.status, 403);

  reset();
  state.error = new MockDraftImageUploadError();
  response = await POST(request({ origin: "http://localhost:3000" }));
  assert.equal(response.status, 400);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
});
