
import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";

function getServiceAccountCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  // Explicit service-account authentication is used locally
  // when both credential fields are provided.
  if (clientEmail || privateKey) {
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin service-account credentials are incomplete."
      );
    }

    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  // Managed hosting uses Application Default Credentials.
  return applicationDefault();
}

export function getFirebaseAdminApp() {
  const existingApp = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  if (existingApp) {
    return existingApp;
  }

  return initializeApp({
    credential: getServiceAccountCredential(),
    ...(process.env.FIREBASE_ADMIN_PROJECT_ID
      ? { projectId: process.env.FIREBASE_ADMIN_PROJECT_ID }
      : {}),
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
