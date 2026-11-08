import test, { mock } from "node:test";
import assert from "node:assert/strict";

class MockStaffAuthorizationError extends Error {}

const state = {
  requestHeaders: new Headers(),
};

mock.module("server-only", {});

mock.module("next/headers.js", {
  namedExports: {
    async headers() {
      return state.requestHeaders;
    },
  },
});

mock.module("../src/lib/auth/staff-session.js", {
  namedExports: {
    StaffAuthorizationError: MockStaffAuthorizationError,
  },
});

const { requireAllowedStaffMutationOrigin } = await import(
  "../src/lib/auth/staff-mutation-origin.js"
);

const envKey = "STAFF_AUTH_ALLOWED_ORIGIN";

async function withConfiguredOrigin(origin, callback) {
  const previousValue = process.env[envKey];

  try {
    if (origin === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = origin;
    }

    await callback();
  } finally {
    if (previousValue === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previousValue;
    }
  }
}

test("local development requires an exact Origin and Host match", async () => {
  await withConfiguredOrigin(undefined, async () => {
    state.requestHeaders = new Headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });

    await assert.doesNotReject(requireAllowedStaffMutationOrigin);
  });
});

test("missing, malformed, and spoofed forwarded origins are rejected", async () => {
  await withConfiguredOrigin(undefined, async () => {
    for (const headers of [
      { host: "localhost:3000" },
      { origin: "not-an-origin", host: "localhost:3000" },
      {
        origin: "https://attacker.example",
        host: "localhost:3000",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
      {
        origin: "http://localhost:3000",
        host: "internal-proxy:8080",
        "x-forwarded-host": "localhost:3000",
        "x-forwarded-proto": "http",
      },
    ]) {
      state.requestHeaders = new Headers(headers);
      await assert.rejects(
        requireAllowedStaffMutationOrigin,
        MockStaffAuthorizationError
      );
    }
  });
});

test("the configured Firebase App Hosting origin is accepted and unapproved origins fail", async () => {
  const productionOrigin =
    "https://ghana-auto--ghana-auto.us-east4.hosted.app";

  await withConfiguredOrigin(productionOrigin, async () => {
    state.requestHeaders = new Headers({
      origin: productionOrigin,
      host: "internal-proxy:8080",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "http",
    });
    await assert.doesNotReject(requireAllowedStaffMutationOrigin);

    state.requestHeaders = new Headers({
      origin: "https://attacker.example",
      host: "internal-proxy:8080",
      "x-forwarded-host": "ghana-auto--ghana-auto.us-east4.hosted.app",
      "x-forwarded-proto": "https",
    });
    await assert.rejects(
      requireAllowedStaffMutationOrigin,
      MockStaffAuthorizationError
    );
  });
});
