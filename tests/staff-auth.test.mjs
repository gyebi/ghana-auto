import test from "node:test";
import assert from "node:assert/strict";

import {
  getIdTokenFromPayload,
  hasValidCsrfToken,
  isSameOriginRequest,
  readSmallJsonBody,
} from "../src/lib/auth/request-validation.mjs";
import {
  isActiveStaffIdentity,
  isRecentlyAuthenticated,
} from "../src/lib/auth/staff-authorization.mjs";

const staffUser = {
  firebaseUid: "firebase-user-123",
  email: "staff@ghanaauto.example",
  active: true,
  role: "STAFF",
};

const decodedToken = {
  uid: "firebase-user-123",
  email: "STAFF@ghanaauto.example",
  email_verified: true,
};

test("active ADMIN and STAFF identities require matching verified Firebase email", () => {
  assert.equal(isActiveStaffIdentity(decodedToken, staffUser), true);
  assert.equal(
    isActiveStaffIdentity(decodedToken, { ...staffUser, role: "ADMIN" }),
    true
  );
  assert.equal(
    isActiveStaffIdentity(decodedToken, { ...staffUser, active: false }),
    false
  );
  assert.equal(
    isActiveStaffIdentity(decodedToken, {
      ...staffUser,
      email: "other@ghanaauto.example",
    }),
    false
  );
  assert.equal(
    isActiveStaffIdentity(
      { ...decodedToken, email_verified: false },
      staffUser
    ),
    false
  );
  assert.equal(
    isActiveStaffIdentity({ ...decodedToken, uid: "other-user" }, staffUser),
    false
  );
});

test("session issuance only accepts recently authenticated Firebase identities", () => {
  const now = 1_800_000_000;

  assert.equal(isRecentlyAuthenticated({ auth_time: now - 299 }, now), true);
  assert.equal(isRecentlyAuthenticated({ auth_time: now - 301 }, now), false);
  assert.equal(isRecentlyAuthenticated({ auth_time: now + 61 }, now), false);
  assert.equal(isRecentlyAuthenticated({}, now), false);
});

test("session requests reject cross-origin and malformed CSRF attempts", () => {
  const sameOriginRequest = new Request("https://ghanaauto.example/api/auth/session", {
    headers: { origin: "https://ghanaauto.example" },
  });
  const crossOriginRequest = new Request("https://ghanaauto.example/api/auth/session", {
    headers: { origin: "https://attacker.example" },
  });
  const csrfToken = "a".repeat(43);

  assert.equal(isSameOriginRequest(sameOriginRequest), true);
  assert.equal(isSameOriginRequest(crossOriginRequest), false);
  assert.equal(isSameOriginRequest(new Request("https://ghanaauto.example")), false);
  assert.equal(hasValidCsrfToken(csrfToken, csrfToken), true);
  assert.equal(hasValidCsrfToken(csrfToken, "b".repeat(43)), false);
  assert.equal(hasValidCsrfToken("short", csrfToken), false);
});

test("session payload validation constrains JSON shape and request size", async () => {
  const idToken = "a".repeat(100);
  const validRequest = new Request("https://ghanaauto.example/api/auth/session", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  const parsed = await readSmallJsonBody(validRequest);

  assert.equal(parsed.ok, true);
  assert.equal(getIdTokenFromPayload(parsed.value), idToken);
  assert.equal(getIdTokenFromPayload({ idToken, extra: true }), null);
  assert.equal(getIdTokenFromPayload({ idToken: "too-short" }), null);

  const oversizedRequest = new Request(
    "https://ghanaauto.example/api/auth/session",
    {
      method: "POST",
      body: JSON.stringify({ idToken: "a".repeat(9_000) }),
    }
  );
  const oversized = await readSmallJsonBody(oversizedRequest);

  assert.deepEqual(oversized, { ok: false, reason: "too_large" });
});


test("production origin validation works behind a reverse proxy", () => {
  const envKey = "STAFF_AUTH_ALLOWED_ORIGIN";
  const previousValue = process.env[envKey];

  const productionOrigin =
    "https://ghana-auto--ghana-auto.us-east4.hosted.app";

  const makeRequest = (origin) =>
    new Request("http://internal-proxy:8080/api/auth/session", {
      headers: origin ? { origin } : {},
    });

  try {
    process.env[envKey] = productionOrigin;

    // Accept the approved public origin even if the
    // internal request URL differs.
    assert.equal(
      isSameOriginRequest(makeRequest(productionOrigin)),
      true
    );

    // Reject unapproved origins.
    assert.equal(
      isSameOriginRequest(makeRequest("https://attacker.example")),
      false
    );

    // Reject missing origins.
    assert.equal(
      isSameOriginRequest(makeRequest(null)),
      false
    );

    // Reject malformed origins.
    assert.equal(
      isSameOriginRequest(makeRequest("not-a-valid-origin")),
      false
    );

    // Reject origins containing paths.
    assert.equal(
      isSameOriginRequest(
        makeRequest(`${productionOrigin}/admin`)
      ),
      false
    );

    // Invalid production configuration must fail closed.
    process.env[envKey] = "http://insecure.example";

    assert.equal(
      isSameOriginRequest(makeRequest(productionOrigin)),
      false
    );

    process.env[envKey] = `${productionOrigin}/admin`;

    assert.equal(
      isSameOriginRequest(makeRequest(productionOrigin)),
      false
    );
  } finally {
    if (previousValue === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previousValue;
    }
  }
});
