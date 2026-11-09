"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { validateCarPhotoFiles } from "@/lib/admin/vehicle-photo-client-policy.mjs";

function getResponseError(payload, fallback) {
  return typeof payload?.error === "string" ? payload.error : fallback;
}

async function getJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function uploadToCloudinary(upload, file, onProgress) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", upload.apiKey);
    body.append("signature", upload.signature);

    for (const [name, value] of Object.entries(upload.params)) {
      body.append(name, String(value));
    }

    const request = new XMLHttpRequest();
    request.open("POST", upload.uploadUrl);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error("Cloudinary could not be reached."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response);
      } else {
        reject(new Error("Cloudinary rejected this image."));
      }
    };
    request.send(body);
  });
}

export default function VehiclePhotoUpload({ vehicleId, initialImages = [] }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [images, setImages] = useState(initialImages);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(
    () => () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [previewUrls]
  );

  async function attachUploadGrant(uploadGrant) {
    const response = await fetch("/api/admin/vehicle-images/attach", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadGrant }),
    });
    const payload = await getJson(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(getResponseError(payload, "The uploaded photo could not be attached."));
    }

    return payload;
  }

  async function uploadOne(file, index, total) {
    setStatus(`Preparing photo ${index + 1} of ${total}…`);
    const signatureResponse = await fetch(
      `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/image-upload-signature`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      }
    );
    const signaturePayload = await getJson(signatureResponse);
    if (!signatureResponse.ok || !signaturePayload?.upload) {
      throw new Error(getResponseError(signaturePayload, "Unable to prepare this photo upload."));
    }

    setStatus(`Uploading photo ${index + 1} of ${total}…`);
    await uploadToCloudinary(signaturePayload.upload, file, setProgress);

    setStatus(`Verifying photo ${index + 1} of ${total}…`);
    try {
      const attachment = await attachUploadGrant(signaturePayload.upload.uploadGrant);
      if (attachment.image) {
        setImages((current) => [...current, attachment.image]);
      }
      setStatus(
        attachment.alreadyAttached
          ? "This photo was already attached to the car."
          : `Photo ${index + 1} of ${total} saved to this car.`
      );
    } catch (attachmentError) {
      throw new Error(
        `The image reached Cloudinary but was not saved to this car. ${attachmentError.message}`
      );
    }
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files ?? []);
    const validationError = validateCarPhotoFiles(files, 10 - images.length);
    setError("");
    setStatus("");
    setProgress(0);

    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
    setUploading(true);

    try {
      for (let index = 0; index < files.length; index += 1) {
        await uploadOne(files[index], index, files.length);
      }
      setProgress(100);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload this photo.");
      setStatus("");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const remainingSlots = Math.max(0, 10 - images.length);

  return (
    <section aria-labelledby="car-photo-upload-heading" className="admin-photo-upload">
      <div className="admin-photo-upload-header">
        <div>
          <h2 id="car-photo-upload-heading">Add Car Photos</h2>
          <p>JPEG, PNG, or WebP, up to 10 MB each.</p>
        </div>
        <strong aria-live="polite">{remainingSlots} of 10 photo slots remaining</strong>
      </div>

      {images.length > 0 ? (
        <div aria-label="Attached car photos" className="admin-photo-grid">
          {images.map((image, index) => (
            <div className="admin-photo-thumbnail" key={image.id}>
              <Image
                alt={image.altText || `Attached car photo ${index + 1}`}
                fill
                sizes="(max-width: 700px) 45vw, 180px"
                src={image.imageUrl}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="admin-field-help">No photos have been attached to this car yet.</p>
      )}

      {previewUrls.length > 0 && (
        <div aria-label="Selected photo previews" className="admin-photo-grid admin-photo-preview-grid">
          {previewUrls.map((url, index) => (
            <div className="admin-photo-thumbnail" key={url}>
              {/* A browser blob URL is not eligible for next/image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`Selected photo preview ${index + 1}`} src={url} />
            </div>
          ))}
        </div>
      )}

      <label className="admin-photo-picker">
        <span>Select photos</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="car-photo-upload-help"
          disabled={uploading || remainingSlots === 0}
          multiple
          onChange={handleFiles}
          ref={inputRef}
          type="file"
        />
      </label>
      <p className="admin-field-help" id="car-photo-upload-help">
        Photos are uploaded one at a time and saved only after server verification.
      </p>

      {(uploading || status || error) && (
        <div aria-live="polite" className={error ? "admin-photo-message error" : "admin-photo-message"} role={error ? "alert" : "status"}>
          {uploading && <progress aria-label="Photo upload progress" max="100" value={progress} />}
          <p>{error || status}</p>
        </div>
      )}
    </section>
  );
}
