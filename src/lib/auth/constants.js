import "server-only";

export const SESSION_COOKIE_NAME = "ghana_auto_staff_session";
export const CSRF_COOKIE_NAME = "ghana_auto_staff_csrf";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const CSRF_DURATION_SECONDS = 10 * 60;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  };
}

export function getCsrfCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    maxAge: CSRF_DURATION_SECONDS,
  };
}
