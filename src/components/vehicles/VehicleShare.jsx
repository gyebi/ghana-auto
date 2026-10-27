
"use client";

import { useState } from "react";
import "./VehicleShare.css";

export default function VehicleShare({ title }) {
  const [message, setMessage] = useState("");

  async function handleShare() {
    const url = window.location.href;

    setMessage("");

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: `View this vehicle: ${title}`,
          url,
        });

        setMessage("Sharing opened successfully.");
        return;
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        // Fall back to copying the link.
      }
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(url);
      setMessage("Vehicle link copied!");
    } catch {
      setMessage(
        "Unable to share automatically. Please copy the page URL from your browser."
      );
    }
  }

  return (
    <div className="vehicle-share">
      <button
        type="button"
        className="vehicle-share-button"
        onClick={handleShare}
      >
        <span aria-hidden="true">↗</span>
        Share This Vehicle
      </button>

      {message && (
        <p className="vehicle-share-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
