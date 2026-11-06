import { randomBytes } from "node:crypto";
import { connection } from "next/server";
import { NextResponse } from "next/server";

import {
  CSRF_COOKIE_NAME,
  getCsrfCookieOptions,
} from "@/lib/auth/constants";

export async function GET() {
  // Cache Components requires this request-time boundary instead of segment
  // config exports. A new CSRF value must never be prerendered or cached.
  await connection();
  const csrfToken = randomBytes(32).toString("base64url");
  const response = NextResponse.json(
    { csrfToken },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    }
  );

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

  return response;
}
