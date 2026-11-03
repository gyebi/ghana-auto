
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseClientApp() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client must run in the browser.");
  }

  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missing.join(", ")}`
    );
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getClientFirestore() {
  return getFirestore(getFirebaseClientApp());
}

// Staff sessions are represented by the server-issued, HTTP-only cookie. Keep
// the short-lived browser credential in memory only while exchanging its ID
// token; do not let Firebase restore it from local or session storage.
export function getFirebaseClientAuth() {
  const app = getFirebaseClientApp();

  try {
    return initializeAuth(app, {
      persistence: inMemoryPersistence,
    });
  } catch (error) {
    if (error?.code === "auth/already-initialized") {
      return getAuth(app);
    }

    throw error;
  }
}
