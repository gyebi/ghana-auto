import { timingSafeEqual } from "node:crypto";

export const MAX_SESSION_REQUEST_BYTES = 8 * 1024;
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function isAllowedStaffOrigin(origin, fallbackOrigin) {
  if (typeof origin !== "string" || !origin) return false;

  try {
    const suppliedOrigin = new URL(origin);

    // The Origin header must contain an origin only.
    if (
      origin !== suppliedOrigin.origin ||
      suppliedOrigin.username ||
      suppliedOrigin.password
    ) {
      return false;
    }

    const configuredOrigin = process.env.STAFF_AUTH_ALLOWED_ORIGIN;

    if (configuredOrigin) {
      const approved = new URL(configuredOrigin);

      // Reject invalid or insecure production configuration.
      if (
        approved.protocol !== "https:" ||
        configuredOrigin !== approved.origin
      ) {
        return false;
      }

      return origin === configuredOrigin;
    }

    return origin === fallbackOrigin;
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request) {
  return isAllowedStaffOrigin(
    request.headers.get("origin"),
    new URL(request.url).origin
  );
}

export function hasJsonContentType(request) {
  return request.headers
    .get("content-type")
    ?.toLowerCase()
    .startsWith("application/json");
}

export function hasValidCsrfToken(submittedToken, cookieToken) {
  if (
    typeof submittedToken !== "string" ||
    typeof cookieToken !== "string" ||
    !CSRF_TOKEN_PATTERN.test(submittedToken) ||
    !CSRF_TOKEN_PATTERN.test(cookieToken)
  ) {
    return false;
  }

  const submitted = Buffer.from(submittedToken);
  const expected = Buffer.from(cookieToken);

  return (
    submitted.length === expected.length &&
    timingSafeEqual(submitted, expected)
  );
}


export async function readSmallJsonBody(request) {
  const contentLength = request.headers.get("content-length");

  if (
    contentLength &&
    (!/^\d+$/.test(contentLength) ||
      Number(contentLength) > MAX_SESSION_REQUEST_BYTES)
  ) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) {
    return { ok: false, reason: "invalid_json" };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_SESSION_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }

      chunks.push(value);
    }

    const body = Buffer.concat(chunks, totalBytes).toString("utf8");

    return {
      ok: true,
      value: JSON.parse(body),
    };
  } catch {
    return { ok: false, reason: "invalid_json" };
  } finally {
    reader.releaseLock();
  }
}


export function getIdTokenFromPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).length !== 1 ||
    typeof payload.idToken !== "string" ||
    payload.idToken.length < 100 ||
    payload.idToken.length > 7_000
  ) {
    return null;
  }

  return payload.idToken;
}
