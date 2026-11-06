
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Could not prepare sign-out.");
  }

  const payload = await response.json();

  if (typeof payload.csrfToken !== "string") {
    throw new Error("Invalid CSRF response.");
  }

  return payload.csrfToken;
}

export default function StaffSignOut() {
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setError("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch("/api/auth/session", {
        method: "DELETE",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error("Sign-out request failed.");
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Sign-out could not be confirmed. Please try again."
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="admin-sign-out-container">
      <button
        className="admin-sign-out"
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>

      {error && (
        <p className="admin-sign-out-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
