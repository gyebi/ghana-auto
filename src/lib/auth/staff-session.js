import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";

import { unstable_rethrow } from "next/navigation";

import { findActiveStaffUserByFirebaseUid } from "@/lib/db/staff-repository";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./constants";
import {
  isActiveStaffIdentity,
  isRecentlyAuthenticated,
} from "./staff-authorization.mjs";

import { isFirebaseCredentialDenial } from "./auth-error-policy.mjs";

export class StaffAuthorizationError extends Error {
  constructor() {
    super("Staff authorization failed.");
  }
}

async function getAuthorizedStaffFromDecodedToken(decodedToken) {
  const staffUser = await findActiveStaffUserByFirebaseUid(decodedToken?.uid);

  if (!isActiveStaffIdentity(decodedToken, staffUser)) {
    throw new StaffAuthorizationError();
  }

  return staffUser;
}

export async function createStaffSession(idToken) {
  const auth = getFirebaseAdminAuth();
  const decodedToken = await auth.verifyIdToken(idToken, true);

  if (!isRecentlyAuthenticated(decodedToken)) {
    throw new StaffAuthorizationError();
  }

  const staffUser = await getAuthorizedStaffFromDecodedToken(decodedToken);
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  return { sessionCookie, staffUser };
}

// Verify every protected render and service call against Firebase (including
// revocation) and Neon. This is the authorization boundary for future admin
// route handlers and mutations as well as the dashboard page.

export async function getCurrentStaffSession() {
  // Authentication must execute during a real request.
  // Firebase checks session expiration using the current time.
  await connection();

  const sessionCookie = (await cookies())
    .get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) return null;

  try {
    const decodedToken =
      await getFirebaseAdminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    const staffUser =
      await getAuthorizedStaffFromDecodedToken(decodedToken);

    return { staffUser };
  } catch (error) {
    // Preserve special Next.js rendering errors.
    unstable_rethrow(error);

    // Expected authentication and authorization denials.
    if (
      error instanceof StaffAuthorizationError ||
      isFirebaseCredentialDenial(error)
    ) {
      return null;
    }

    // Unexpected Firebase, Prisma or configuration failures
    // must reach the server error boundary.
    throw error;
  }
}


export async function requireActiveStaffSession() {
  const session = await getCurrentStaffSession();

  if (!session) {
    throw new StaffAuthorizationError();
  }

  return session.staffUser;
}
