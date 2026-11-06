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
