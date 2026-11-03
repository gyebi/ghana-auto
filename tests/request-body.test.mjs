
import test from "node:test";
import assert from "node:assert/strict";

import {
  readSmallJsonBody,
  MAX_SESSION_REQUEST_BYTES,
} from "../src/lib/auth/request-validation.mjs";

function createStreamRequest(chunks) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });

  return new Request("http://localhost:3000/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: stream,
    duplex: "half",
  });
}

test("accepts valid JSON split across chunks", async () => {
  const request = createStreamRequest([
    '{"idToken":',
    '"example-token"',
    "}",
  ]);

  const result = await readSmallJsonBody(request);

  assert.deepEqual(result, {
    ok: true,
    value: { idToken: "example-token" },
  });
});

test("rejects oversized streamed requests", async () => {
  const request = createStreamRequest([
    '{"data":"',
    "x".repeat(MAX_SESSION_REQUEST_BYTES + 1),
    '"}',
  ]);

  const result = await readSmallJsonBody(request);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "too_large");
});

test("rejects malformed JSON safely", async () => {
  const request = createStreamRequest([
    '{"idToken":',
    "invalid-json",
  ]);

  const result = await readSmallJsonBody(request);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_json");
});
