
import test from "node:test";
import assert from "node:assert/strict";

import {
  isFirebaseCredentialDenial,
} from "../src/lib/auth/auth-error-policy.mjs";

test("recognizes expired Firebase sessions", () => {
  assert.equal(
    isFirebaseCredentialDenial({
      code: "auth/session-cookie-expired",
    }),
    true
  );
});

test("recognizes revoked Firebase sessions", () => {
  assert.equal(
    isFirebaseCredentialDenial({
      code: "auth/session-cookie-revoked",
    }),
    true
  );
});

test("does not classify database outages as credential failures", () => {
  assert.equal(
    isFirebaseCredentialDenial({
      code: "P1001",
    }),
    false
  );
});

test("does not classify unknown service errors as credential failures", () => {
  assert.equal(
    isFirebaseCredentialDenial({
      code: "auth/internal-error",
    }),
    false
  );
});

test("handles missing or malformed errors safely", () => {
  assert.equal(isFirebaseCredentialDenial(null), false);
  assert.equal(isFirebaseCredentialDenial({}), false);
});
