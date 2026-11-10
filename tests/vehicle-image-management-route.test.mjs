import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("next/cache.js", { namedExports: { revalidatePath() {} } });

class MockStaffAuthorizationError extends Error {}
class MockDraftImageUploadError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    Object.assign(this, details);
  }
}

const state = {
  calls: [],
  error: null,
  result: { ok: true, images: [{ id: "image-1", position: 0, isCover: true }] },
};

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: { StaffAuthorizationError: MockStaffAuthorizationError },
});

mock.module("../src/lib/admin/vehicle-image-upload-service.js", {
  namedExports: {
    DraftImageUploadError: MockDraftImageUploadError,
    async manageDraftVehicleImage(input) {
      state.calls.push(input);
      if (state.error) throw state.error;
      return state.result;
    },
  },
});

const { POST } = await import("../src/app/api/admin/vehicle-images/manage/route.js");

function request(headers = {}, body = JSON.stringify({ action: "cover", imageId: "image-1" })) {
  return new Request("http://localhost:3000/api/admin/vehicle-images/manage", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

function reset() {
  state.calls = [];
  state.error = null;
  state.result = { ok: true, images: [{ id: "image-1", position: 0, isCover: true }] };
}

test("management route rejects missing, cross-origin, malformed, and client-supplied ownership data", async () => {
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

  reset();
  let response = await POST(
    request(
      { origin: "http://localhost:3000" },
      JSON.stringify({
        action: "remove",
        imageId: "image-1",
        vehicleId: "another-car",
        cloudinaryPublicId: "attacker-controlled",
      })
    )
  );
  assert.equal(response.status, 400);
  assert.deepEqual(state.calls, []);

  response = await POST(
    request({ origin: "http://localhost:3000" }, JSON.stringify({ action: "reorder", imageId: "image-1" }))
  );
  assert.equal(response.status, 400);
  assert.deepEqual(state.calls, []);
});

test("management route passes only allowlisted operations and emits private responses", async () => {
  reset();
  let response = await POST(
    request(
      { origin: "http://localhost:3000" },
      JSON.stringify({ action: "reorder", imageId: "image-1", direction: "left" })
    )
  );
  assert.equal(response.status, 200);
  assert.deepEqual(state.calls, [{ action: "reorder", imageId: "image-1", direction: "left" }]);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.deepEqual(await response.json(), state.result);

  reset();
  state.error = new MockStaffAuthorizationError();
  response = await POST(request({ origin: "http://localhost:3000" }));
  assert.equal(response.status, 403);

  reset();
  state.error = new MockDraftImageUploadError("not_found_or_not_editable");
  response = await POST(request({ origin: "http://localhost:3000" }));
  assert.equal(response.status, 404);
});

test("Cloudinary cleanup failure remains explicit while returning repaired trusted image state", async () => {
  reset();
  state.error = new MockDraftImageUploadError("cloudinary_cleanup_failed", {
    detached: true,
    images: [{ id: "image-2", position: 0, isCover: true }],
  });

  const response = await POST(
    request(
      { origin: "http://localhost:3000" },
      JSON.stringify({ action: "remove", imageId: "image-1" })
    )
  );
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error:
      "The photo was removed from this car, but Cloudinary cleanup failed. It requires safe server-side cleanup.",
    detached: true,
    images: [{ id: "image-2", position: 0, isCover: true }],
  });
});
