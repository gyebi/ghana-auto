import "server-only";

import { headers } from "next/headers.js";

import { StaffAuthorizationError } from "./staff-session.js";
import { isAllowedStaffOrigin } from "./request-validation.mjs";

export async function requireAllowedStaffMutationOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  let localOrigin = null;

  try {
    const suppliedOrigin = new URL(origin);

    if (
      host &&
      ["http:", "https:"].includes(suppliedOrigin.protocol) &&
      suppliedOrigin.host === host
    ) {
      localOrigin = suppliedOrigin.origin;
    }
  } catch {}

  // The configured HTTPS origin is authoritative in App Hosting. Without one,
  // local development uses only the direct Host header; forwarded headers are
  // intentionally not trusted for authorization decisions.
  if (!isAllowedStaffOrigin(origin, localOrigin)) {
    throw new StaffAuthorizationError();
  }
}
