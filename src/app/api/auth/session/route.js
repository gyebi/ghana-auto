import { NextResponse } from "next/server";

import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  getSessionCookieOptions,
} from "@/lib/auth/constants";
import {
  getIdTokenFromPayload,
  hasJsonContentType,
  hasValidCsrfToken,
  isSameOriginRequest,
  readSmallJsonBody,
} from "@/lib/auth/request-validation.mjs";
import { createStaffSession } from "@/lib/auth/staff-session";

import { unstable_rethrow } from "next/navigation";
import { isFirebaseCredentialDenial } from "@/lib/auth/auth-error-policy.mjs";
import { StaffAuthorizationError } from "@/lib/auth/staff-session";



function privateResponse(body, status) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function hasValidRequestCsrf(request) {
  return (
    isSameOriginRequest(request) &&
    hasValidCsrfToken(
      request.headers.get("x-csrf-token"),
      request.cookies.get(CSRF_COOKIE_NAME)?.value
    )
  );
}

export async function POST(request) {
  if (!isSameOriginRequest(request) || !hasJsonContentType(request)) {
    return privateResponse({ error: "Unable to sign in." }, 403);
  }

  if (!hasValidRequestCsrf(request)) {
    return privateResponse({ error: "Unable to sign in." }, 403);
  }

  const parsedBody = await readSmallJsonBody(request);

  if (!parsedBody.ok) {
    return privateResponse({ error: "Unable to sign in." }, 400);
  }

  const idToken = getIdTokenFromPayload(parsedBody.value);

  if (!idToken) {
    return privateResponse({ error: "Unable to sign in." }, 400);
  }

  try {
    const { sessionCookie } = await createStaffSession(idToken);
    const response = privateResponse({ ok: true }, 200);
    const expires = new Date(Date.now() + SESSION_DURATION_MS);

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      ...getSessionCookieOptions(),
      expires,
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return response;
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof StaffAuthorizationError) {
      return privateResponse(
        { error: "Staff access denied." },
        403
      );
    }

    if (isFirebaseCredentialDenial(error)) {
      return privateResponse(
        { error: "Unable to sign in." },
        401
      );
    }

    // Do not expose database or Firebase internals.
    console.error("Staff session service failure", {
      name: error?.name ?? "UnknownError",
      code: error?.code ?? "unknown",
    });

    return privateResponse(
      { error: "Authentication service temporarily unavailable." },
      503
    );
  }
}

export async function DELETE(request) {
  if (!hasValidRequestCsrf(request)) {
    return privateResponse({ error: "Unable to sign out." }, 403);
  }

  const response = privateResponse({ ok: true }, 200);

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
