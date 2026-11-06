export const STAFF_ROLES = new Set(["ADMIN", "STAFF"]);

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isRecentlyAuthenticated(decodedToken, nowSeconds = Date.now() / 1000) {
  const authTime = Number(decodedToken?.auth_time);

  return (
    Number.isFinite(authTime) &&
    authTime <= nowSeconds + 60 &&
    nowSeconds - authTime <= 5 * 60
  );
}

export function isActiveStaffIdentity(decodedToken, staffUser) {
  const tokenEmail = normalizeEmail(decodedToken?.email);
  const staffEmail = normalizeEmail(staffUser?.email);

  return Boolean(
    staffUser &&
      staffUser.active === true &&
      STAFF_ROLES.has(staffUser.role) &&
      typeof decodedToken?.uid === "string" &&
      decodedToken.uid.length > 0 &&
      decodedToken.uid === staffUser.firebaseUid &&
      decodedToken.email_verified === true &&
      tokenEmail &&
      tokenEmail === staffEmail
  );
}
