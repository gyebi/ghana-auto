"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

import { useRouter } from "next/navigation";

import { getFirebaseClientAuth } from "@/lib/firebase/client";

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) throw new Error("Could not prepare sign-in.");

  const payload = await response.json();

  if (typeof payload.csrfToken !== "string") {
    throw new Error("Could not prepare sign-in.");
  }

  return payload.csrfToken;
}

export default function StaffLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    let auth;

    try {
      const csrfToken = await getCsrfToken();
      auth = getFirebaseClientAuth();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        await signOut(auth);

        setError(
          "Your email address is not verified. " +
          "We have sent you a verification link. " +
          "Please check your inbox and sign in again."
        );

        setIsSubmitting(false);
        return;
      }

      const idToken = await userCredential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) throw new Error("Sign-in denied.");

      // The Firebase browser state is intentionally ephemeral. The server
      // session cookie, not this browser state, authorizes later requests.
      await signOut(auth);
      router.replace("/admin");
      router.refresh();
    } catch {
      if (auth) await signOut(auth).catch(() => undefined);
      setError("We could not sign you in with those details.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-login" aria-labelledby="admin-login-title">
      <div className="admin-login-card">
        <p className="admin-eyebrow">STAFF ACCESS</p>
        <h1 id="admin-login-title">Ghana Auto Administration</h1>
        <p>
          Sign in with your approved staff account to access the dashboard.
        </p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="staff-email">Email address</label>
          <input
            id="staff-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={isSubmitting}
          />

          <label htmlFor="staff-password">Password</label>
          <input
            id="staff-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />

          {error ? (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
