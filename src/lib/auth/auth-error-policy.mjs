
const DENIED_FIREBASE_CODES = new Set([
  "auth/invalid-id-token",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-session-cookie",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

export function isFirebaseCredentialDenial(error) {
  return (
    typeof error?.code === "string" &&
    DENIED_FIREBASE_CODES.has(error.code)
  );
}
