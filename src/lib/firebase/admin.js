import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getServiceAccountCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const configuredValues = [projectId, clientEmail, privateKey];

  if (configuredValues.some(Boolean)) {
    if (configuredValues.some((value) => !value)) {
      throw new Error("Firebase Admin credentials are incomplete.");
    }

    return cert({
      projectId,
      clientEmail,
      // Environment providers commonly preserve newlines as literal `\\n`.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  // This supports managed runtimes that use Application Default Credentials
  // without making credentials part of the application bundle.
  return applicationDefault();
}

export function getFirebaseAdminApp() {
  const existingApp = getApps().find((app) => app.name === "[DEFAULT]");

  return (
    existingApp ??
    initializeApp({
      credential: getServiceAccountCredential(),
    })
  );
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
